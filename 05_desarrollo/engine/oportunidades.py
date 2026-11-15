#!/usr/bin/env python3
"""
Motor de Oportunidades de Kultiva (O1-O6), Calendario de mi chacra y Semaforo regional.

Calcula a partir de datos reales (NASA GPM IMERG, NASA POWER, DEM, EMMSA, ENIS):
- O1: Inicio real de las lluvias (IMERG 2001-2026)
- O2: Ventana segura contra la helada (POWER T2M_MIN ajustada por altura, 1991-2020)
- O3: Fecha estimada de cosecha de tuna (GD T_base=0 C, meta 2,751.31 GD, 2400-3000 m)
- O4: Calendario de precios de la papa en Lima (EMMSA 2022-2026, excluye mes en curso)
- O5: Transformar en vez de malvender: chuno y tunta (>3500 m + >=5 heladas + sobreoferta)
- O6: Siembra lo que pocos siembran (ENIS Ayacucho +19.3% papa, chacras con leguminosa)

Cumple .agent/rules/muyu.md y .agent/skills/kultiva-oportunidades/SKILL.md.
"""

import csv
import json
import statistics
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fetch_power import cell_key
from procesar_imerg import leer_csv_giovanni

ENGINE_DIR = Path(__file__).resolve().parent
BASE_DIR = ENGINE_DIR.parent
RAW_DIR = BASE_DIR / "data" / "raw"
RAW_IMERG_DIR = RAW_DIR / "imerg"
MERCADO_DIR = BASE_DIR / "data" / "mercado"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
OUT_PATH = PROCESSED_DIR / "oportunidades.json"

TARGET_GD_TUNA = 2751.31
FALTANTE = -999.0

MESES_CAMPANA = [
    (8, "Ago", "agosto"),
    (9, "Sep", "septiembre"),
    (10, "Oct", "octubre"),
    (11, "Nov", "noviembre"),
    (12, "Dic", "diciembre"),
    (1, "Ene", "enero"),
    (2, "Feb", "febrero"),
    (3, "Mar", "marzo"),
    (4, "Abr", "abril"),
    (5, "May", "mayo"),
    (6, "Jun", "junio"),
    (7, "Jul", "julio"),
]

NOMBRES_MES = {m: largo for m, _, largo in MESES_CAMPANA}


def _percentil(valores: List[float], q: float) -> Optional[float]:
    """Calcula percentil lineal (q en [0, 1]) sin dependencias externas."""
    if not valores:
        return None
    s = sorted(valores)
    k = (len(s) - 1) * q
    f = int(k)
    c = min(f + 1, len(s) - 1)
    return s[f] + (k - f) * (s[c] - s[f])


def _formato_dia_mes(d: date) -> str:
    return f"{d.day} de {NOMBRES_MES[d.month]}"


def _cargar_power_por_celda() -> Dict[str, Dict[str, Any]]:
    """Carga los JSON crudos de NASA POWER en data/raw/ indexados por cell_key."""
    celdas: Dict[str, Dict[str, Any]] = {}
    for ruta in sorted(RAW_DIR.glob("power_*.json")):
        partes = ruta.stem.split("_")
        if len(partes) >= 3:
            ck = f"{partes[1]}_{partes[2]}"
            celdas[ck] = json.loads(ruta.read_text(encoding="utf-8"))
    return celdas


def calcular_o1_inicio_lluvias() -> Dict[str, Any]:
    """
    O1: Primer dia desde el 1 de septiembre en que 3 dias seguidos suman >= 20 mm
    y en los 30 dias siguientes no hay racha seca de 10 dias (< 1 mm).
    """
    reg_hist = leer_csv_giovanni(RAW_IMERG_DIR / "imerg_serie_2001-2025.csv")
    reg_2026 = leer_csv_giovanni(RAW_IMERG_DIR / "imerg_serie_jul-oct2026.csv")

    lluvia_por_fecha: Dict[date, float] = {}
    for f_str, val in reg_hist + reg_2026:
        if val is not None:
            lluvia_por_fecha[date.fromisoformat(f_str)] = val

    def detectar_inicio(anio: int) -> Optional[date]:
        d = date(anio, 9, 1)
        fin = date(anio, 12, 31)
        while d <= fin:
            ventana3 = [lluvia_por_fecha.get(d + timedelta(days=i)) for i in range(3)]
            if all(v is not None for v in ventana3) and sum(v for v in ventana3 if v is not None) >= 20.0:
                siguientes = [lluvia_por_fecha.get(d + timedelta(days=j)) for j in range(1, 31)]
                disponibles = [v for v in siguientes if v is not None]
                if len(disponibles) >= 10:
                    racha = 0
                    max_racha = 0
                    for v in disponibles:
                        if v < 1.0:
                            racha += 1
                            if racha > max_racha:
                                max_racha = racha
                        else:
                            racha = 0
                    if max_racha < 10:
                        return d
            d += timedelta(days=1)
        return None

    inicios_hist: List[Tuple[int, date, int]] = []
    for y in range(2001, 2026):
        ini = detectar_inicio(y)
        if ini is not None:
            dias = (ini - date(y, 9, 1)).days
            inicios_hist.append((y, ini, dias))

    dias_lista = [x[2] for x in inicios_hist]
    mediana_dias = round(statistics.median(dias_lista), 1)
    fecha_mediana_ref = date(2026, 9, 1) + timedelta(days=round(mediana_dias))
    min_item = min(inicios_hist, key=lambda x: x[2])
    max_item = max(inicios_hist, key=lambda x: x[2])

    fechas_2026 = [date.fromisoformat(f) for f, v in reg_2026 if v is not None]
    dato_hasta_2026 = max(fechas_2026).isoformat() if fechas_2026 else "no disponible"
    inicio_2026 = detectar_inicio(2026)

    if inicio_2026 is None:
        estado_2026 = "no_establecidas"
        texto_2026 = "todavía no se establecen al 31 de octubre"
        accion = (
            "Este año las lluvias aún no se asientan (normalmente empiezan a fines de octubre). "
            "Siembra cuando se establezcan, no por la fecha de siempre."
        )
    else:
        estado_2026 = "establecidas"
        texto_2026 = f"se establecieron el {_formato_dia_mes(inicio_2026)}"
        accion = (
            f"Las lluvias ya se asentaron desde el {_formato_dia_mes(inicio_2026)}: "
            "aprovecha la humedad para sembrar según el plan de tu chacra."
        )

    return {
        "codigo": "O1",
        "titulo": "Cuándo sembrar: inicio real de las lluvias",
        "accion_positiva": accion,
        "por_que_corto": f"En {len(inicios_hist)} años de registro (2001–2025) las lluvias se asentaron hacia fines de octubre; en 2026 {texto_2026}.",
        "accion_ficha": (
            "Espera a que se asienten las lluvias antes de sembrar (normalmente a fines de octubre)."
            if inicio_2026 is None
            else f"Lluvias asentadas desde el {_formato_dia_mes(inicio_2026)}: momento apto para sembrar."
        ),
        "mediana_dias_desde_sep1": mediana_dias,
        "fecha_mediana_normal": _formato_dia_mes(fecha_mediana_ref),
        "n_anios_con_inicio": len(inicios_hist),
        "rango_min_md": f"{min_item[1].day} de {NOMBRES_MES[min_item[1].month]}",
        "rango_max_md": f"{max_item[1].day} de {NOMBRES_MES[max_item[1].month]}",
        "anio_2026_estado": estado_2026,
        "anio_2026_fecha_inicio": inicio_2026.isoformat() if inicio_2026 else None,
        "anio_2026_texto": texto_2026,
        "fuente": "NASA GPM IMERG Late V07 (2001–2026)",
        "escala": "Zona piloto (-74.4, -13.3, -74.0, -12.8), ~10 km",
        "estado": "estimado",
        "nota": "Escala de zona, no de chacra individual. Criterio: >=20 mm en 3 dias sin racha seca de 10 dias en los 30 dias siguientes.",
        "dato_hasta": dato_hasta_2026,
    }


def calcular_o2_ventana_helada(parcela: Dict[str, Any], power_json: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    O2: Ventana segura contra heladas (Tmin ajustada <= 0 C, 1991-2020).
    Aplica solo a chacras con heladas en ambos extremos de la climatologia (invierno y retorno).
    """
    ajuste_c = float(parcela["ajuste_termico_c"])
    tmin_s = power_json["properties"]["parameter"]["T2M_MIN"]

    ultima_dias: List[int] = []   # dias desde 1 de agosto (Aug-Dec)
    primera_dias: List[int] = []  # dias desde 1 de febrero (Feb-Jul)

    for y in range(1991, 2021):
        d = date(y, 8, 1)
        fin_inv = date(y, 12, 31)
        heladas_ad: List[date] = []
        while d <= fin_inv:
            val = tmin_s.get(d.strftime("%Y%m%d"), FALTANTE)
            if val != FALTANTE and (val + ajuste_c) <= 0.0:
                heladas_ad.append(d)
            d += timedelta(days=1)
        if heladas_ad:
            ultima_dias.append((max(heladas_ad) - date(y, 8, 1)).days)

        d = date(y, 2, 1)
        fin_ret = date(y, 7, 31)
        heladas_fj: List[date] = []
        while d <= fin_ret:
            val = tmin_s.get(d.strftime("%Y%m%d"), FALTANTE)
            if val != FALTANTE and (val + ajuste_c) <= 0.0:
                heladas_fj.append(d)
            d += timedelta(days=1)
        if heladas_fj:
            primera_dias.append((min(heladas_fj) - date(y, 2, 1)).days)

    if not ultima_dias or not primera_dias:
        return None

    ult_med_dias = round(statistics.median(ultima_dias))
    ult_p80_dias = round(_percentil([float(x) for x in ultima_dias], 0.80) or 0.0)
    pri_med_dias = round(statistics.median(primera_dias))
    pri_p20_dias = round(_percentil([float(x) for x in primera_dias], 0.20) or 0.0)

    ult_med_fecha = date(2025, 8, 1) + timedelta(days=ult_med_dias)
    ult_p80_fecha = date(2025, 8, 1) + timedelta(days=ult_p80_dias)
    pri_med_fecha = date(2026, 2, 1) + timedelta(days=pri_med_dias)
    pri_p20_fecha = date(2026, 2, 1) + timedelta(days=pri_p20_dias)

    # Ventana segura mensual (entre mes siguiente a ultima p80 / o mismo mes si termina temprano, y mes antes de primera p20)
    mes_inicio_seguro = ult_p80_fecha.month + 1 if ult_p80_fecha.day >= 15 else ult_p80_fecha.month
    if mes_inicio_seguro > 12:
        mes_inicio_seguro -= 12
    # Como regla practica andina, las heladas de retorno desde pri_p20 marcan el cierre seguro
    mes_fin_seguro = pri_p20_fecha.month - 1 if pri_p20_fecha.day <= 25 else pri_p20_fecha.month
    # Si pri_p20 es 30 mar, casi todo marzo es seguro -> fin seguro marzo, cosecha antes de abril
    if pri_p20_fecha.day >= 26:
        mes_fin_seguro = pri_p20_fecha.month

    mes_cosecha_limite = mes_fin_seguro + 1 if mes_fin_seguro < 12 else 1

    # Meses con riesgo de helada en el ciclo Ago..Jul
    meses_riesgo: List[int] = []
    for m, _, _ in MESES_CAMPANA:
        if m in (8, 9, 10, 11, 12):
            if m < ult_p80_fecha.month or (m == ult_p80_fecha.month and ult_p80_fecha.day >= 10):
                meses_riesgo.append(m)
        elif m in (2, 3, 4, 5, 6, 7):
            if m > pri_p20_fecha.month or (m == pri_p20_fecha.month and pri_p20_fecha.day <= 20):
                meses_riesgo.append(m)

    # Ventana segura en meses de ciclo Ago..Jul (empezando cuando terminan heladas tardias y lluvias se establecen ~fin oct -> nov)
    orden_ciclo = [m for m, _, _ in MESES_CAMPANA]
    mes_inicio_ventana = max(mes_inicio_seguro, 11)
    idx_ini = orden_ciclo.index(mes_inicio_ventana)
    idx_fin = orden_ciclo.index(mes_fin_seguro)
    ventana_segura_meses = orden_ciclo[idx_ini : idx_fin + 1]

    inicio_nombre = NOMBRES_MES[mes_inicio_ventana]
    fin_nombre = NOMBRES_MES[mes_fin_seguro]
    limite_nombre = NOMBRES_MES[mes_cosecha_limite]

    dias_helada_camp = int(parcela["clima_campana_2025_2026"]["dias_helada"])
    accion = (
        f"Tu ventana segura es de {inicio_nombre} a {fin_nombre}: "
        f"siembra después de la última helada y cosecha antes de {limite_nombre}."
    )
    por_que = (
        f"En 8 de cada 10 años la última helada terminó hacia el {_formato_dia_mes(ult_p80_fecha)} "
        f"y en 2 de cada 10 años volvió desde el {_formato_dia_mes(pri_p20_fecha)}. "
        f"Esta campaña hubo {dias_helada_camp} noches con helada."
    )

    return {
        "codigo": "O2",
        "titulo": "Ventana segura contra la helada",
        "accion_positiva": accion,
        "por_que_corto": por_que,
        "accion_ficha": accion,
        "valores_json": {
            "ajuste_termico_c": ajuste_c,
            "n_anios_ultima_helada": len(ultima_dias),
            "n_anios_primera_helada": len(primera_dias),
            "ultima_helada_mediana": ult_med_fecha.strftime("%m-%d"),
            "ultima_helada_mediana_texto": _formato_dia_mes(ult_med_fecha),
            "ultima_helada_p80": ult_p80_fecha.strftime("%m-%d"),
            "ultima_helada_p80_texto": _formato_dia_mes(ult_p80_fecha),
            "primera_helada_mediana": pri_med_fecha.strftime("%m-%d"),
            "primera_helada_mediana_texto": _formato_dia_mes(pri_med_fecha),
            "primera_helada_p20": pri_p20_fecha.strftime("%m-%d"),
            "primera_helada_p20_texto": _formato_dia_mes(pri_p20_fecha),
            "dias_helada_campana": dias_helada_camp,
            "meses_riesgo_helada": meses_riesgo,
            "ventana_segura_meses": ventana_segura_meses,
            "ventana_inicio_mes": inicio_nombre,
            "ventana_fin_mes": fin_nombre,
            "cosecha_antes_de": limite_nombre,
        },
        "fuente": "NASA POWER T2M_MIN (1991–2020) + ajuste por altura",
        "escala": "~50 km ajustado a elevación DEM 90 m",
        "estado": "estimado",
        "nota": "Criterio SENAMHI: Tmin ajustada <= 0 °C con gradiente -4.35 °C/km. p80 = 8 de cada 10 años ya terminó; p20 = 2 de cada 10 años ya empezó.",
        "dato_hasta": parcela["dato_hasta"],
    }


def calcular_o3_tuna(parcela: Dict[str, Any], power_json: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    O3: Fecha estimada de cosecha de tuna (2,400-3,000 m).
    T_base = 0 C, meta 2,751.31 GD desde 1 de julio (supuesto).
    """
    elev = float(parcela["elev_dem_m"])
    if not (2400.0 <= elev <= 3000.0):
        return None

    ajuste_c = float(parcela["ajuste_termico_c"])
    par = power_json["properties"]["parameter"]
    tmax_s = par["T2M_MAX"]
    tmin_s = par["T2M_MIN"]

    completas = [
        k for k in tmax_s
        if tmax_s[k] != FALTANTE and tmin_s.get(k, FALTANTE) != FALTANTE
    ]
    dh_str = max(completas)
    dato_hasta = date(int(dh_str[:4]), int(dh_str[4:6]), int(dh_str[6:8]))

    # GD acumulados 2026 desde 1 de julio hasta dato_hasta
    gdd_2026 = 0.0
    d = date(2026, 7, 1)
    while d <= dato_hasta:
        k = d.strftime("%Y%m%d")
        tx = tmax_s.get(k, FALTANTE)
        tn = tmin_s.get(k, FALTANTE)
        if tx != FALTANTE and tn != FALTANTE:
            gdd_2026 += max(0.0, ((tx + ajuste_c) + (tn + ajuste_c)) / 2.0)
        d += timedelta(days=1)

    # GD diario normal de mediados de noviembre a mediados de enero (1991-2020)
    gd_nov_jan: List[float] = []
    for y in range(1991, 2021):
        for mes, d_ini, d_fin in [(11, 15, 30), (12, 1, 31), (1, 1, 15)]:
            for day in range(d_ini, d_fin + 1):
                k = f"{y:04d}{mes:02d}{day:02d}"
                tx = tmax_s.get(k, FALTANTE)
                tn = tmin_s.get(k, FALTANTE)
                if tx != FALTANTE and tn != FALTANTE:
                    gd_nov_jan.append(max(0.0, ((tx + ajuste_c) + (tn + ajuste_c)) / 2.0))

    gd_diario_norm = statistics.mean(gd_nov_jan)
    gd_faltan = max(0.0, TARGET_GD_TUNA - gdd_2026)
    dias_faltan = round(gd_faltan / gd_diario_norm)
    fecha_2026 = dato_hasta + timedelta(days=dias_faltan)

    # Fecha normal (mediana 1991-2020) para alcanzar 2,751.31 GD desde 1 de julio
    dias_normal_serie: List[int] = []
    for y in range(1991, 2021):
        acc = 0.0
        d = date(y, 7, 1)
        fin = date(y + 1, 6, 30)
        while d <= fin:
            k = d.strftime("%Y%m%d")
            tx = tmax_s.get(k, FALTANTE)
            tn = tmin_s.get(k, FALTANTE)
            if tx != FALTANTE and tn != FALTANTE:
                acc += max(0.0, ((tx + ajuste_c) + (tn + ajuste_c)) / 2.0)
                if acc >= TARGET_GD_TUNA:
                    dias_normal_serie.append((d - date(y, 7, 1)).days)
                    break
            d += timedelta(days=1)

    med_dias_normal = round(statistics.median(dias_normal_serie))
    fecha_normal = date(2026, 7, 1) + timedelta(days=med_dias_normal)
    adelanto_dias = (fecha_normal - fecha_2026).days

    fecha_2026_txt = _formato_dia_mes(fecha_2026)
    fecha_norm_txt = _formato_dia_mes(fecha_normal)
    if fecha_2026.month == 12 and fecha_2026.day >= 20:
        cuando_txt = f"a fin de año (alrededor del {fecha_2026_txt})"
    else:
        cuando_txt = f"alrededor del {fecha_2026_txt}"

    accion = (
        f"Tu tuna estaría lista {cuando_txt}, unos {adelanto_dias} días antes de lo normal: "
        "busca comprador desde ya."
    )
    por_que = (
        f"Acumula {round(gdd_2026)} grados-día desde el 1 de julio frente a una meta de 2,751 grados-día "
        f"(normal: {fecha_norm_txt})."
    )
    nota_supuesto = "Supone que el brotamiento empezó el 1 de julio; la fecha real de 2026 no se conoce."

    return {
        "codigo": "O3",
        "titulo": "Fecha estimada de cosecha de tuna",
        "accion_positiva": accion,
        "por_que_corto": por_que,
        "accion_ficha": accion,
        "valores_json": {
            "t_base_c": 0.0,
            "meta_gd": TARGET_GD_TUNA,
            "ajuste_termico_c": ajuste_c,
            "gdd_acumulados_2026": round(gdd_2026, 1),
            "gd_diario_normal_nov_ene": round(gd_diario_norm, 2),
            "fecha_estimada_2026": fecha_2026.isoformat(),
            "fecha_estimada_2026_texto": fecha_2026_txt,
            "mes_cosecha_2026": fecha_2026.month,
            "fecha_normal_1991_2020": fecha_normal.isoformat(),
            "fecha_normal_texto": fecha_norm_txt,
            "adelanto_dias": adelanto_dias,
        },
        "fuente": "Tesis Marcaquispe Capiso (2021) + NASA POWER",
        "escala": "~50 km ajustado a elevación DEM 90 m",
        "estado": "estimado",
        "nota": nota_supuesto,
        "dato_hasta": dato_hasta.isoformat(),
    }


def calcular_o4_precios_papa() -> Dict[str, Any]:
    """
    O4: Calendario mensual de precios de papa blanca en Lima (EMMSA 2022-2026).
    Excluye el mes en curso (noviembre 2026 parcial).
    """
    por_mes: Dict[int, List[float]] = {m: [] for m in range(1, 13)}
    with (MERCADO_DIR / "papa_emmsa_mensual.csv").open("r", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            anio = int(row["anio"])
            mes = int(row["mes"])
            verif = row["verificacion"].strip()
            if (anio == 2026 and mes == 11) or "parcial" in verif:
                continue
            por_mes[mes].append(float(row["precio_papa_blanca_soles_kg"]))

    resumen_meses = []
    for mes in range(1, 13):
        vals = por_mes[mes]
        resumen_meses.append(
            {
                "mes": mes,
                "mes_nombre": NOMBRES_MES[mes],
                "mediana_soles_kg": round(statistics.median(vals), 2),
                "min_soles_kg": round(min(vals), 2),
                "max_soles_kg": round(max(vals), 2),
                "n_anios": len(vals),
            }
        )

    advertencia = (
        "Referencia de años anteriores en Lima, no pronóstico. "
        "Varía mucho (en marzo de 2026 llegó a S/ 1.81)."
    )
    accion = (
        "La papa suele pagarse menos de febrero a mayo (~S/ 0.90 por kilo) "
        "y más de julio a septiembre (~S/ 1.30–1.50). Si puedes, guarda una parte y vende escalonado."
    )
    accion_ficha = (
        "La papa suele pagarse mejor entre julio y septiembre que entre febrero y mayo: "
        "si puedes, guarda una parte y vende escalonado."
    )

    return {
        "codigo": "O4",
        "titulo": "Cuándo vender: calendario de precios de la papa",
        "accion_positiva": accion,
        "por_que_corto": advertencia,
        "accion_ficha": accion_ficha,
        "meses": resumen_meses,
        "meses_precio_bajo": [2, 3, 4, 5],
        "meses_precio_alto": [7, 8, 9],
        "advertencia": advertencia,
        "fuente": "EMMSA / MIDAGRI-SIEA (GMML Lima 2022–2026)",
        "escala": "Gran Mercado Mayorista de Lima (referencia)",
        "estado": "estimado",
        "nota": f"Precios medidos (EMMSA); mediana mensual calculada excluyendo mes en curso. {advertencia}",
        "dato_hasta": "2026-10-31",
    }


def calcular_o5_chuno_tunta(
    parcela: Dict[str, Any],
    enis_papa_ayacucho_pct: float,
    im_reciente: Optional[float],
) -> Optional[Dict[str, Any]]:
    """
    O5: Apta para chuno o tunta si elev > 3500 m + >= 5 noches de helada + senal de mucha papa.
    """
    elev = float(parcela["elev_dem_m"])
    dias_helada = int(parcela["clima_campana_2025_2026"]["dias_helada"])
    senal_mucha_papa = enis_papa_ayacucho_pct > 10.0 or (im_reciente is not None and im_reciente > 1.05)

    if not (elev > 3500.0 and dias_helada >= 5 and senal_mucha_papa):
        return None

    accion = (
        "Tu chacra es apta para hacer chuño o tunta: si sobra papa, transfórmala; "
        "se guarda y se vende después."
    )
    por_que = (
        f"Está a {round(elev)} m con {dias_helada} noches de helada esta campaña "
        f"y Ayacucho proyecta +{enis_papa_ayacucho_pct} % de área de papa."
    )
    return {
        "codigo": "O5",
        "titulo": "Transformar en vez de malvender: chuño y tunta",
        "accion_positiva": accion,
        "por_que_corto": por_que,
        "accion_ficha": accion,
        "valores_json": {
            "elev_dem_m": round(elev),
            "dias_helada_campana": dias_helada,
            "enis_papa_ayacucho_pct": enis_papa_ayacucho_pct,
            "im_reciente": im_reciente if im_reciente is not None else "no disponible",
            "sin_rendimiento_fijo": True,
        },
        "fuente": "DEM 90 m + NASA POWER + ENIS MIDAGRI",
        "escala": "Chacra (altura/helada) + regional Ayacucho",
        "estado": "estimado",
        "nota": "Sin rendimiento fijo ni promesa de kilos. Referencia técnica NTP 011.401:2020.",
        "dato_hasta": parcela["dato_hasta"],
    }


def calcular_o6_siembra_diferenciada(
    parcela: Dict[str, Any],
    plan_item: Dict[str, Any],
    enis_papa_ayacucho_pct: float,
) -> Optional[Dict[str, Any]]:
    """
    O6: Siembra lo que pocos siembran (chacras con recomendacion de leguminosa).
    Solo usa el dato real de papa en ENIS (+19.3 %); no inventa porcentajes de otros cultivos.
    """
    if plan_item["cultivo_asignado"] not in ("tarwi", "haba"):
        return None

    accion = (
        "Este año mucha gente sembrará papa. El tarwi o el haba tendrán menos competencia "
        "y además recuperan tu suelo."
    )
    por_que = f"En Ayacucho la intención de siembra de papa sube +{enis_papa_ayacucho_pct} % según la encuesta ENIS."
    return {
        "codigo": "O6",
        "titulo": "Siembra lo que pocos siembran",
        "accion_positiva": accion,
        "por_que_corto": por_que,
        "accion_ficha": accion,
        "valores_json": {
            "enis_papa_ayacucho_pct": enis_papa_ayacucho_pct,
            "cultivo_recomendado": plan_item["cultivo_asignado"],
        },
        "fuente": "Encuesta ENIS MIDAGRI 2026/2027",
        "escala": "Regional Ayacucho",
        "estado": "observado",
        "nota": "Solo se reporta el dato medido de papa en ENIS (+19.3 %); sin porcentajes inventados de otros cultivos.",
        "dato_hasta": "2026-07-15",
    }


def construir_calendario_parcela(
    parcela: Dict[str, Any],
    plan_item: Dict[str, Any],
    o1: Dict[str, Any],
    o2: Optional[Dict[str, Any]],
    o3: Optional[Dict[str, Any]],
    o4: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """Construye la linea de tiempo Agosto-Julio (12 meses) para una chacra."""
    riesgo_set = set(o2["valores_json"]["meses_riesgo_helada"]) if o2 else set()
    if o2:
        segura_set = set(o2["valores_json"]["ventana_segura_meses"])
        inicio_seguro_txt = o2["valores_json"]["ventana_inicio_mes"]
        fin_seguro_txt = o2["valores_json"]["ventana_fin_mes"]
        cosecha_antes_txt = o2["valores_json"]["cosecha_antes_de"]
        frase_resumen = (
            f"Siembra de {inicio_seguro_txt} a {fin_seguro_txt}, después de las lluvias; "
            f"cosecha antes de {cosecha_antes_txt}."
        )
    else:
        segura_set = {11, 12, 1, 2, 3, 4, 5, 6, 7}
        frase_resumen = (
            "Sin riesgo de helada en el año; siembra cuando se asienten las lluvias "
            "(normalmente fines de octubre)."
        )

    if o3:
        mes_tuna = int(o3["valores_json"]["mes_cosecha_2026"])
        fecha_tuna_txt = o3["valores_json"]["fecha_estimada_2026_texto"]
        frase_resumen = f"{frase_resumen} Cosecha estimada de tuna hacia el {fecha_tuna_txt}."
    else:
        mes_tuna = None

    bajo_set = set(o4["meses_precio_bajo"]) if o4 else set()
    alto_set = set(o4["meses_precio_alto"]) if o4 else set()

    meses = []
    for m_num, corto, largo in MESES_CAMPANA:
        meses.append(
            {
                "mes_num": m_num,
                "mes_corto": corto,
                "mes_largo": largo,
                "riesgo_helada": m_num in riesgo_set,
                "inicio_normal_lluvias": m_num == 10,
                "lluvias_2026_pendientes": m_num == 10 and o1["anio_2026_estado"] == "no_establecidas",
                "ventana_segura": m_num in segura_set,
                "cosecha_tuna": mes_tuna == m_num,
                "precio_papa_bajo": m_num in bajo_set,
                "precio_papa_alto": m_num in alto_set,
            }
        )

    partes_aria = [
        f"Calendario agrícola agosto a julio para {parcela['id']} ({parcela['distrito']}).",
        f"Inicio normal de lluvias: fines de octubre; en 2026 {o1['anio_2026_texto']}.",
    ]
    if o2:
        partes_aria.append(
            "Meses con riesgo de helada: "
            + ", ".join(NOMBRES_MES[m] for m, _, _ in MESES_CAMPANA if m in riesgo_set)
            + "."
        )
        partes_aria.append(
            "Ventana segura de siembra: "
            + ", ".join(NOMBRES_MES[m] for m, _, _ in MESES_CAMPANA if m in segura_set)
            + "."
        )
    else:
        partes_aria.append("Sin meses con riesgo de helada.")
    if o3:
        partes_aria.append(f"Cosecha estimada de tuna: {o3['valores_json']['fecha_estimada_2026_texto']}.")
    if o4:
        partes_aria.append(
            "Precios de referencia de papa en Lima: más bajos de febrero a mayo y más altos de julio a septiembre."
        )
    partes_aria.append(frase_resumen)

    return {
        "parcela_id": parcela["id"],
        "cultivo_asignado": plan_item["cultivo_asignado"],
        "tiene_helada": o2 is not None,
        "tiene_tuna": o3 is not None,
        "tiene_papa_en_plan": o4 is not None,
        "frase_resumen": frase_resumen,
        "aria_label": " ".join(partes_aria),
        "meses": meses,
    }


def calcular_semaforo_regional(plan_10: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calcula el conteo de chacras por cultivo recomendado para la vista Region."""
    total = len(plan_10)
    conteo_leguminosa = sum(1 for p in plan_10 if p["cultivo_asignado"] in ("tarwi", "haba"))
    conteo_quinua = sum(1 for p in plan_10 if p["cultivo_asignado"] == "quinua")
    conteo_papa = sum(1 for p in plan_10 if p["cultivo_asignado"] == "papa")

    return {
        "total_chacras": total,
        "conteo": {
            "tarwi_o_haba": conteo_leguminosa,
            "quinua": conteo_quinua,
            "papa": conteo_papa,
        },
        "linea": (
            f"Si estas {total} chacras siguen la recomendación: "
            f"{conteo_leguminosa} tarwi o haba, {conteo_quinua} quinua y {conteo_papa} papa."
        ),
        "nota_siguiente_fase": (
            "Siguiente fase: con las siembras registradas por cooperativa, "
            "Kultiva cambiará la recomendación cuando un cultivo se acerque al exceso (semáforo regional)."
        ),
        "estado": "ilustrativo",
        "dato_hasta": plan_10[0]["dato_hasta"] if plan_10 else "2026-11-12",
    }


def generar_oportunidades() -> Dict[str, Any]:
    """Genera el conjunto completo de oportunidades O1-O6, calendario y semaforo regional."""
    parcelas_json = json.loads((PROCESSED_DIR / "parcelas_demo.json").read_text(encoding="utf-8"))
    plan_json = json.loads((PROCESSED_DIR / "plan_rotacion_demo.json").read_text(encoding="utf-8"))
    mercado_json = json.loads((PROCESSED_DIR / "mercado_resumen.json").read_text(encoding="utf-8"))

    parcelas = parcelas_json["parcelas"]
    plan_por_id = {item["parcela_id"]: item for item in plan_json["plan_rotacion_10_parcelas"]}
    power_por_celda = _cargar_power_por_celda()

    # ENIS Ayacucho (+19.3 %) e I_m mas reciente disponible
    enis_ay = next(
        (e for e in mercado_json["enis"] if e["ambito"] == "ayacucho"),
        {"valor": "+19.3%"},
    )
    enis_pct = float(str(enis_ay["valor"]).replace("%", "").replace("+", "").strip())
    im_validos = [
        m["im_papa"]
        for m in mercado_json["mercado_papa_mensual"]
        if isinstance(m.get("im_papa"), (int, float))
    ]
    im_reciente = im_validos[-1] if im_validos else None

    o1_global = calcular_o1_inicio_lluvias()
    o4_global = calcular_o4_precios_papa()
    semaforo = calcular_semaforo_regional(plan_json["plan_rotacion_10_parcelas"])

    por_parcela: List[Dict[str, Any]] = []
    filas_supabase: List[Dict[str, Any]] = []

    for parcela in parcelas:
        pid = parcela["id"]
        plan_item = plan_por_id[pid]
        ck = parcela["power_cell_id"] or cell_key(float(parcela["latitude"]), float(parcela["longitude"]))
        pj = power_por_celda[ck]

        o2 = calcular_o2_ventana_helada(parcela, pj)
        o3 = calcular_o3_tuna(parcela, pj)
        o4_aplica = o4_global if plan_item["cultivo_asignado"] == "papa" else None
        o5 = calcular_o5_chuno_tunta(parcela, enis_pct, im_reciente)
        o6 = calcular_o6_siembra_diferenciada(parcela, plan_item, enis_pct)

        candidatas: List[Dict[str, Any]] = [
            {
                "codigo": "O1",
                "titulo": o1_global["titulo"],
                "accion_positiva": o1_global["accion_positiva"],
                "por_que_corto": o1_global["por_que_corto"],
                "accion_ficha": o1_global["accion_ficha"],
                "valores_json": {
                    "mediana_dias_desde_sep1": o1_global["mediana_dias_desde_sep1"],
                    "fecha_mediana_normal": o1_global["fecha_mediana_normal"],
                    "n_anios_con_inicio": o1_global["n_anios_con_inicio"],
                    "rango_min_md": o1_global["rango_min_md"],
                    "rango_max_md": o1_global["rango_max_md"],
                    "anio_2026_estado": o1_global["anio_2026_estado"],
                    "anio_2026_texto": o1_global["anio_2026_texto"],
                },
                "fuente": o1_global["fuente"],
                "escala": o1_global["escala"],
                "estado": o1_global["estado"],
                "nota": o1_global["nota"],
                "dato_hasta": o1_global["dato_hasta"],
            }
        ]
        if o2:
            candidatas.append(o2)
        if o3:
            candidatas.append(o3)
        if o4_aplica:
            candidatas.append(
                {
                    "codigo": "O4",
                    "titulo": o4_aplica["titulo"],
                    "accion_positiva": o4_aplica["accion_positiva"],
                    "por_que_corto": o4_aplica["por_que_corto"],
                    "accion_ficha": o4_aplica["accion_ficha"],
                    "valores_json": {
                        "meses": o4_aplica["meses"],
                        "meses_precio_bajo": o4_aplica["meses_precio_bajo"],
                        "meses_precio_alto": o4_aplica["meses_precio_alto"],
                        "advertencia": o4_aplica["advertencia"],
                    },
                    "fuente": o4_aplica["fuente"],
                    "escala": o4_aplica["escala"],
                    "estado": o4_aplica["estado"],
                    "nota": o4_aplica["nota"],
                    "dato_hasta": o4_aplica["dato_hasta"],
                }
            )
        if o5:
            candidatas.append(o5)
        if o6:
            candidatas.append(o6)

        # Prioridad para la Ficha del agricultor (1 oportunidad por chacra)
        if plan_item["cultivo_asignado"] == "papa":
            orden_prioridad = ["O4", "O2", "O1"]
        elif float(parcela["elev_dem_m"]) <= 3000.0 and o3 is not None:
            orden_prioridad = ["O3", "O6", "O1", "O2"]
        elif o2 is not None:
            orden_prioridad = ["O2", "O5", "O6", "O1"]
        else:
            orden_prioridad = ["O1", "O6"]

        def rank_fn(op: Dict[str, Any]) -> int:
            c = op["codigo"]
            return orden_prioridad.index(c) + 1 if c in orden_prioridad else 99

        candidatas.sort(key=rank_fn)
        for idx, op in enumerate(candidatas, start=1):
            op["prioridad"] = idx
            filas_supabase.append(
                {
                    "parcela_id": pid,
                    "codigo": op["codigo"],
                    "titulo": op["titulo"],
                    "accion_positiva": op["accion_positiva"],
                    "por_que_corto": op["por_que_corto"],
                    "accion_ficha": op["accion_ficha"],
                    "prioridad": idx,
                    "valores_json": op["valores_json"],
                    "fuente": op["fuente"],
                    "escala": op["escala"],
                    "nota": op["nota"],
                    "estado": op["estado"],
                    "dato_hasta": op["dato_hasta"],
                }
            )

        calendario = construir_calendario_parcela(parcela, plan_item, o1_global, o2, o3, o4_aplica)
        por_parcela.append(
            {
                "parcela_id": pid,
                "distrito": parcela["distrito"],
                "elev_dem_m": parcela["elev_dem_m"],
                "cultivo_asignado": plan_item["cultivo_asignado"],
                "oportunidades_aplicables": [op["codigo"] for op in candidatas],
                "oportunidad_ficha": candidatas[0],
                "oportunidades": candidatas,
                "calendario": calendario,
            }
        )

    # Resumen de cooperativa (O1-O6 en orden de visibilidad: max 3 visibles + Ver mas)
    por_codigo: Dict[str, List[Tuple[str, Dict[str, Any]]]] = {f"O{i}": [] for i in range(1, 7)}
    for p_entry in por_parcela:
        for op in p_entry["oportunidades"]:
            por_codigo[op["codigo"]].append((p_entry["parcela_id"], op))

    orden_coop = ["O1", "O2", "O6", "O3", "O5", "O4"]
    oportunidades_coop: List[Dict[str, Any]] = []
    for cod in orden_coop:
        lista = por_codigo[cod]
        if not lista:
            continue
        # Usar P05 como referencia representativa para O2, P01 para O3, etc.
        ref_pid, ref_op = lista[0]
        if cod == "O2":
            p05_match = next(((pid, op) for pid, op in lista if pid == "P05"), None)
            if p05_match:
                ref_pid, ref_op = p05_match
        elif cod == "O3":
            p01_match = next(((pid, op) for pid, op in lista if pid == "P01"), None)
            if p01_match:
                ref_pid, ref_op = p01_match

        oportunidades_coop.append(
            {
                "codigo": cod,
                "titulo": ref_op["titulo"],
                "accion_positiva": ref_op["accion_positiva"],
                "por_que_corto": ref_op["por_que_corto"],
                "parcelas_aplican": [pid for pid, _ in lista],
                "parcela_referencia": ref_pid,
                "fuente": ref_op["fuente"],
                "escala": ref_op["escala"],
                "estado": ref_op["estado"],
                "nota": ref_op["nota"],
                "dato_hasta": ref_op["dato_hasta"],
            }
        )

    dato_hasta_max = max(f["dato_hasta"] for f in filas_supabase)
    return {
        "_metadata": {
            "proyecto": "Kultiva",
            "dato_hasta": dato_hasta_max,
            "nota_honestidad": "Solo datos reales. Sin puntajes compuestos ni pronósticos de precio.",
        },
        "global_o1_lluvias": o1_global,
        "global_o4_precios_papa": o4_global,
        "global_o6_enis": {
            "enis_papa_ayacucho_pct": enis_pct,
            "estado": "observado",
            "dato_hasta": "2026-07-15",
        },
        "semaforo_regional": semaforo,
        "oportunidades_cooperativa": oportunidades_coop,
        "por_parcela": por_parcela,
        "filas_supabase": filas_supabase,
    }


def main() -> None:
    res = generar_oportunidades()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] Generado {OUT_PATH} ({len(res['filas_supabase'])} filas de oportunidades)")
    o1 = res["global_o1_lluvias"]
    print(f"  O1: mediana={o1['mediana_dias_desde_sep1']} d ({o1['fecha_mediana_normal']}), n={o1['n_anios_con_inicio']}, 2026={o1['anio_2026_texto']}")
    p05 = next(p for p in res["por_parcela"] if p["parcela_id"] == "P05")
    o2_p05 = next(o for o in p05["oportunidades"] if o["codigo"] == "O2")["valores_json"]
    print(f"  O2 (P05): ult_med={o2_p05['ultima_helada_mediana_texto']}, p80={o2_p05['ultima_helada_p80_texto']}, pri_med={o2_p05['primera_helada_mediana_texto']}, p20={o2_p05['primera_helada_p20_texto']}")
    p01 = next(p for p in res["por_parcela"] if p["parcela_id"] == "P01")
    o3_p01 = next(o for o in p01["oportunidades"] if o["codigo"] == "O3")["valores_json"]
    print(f"  O3 (P01): normal={o3_p01['fecha_normal_texto']}, 2026={o3_p01['fecha_estimada_2026_texto']}, adelanto={o3_p01['adelanto_dias']} d")
    print(f"  Semaforo: {res['semaforo_regional']['linea']}")


if __name__ == "__main__":
    main()
