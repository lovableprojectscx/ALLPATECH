#!/usr/bin/env python3
"""
Motor del Comparador A/B/C en bandas y Planificador de Rotacion (Paso 3.5).

Cumple RF-06, RF-08, RF-10, RF-11, RF-13, RF-15, RF-16 y RNF-04:
- Radar en bandas discretas (alto / medio / bajo / evidencia_insuficiente).
- Puntajes 0-100 solo internos (nunca visibles para ejes sin fuente/modelo).
- Plagas siempre en evidencia_insuficiente; I_m en no_disponible si no se provee.
- Reglas del planificador: no repetir familia botanica en la misma parcela,
  al menos una leguminosa en la rotacion, y chuno/tunta solo si
  elev_dem_m > 3500 + dias_helada > 0 + I_m > 1.
"""

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PROCESSED = BASE_DIR / "data" / "processed"
DATA_DIR = BASE_DIR / "data"

ESTRATEGIAS_META = {
    "A": {
        "codigo": "A",
        "nombre": "Seguir con papa",
        "cultivo_objetivo": "papa",
        "color_hex": "#B83A00",
        "forma": "▲",
    },
    "B": {
        "codigo": "B",
        "nombre": "Cuidar el agua (quinua)",
        "cultivo_objetivo": "quinua",
        "color_hex": "#003F6E",
        "forma": "■",
    },
    "C": {
        "codigo": "C",
        "nombre": "Recuperar el suelo (haba o tarwi)",
        "cultivo_objetivo": "leguminosa",
        "color_hex": "#007755",
        "forma": "●",
    },
}

# Cultivo previo ilustrativo por parcela para la demo de 10 parcelas (estado = ilustrativo)
CULTIVO_PREVIO_DEMO = {
    "P01": "papa",
    "P02": "papa",
    "P03": "quinua",
    "P04": "papa",
    "P05": "papa",
    "P06": "papa",
    "P07": "papa",
    "P08": "quinua",
    "P09": "papa",
    "P10": "haba",
}


def puntaje_a_banda(puntaje: float) -> str:
    """Convierte un puntaje interno 0-100 a banda discreta (RF-16)."""
    if puntaje >= 70.0:
        return "alto"
    if puntaje >= 45.0:
        return "medio"
    return "bajo"


def evaluar_aptitud_parcela_cultivo(
    parcela: Dict[str, Any],
    cultivo: Dict[str, Any],
    escenario_mas_1c: bool = False,
) -> Dict[str, Any]:
    """Evalua aptitud termica/altitudinal y resiliencia climatica en bandas."""
    elev = float(parcela["elev_dem_m"])
    clima = parcela["clima_campana_2025_2026"]
    t2m = float(clima["t2m_media_ajustada_c"]) + (1.0 if escenario_mas_1c else 0.0)
    tmin = float(clima["tmin_absoluta_ajustada_c"]) + (1.0 if escenario_mas_1c else 0.0)
    dias_helada = int(clima["dias_helada"])
    racha_seca = int(clima["racha_seca_max_dias"])
    dato_hasta = parcela.get("dato_hasta", "no_disponible")

    agro = cultivo["agronomia"]
    alt_min = agro.get("altitud_min_msnm")
    alt_max = agro.get("altitud_max_msnm")

    # 1. Eje aptitud termica y suelo
    puntaje_apt = 65.0
    if alt_min is not None and alt_max is not None:
        if alt_min <= elev <= alt_max:
            puntaje_apt += 20.0
        else:
            puntaje_apt -= 25.0
    elif cultivo["id"] == "quinua":
        # Quinua en cultivos_demo_base.json tiene altitud pendiente_agronomia=True;
        # usamos banda prudente sin inventar rangos.
        puntaje_apt = 60.0

    suelo = parcela["suelo"]
    ph = suelo.get("ph")
    if ph is not None:
        if 5.5 <= float(ph) <= 7.5:
            puntaje_apt += 10.0
        elif float(ph) < 5.0 or float(ph) > 8.0:
            puntaje_apt -= 10.0

    puntaje_apt = max(0.0, min(100.0, puntaje_apt))
    estado_apt = "estimado"

    # 2. Eje resiliencia climatica (heladas SENAMHI Tmin <= 0 °C y racha seca)
    puntaje_res = 75.0
    riesgo_helada = tmin <= 0.0 or dias_helada > 0
    if riesgo_helada:
        if cultivo["id"] == "quinua":
            puntaje_res -= 25.0
        elif cultivo["id"] == "papa":
            puntaje_res -= 20.0
        else:
            puntaje_res -= 10.0
    if racha_seca >= 20:
        puntaje_res -= 15.0
    if escenario_mas_1c and cultivo["id"] == "papa" and elev < 3000:
        puntaje_res -= 10.0

    puntaje_res = max(0.0, min(100.0, puntaje_res))

    return {
        "aptitud_termica_y_suelo": {
            "banda": puntaje_a_banda(puntaje_apt),
            "_interno_0_100": round(puntaje_apt, 1),
            "estado": estado_apt,
            "dato_hasta": dato_hasta,
        },
        "resiliencia_climatica": {
            "banda": puntaje_a_banda(puntaje_res),
            "_interno_0_100": round(puntaje_res, 1),
            "estado": "estimado",
            "dato_hasta": dato_hasta,
            "detalle": {
                "t2m_media_evaluada_c": round(t2m, 2),
                "tmin_absoluta_evaluada_c": round(tmin, 2),
                "dias_helada_base": dias_helada,
                "racha_seca_max_dias": racha_seca,
            },
        },
    }


def comparar_abc_parcela(
    parcela: Dict[str, Any],
    cultivos_por_id: Dict[str, Dict[str, Any]],
    cultivo_previo_id: str,
    im_papa: Optional[float] = None,
    humedad_quinua_pct: Optional[float] = None,
    escenario_mas_1c: bool = False,
) -> Dict[str, Any]:
    """Genera la comparacion A/B/C en bandas para una parcela (RF-11, RF-15, RF-16)."""
    elev = float(parcela["elev_dem_m"])
    dato_hasta = parcela.get("dato_hasta", "no_disponible")
    clima = parcela["clima_campana_2025_2026"]
    tmin_eval = float(clima["tmin_absoluta_ajustada_c"]) + (1.0 if escenario_mas_1c else 0.0)
    dias_helada = int(clima["dias_helada"])

    # Seleccion de leguminosa para C segun piso altitudinal (tarwi >= 2800 m, haba < 2800 m)
    leguminosa_id = "tarwi" if elev >= 2800.0 else "haba"
    familia_previa = cultivos_por_id[cultivo_previo_id]["familia_botanica"]

    estrategias_salida = {}
    mapa_cultivos = {"A": "papa", "B": "quinua", "C": leguminosa_id}

    for clave, cultivo_id in mapa_cultivos.items():
        meta = ESTRATEGIAS_META[clave]
        cultivo = cultivos_por_id[cultivo_id]
        eval_clima = evaluar_aptitud_parcela_cultivo(parcela, cultivo, escenario_mas_1c)

        # 3. Eje salud del suelo y rotacion
        repite_familia = cultivo["familia_botanica"] == familia_previa
        es_leguminosa = "Leguminosa" in cultivo["familia_botanica"]
        if es_leguminosa and not repite_familia:
            puntaje_suelo = 90.0
        elif not repite_familia:
            puntaje_suelo = 70.0
        else:
            puntaje_suelo = 30.0

        # 4. Eje mercado y sobreoferta (ENIS Ayacucho +19.3 % papa: A=alto, B/C=bajo)
        if im_papa is None:
            eje_mercado = {
                "banda": "alto" if clave == "A" else "bajo",
                "estado": "estimado",
                "dato_hasta": "2026-11-13",
                "motivo": "ENIS MIDAGRI Ayacucho (+19.3 % intencion de siembra de papa)",
            }
        else:
            banda_m = "alto" if (clave == "A" and im_papa > 1.0) else "bajo"
            eje_mercado = {
                "banda": banda_m,
                "estado": "estimado",
                "dato_hasta": dato_hasta,
            }

        # 5. Eje riesgo de plagas (RF-16: siempre evidencia_insuficiente sin modelo validado)
        eje_plagas = {
            "banda": "evidencia_insuficiente",
            "estado": "no_disponible",
            "dato_hasta": dato_hasta,
            "motivo": "Sin modelo fitosanitario validado en esta fase",
        }

        alertas = []
        if clave == "B" and tmin_eval <= 0.0:
            alertas.append(
                {
                    "regla": "RF-06(a) quinua helada",
                    "mensaje": "Señal de RIESGO de helada en floracion (Tmin ajustada <= 0 °C, criterio SENAMHI; sin porcentaje de perdida)",
                    "estado": "estimado",
                }
            )
        if clave == "B":
            if humedad_quinua_pct is None:
                alertas.append(
                    {
                        "regla": "RF-08(b) secado quinua",
                        "mensaje": "no disponible (ingrese humedad manual del grano para evaluar > 12 %)",
                        "estado": "no_disponible",
                    }
                )
            elif humedad_quinua_pct > 12.0:
                alertas.append(
                    {
                        "regla": "RF-08(b) secado quinua",
                        "mensaje": f"Recomendar secado antes de almacenar (humedad ingresada {humedad_quinua_pct}% > 12 %, Ficha INIA 420)",
                        "estado": "observado",
                    }
                )
        if clave == "A":
            chuno_elegible = elev > 3500.0 and dias_helada > 0
            if im_papa is None:
                alertas.append(
                    {
                        "regla": "RF-08(a) chuno/tunta",
                        "mensaje": (
                            "no disponible (falta I_m > 1; parcela cumple altitud > 3,500 m y heladas)"
                            if chuno_elegible
                            else "no aplica (altitud <= 3,500 m o sin heladas; ademas falta I_m)"
                        ),
                        "estado": "no_disponible",
                    }
                )
            elif chuno_elegible and im_papa > 1.0:
                alertas.append(
                    {
                        "regla": "RF-08(a) chuno/tunta",
                        "mensaje": "Considerar transformacion a chuno o tunta (NTP 011.401:2020; sin rendimiento fijo)",
                        "estado": "estimado",
                    }
                )

        estrategias_salida[clave] = {
            **meta,
            "cultivo_asignado": cultivo["nombre"],
            "cultivo_id": cultivo_id,
            "familia_botanica": cultivo["familia_botanica"],
            "repite_familia_previa": repite_familia,
            "rotacion_con_leguminosa": es_leguminosa,
            "radar_bandas": {
                "aptitud_termica_y_suelo": eval_clima["aptitud_termica_y_suelo"],
                "resiliencia_climatica": eval_clima["resiliencia_climatica"],
                "salud_suelo_y_rotacion": {
                    "banda": puntaje_a_banda(puntaje_suelo),
                    "_interno_0_100": round(puntaje_suelo, 1),
                    "estado": "estimado",
                    "dato_hasta": dato_hasta,
                },
                "mercado_y_sobreoferta": eje_mercado,
                "riesgo_plagas": eje_plagas,
            },
            "alertas": alertas,
        }

    return {
        "parcela_id": parcela["id"],
        "distrito": parcela["distrito"],
        "elev_dem_m": elev,
        "escala_visible": {
            "clima": "~50 km (NASA POWER)",
            "terreno": "30 m (DEM/parcela)",
        },
        "cultivo_previo": {
            "id": cultivo_previo_id,
            "familia_botanica": familia_previa,
            "estado": "ilustrativo",
        },
        "estrategias": estrategias_salida,
    }


def planificar_rotacion_10_parcelas(
    parcelas_data: Dict[str, Any],
    cultivos_data: Dict[str, Any],
    im_papa: Optional[float] = None,
    humedad_quinua_pct: Optional[float] = None,
    escenario_mas_1c: bool = False,
) -> Dict[str, Any]:
    """Planifica la rotacion de las 10 parcelas respetando familia, leguminosa y chuno."""
    cultivos_por_id = {c["id"]: c for c in cultivos_data["cultivos"]}
    parcelas = parcelas_data["parcelas"]

    comparador_parcelas = []
    plan_parcelas = []
    conteo_leguminosas = 0
    familias_repetidas = 0

    for p in parcelas:
        pid = p["id"]
        elev = float(p["elev_dem_m"])
        dias_helada = int(p["clima_campana_2025_2026"]["dias_helada"])
        previo_id = CULTIVO_PREVIO_DEMO.get(pid, "papa")
        familia_previa = cultivos_por_id[previo_id]["familia_botanica"]

        comp = comparar_abc_parcela(
            p,
            cultivos_por_id,
            previo_id,
            im_papa=im_papa,
            humedad_quinua_pct=humedad_quinua_pct,
            escenario_mas_1c=escenario_mas_1c,
        )
        comparador_parcelas.append(comp)

        # Seleccion deterministica para el planificador:
        # Regla 1: nunca repetir familia botanica de la parcela.
        # Regla 2: garantizar al menos una leguminosa (y priorizar C donde aporta mayor rotacion).
        if previo_id == "papa":
            # Alternamos B (quinua) en valles medios secos / sin helada severa cuando diversifica,
            # y C (leguminosa) en parcelas prioritarias o altas; asegurando >=1 leguminosa.
            estrategia_elegida = "C" if pid in {"P01", "P04", "P05", "P07", "P09"} else "B"
        elif previo_id == "quinua":
            estrategia_elegida = "C"  # rompe Amaranthaceae con Fabaceae
        else:
            # previo_id == "haba" (Fabaceae) -> no repetir leguminosa; asignar papa (A) o quinua (B)
            estrategia_elegida = "B" if dias_helada == 0 else "A"

        est = comp["estrategias"][estrategia_elegida]
        if est["repite_familia_previa"]:
            familias_repetidas += 1
        if est["rotacion_con_leguminosa"]:
            conteo_leguminosas += 1

        chuno_elegible_fisico = elev > 3500.0 and dias_helada > 0
        if im_papa is None:
            estado_chuno = "no_disponible"
        elif chuno_elegible_fisico and im_papa > 1.0 and est["cultivo_id"] == "papa":
            estado_chuno = "activado"
        else:
            estado_chuno = "no_aplica"

        plan_parcelas.append(
            {
                "parcela_id": pid,
                "distrito": p["distrito"],
                "elev_dem_m": elev,
                "cultivo_previo": previo_id,
                "familia_previa": familia_previa,
                "estrategia_elegida": estrategia_elegida,
                "color_hex": est["color_hex"],
                "forma": est["forma"],
                "cultivo_asignado": est["cultivo_id"],
                "familia_asignada": est["familia_botanica"],
                "rotacion_con_leguminosa": "✓" if est["rotacion_con_leguminosa"] else "✗",
                "chuno_tunta": {
                    "elegible_altitud_y_helada": chuno_elegible_fisico,
                    "im_papa": im_papa if im_papa is not None else "no disponible",
                    "estado_regla": estado_chuno,
                },
                "estado": "ilustrativo",
                "dato_hasta": p.get("dato_hasta", "no_disponible"),
            }
        )

    return {
        "_metadata": {
            "escenario_mas_1c": escenario_mas_1c,
            "im_papa": im_papa if im_papa is not None else "no disponible",
            "humedad_quinua_pct": humedad_quinua_pct if humedad_quinua_pct is not None else "no disponible",
            "colores_rnf04": {
                "A": {"color": "#B83A00", "forma": "▲"},
                "B": {"color": "#003F6E", "forma": "■"},
                "C": {"color": "#007755", "forma": "●"},
            },
            "nota_honestidad": "Puntajes _interno_0_100 son solo internos (RF-16). Ejes sin fuente/modelo quedan en evidencia_insuficiente.",
        },
        "resumen_planificador": {
            "total_parcelas": len(plan_parcelas),
            "parcelas_con_leguminosa": conteo_leguminosas,
            "cumple_al_menos_una_leguminosa": conteo_leguminosas >= 1,
            "familias_repetidas": familias_repetidas,
            "parcelas_elegibles_chuno_por_altitud_y_helada": [
                p["parcela_id"] for p in plan_parcelas if p["chuno_tunta"]["elegible_altitud_y_helada"]
            ],
            "chuno_activado_estado": "no_disponible" if im_papa is None else "evaluado",
        },
        "plan_rotacion_10_parcelas": plan_parcelas,
        "comparador_abc_por_parcela": comparador_parcelas,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Comparador A/B/C y Planificador de Rotacion (Paso 3.5)")
    parser.add_argument("--escenario-mas-1c", action="store_true", help="Activar escenario +1 C (RF-13)")
    parser.add_argument("--im-papa", type=float, default=None, help="Indice I_m opcional (si falta, queda no_disponible)")
    parser.add_argument("--humedad-quinua", type=float, default=None, help="Humedad manual de quinua en porcentaje")
    args = parser.parse_args()

    parcelas_data = json.loads((DATA_PROCESSED / "parcelas_demo.json").read_text(encoding="utf-8"))
    cultivos_data = json.loads((DATA_DIR / "cultivos_demo_base.json").read_text(encoding="utf-8"))

    resultado = planificar_rotacion_10_parcelas(
        parcelas_data,
        cultivos_data,
        im_papa=args.im_papa,
        humedad_quinua_pct=args.humedad_quinua,
        escenario_mas_1c=args.escenario_mas_1c,
    )

    out_path = DATA_PROCESSED / "plan_rotacion_demo.json"
    out_path.write_text(json.dumps(resultado, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] Generado {out_path}")
    print("Resumen:", json.dumps(resultado["resumen_planificador"], ensure_ascii=False))


if __name__ == "__main__":
    main()
