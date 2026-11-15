#!/usr/bin/env python3
"""
Procesa los datos de mercado (EMMSA/SIEA, ENIS, produccion regional) en
05_desarrollo/data/mercado/ y genera 05_desarrollo/data/processed/mercado_resumen.json.

Calcula el indice de sobreoferta I_m = ingreso_t / promedio_mismo_mes(2022-2025 anteriores al anio)
y valida Prueba 2 (enero 2024: I_m > 1 y caida de precio -48 %).
"""

import csv
import json
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parent.parent
MERCADO_DIR = BASE_DIR / "data" / "mercado"
OUT_PATH = BASE_DIR / "data" / "processed" / "mercado_resumen.json"

NOMBRES_MES = {
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


def procesar_mercado() -> Dict[str, Any]:
    # 1. EMMSA mensual
    emmsa_rows: List[Dict[str, Any]] = []
    ingreso_por_anio_mes: Dict[tuple, float] = {}

    with (MERCADO_DIR / "papa_emmsa_mensual.csv").open("r", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            anio = int(row["anio"])
            mes = int(row["mes"])
            ingreso = float(row["ingreso_t"])
            precio = float(row["precio_papa_blanca_soles_kg"])
            boletin = row["boletin_fuente"].strip()
            verif = row["verificacion"].strip()
            emmsa_rows.append(
                {
                    "anio": anio,
                    "mes": mes,
                    "ingreso_t": ingreso,
                    "precio_soles_kg": precio,
                    "boletin_fuente": boletin,
                    "verificacion": verif,
                }
            )
            ingreso_por_anio_mes[(anio, mes)] = ingreso

    dato_hasta = "2026-11-13"
    registros_mensuales = []

    for r in emmsa_rows:
        anio = r["anio"]
        mes = r["mes"]
        verif = r["verificacion"]
        ingreso_prev = ingreso_por_anio_mes.get((anio - 1, mes))

        if anio == 2026 and mes == 11:
            im_val = None
            prom_base = ingreso_prev
            anios_base = 1 if ingreso_prev is not None else 0
            etiqueta = "no disponible"
            estado = "no_disponible"
            nota = "mes incompleto (hasta dia 13); no comparable contra mes completo"
        elif ingreso_prev is not None and ingreso_prev > 0:
            prom_base = round(ingreso_prev, 1)
            anios_base = 1
            im_val = round(r["ingreso_t"] / ingreso_prev, 3)
            if im_val > 1.05:
                etiqueta = "riesgo de saturación"
            elif im_val >= 0.95:
                etiqueta = "oferta normal"
            else:
                etiqueta = "oferta baja"
            # I_m es un calculo: su estado siempre es "estimado" (regla 4)
            estado = "estimado"
            if verif == "extraccion_automatica_revisar":
                nota = "extraccion automatica pendiente de revision manual (boletin 03-01-2025)"
            else:
                nota = ""
        else:
            prom_base = None
            anios_base = 0
            im_val = None
            etiqueta = "no disponible"
            estado = "no_disponible"
            if verif == "extraccion_automatica_revisar":
                nota = "sin mismo mes del anio anterior; extraccion automatica pendiente de revision manual (boletin 03-01-2025)"
            else:
                nota = "sin mismo mes del anio anterior"

        registros_mensuales.append(
            {
                "anio": anio,
                "mes": mes,
                "mes_nombre": NOMBRES_MES[mes],
                "ingreso_t": r["ingreso_t"],
                "precio_soles_kg": r["precio_soles_kg"],
                "boletin_fuente": r["boletin_fuente"],
                "verificacion": verif,
                "im_papa": im_val if im_val is not None else "no disponible",
                "promedio_base_t": prom_base if prom_base is not None else "no disponible",
                "anios_base": anios_base,
                "etiqueta_riesgo": etiqueta,
                "nota": nota,
                "fuente_id": "emmsa_siea",
                "estado": estado,
                "dato_hasta": dato_hasta,
            }
        )

    # 2. ENIS (nacional + Ayacucho 2026/2027)
    enis_rows = []
    with (MERCADO_DIR / "enis_papa.csv").open("r", encoding="utf-8") as fh:
        for idx, row in enumerate(csv.DictReader(fh), start=1):
            camp = row["campana"].strip()
            enis_rows.append(
                {
                    "id": f"enis_nac_{idx}",
                    "ambito": "nacional",
                    "campana": camp,
                    "variable": "papa_intencion_siembra_ha",
                    "valor": row["papa_intencion_ha"].strip(),
                    "variacion": row["variacion"].strip(),
                    "fuente": row["fuente"].strip(),
                    "fuente_id": "enis_2025_2026" if "2025/2026" in camp else "enis_2026_2027",
                    "estado": row["estado"].strip(),
                    "nota": "",
                    "dato_hasta": "2026-07-15",
                }
            )
    enis_rows.append(
        {
            "id": "enis_ayacucho_2026_2027",
            "ambito": "ayacucho",
            "campana": "2026/2027",
            "variable": "papa_variacion_area_pct",
            "valor": "+19.3%",
            "variacion": "+19.3% (segundo mayor aumento del pais)",
            "fuente": "Agraria.pe 15-07-2026 (ENIS 2026/2027)",
            "fuente_id": "enis_2026_2027",
            "estado": "estimado",
            "nota": "hectareas por provincia pendientes",
            "dato_hasta": "2026-07-15",
        }
    )

    # 3. Produccion regional
    prod_rows = []
    with (MERCADO_DIR / "produccion_ayacucho.csv").open("r", encoding="utf-8") as fh:
        for idx, row in enumerate(csv.DictReader(fh), start=1):
            val_raw = row["valor"].strip().replace("%", "")
            fuente_txt = row["fuente"].strip()
            fuente_id = "ficha_ayacucho_2024" if "Ficha agricola Ayacucho 2024" in fuente_txt else "emmsa_siea"
            prod_rows.append(
                {
                    "id": f"prod_{idx}",
                    "cultivo": row["cultivo"].strip(),
                    "anio": row["anio"].strip(),
                    "variable": row["variable"].strip(),
                    "valor": float(val_raw),
                    "unidad": row["unidad"].strip(),
                    "fuente": fuente_txt,
                    "fuente_id": fuente_id,
                    "estado": row["estado"].strip(),
                    "nota": row["nota"].strip(),
                    "dato_hasta": "2026-02-26",
                }
            )

    # Prueba 2 summary
    ene_2023 = next(r for r in registros_mensuales if r["anio"] == 2023 and r["mes"] == 1)
    ene_2024 = next(r for r in registros_mensuales if r["anio"] == 2024 and r["mes"] == 1)
    var_precio_pct = round(((ene_2024["precio_soles_kg"] - ene_2023["precio_soles_kg"]) / ene_2023["precio_soles_kg"]) * 100.0, 1)

    return {
        "_metadata": {
            "fuente_principal": "EMMSA / MIDAGRI-SIEA (GMML Lima)",
            "nota_escala": "Ingreso total a Lima (GMML), no solo Ayacucho (aporta ~3%-22% segun epoca).",
            "nota_im": "Mide volumen que entra a Lima, no predice precio. Entre 2023 y 2026 la correlacion entre la variacion del volumen y la del precio fue baja (r = 0.18, n = 31).",
            "formula_im": "I_m = ingreso del mes / ingreso del mismo mes del anio anterior (>1.05 riesgo de saturación, 0.95-1.05 oferta normal, <0.95 oferta baja)",
            "dato_hasta": dato_hasta,
        },
        "prueba2_ene_2024": {
            "im_enero_2024": ene_2024["im_papa"],
            "ingreso_2023_t": ene_2023["ingreso_t"],
            "ingreso_2024_t": ene_2024["ingreso_t"],
            "precio_2023_soles_kg": ene_2023["precio_soles_kg"],
            "precio_2024_soles_kg": ene_2024["precio_soles_kg"],
            "variacion_precio_pct": var_precio_pct,
            "etiqueta": ene_2024["etiqueta_riesgo"],
            "estado": ene_2024["estado"],
        },
        "mercado_papa_mensual": registros_mensuales,
        "enis": enis_rows,
        "produccion_region": prod_rows,
    }


def main() -> None:
    res = procesar_mercado()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] Generado {OUT_PATH}")
    print("Prueba 2:", json.dumps(res["prueba2_ene_2024"], ensure_ascii=False))


if __name__ == "__main__":
    main()
