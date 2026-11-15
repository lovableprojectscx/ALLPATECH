#!/usr/bin/env python3
"""
ETL hacia Supabase (Postgres) desde los JSON agregados en data/processed/.

Lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY desde .env o variables de entorno.
Usa --dry-run para validar los registros sin conectarse a la red.
"""

import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"

ESTADOS_VALIDOS = {"observado", "estimado", "ilustrativo", "no_disponible"}


def cargar_env() -> None:
    """Carga variables desde .env local si existe (sin sobreescribir os.environ)."""
    for env_path in [REPO_ROOT / ".env", BASE_DIR / ".env"]:
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def construir_lotes() -> List[Tuple[str, str, List[Dict[str, Any]]]]:
    """Construye (tabla, on_conflict, filas) desde data/processed/."""
    parcelas_json = json.loads((PROCESSED_DIR / "parcelas_demo.json").read_text(encoding="utf-8"))
    clima_json = json.loads((PROCESSED_DIR / "clima_mensual.json").read_text(encoding="utf-8"))
    imerg_json = json.loads((PROCESSED_DIR / "imerg_mensual.json").read_text(encoding="utf-8"))
    plan_json = json.loads((PROCESSED_DIR / "plan_rotacion_demo.json").read_text(encoding="utf-8"))
    normales_json = json.loads((PROCESSED_DIR / "normales_1991_2020_celdas.json").read_text(encoding="utf-8"))
    mercado_json = json.loads((PROCESSED_DIR / "mercado_resumen.json").read_text(encoding="utf-8"))
    ndvi_path = PROCESSED_DIR / "ndvi_parcelas.json"
    ndvi_json = json.loads(ndvi_path.read_text(encoding="utf-8")) if ndvi_path.exists() else {"parcelas": []}
    oportunidades_path = PROCESSED_DIR / "oportunidades.json"
    oportunidades_json = (
        json.loads(oportunidades_path.read_text(encoding="utf-8"))
        if oportunidades_path.exists()
        else {"filas_supabase": []}
    )

    # 1. celdas_power
    celdas_rows = []
    for ck, info in clima_json["celdas"].items():
        celdas_rows.append(
            {
                "cell_key": ck,
                "elev_celda_m": info["elev_celda_m"],
                "normal_1991_2020_json": normales_json.get(ck, {}),
                "estado": "observado",
                "dato_hasta": info["dato_hasta"],
            }
        )

    # 2. parcelas
    parcelas_rows = []
    for p in parcelas_json["parcelas"]:
        parcelas_rows.append(
            {
                "id": p["id"],
                "distrito": p["distrito"],
                "latitude": p["latitude"],
                "longitude": p["longitude"],
                "elev_dem_m": p["elev_dem_m"],
                "fuente_coord": p["fuente_coord"],
                "es_aproximada": bool(p["es_aproximada"]),
                "power_cell_id": p["power_cell_id"],
                "gradiente_c_km": p["gradiente_c_km"],
                "ajuste_termico_c": p["ajuste_termico_c"],
                "clima_campana_json": p["clima_campana_2025_2026"],
                "suelo_json": p["suelo"],
                "estado": "estimado",
                "dato_hasta": p["dato_hasta"],
            }
        )

    # 3. clima_mensual
    clima_rows = []
    for ck, info in clima_json["celdas"].items():
        for r in info["registros"]:
            clima_rows.append(
                {
                    "cell_key": ck,
                    "anio": r["anio"],
                    "mes": r["mes"],
                    "t2m_media_c": None if r["t2m_media_c"] == "no disponible" else r["t2m_media_c"],
                    "tmin_media_c": None if r["tmin_media_c"] == "no disponible" else r["tmin_media_c"],
                    "tmin_absoluta_c": None if r["tmin_absoluta_c"] == "no disponible" else r["tmin_absoluta_c"],
                    "lluvia_mm": None if r["lluvia_mm"] == "no disponible" else r["lluvia_mm"],
                    "humedad_suelo_raiz": None
                    if r.get("humedad_suelo_raiz") in (None, "no disponible")
                    else r["humedad_suelo_raiz"],
                    "nota_humedad": r.get("nota_humedad", "modelo MERRA-2, ~50 km, no es medicion en la chacra"),
                    "normal_1991_2020_t2m_c": None
                    if r["normal_1991_2020_t2m_c"] == "no disponible"
                    else r["normal_1991_2020_t2m_c"],
                    "anomalia_t2m_c": None if r["anomalia_t2m_c"] == "no disponible" else r["anomalia_t2m_c"],
                    "puesto_calor": None if r["puesto_calor"] == "no disponible" else r["puesto_calor"],
                    "total_anios_mes": r["total_anios_mes"],
                    "estado": r["estado"],
                    "dato_hasta": r["dato_hasta"],
                }
            )

    # 4. lluvia_imerg_mensual
    nota_imerg = imerg_json["_metadata"]["nota_escala"]
    imerg_rows = []
    for m in imerg_json["meses_jul_oct"]:
        imerg_rows.append(
            {
                "mes_num": m["mes_num"],
                "mes": m["mes"],
                "total_2026_mm": None if m["total_2026_mm"] == "no disponible" else m["total_2026_mm"],
                "media_2001_2025_mm": None if m["media_2001_2025_mm"] == "no disponible" else m["media_2001_2025_mm"],
                "mediana_2001_2025_mm": None
                if m["mediana_2001_2025_mm"] == "no disponible"
                else m["mediana_2001_2025_mm"],
                "anomalia_pct": None if m["anomalia_pct"] == "no disponible" else m["anomalia_pct"],
                "puesto_seco_2001_2026": None
                if m["puesto_seco_2001_2026"] == "no disponible"
                else m["puesto_seco_2001_2026"],
                "total_anios_serie": m["total_anios_serie"],
                "dias_ge_1mm_2026": None if m["dias_ge_1mm_2026"] == "no disponible" else m["dias_ge_1mm_2026"],
                "dias_ge_1mm_media_2001_2025": None
                if m["dias_ge_1mm_media_2001_2025"] == "no disponible"
                else m["dias_ge_1mm_media_2001_2025"],
                "nota_escala": nota_imerg,
                "estado": m["estado"],
                "dato_hasta": m["dato_hasta"],
            }
        )

    # 5. estrategias_bandas (sin puntajes _interno_0_100 en columnas visibles)
    estrategias_rows = []
    for comp in plan_json["comparador_abc_por_parcela"]:
        pid = comp["parcela_id"]
        for k, est in comp["estrategias"].items():
            bandas_limpias = {
                eje: {key: val for key, val in info.items() if key != "_interno_0_100"}
                for eje, info in est["radar_bandas"].items()
            }
            dato_hasta = est["radar_bandas"]["aptitud_termica_y_suelo"]["dato_hasta"]
            estrategias_rows.append(
                {
                    "parcela_id": pid,
                    "estrategia": k,
                    "nombre": est["nombre"],
                    "cultivo_id": est["cultivo_id"],
                    "color_hex": est["color_hex"],
                    "forma": est["forma"],
                    "radar_bandas_json": bandas_limpias,
                    "alertas_json": est["alertas"],
                    "estado": "ilustrativo",
                    "dato_hasta": dato_hasta,
                }
            )

    # 6. plan_rotacion
    plan_rows = []
    for item in plan_json["plan_rotacion_10_parcelas"]:
        plan_rows.append(
            {
                "parcela_id": item["parcela_id"],
                "distrito": item["distrito"],
                "elev_dem_m": item["elev_dem_m"],
                "cultivo_previo": item["cultivo_previo"],
                "estrategia_elegida": item["estrategia_elegida"],
                "cultivo_asignado": item["cultivo_asignado"],
                "rotacion_con_leguminosa": item["rotacion_con_leguminosa"],
                "chuno_tunta_json": item["chuno_tunta"],
                "estado": item["estado"],
                "dato_hasta": item["dato_hasta"],
            }
        )

    # 7. mercado_papa_mensual, enis, produccion_region
    mercado_rows = []
    for m in mercado_json["mercado_papa_mensual"]:
        mercado_rows.append(
            {
                "anio": m["anio"],
                "mes": m["mes"],
                "ingreso_t": m["ingreso_t"],
                "precio_soles_kg": m["precio_soles_kg"],
                "boletin_fuente": m["boletin_fuente"],
                "verificacion": m["verificacion"],
                "im_papa": None if m["im_papa"] == "no disponible" else m["im_papa"],
                "promedio_base_t": None if m["promedio_base_t"] == "no disponible" else m["promedio_base_t"],
                "anios_base": m["anios_base"],
                "etiqueta_riesgo": m["etiqueta_riesgo"],
                "nota": m["nota"],
                "fuente_id": m["fuente_id"],
                "estado": m["estado"],
                "dato_hasta": m["dato_hasta"],
            }
        )

    enis_rows = mercado_json["enis"]
    prod_rows = mercado_json["produccion_region"]

    # 8. ndvi_parcelas
    ndvi_rows = []
    for p in ndvi_json.get("parcelas", []):
        pid = p["parcela_id"]
        dato_hasta_p = p.get("dato_hasta", "no disponible")
        for r in p.get("registros", []):
            ndvi_rows.append(
                {
                    "parcela_id": pid,
                    "modis_date": r["modis_date"],
                    "calendar_date": r["calendar_date"],
                    "ndvi": None if r["ndvi"] == "no disponible" else r["ndvi"],
                    "pixel_reliability": r["pixel_reliability"],
                    "fuente_id": "modis_mod13q1",
                    "estado": r["estado"],
                    "dato_hasta": dato_hasta_p,
                }
            )

    # 9. fuentes completas (B1)
    modis_ok = len(ndvi_rows) > 0
    fuentes_rows = [
        {
            "id": "nasa_power",
            "nombre": "NASA POWER MERRA-2 (T2M, T2M_MIN, PRECTOTCORR, GWETROOT)",
            "escala": "0.5 x 0.625 grados (~50 km)",
            "url_o_referencia": "https://power.larc.nasa.gov/",
            "aporta": "Temperatura media/minima, lluvia diaria, dias de helada, normal 1991-2020 y humedad de raiz GWETROOT (1981-2026)",
            "estado": "observado",
            "dato_hasta": "2026-10-31",
        },
        {
            "id": "gpm_imerg",
            "nombre": "NASA GPM IMERG Late V07 (Giovanni)",
            "escala": "0.1 grados (promedio bbox -74.4,-13.3,-74.0,-12.8)",
            "url_o_referencia": "https://giovanni.gsfc.nasa.gov/",
            "aporta": "Lluvia satelital diaria/mensual jul-oct 2026 vs 2001-2025 y anomalia de precipitacion",
            "estado": "observado",
            "dato_hasta": "2026-10-31",
        },
        {
            "id": "soilgrids_v2",
            "nombre": "ISRIC SoilGrids v2.0 (0-5 cm)",
            "escala": "250 m",
            "url_o_referencia": "https://rest.isric.org/soilgrids/v2.0/",
            "aporta": "Arcilla, arena, carbono organico, pH y nitrogeno del suelo por parcela",
            "estado": "observado",
            "dato_hasta": "2026-10-31",
        },
        {
            "id": "copernicus_dem_90m",
            "nombre": "Copernicus DEM 90 m (Open-Meteo Elevation API)",
            "escala": "90 m",
            "url_o_referencia": "https://open-meteo.com/en/docs/elevation-api",
            "aporta": "Altitud de respaldo por parcela (elev_dem_m) para correccion termica y regla de chuno > 3500 m",
            "estado": "estimado",
            "dato_hasta": "2026-11-15",
        },
        {
            "id": "emmsa_siea",
            "nombre": "EMMSA / MIDAGRI-SIEA (Boletines de papa GMML)",
            "escala": "Gran Mercado Mayorista de Lima (GMML)",
            "url_o_referencia": "https://www.gob.pe/midagri",
            "aporta": "Ingreso mensual (t), precio mayorista papa blanca (S/ kg) e indice de sobreoferta I_m",
            "estado": "observado",
            "dato_hasta": "2026-11-13",
        },
        {
            "id": "enis_2025_2026",
            "nombre": "ENIS MIDAGRI 2025/2026 (Agraria.pe 22-08-2025)",
            "escala": "Nacional",
            "url_o_referencia": "https://agraria.pe/",
            "aporta": "Intencion de siembra de papa campana 2025/2026 (344,528 ha)",
            "estado": "observado",
            "dato_hasta": "2025-08-22",
        },
        {
            "id": "enis_2026_2027",
            "nombre": "ENIS MIDAGRI 2026/2027 (Agraria.pe 15-07-2026)",
            "escala": "Nacional y Ayacucho",
            "url_o_referencia": "https://agraria.pe/",
            "aporta": "Intencion de siembra 2026/2027 (+3.7% nacional, +19.3% area de papa en Ayacucho)",
            "estado": "estimado",
            "dato_hasta": "2026-07-15",
        },
        {
            "id": "ficha_ayacucho_2024",
            "nombre": "Ficha agricola Ayacucho 2024 (Agromercado MIDAGRI)",
            "escala": "Regional Ayacucho",
            "url_o_referencia": "https://www.gob.pe/agromercado",
            "aporta": "Produccion regional de papa (716,967 t) y quinua (33,576 t) en Ayacucho",
            "estado": "observado",
            "dato_hasta": "2024-12-31",
        },
        {
            "id": "tesis_tuna_2021",
            "nombre": "Tesis Marcaquispe Capiso (2021), UNSCH, INIA Canaan",
            "escala": "Parcela experimental Ayacucho",
            "url_o_referencia": "UNSCH Repositorio Institucional",
            "aporta": "Referencia de 2,751.31 °C·dia y 161 dias reproductivos de tuna (T_base pendiente)",
            "estado": "estimado",
            "dato_hasta": "2021-12-31",
        },
        {
            "id": "modis_mod13q1",
            "nombre": "MODIS MOD13Q1 v061 (ORNL DAAC REST API)",
            "escala": "250 m, cada 16 dias",
            "url_o_referencia": "https://modis.ornl.gov/rst/api/v1/MOD13Q1",
            "aporta": "Indice de vegetacion NDVI 2024-01 a 2026-10 por parcela filtrado por pixel_reliability",
            "estado": "observado" if modis_ok else "no_disponible",
            "dato_hasta": "2026-10-16" if modis_ok else "no disponible",
        },
        {
            "id": "appeears_nasadem",
            "nombre": "NASADEM 30 m (NASA AppEEARS)",
            "escala": "30 m",
            "url_o_referencia": "https://appeears.earthdatacloud.nasa.gov/",
            "aporta": "Elevacion por chacra 30 m (en cola; respaldo actual: Copernicus DEM 90 m)",
            "estado": "no_disponible",
            "dato_hasta": "no disponible",
        },
        {
            "id": "appeears_smap",
            "nombre": "SMAP L4 / SPL3SMP_E (NASA AppEEARS)",
            "escala": "9 km",
            "url_o_referencia": "https://appeears.earthdatacloud.nasa.gov/",
            "aporta": "Humedad de suelo satelital (en cola; respaldo actual: POWER GWETROOT)",
            "estado": "no_disponible",
            "dato_hasta": "no disponible",
        },
        {
            "id": "appeears_hls",
            "nombre": "HLS Sentinel-2/Landsat NDVI (NASA AppEEARS)",
            "escala": "30 m",
            "url_o_referencia": "https://appeears.earthdatacloud.nasa.gov/",
            "aporta": "NDVI de alta resolucion 30 m (en cola; respaldo actual: MODIS MOD13Q1 250 m)",
            "estado": "no_disponible",
            "dato_hasta": "no disponible",
        },
        {
            "id": "appeears_ecostress",
            "nombre": "ECOSTRESS ESI (NASA AppEEARS)",
            "escala": "70 m",
            "url_o_referencia": "https://appeears.earthdatacloud.nasa.gov/",
            "aporta": "Indice de estres evaporativo (en cola)",
            "estado": "no_disponible",
            "dato_hasta": "no disponible",
        },
    ]

    # 10. oportunidades (O1-O6 por parcela)
    oportunidades_rows = list(oportunidades_json.get("filas_supabase", []))

    lotes = [
        ("celdas_power", "cell_key", celdas_rows),
        ("parcelas", "id", parcelas_rows),
        ("clima_mensual", "cell_key,anio,mes", clima_rows),
        ("lluvia_imerg_mensual", "mes_num", imerg_rows),
        ("estrategias_bandas", "parcela_id,estrategia", estrategias_rows),
        ("plan_rotacion", "parcela_id", plan_rows),
        ("mercado_papa_mensual", "anio,mes", mercado_rows),
        ("enis", "id", enis_rows),
        ("produccion_region", "id", prod_rows),
        ("ndvi_parcelas", "parcela_id,modis_date", ndvi_rows),
        ("fuentes", "id", fuentes_rows),
        ("oportunidades", "parcela_id,codigo", oportunidades_rows),
    ]

    for tabla, _, filas in lotes:
        for f in filas:
            assert f.get("estado") in ESTADOS_VALIDOS, f"Estado invalido en {tabla}: {f.get('estado')}"
            assert f.get("dato_hasta"), f"Falta dato_hasta en {tabla}"

    return lotes


def upsert_lote(url: str, key: str, tabla: str, on_conflict: str, filas: List[Dict[str, Any]]) -> None:
    endpoint = f"{url.rstrip('/')}/rest/v1/{tabla}?on_conflict={on_conflict}"
    chunk_size = 500
    for i in range(0, len(filas), chunk_size):
        chunk = filas[i : i + chunk_size]
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(chunk, ensure_ascii=False).encode("utf-8"),
            method="POST",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status not in (200, 201, 204):
                raise RuntimeError(f"Error HTTP {resp.status} en {tabla}")


def main() -> None:
    parser = argparse.ArgumentParser(description="ETL de data/processed/ hacia Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Valida contratos sin escribir en Supabase")
    args = parser.parse_args()

    cargar_env()
    lotes = construir_lotes()

    for tabla, on_conflict, filas in lotes:
        print(f"  [{tabla}] {len(filas)} filas validadas (conflict={on_conflict})")

    if args.dry_run:
        print("[OK] --dry-run completado: todas las tablas y estados son validos.")
        return

    supa_url = os.environ.get("SUPABASE_URL", "").strip()
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not supa_url or not service_key:
        raise SystemExit(
            "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env o entorno. "
            "Usa --dry-run si aun no creaste el proyecto."
        )

    for tabla, on_conflict, filas in lotes:
        upsert_lote(supa_url, service_key, tabla, on_conflict, filas)
        print(f"[OK] Upsert {tabla}: {len(filas)} filas")


if __name__ == "__main__":
    main()
