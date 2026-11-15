#!/usr/bin/env python3
"""
Vigilancia de condiciones favorables para rancha en papa usando días con lluvia
observados de GPM IMERG (>= 1 mm/día) en los últimos 7 días disponibles frente a
la mediana climatológica 2001–2025 de esa misma semana calendario.

Escribe únicamente `web/public/data/vigilancia_rancha.json` (sin tabla en Supabase).
"""

from __future__ import annotations

import json
import statistics
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List

from procesar_imerg import leer_csv_giovanni

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_IMERG_DIR = BASE_DIR / "data" / "raw" / "imerg"
OUT_WEB_PATH = BASE_DIR / "web" / "public" / "data" / "vigilancia_rancha.json"

UMBRAL_LLUVIA_MM = 1.0
ENLACE_SENAMHI = "https://www.gob.pe/12431-pronosticos-agrometeorologicos-del-senamhi"

MESES_ES = {
    1: "enero",
    2: "febrero",
    3: "marzo",
    4: "abril",
    5: "mayo",
    6: "junio",
    7: "julio",
    8: "agosto",
    9: "septiembre",
    10: "octubre",
    11: "noviembre",
    12: "diciembre",
}


def clasificar_nivel_lluvia(dias_lluvia: int) -> str:
    """Clasifica días con lluvia en 7 días: 0–2 pocos, 3–4 varios, 5–7 frecuentes."""
    if dias_lluvia <= 2:
        return "pocos"
    if dias_lluvia <= 4:
        return "varios"
    return "frecuentes"


def formato_fecha_es(d: date) -> str:
    return f"{d.day} de {MESES_ES[d.month]}"


def calcular_vigilancia_rancha() -> Dict[str, Any]:
    reg_2026 = dict(leer_csv_giovanni(RAW_IMERG_DIR / "imerg_serie_jul-oct2026.csv"))
    reg_hist = dict(leer_csv_giovanni(RAW_IMERG_DIR / "imerg_serie_2001-2025.csv"))

    fechas_validas = sorted(f for f, v in reg_2026.items() if v is not None)
    if not fechas_validas:
        raise RuntimeError("No hay datos válidos en imerg_serie_jul-oct2026.csv")

    ultimo_dia = date.fromisoformat(fechas_validas[-1])
    semana_2026: List[date] = [ultimo_dia - timedelta(days=k) for k in range(6, -1, -1)]

    dias_lluvia_7d = sum(
        1
        for d in semana_2026
        if (val := reg_2026.get(d.isoformat())) is not None and val >= UMBRAL_LLUVIA_MM
    )

    cuentas_hist: List[int] = []
    for anio in range(2001, 2026):
        fechas_anio = [date(anio, d.month, d.day).isoformat() for d in semana_2026]
        vals = [reg_hist.get(f) for f in fechas_anio if reg_hist.get(f) is not None]
        if len(vals) == 7:
            cuentas_hist.append(sum(1 for v in vals if v >= UMBRAL_LLUVIA_MM))

    mediana_raw = statistics.median(cuentas_hist)
    normal_mediana_7d = int(round(mediana_raw)) if float(mediana_raw).is_integer() else round(float(mediana_raw), 1)
    nivel = clasificar_nivel_lluvia(dias_lluvia_7d)
    fecha_larga = formato_fecha_es(ultimo_dia)

    return {
        "cultivos_aplica": ["papa"],
        "ventana_inicio": semana_2026[0].isoformat(),
        "ventana_fin": ultimo_dia.isoformat(),
        "dato_hasta": ultimo_dia.isoformat(),
        "umbral_mm_dia": UMBRAL_LLUVIA_MM,
        "dias_lluvia_7d": dias_lluvia_7d,
        "normal_mediana_7d": normal_mediana_7d,
        "n_anios_referencia": len(cuentas_hist),
        "nivel": nivel,
        "titulo": "Revisa tu papa",
        "mensaje": (
            f"En la semana al {fecha_larga} llovió {dias_lluvia_7d} de 7 días en tu zona "
            f"(lo normal: {normal_mediana_7d}). Con lluvia seguida, la rancha avanza rápido. "
            "Revisa el envés de las hojas de tu papa."
        ),
        "etiqueta_fuente": f"Medido · NASA IMERG · Dato hasta el {fecha_larga}",
        "estado": "observado",
        "fuente": "NASA GPM IMERG Late V07 (2001–2026)",
        "enlace_senamhi": ENLACE_SENAMHI,
        "enlace_senamhi_texto": "Boletín agrometeorológico de SENAMHI",
    }


def main() -> None:
    payload = calcular_vigilancia_rancha()
    OUT_WEB_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_WEB_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"[OK] Generado {OUT_WEB_PATH}: {payload['dias_lluvia_7d']}/7 días "
        f"(normal {payload['normal_mediana_7d']}), nivel={payload['nivel']}"
    )


if __name__ == "__main__":
    main()
