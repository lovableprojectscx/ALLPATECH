#!/usr/bin/env python3
"""
MUYU - Orquestador único de actualización de datos (POWER, MODIS, mercado,
procesamientos, copia a web/public/data, pytest y ETL a Supabase).

Se detiene inmediatamente si cualquier paso devuelve un código de salida distinto de 0.
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List, Tuple

ENGINE_DIR = Path(__file__).resolve().parent
BASE_DIR = ENGINE_DIR.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
WEB_PUBLIC_DATA_DIR = BASE_DIR / "web" / "public" / "data"


def construir_pasos(dry_run: bool = False) -> List[Tuple[str, List[str]]]:
    py = sys.executable
    etl_cmd = [py, str(ENGINE_DIR / "etl_supabase.py")]
    if dry_run:
        etl_cmd.append("--dry-run")

    return [
        ("1. NASA POWER + parcelas", [py, str(ENGINE_DIR / "fetch_power.py"), "--csv", "data/parcelas_demo_v1.csv", "--cache-suelo"]),
        ("2. MODIS NDVI (caché incremental)", [py, str(ENGINE_DIR / "fetch_modis_ndvi.py")]),
        ("3. Mercado mayorista + ENIS", [py, str(ENGINE_DIR / "procesar_mercado.py")]),
        ("4. Agregar clima mensual", [py, str(ENGINE_DIR / "agregar_clima_mensual.py")]),
        ("5. Procesar lluvia IMERG", [py, str(ENGINE_DIR / "procesar_imerg.py")]),
        ("6. Estrategias y planificador", [py, str(ENGINE_DIR / "estrategias_y_planificador.py")]),
        ("7. Oportunidades y calendario", [py, str(ENGINE_DIR / "oportunidades.py")]),
        ("8. Pruebas pytest del motor", [py, "-m", "pytest", str(ENGINE_DIR / "tests"), "-v"]),
        ("9. ETL a Supabase", etl_cmd),
    ]


def sincronizar_public_data() -> int:
    WEB_PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    copiados = 0
    for src in sorted(PROCESSED_DIR.glob("*.json")):
        shutil.copy2(src, WEB_PUBLIC_DATA_DIR / src.name)
        copiados += 1
    print(f"[SYNC] {copiados} JSON copiados a {WEB_PUBLIC_DATA_DIR}")
    return copiados


def main() -> None:
    ap = argparse.ArgumentParser(description="MUYU - Actualiza todo el pipeline en orden y se detiene si algo falla.")
    ap.add_argument("--dry-run", action="store_true", help="Ejecuta el ETL en modo --dry-run")
    args = ap.parse_args()

    pasos = construir_pasos(dry_run=args.dry_run)
    for nombre, cmd in pasos:
        if nombre.startswith("8."):
            sincronizar_public_data()
        print(f"\n=== {nombre} ===")
        res = subprocess.run(cmd, cwd=str(BASE_DIR))
        if res.returncode != 0:
            raise SystemExit(f"[ERROR] Paso fallido ({nombre}), codigo={res.returncode}")

    print("\n[OK] Pipeline completo ejecutado sin errores.")


if __name__ == "__main__":
    main()
