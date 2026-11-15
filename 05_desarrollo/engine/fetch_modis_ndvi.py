#!/usr/bin/env python3
"""
Descarga NDVI MODIS MOD13Q1 (250 m, 16 dias) de 2024-01 a 2026-10 para las 10 parcelas
usando la API REST oficial de ORNL DAAC:
  - GET /rst/api/v1/MOD13Q1/dates?latitude=..&longitude=..
  - GET /rst/api/v1/MOD13Q1/subset?latitude=..&longitude=..&band=..&startDate=..&endDate=..&kmAboveBelow=0&kmLeftRight=0

Escala NDVI = 0.0001. Descarta pixeles con pixel_reliability distinto de 0 o 1 -> no_disponible.
"""

import csv
import json
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "parcelas_demo_v1.csv"
RAW_MODIS_DIR = BASE_DIR / "data" / "raw" / "modis"
OUT_PATH = BASE_DIR / "data" / "processed" / "ndvi_parcelas.json"

ORNL_BASE = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"
SCALE_NDVI = 0.0001
MAX_DATES_PER_REQ = 10


def http_get_json(url: str) -> Dict[str, Any]:
    """Ejecuta GET via curl.exe (almacen TLS de Windows) con 120 s de espera."""
    last_err = ""
    for wait_s in [0, 5]:
        if wait_s:
            time.sleep(wait_s)
        proc = subprocess.run(
            [
                "curl.exe",
                "-sS",
                "--fail",
                "--max-time",
                "120",
                "-H",
                "Accept: application/json",
                url,
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return json.loads(proc.stdout)
        last_err = proc.stderr.strip() or f"exit {proc.returncode}"
    raise RuntimeError(f"Error consultando {url}: {last_err}")


def fetch_parcela_ndvi(parcela: Dict[str, str], forzar: bool = False) -> Dict[str, Any]:
    pid = parcela["ID"]
    lat = float(parcela["Latitude"])
    lon = float(parcela["Longitude"])

    RAW_MODIS_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = RAW_MODIS_DIR / f"mod13q1_{pid}.json"

    if cache_file.exists() and not forzar:
        cached = json.loads(cache_file.read_text(encoding="utf-8"))
        return cached

    dates_url = f"{ORNL_BASE}/dates?latitude={lat}&longitude={lon}"
    dates_resp = http_get_json(dates_url)
    target_dates = [
        d for d in dates_resp.get("dates", [])
        if "2024-01-01" <= d["calendar_date"] <= "2026-10-31"
    ]

    ndvi_by_date: Dict[str, Optional[int]] = {}
    rel_by_date: Dict[str, Optional[int]] = {}

    for i in range(0, len(target_dates), MAX_DATES_PER_REQ):
        chunk = target_dates[i : i + MAX_DATES_PER_REQ]
        sd = chunk[0]["modis_date"]
        ed = chunk[-1]["modis_date"]

        for band, target_map in [
            ("250m_16_days_NDVI", ndvi_by_date),
            ("250m_16_days_pixel_reliability", rel_by_date),
        ]:
            sub_url = (
                f"{ORNL_BASE}/subset?latitude={lat}&longitude={lon}"
                f"&band={band}&startDate={sd}&endDate={ed}&kmAboveBelow=0&kmLeftRight=0"
            )
            sub_resp = http_get_json(sub_url)
            for item in sub_resp.get("subset", []):
                mdate = item.get("modis_date")
                vals = item.get("data", [])
                target_map[mdate] = int(vals[0]) if vals else None

    registros = []
    valid_count = 0
    for d in target_dates:
        mdate = d["modis_date"]
        cdate = d["calendar_date"]
        raw_ndvi = ndvi_by_date.get(mdate)
        rel = rel_by_date.get(mdate)

        # pixel_reliability: 0 = Good, 1 = Marginal; otros valores (2=Snow/Ice, 3=Cloudy, -1=Fill) -> descartar
        if rel in (0, 1) and raw_ndvi is not None and -2000 <= raw_ndvi <= 10000:
            ndvi_val = round(raw_ndvi * SCALE_NDVI, 4)
            estado = "observado"
            valid_count += 1
        else:
            ndvi_val = "no disponible"
            estado = "no_disponible"

        registros.append(
            {
                "modis_date": mdate,
                "calendar_date": cdate,
                "ndvi": ndvi_val,
                "pixel_reliability": rel,
                "estado": estado,
            }
        )

    dato_hasta = max((r["calendar_date"] for r in registros), default="no disponible")
    out = {
        "parcela_id": pid,
        "distrito": parcela["Category"],
        "escala": "250 m",
        "estado": "observado",
        "total_fechas": len(registros),
        "fechas_validas": valid_count,
        "dato_hasta": dato_hasta,
        "registros": registros,
    }
    cache_file.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    return out


def main() -> None:
    with CSV_PATH.open("r", encoding="utf-8") as fh:
        parcelas = list(csv.DictReader(fh))

    prioritarias = {"P01", "P02", "P03", "P04", "P05", "P07", "P08"}
    resultados = []
    fallos = []

    for p in parcelas:
        pid = p["ID"]
        cache_file = RAW_MODIS_DIR / f"mod13q1_{pid}.json"
        if not cache_file.exists() and pid not in prioritarias:
            resultados.append(
                {
                    "parcela_id": pid,
                    "distrito": p["Category"],
                    "escala": "250 m",
                    "estado": "no_disponible",
                    "total_fechas": 0,
                    "fechas_validas": 0,
                    "dato_hasta": "no disponible",
                    "registros": [],
                }
            )
            print(f"[MODIS] {pid}: omitida (no_disponible)")
            continue
        try:
            res = fetch_parcela_ndvi(p)
            res["escala"] = "250 m"
            res["estado"] = "observado"
            resultados.append(res)
            print(f"[MODIS] {pid}: {res['fechas_validas']}/{res['total_fechas']} fechas validas (hasta {res['dato_hasta']})")
        except Exception as exc:
            fallos.append({"parcela_id": pid, "error": str(exc)})
            resultados.append(
                {
                    "parcela_id": pid,
                    "distrito": p["Category"],
                    "escala": "250 m",
                    "estado": "no_disponible",
                    "total_fechas": 0,
                    "fechas_validas": 0,
                    "dato_hasta": "no disponible",
                    "registros": [],
                }
            )
            print(f"[MODIS][WARN] {pid} fallo: {exc}")

    con_datos = sum(1 for r in resultados if r["estado"] == "observado" and r["fechas_validas"] > 0)
    salida = {
        "_metadata": {
            "fuente": "MODIS MOD13Q1 v061 (ORNL DAAC REST API v1, 250 m, 16 dias)",
            "fuente_id": "modis_mod13q1",
            "escala": "250 m",
            "bandas": ["250m_16_days_NDVI", "250m_16_days_pixel_reliability"],
            "regla_calidad": "Solo pixel_reliability in {0, 1}; otros descartados como no_disponible",
            "parcelas_con_datos": con_datos,
            "estado": "observado" if con_datos > 0 else "no_disponible",
            "fallos": fallos,
        },
        "parcelas": resultados,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    size_kb = OUT_PATH.stat().st_size / 1024.0
    print(f"[OK] Generado {OUT_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
