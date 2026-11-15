#!/usr/bin/env python3
"""
Procesa los CSV diarios de GPM IMERG Late V07 (Giovanni) en data/raw/imerg/
y genera data/processed/imerg_mensual.json (jul-oct 2026 vs 2001-2025).
"""

import csv
import json
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_IMERG_DIR = BASE_DIR / "data" / "raw" / "imerg"
OUT_PATH = BASE_DIR / "data" / "processed" / "imerg_mensual.json"

FILL_VALUE = -9999.9
MESES_OBJETIVO = {
    7: "julio",
    8: "agosto",
    9: "septiembre",
    10: "octubre",
}


def leer_csv_giovanni(csv_path: Path) -> List[Tuple[str, Optional[float]]]:
    """Lee un CSV de Giovanni saltando las 9 lineas de cabecera."""
    filas: List[Tuple[str, Optional[float]]] = []
    with csv_path.open("r", encoding="utf-8") as fh:
        lines = fh.readlines()[9:]
    reader = csv.reader(lines)
    for row in reader:
        if not row or len(row) < 2:
            continue
        fecha = row[0].strip()
        if not fecha or fecha.lower() == "time":
            continue
        try:
            val = float(row[1].strip())
        except ValueError:
            filas.append((fecha, None))
            continue
        if abs(val - FILL_VALUE) < 1e-6 or val <= -9999.0:
            filas.append((fecha, None))
        else:
            filas.append((fecha, val))
    return filas


def agregar_mensual(registros: List[Tuple[str, Optional[float]]]) -> Dict[Tuple[int, int], Dict[str, Any]]:
    """Agrupa observaciones diarias en totales mensuales y dias >= 1 mm."""
    agrupado: Dict[Tuple[int, int], List[Optional[float]]] = defaultdict(list)
    for fecha, val in registros:
        anio = int(fecha[:4])
        mes = int(fecha[5:7])
        if mes in MESES_OBJETIVO:
            agrupado[(anio, mes)].append(val)

    mensual: Dict[Tuple[int, int], Dict[str, Any]] = {}
    for (anio, mes), vals in sorted(agrupado.items()):
        validos = [v for v in vals if v is not None]
        if not validos:
            mensual[(anio, mes)] = {
                "total_mm": None,
                "dias_ge_1mm": None,
                "estado": "no_disponible",
            }
        else:
            mensual[(anio, mes)] = {
                "total_mm": sum(validos),
                "dias_ge_1mm": sum(1 for v in validos if v >= 1.0),
                "estado": "observado",
            }
    return mensual


def procesar_imerg() -> Dict[str, Any]:
    csv_hist = RAW_IMERG_DIR / "imerg_serie_2001-2025.csv"
    csv_2026 = RAW_IMERG_DIR / "imerg_serie_jul-oct2026.csv"

    reg_hist = leer_csv_giovanni(csv_hist)
    reg_2026 = leer_csv_giovanni(csv_2026)

    mensual_hist = agregar_mensual(reg_hist)
    mensual_2026 = agregar_mensual(reg_2026)

    fechas_2026 = [f for f, v in reg_2026 if v is not None]
    dato_hasta = max(fechas_2026) if fechas_2026 else "no disponible"

    meses_salida = []
    for mes_num, mes_nombre in MESES_OBJETIVO.items():
        serie_hist = [
            mensual_hist[(a, mes_num)]
            for a in range(2001, 2026)
            if (a, mes_num) in mensual_hist and mensual_hist[(a, mes_num)]["total_mm"] is not None
        ]
        totales_hist = [m["total_mm"] for m in serie_hist]
        dias_hist = [m["dias_ge_1mm"] for m in serie_hist]

        dato_2026 = mensual_2026.get((2026, mes_num), {"total_mm": None, "dias_ge_1mm": None, "estado": "no_disponible"})
        total_2026 = dato_2026["total_mm"]

        media_hist = statistics.mean(totales_hist) if totales_hist else None
        mediana_hist = statistics.median(totales_hist) if totales_hist else None
        dias_media_hist = statistics.mean(dias_hist) if dias_hist else None

        if total_2026 is not None and media_hist is not None and media_hist > 0:
            anomalia_pct = round(((total_2026 - media_hist) / media_hist) * 100.0, 1)
        else:
            anomalia_pct = "no disponible"

        if total_2026 is not None and len(totales_hist) == 25:
            todos = sorted(totales_hist + [total_2026])
            # Puesto de mas seco (1) a mas lluvioso (26)
            puesto = todos.index(total_2026) + 1
        else:
            puesto = "no disponible"

        meses_salida.append(
            {
                "mes_num": mes_num,
                "mes": mes_nombre,
                "total_2026_mm": round(total_2026, 1) if total_2026 is not None else "no disponible",
                "media_2001_2025_mm": round(media_hist, 1) if media_hist is not None else "no disponible",
                "mediana_2001_2025_mm": round(mediana_hist, 1) if mediana_hist is not None else "no disponible",
                "anomalia_pct": anomalia_pct,
                "puesto_seco_2001_2026": puesto,
                "total_anios_serie": len(totales_hist) + (1 if total_2026 is not None else 0),
                "dias_ge_1mm_2026": dato_2026["dias_ge_1mm"] if dato_2026["dias_ge_1mm"] is not None else "no disponible",
                "dias_ge_1mm_media_2001_2025": round(dias_media_hist, 1) if dias_media_hist is not None else "no disponible",
                "estado": "observado" if total_2026 is not None else "no_disponible",
                "dato_hasta": dato_hasta,
            }
        )

    return {
        "_metadata": {
            "fuente": "NASA GPM IMERG Late V07 (Giovanni ArAvTs, 0.1 grados)",
            "bbox": "-74.4,-13.3,-74.0,-12.8",
            "nota_escala": "Promedio de area de la zona -74.4,-13.3,-74.0,-12.8 (IMERG Late V07, 0.1°), no de cada chacra.",
            "baseline": "2001-2025 (25 anios)",
            "ranking_criterio": "1 = mas seco, 26 = mas lluvioso (2001-2026)",
            "estado": "observado",
            "dato_hasta": dato_hasta,
        },
        "meses_jul_oct": meses_salida,
    }


def main() -> None:
    res = procesar_imerg()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] Generado {OUT_PATH}")
    for m in res["meses_jul_oct"]:
        print(
            f"  {m['mes']}: 2026={m['total_2026_mm']} mm | media={m['media_2001_2025_mm']} mm | "
            f"mediana={m['mediana_2001_2025_mm']} mm | anom={m['anomalia_pct']}% | puesto={m['puesto_seco_2001_2026']}/26"
        )


if __name__ == "__main__":
    main()
