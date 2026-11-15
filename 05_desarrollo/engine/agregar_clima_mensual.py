#!/usr/bin/env python3
"""
Agrega los crudos diarios de NASA POWER (data/raw/power_c*.json)
en data/processed/clima_mensual.json por celda y mes (1981-2026).

Incluye T2M media, Tmin media/absoluta, lluvia total, normal 1991-2020,
anomalia T2M y puesto (1 = mas calido de la serie) con peso < 1 MB.
"""

import json
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
OUT_PATH = BASE_DIR / "data" / "processed" / "clima_mensual.json"

FILL_POWER = -999.0


def agregar_celda(raw_path: Path) -> Dict[str, Any]:
    """Agrega un archivo crudo POWER a series mensuales 1981-2026."""
    # Nombre esperado: power_c-26_-119_19810101_20261031.json
    stem_parts = raw_path.stem.split("_")
    cell_key = f"{stem_parts[1]}_{stem_parts[2]}"

    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    params = raw["properties"]["parameter"]
    t2m_d = params["T2M"]
    tmin_d = params["T2M_MIN"]
    prectot_d = params["PRECTOTCORR"]
    gwetroot_d = params.get("GWETROOT", {})
    elev_cell = raw.get("geometry", {}).get("coordinates", [None, None, None])[2]

    por_anio_mes: Dict[tuple, Dict[str, List[float]]] = defaultdict(
        lambda: {"t2m": [], "tmin": [], "prec": [], "gwetroot": []}
    )
    fechas_validas: List[str] = []

    for yyyymmdd, t2m_val in t2m_d.items():
        if t2m_val is None or t2m_val <= FILL_POWER + 1:
            continue
        anio = int(yyyymmdd[:4])
        mes = int(yyyymmdd[4:6])
        fechas_validas.append(f"{yyyymmdd[:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:8]}")
        por_anio_mes[(anio, mes)]["t2m"].append(float(t2m_val))

        tmin_val = tmin_d.get(yyyymmdd)
        if tmin_val is not None and tmin_val > FILL_POWER + 1:
            por_anio_mes[(anio, mes)]["tmin"].append(float(tmin_val))

        prec_val = prectot_d.get(yyyymmdd)
        if prec_val is not None and prec_val > FILL_POWER + 1:
            por_anio_mes[(anio, mes)]["prec"].append(float(prec_val))

        gw_val = gwetroot_d.get(yyyymmdd)
        if gw_val is not None and gw_val > FILL_POWER + 1:
            por_anio_mes[(anio, mes)]["gwetroot"].append(float(gw_val))

    dato_hasta = max(fechas_validas) if fechas_validas else "no disponible"

    # Normal 1991-2020 por mes (1..12)
    normal_t2m: Dict[int, float] = {}
    for mes in range(1, 13):
        vals_norm = [
            statistics.mean(por_anio_mes[(a, mes)]["t2m"])
            for a in range(1991, 2021)
            if por_anio_mes[(a, mes)]["t2m"]
        ]
        if vals_norm:
            normal_t2m[mes] = statistics.mean(vals_norm)

    # Ranking por mes across all years (1 = mas calido)
    rankings: Dict[tuple, int] = {}
    totales_por_mes: Dict[int, int] = {}
    for mes in range(1, 13):
        pares = [
            (a, statistics.mean(por_anio_mes[(a, mes)]["t2m"]))
            for (a, m) in por_anio_mes
            if m == mes and por_anio_mes[(a, mes)]["t2m"]
        ]
        pares.sort(key=lambda x: x[1], reverse=True)
        totales_por_mes[mes] = len(pares)
        for idx, (a, _) in enumerate(pares, start=1):
            rankings[(a, mes)] = idx

    registros = []
    for (anio, mes) in sorted(por_anio_mes.keys()):
        bucket = por_anio_mes[(anio, mes)]
        if not bucket["t2m"]:
            continue
        t2m_m = statistics.mean(bucket["t2m"])
        norm_m = normal_t2m.get(mes)
        anom_m = round(t2m_m - norm_m, 2) if norm_m is not None else "no disponible"
        tmin_media = round(statistics.mean(bucket["tmin"]), 2) if bucket["tmin"] else "no disponible"
        tmin_abs = round(min(bucket["tmin"]), 2) if bucket["tmin"] else "no disponible"
        lluvia_mm = round(sum(bucket["prec"]), 1) if bucket["prec"] else "no disponible"
        humedad_raiz = (
            round(statistics.mean(bucket["gwetroot"]), 3) if bucket["gwetroot"] else "no disponible"
        )

        registros.append(
            {
                "anio": anio,
                "mes": mes,
                "t2m_media_c": round(t2m_m, 2),
                "tmin_media_c": tmin_media,
                "tmin_absoluta_c": tmin_abs,
                "lluvia_mm": lluvia_mm,
                "humedad_suelo_raiz": humedad_raiz,
                "nota_humedad": "modelo MERRA-2, ~50 km, no es medicion en la chacra",
                "normal_1991_2020_t2m_c": round(norm_m, 2) if norm_m is not None else "no disponible",
                "anomalia_t2m_c": anom_m,
                "puesto_calor": rankings.get((anio, mes), "no disponible"),
                "total_anios_mes": totales_por_mes.get(mes, 0),
                "estado": "observado",
                "dato_hasta": dato_hasta,
            }
        )

    return {
        "cell_key": cell_key,
        "elev_celda_m": round(float(elev_cell), 2) if elev_cell is not None else "no disponible",
        "dato_hasta": dato_hasta,
        "registros": registros,
    }


def main() -> None:
    raw_files = sorted(RAW_DIR.glob("power_c*.json"))
    celdas = {}
    for path in raw_files:
        res = agregar_celda(path)
        celdas[res["cell_key"]] = res

    salida = {
        "_metadata": {
            "fuente": "NASA POWER MERRA-2 (0.5 x 0.625 grados)",
            "normal_climatologica": "1991-2020",
            "serie": "1981-2026",
            "ranking_criterio": "1 = mes mas calido de la serie",
            "estado": "observado",
        },
        "celdas": celdas,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    # Compact JSON (separators sin espacios innecesarios) para mantener peso << 1 MB
    OUT_PATH.write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    size_kb = OUT_PATH.stat().st_size / 1024.0
    print(f"[OK] Generado {OUT_PATH} ({size_kb:.1f} KB, {len(celdas)} celdas)")


if __name__ == "__main__":
    main()
