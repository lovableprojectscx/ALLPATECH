"""
MUYU - Script unificado de ingesta y preprocesamiento NASA POWER + cache de parcelas.

Responsabilidades:
1. Descarga series diarias NASA POWER (1981-2026, community=AG) UNA VEZ por celda
   unica (0.5 deg x 0.625 deg) y guarda el JSON crudo en data/raw/.
2. Calcula la normal climatologica 1991-2020 por dia del anio y por mes.
3. Calcula anomalias mensuales de temperatura 2026 vs 1991-2020 y puesto en la
   serie completa 1981-2026 (sin convertir a semanas mientras no exista T_base/GDD
   verificado de tuna en cultivos_demo_base.json).
4. Aplica correccion termica por desnivel (elev_dem_m - elev_celda_power) con
   gradiente andino parametrizable (-3.78 a -4.93 C/km), registra el valor usado
   y calcula dias de helada (umbral parametrizable, pendiente validar con SENAMHI),
   racha seca mas larga (< 1 mm) y dias con lluvia >= 1 mm.
5. Genera data/processed/prueba1_tuna_huanta.json y, opcionalmente, cachea
   SoilGrids + elevacion en data/processed/parcelas_demo.json con fallback.

Uso:
    python engine/fetch_power.py --csv data/parcelas_demo_v1.csv --cache-suelo
"""

import argparse
import csv
import json
import os
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, timedelta

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
PARAMS = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,WS2M,GWETROOT"
FALTANTE = -999.0

GRADIENTE_MIN = -4.93
GRADIENTE_MAX = -3.78
GRADIENTE_DEFAULT = -4.35  # punto medio documentado en Andes (Navarro-Serrano et al., 2020)

# Fallback edafico referencial por piso altitudinal cuando SoilGrids hace timeout o devuelve null
FALLBACK_SUELO_PISO = {
    "valle_bajo_lt_2900": {
        "clay_g_kg": 265,
        "sand_g_kg": 380,
        "soc_dg_kg": 140,
        "ph": 6.8,
        "textura_clase": "franco_arcilloso",
        "nota": "Fallback referencial piso valle (<2900 m) por indisponibilidad de SoilGrids; validar con textura en campo.",
    },
    "intermedio_2900_3500": {
        "clay_g_kg": 270,
        "sand_g_kg": 350,
        "soc_dg_kg": 210,
        "ph": 6.4,
        "textura_clase": "franco_arcilloso",
        "nota": "Fallback referencial piso intermedio (2900-3500 m) por indisponibilidad de SoilGrids; validar con textura en campo.",
    },
    "altoandino_gt_3500": {
        "clay_g_kg": 240,
        "sand_g_kg": 390,
        "soc_dg_kg": 280,
        "ph": 5.8,
        "textura_clase": "franco",
        "nota": "Fallback referencial piso altoandino (>3500 m) por indisponibilidad de SoilGrids; validar con textura en campo.",
    },
}


def cell_key(lat: float, lon: float) -> str:
    """Identificador deterministico de celda POWER (centros en multiplos de 0.5 y 0.625)."""
    lat_idx = round(lat / 0.5)
    lon_idx = round(lon / 0.625)
    return f"c{lat_idx}_{lon_idx}"


def descargar_power(lat: float, lon: float, inicio: str, fin: str) -> dict:
    query = urllib.parse.urlencode({
        "parameters": PARAMS,
        "community": "AG",
        "latitude": lat,
        "longitude": lon,
        "start": inicio,
        "end": fin,
        "format": "JSON",
    })
    with urllib.request.urlopen(f"{POWER_URL}?{query}", timeout=120) as resp:
        return json.load(resp)


def obtener_power_celda(lat: float, lon: float, inicio: str, fin: str, raw_dir: str, force: bool = False) -> tuple[str, dict]:
    """Descarga una sola vez por celda POWER unica o reutiliza el JSON crudo en data/raw/."""
    cid = cell_key(lat, lon)
    os.makedirs(raw_dir, exist_ok=True)
    ruta = os.path.join(raw_dir, f"power_{cid}_{inicio}_{fin}.json")
    if os.path.exists(ruta) and not force:
        with open(ruta, encoding="utf-8") as f:
            return cid, json.load(f)
    data = descargar_power(lat, lon, inicio, fin)
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return cid, data


def consultar_soilgrids(lat: float, lon: float) -> dict | None:
    """Consulta SoilGrids v2.0 (0-5cm) con timeout 60s y 3 reintentos (5/15/30s)."""
    query = urllib.parse.urlencode([
        ("lon", lon),
        ("lat", lat),
        ("property", "clay"),
        ("property", "sand"),
        ("property", "soc"),
        ("property", "phh2o"),
        ("property", "nitrogen"),
        ("depth", "0-5cm"),
        ("value", "mean"),
    ])
    esperas = [5, 15, 30]
    ultimo_error = ""
    for intento in range(len(esperas) + 1):
        try:
            with urllib.request.urlopen(f"{SOILGRIDS_URL}?{query}", timeout=60) as resp:
                sj = json.load(resp)
            layers = sj.get("properties", {}).get("layers", [])
            out = {}
            for lyr in layers:
                val = lyr["depths"][0]["values"].get("mean")
                out[lyr["name"]] = val
            if not out or all(v is None for v in out.values()):
                return None
            clay = out.get("clay")
            sand = out.get("sand")
            phh2o = out.get("phh2o")
            textura = "franco"
            if clay is not None and clay >= 350:
                textura = "arcilloso"
            elif sand is not None and sand >= 550:
                textura = "arenoso"
            elif clay is not None and clay >= 250:
                textura = "franco_arcilloso"
            return {
                "clay_g_kg": clay,
                "sand_g_kg": sand,
                "soc_dg_kg": out.get("soc"),
                "ph": round(phh2o / 10.0, 2) if phh2o is not None else None,
                "nitrogen_cg_kg": out.get("nitrogen"),
                "textura_clase": textura,
                "estado": "observado",
                "fuente": "ISRIC SoilGrids v2.0 (0-5cm, mean)",
                "fallback_aplicado": False,
            }
        except Exception as exc:
            ultimo_error = str(exc)
            if intento < len(esperas):
                print(f"  [SoilGrids] reintento {intento + 1}/3 en {esperas[intento]}s ({ultimo_error})...")
                time.sleep(esperas[intento])
    return {"_error": ultimo_error}


def resolver_suelo(lat: float, lon: float, elev_m: float, usar_red: bool = True) -> dict:
    if usar_red:
        sg = consultar_soilgrids(lat, lon)
        if sg and "_error" not in sg:
            return sg
        motivo = sg["_error"] if sg else "SoilGrids devolvio valores null (zona urbana o sin cobertura)"
    else:
        motivo = "Consulta en red omitida; uso de fallback por piso altitudinal"

    if elev_m < 2900:
        piso = "valle_bajo_lt_2900"
    elif elev_m <= 3500:
        piso = "intermedio_2900_3500"
    else:
        piso = "altoandino_gt_3500"

    fb = dict(FALLBACK_SUELO_PISO[piso])
    fb.update({
        "nitrogen_cg_kg": None,
        "estado": "ilustrativo",
        "fuente": "valor referencial por piso altitudinal, sin medición",
        "piso_referencia": piso,
        "fallback_aplicado": True,
        "motivo_fallback": motivo,
    })
    return fb


def calcular_normal_doy(power_json: dict, anio_ini: int = 1991, anio_fin: int = 2020) -> dict[int, dict]:
    """Normal climatologica 1991-2020 por dia del anio (1..366)."""
    par = power_json["properties"]["parameter"]
    t2m = par["T2M"]
    tmax = par["T2M_MAX"]
    tmin = par["T2M_MIN"]
    prec = par["PRECTOTCORR"]

    buckets = defaultdict(lambda: {"t2m": [], "tmax": [], "tmin": [], "prec": []})
    for k, v in t2m.items():
        y = int(k[:4])
        if not (anio_ini <= y <= anio_fin):
            continue
        d = date(y, int(k[4:6]), int(k[6:8]))
        doy = d.timetuple().tm_yday
        if v != FALTANTE:
            buckets[doy]["t2m"].append(v)
        if tmax.get(k, FALTANTE) != FALTANTE:
            buckets[doy]["tmax"].append(tmax[k])
        if tmin.get(k, FALTANTE) != FALTANTE:
            buckets[doy]["tmin"].append(tmin[k])
        if prec.get(k, FALTANTE) != FALTANTE:
            buckets[doy]["prec"].append(prec[k])

    normal = {}
    for doy, vals in sorted(buckets.items()):
        normal[doy] = {
            "t2m": round(sum(vals["t2m"]) / len(vals["t2m"]), 3) if vals["t2m"] else None,
            "tmax": round(sum(vals["tmax"]) / len(vals["tmax"]), 3) if vals["tmax"] else None,
            "tmin": round(sum(vals["tmin"]) / len(vals["tmin"]), 3) if vals["tmin"] else None,
            "prec_media_diaria": round(sum(vals["prec"]) / len(vals["prec"]), 3) if vals["prec"] else None,
        }
    return normal


def metricas_mensuales_1981_2026(power_json: dict) -> dict:
    """Agrupa promedios mensuales 1981-2026 para anomalias vs 1991-2020 y ranking."""
    par = power_json["properties"]["parameter"]
    t2m = par["T2M"]
    tmax = par["T2M_MAX"]
    tmin = par["T2M_MIN"]
    prec = par["PRECTOTCORR"]

    por_mes_anio = defaultdict(lambda: {"t2m": [], "tmax": [], "tmin": [], "prec": []})
    for k in sorted(t2m):
        y, m = int(k[:4]), int(k[4:6])
        if t2m[k] != FALTANTE:
            por_mes_anio[(y, m)]["t2m"].append(t2m[k])
        if tmax.get(k, FALTANTE) != FALTANTE:
            por_mes_anio[(y, m)]["tmax"].append(tmax[k])
        if tmin.get(k, FALTANTE) != FALTANTE:
            por_mes_anio[(y, m)]["tmin"].append(tmin[k])
        if prec.get(k, FALTANTE) != FALTANTE:
            por_mes_anio[(y, m)]["prec"].append(prec[k])

    return por_mes_anio


def generar_prueba1_tuna_huanta(power_json: dict, elev_dem_m: float, gradiente_c_km: float) -> dict:
    """Prueba 1: jul-oct 2026 en Huanta vs normal 1991-2020 y puesto en 1981-2026."""
    elev_celda = float(power_json["geometry"]["coordinates"][2])
    ajuste_c = round(((elev_dem_m - elev_celda) / 1000.0) * gradiente_c_km, 2)
    por_mes = metricas_mensuales_1981_2026(power_json)

    meses_nombres = {7: "julio", 8: "agosto", 9: "septiembre", 10: "octubre"}
    resultados_mes = []
    dato_hasta = max(k for k, v in power_json["properties"]["parameter"]["T2M"].items() if v != FALTANTE)
    dato_hasta_iso = f"{dato_hasta[:4]}-{dato_hasta[4:6]}-{dato_hasta[6:8]}"

    for m in [7, 8, 9, 10]:
        serie_t2m = {}
        for y in range(1981, 2027):
            vals = por_mes[(y, m)]["t2m"]
            if vals:
                serie_t2m[y] = sum(vals) / len(vals)

        norm_vals = [serie_t2m[y] for y in range(1991, 2021) if y in serie_t2m]
        normal_91_20 = sum(norm_vals) / len(norm_vals)
        val_2026 = serie_t2m.get(2026)

        ordenado = sorted(serie_t2m.items(), key=lambda x: x[1], reverse=True)
        puesto_2026 = next((i + 1 for i, (yr, _) in enumerate(ordenado) if yr == 2026), None)

        resultados_mes.append({
            "mes_num": m,
            "mes": meses_nombres[m],
            "t2m_celda_2026_c": round(val_2026, 2) if val_2026 is not None else "no disponible",
            "t2m_ajustada_parcela_2026_c": round(val_2026 + ajuste_c, 2) if val_2026 is not None else "no disponible",
            "normal_1991_2020_celda_c": round(normal_91_20, 2),
            "anomalia_c": round(val_2026 - normal_91_20, 2) if val_2026 is not None else "no disponible",
            "puesto_1981_2026": puesto_2026,
            "total_anios_serie": len(serie_t2m),
            "estado_celda": "observado" if val_2026 is not None else "no_disponible",
            "estado_ajustada": "estimado" if val_2026 is not None else "no_disponible",
        })

    # Acumulado jul-sep y jul-oct 2026 vs normal 1991-2020
    periodos = {}
    for nombre, ms in [("jul_sep", [7, 8, 9]), ("jul_oct", [7, 8, 9, 10])]:
        serie_p = {}
        for y in range(1981, 2027):
            vals = [v for m in ms for v in por_mes[(y, m)]["t2m"]]
            if vals:
                serie_p[y] = sum(vals) / len(vals)
        norm_p = sum(serie_p[y] for y in range(1991, 2021) if y in serie_p) / 30.0
        ordenado = sorted(serie_p.items(), key=lambda x: x[1], reverse=True)
        puesto = next((i + 1 for i, (yr, _) in enumerate(ordenado) if yr == 2026), None)
        periodos[nombre] = {
            "t2m_celda_2026_c": round(serie_p[2026], 2),
            "normal_1991_2020_celda_c": round(norm_p, 2),
            "anomalia_c": round(serie_p[2026] - norm_p, 2),
            "puesto_1981_2026": puesto,
            "total_anios_serie": len(serie_p),
            "estado": "observado",
        }

    # GDD de tuna (T_base = 0 °C, metodo residual (Tmax+Tmin)/2 - T_base) jul 1 - oct 31 en P01 ajustada
    par = power_json["properties"]["parameter"]
    tmax_s = par["T2M_MAX"]
    tmin_s = par["T2M_MIN"]
    t_base_c = 0.0
    gdd_por_anio = {}
    gdd_oct_nov_norm = []

    for k in sorted(tmax_s):
        tx = tmax_s[k]
        tn = tmin_s.get(k, FALTANTE)
        if tx == FALTANTE or tn == FALTANTE:
            continue
        y, m, d_num = int(k[:4]), int(k[4:6]), int(k[6:8])
        gdd_dia = max(0.0, ((tx + ajuste_c) + (tn + ajuste_c)) / 2.0 - t_base_c)
        if 7 <= m <= 10:
            gdd_por_anio[y] = gdd_por_anio.get(y, 0.0) + gdd_dia
        if 1991 <= y <= 2020 and ((m == 10 and d_num >= 16) or (m == 11 and d_num <= 15)):
            gdd_oct_nov_norm.append(gdd_dia)

    gdd_2026 = gdd_por_anio.get(2026, 0.0)
    gdd_norm_vals = [gdd_por_anio[y] for y in range(1991, 2021) if y in gdd_por_anio]
    gdd_normal = sum(gdd_norm_vals) / len(gdd_norm_vals)
    diff_gd = gdd_2026 - gdd_normal
    orden_gdd = sorted(gdd_por_anio.items(), key=lambda x: x[1], reverse=True)
    puesto_gdd = next((i + 1 for i, (yr, _) in enumerate(orden_gdd) if yr == 2026), None)
    gd_diario_oct_nov = sum(gdd_oct_nov_norm) / len(gdd_oct_nov_norm) if gdd_oct_nov_norm else 15.0
    adelanto_dias = round(diff_gd / gd_diario_oct_nov, 1)

    return {
        "_metadata": {
            "prueba": "Prueba 1 - Adelanto termico de la tuna en Huanta (2026)",
            "parcela_referencia": "P01 (huanta)",
            "normal_climatologica": "1991-2020",
            "serie_ranking": "1981-2026 (46 anios)",
            "elev_dem_m": elev_dem_m,
            "elev_celda_power_m": elev_celda,
            "gradiente_usado_c_km": gradiente_c_km,
            "ajuste_termico_parcela_c": ajuste_c,
            "escala_dato_power": "regional_50km",
            "dato_hasta": dato_hasta_iso,
            "t_base_c": t_base_c,
            "fuente_tuna": "Tesis Marcaquispe Capiso (2021), UNSCH, sec. 3.3.5 (citando a Hernandez 2009); 2,751.31 GD, 161 dias",
            "nota_supuesto": "Supone que el brotamiento empezo el 1 de julio; la fecha real de 2026 no se conoce.",
        },
        "gdd_tuna_jul1_oct31": {
            "t_base_c": t_base_c,
            "gdd_2026": round(gdd_2026, 1),
            "gdd_normal_1991_2020": round(gdd_normal, 1),
            "diferencia_gd": round(diff_gd, 1),
            "puesto_1981_2026": puesto_gdd,
            "total_anios_serie": len(gdd_por_anio),
            "gd_diario_normal_oct_nov": round(gd_diario_oct_nov, 2),
            "adelanto_dias": adelanto_dias,
            "estado": "estimado",
            "nota": "Supone que el brotamiento empezo el 1 de julio; la fecha real de 2026 no se conoce.",
        },
        "mensual_2026": resultados_mes,
        "periodos_acumulados_2026": periodos,
    }


def resumen_climatico_parcela(power_json: dict, elev_dem_m: float, gradiente_c_km: float, umbral_helada_c: float, anio_inicio: int = 2025, fecha_ini: str = "20250701", fecha_fin: str = "20260630") -> dict:
    """Calcula heladas (con ajuste de altitud), racha seca mas larga y dias lluvia >= 1 mm."""
    elev_celda = float(power_json["geometry"]["coordinates"][2])
    ajuste_c = ((elev_dem_m - elev_celda) / 1000.0) * gradiente_c_km

    par = power_json["properties"]["parameter"]
    tmin_s = par["T2M_MIN"]
    t2m_s = par["T2M"]
    prec_s = par["PRECTOTCORR"]

    dias_helada = 0
    dias_lluvia_1mm = 0
    racha_actual = 0
    racha_max = 0
    t2m_vals = []
    tmin_min_adj = None
    faltantes_temp = 0
    faltantes_prec = 0

    for k in sorted(t2m_s):
        if not (fecha_ini <= k <= fecha_fin):
            continue
        t2 = t2m_s[k]
        tn = tmin_s.get(k, FALTANTE)
        pr = prec_s.get(k, FALTANTE)

        if t2 != FALTANTE:
            t2m_vals.append(t2 + ajuste_c)
        if tn != FALTANTE:
            tn_adj = tn + ajuste_c
            if tmin_min_adj is None or tn_adj < tmin_min_adj:
                tmin_min_adj = tn_adj
            if tn_adj <= umbral_helada_c:
                dias_helada += 1
        else:
            faltantes_temp += 1

        if pr != FALTANTE:
            if pr >= 1.0:
                dias_lluvia_1mm += 1
                racha_actual = 0
            else:
                racha_actual += 1
                if racha_actual > racha_max:
                    racha_max = racha_actual
        else:
            faltantes_prec += 1

    return {
        "ventana_campana": f"{fecha_ini[:4]}-{fecha_ini[4:6]}-{fecha_ini[6:]} a {fecha_fin[:4]}-{fecha_fin[4:6]}-{fecha_fin[6:]}",
        "t2m_media_ajustada_c": round(sum(t2m_vals) / len(t2m_vals), 2) if t2m_vals else "no disponible",
        "tmin_absoluta_ajustada_c": round(tmin_min_adj, 2) if tmin_min_adj is not None else "no disponible",
        "dias_helada": dias_helada,
        "umbral_helada_c": umbral_helada_c,
        "nota_umbral_helada": "Parametro configurable; pendiente de validar con SENAMHI por cultivo",
        "racha_seca_max_dias": racha_max,
        "dias_lluvia_ge_1mm": dias_lluvia_1mm,
        "dias_faltantes_temp": faltantes_temp,
        "dias_faltantes_prec": faltantes_prec,
        "estado_ajuste_termico": "estimado",
        "estado_lluvia_celda": "observado",
    }


def main():
    ap = argparse.ArgumentParser(description="MUYU - Descarga NASA POWER 1981-2026 por celda unica y cache de parcelas.")
    ap.add_argument("--csv", default="data/parcelas_demo_v1.csv", help="CSV de parcelas con elev_dem_m")
    ap.add_argument("--inicio", default="19810101")
    ap.add_argument("--fin", default="20261031")
    ap.add_argument("--gradiente", type=float, default=GRADIENTE_DEFAULT, help="Gradiente termico andino C/km (-4.93 a -3.78)")
    ap.add_argument("--umbral-helada", type=float, default=0.0, help="Umbral C para dias de helada (pendiente validar con SENAMHI)")
    ap.add_argument("--cache-suelo", action="store_true", help="Consultar SoilGrids con fallback y guardar data/processed/parcelas_demo.json")
    ap.add_argument("--solo-prueba1", action="store_true", help="Solo descargar celda de P01 Huanta y generar prueba1_tuna_huanta.json")
    ap.add_argument("--forzar", action="store_true", help="Forzar re-descarga aunque exista en data/raw/")
    args = ap.parse_args()

    if not (GRADIENTE_MIN <= args.gradiente <= GRADIENTE_MAX):
        raise SystemExit(f"Gradiente fuera de rango andino documentado ({GRADIENTE_MIN} a {GRADIENTE_MAX} C/km): {args.gradiente}")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = args.csv if os.path.isabs(args.csv) else os.path.join(base_dir, args.csv)
    raw_dir = os.path.join(base_dir, "data", "raw")
    proc_dir = os.path.join(base_dir, "data", "processed")
    os.makedirs(proc_dir, exist_ok=True)

    with open(csv_path, encoding="utf-8") as f:
        parcelas = list(csv.DictReader(f))

    if args.solo_prueba1:
        parcelas_proc = [parcelas[0]]
    else:
        parcelas_proc = parcelas

    # 1. Descarga una vez por celda POWER unica
    celdas_cache = {}
    for p in parcelas_proc:
        lat, lon = float(p["Latitude"]), float(p["Longitude"])
        cid = cell_key(lat, lon)
        if cid not in celdas_cache:
            print(f"[POWER] Obteniendo celda {cid} para {p['ID']} ({p['Category']})...")
            _, pjson = obtener_power_celda(lat, lon, args.inicio, args.fin, raw_dir, force=args.forzar)
            celdas_cache[cid] = pjson

    print(f"[POWER] Celdas unicas descargadas/cacheadas: {len(celdas_cache)} para {len(parcelas_proc)} parcelas.")

    # Verificacion automatica: avisar si dos celdas distintas devuelven T2M identico
    cids = sorted(celdas_cache)
    for i in range(len(cids)):
        for j in range(i + 1, len(cids)):
            t1 = celdas_cache[cids[i]]["properties"]["parameter"]["T2M"]
            t2 = celdas_cache[cids[j]]["properties"]["parameter"]["T2M"]
            if t1 == t2:
                print(f"[ALERTA] Celdas distintas {cids[i]} y {cids[j]} devuelven T2M identico!")

    # 2. Prueba 1 (Huanta, P01)
    p01 = parcelas[0]
    cid_p01 = cell_key(float(p01["Latitude"]), float(p01["Longitude"]))
    prueba1 = generar_prueba1_tuna_huanta(celdas_cache[cid_p01], float(p01["elev_dem_m"]), args.gradiente)
    ruta_p1 = os.path.join(proc_dir, "prueba1_tuna_huanta.json")
    with open(ruta_p1, "w", encoding="utf-8") as f:
        json.dump(prueba1, f, indent=2, ensure_ascii=False)
    print(f"[OK] Generado {ruta_p1}")

    if args.solo_prueba1:
        return

    # 3. Cache completo de las 10 parcelas (POWER ajustado + normal 1991-2020 + SoilGrids con fallback)
    normales_celda = {cid: calcular_normal_doy(pj) for cid, pj in celdas_cache.items()}
    ruta_norm = os.path.join(proc_dir, "normales_1991_2020_celdas.json")
    with open(ruta_norm, "w", encoding="utf-8") as f:
        json.dump(normales_celda, f, indent=2, ensure_ascii=False)

    ruta_parcelas = os.path.join(proc_dir, "parcelas_demo.json")
    suelo_previo = {}
    if os.path.exists(ruta_parcelas):
        with open(ruta_parcelas, encoding="utf-8") as f:
            for prev in json.load(f).get("parcelas", []):
                if prev.get("suelo", {}).get("estado") == "observado":
                    suelo_previo[prev["id"]] = prev["suelo"]

    parcelas_out = []
    for p in parcelas_proc:
        lat, lon = float(p["Latitude"]), float(p["Longitude"])
        elev_dem = float(p["elev_dem_m"])
        cid = cell_key(lat, lon)
        pj = celdas_cache[cid]
        elev_cell = float(pj["geometry"]["coordinates"][2])
        ajuste_c = round(((elev_dem - elev_cell) / 1000.0) * args.gradiente, 2)

        clima_campana = resumen_climatico_parcela(pj, elev_dem, args.gradiente, args.umbral_helada)
        if p["ID"] in suelo_previo and not args.forzar:
            suelo = suelo_previo[p["ID"]]
        else:
            print(f"[SoilGrids] Consultando {p['ID']} ({p['Category']})...")
            suelo = resolver_suelo(lat, lon, elev_dem, usar_red=args.cache_suelo)

        parcelas_out.append({
            "id": p["ID"],
            "distrito": p["Category"],
            "latitude": lat,
            "longitude": lon,
            "elev_dem_m": elev_dem,
            "fuente_coord": p["fuente_coord"],
            "es_aproximada": p["es_aproximada"].lower() == "true",
            "estado_elevacion": "estimado" if p["es_aproximada"].lower() == "true" else "observado",
            "power_cell_id": cid,
            "power_cell_elev_m": elev_cell,
            "gradiente_c_km": args.gradiente,
            "ajuste_termico_c": ajuste_c,
            "clima_campana_2025_2026": clima_campana,
            "suelo": suelo,
            "dato_hasta": "2026-10-31",
        })

    with open(ruta_parcelas, "w", encoding="utf-8") as f:
        json.dump({
            "_metadata": {
                "fuente_parcelas": os.path.basename(csv_path),
                "normal_climatologica": "1991-2020",
                "gradiente_usado_c_km": args.gradiente,
                "umbral_helada_c": args.umbral_helada,
                "nota_umbral_helada": "Pendiente de validar con SENAMHI",
                "celdas_power_unicas": len(celdas_cache),
            },
            "parcelas": parcelas_out,
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Generado {ruta_parcelas} ({len(parcelas_out)} parcelas)")


if __name__ == "__main__":
    main()
