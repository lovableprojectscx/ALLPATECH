"""Pruebas del motor de oportunidades (O1–O6), Calendario de mi chacra y Semáforo regional."""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = ENGINE_DIR.parent
PROCESSED_DIR = ROOT_DIR / "data" / "processed"

if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))


MESES_ES = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}


def _fecha_campana(texto_dm: str) -> date:
    """Convierte '31 de octubre' o '23 de mayo' a una fecha dentro de la campaña 2026-2027."""
    m = re.match(r"^\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s*$", texto_dm.lower())
    assert m, f"Formato de fecha inesperado: {texto_dm}"
    dia = int(m.group(1))
    mes = MESES_ES[m.group(2)]
    anio = 2026 if mes >= 7 else 2027
    return date(anio, mes, dia)


def _cargar_oportunidades() -> dict:
    ruta = PROCESSED_DIR / "oportunidades.json"
    assert ruta.exists(), "Debe existir data/processed/oportunidades.json"
    return json.loads(ruta.read_text(encoding="utf-8"))


def test_o1_inicio_lluvias_valores_skill():
    data = _cargar_oportunidades()
    o1 = data["global_o1_lluvias"]
    assert 55.0 <= o1["mediana_dias_desde_sep1"] <= 59.0
    assert o1["n_anios_con_inicio"] == 24
    assert o1["anio_2026_estado"] == "no_establecidas"
    assert o1["anio_2026_fecha_inicio"] is None
    assert "31 de octubre" in o1["anio_2026_texto"]
    assert o1["estado"] == "estimado"
    assert o1["dato_hasta"] == "2026-10-31"


def test_o2_helada_tolerancias_y_aplicabilidad():
    data = _cargar_oportunidades()
    por_id = {p["parcela_id"]: p for p in data["por_parcela"]}

    con_o2 = {pid for pid, p in por_id.items() if "O2" in p["oportunidades_aplicables"]}
    assert con_o2 == {"P02", "P05", "P07", "P08", "P10"}
    for pid in ("P01", "P03", "P04", "P06", "P09"):
        assert "O2" not in por_id[pid]["oportunidades_aplicables"]

    o2_p05 = next(o for o in por_id["P05"]["oportunidades"] if o["codigo"] == "O2")
    vals = o2_p05["valores_json"]
    assert abs((_fecha_campana(vals["ultima_helada_mediana_texto"]) - date(2026, 9, 1)).days) <= 3
    assert abs((_fecha_campana(vals["ultima_helada_p80_texto"]) - date(2026, 10, 31)).days) <= 3
    assert abs((_fecha_campana(vals["primera_helada_mediana_texto"]) - date(2027, 5, 22)).days) <= 3
    assert abs((_fecha_campana(vals["primera_helada_p20_texto"]) - date(2027, 3, 30)).days) <= 3


def test_o3_tuna_p01_y_rango_elevacion():
    data = _cargar_oportunidades()
    por_id = {p["parcela_id"]: p for p in data["por_parcela"]}

    con_o3 = {pid for pid, p in por_id.items() if "O3" in p["oportunidades_aplicables"]}
    assert con_o3 == {"P01", "P03", "P04", "P09"}

    o3_p01 = next(o for o in por_id["P01"]["oportunidades"] if o["codigo"] == "O3")
    vals = o3_p01["valores_json"]
    assert abs((_fecha_campana(vals["fecha_normal_texto"]) - date(2027, 1, 9)).days) <= 3
    assert abs((_fecha_campana(vals["fecha_estimada_2026_texto"]) - date(2026, 12, 30)).days) <= 3
    assert 7 <= vals["adelanto_dias"] <= 13


def test_o4_precios_papa_medianas_y_advertencia():
    data = _cargar_oportunidades()
    o4 = data["global_o4_precios_papa"]
    medianas = {m["mes"]: m["mediana_soles_kg"] for m in o4["meses"]}
    esperadas = {
        1: 0.98,
        2: 0.88,
        3: 0.92,
        4: 0.91,
        5: 0.99,
        6: 1.14,
        7: 1.29,
        8: 1.36,
        9: 1.53,
        10: 1.12,
        11: 1.31,
        12: 1.17,
    }
    for mes, exp in esperadas.items():
        assert abs(medianas[mes] - exp) <= 0.02

    assert o4["advertencia"] == "Referencia de años anteriores en Lima, no pronóstico. Varía mucho (en marzo de 2026 llegó a S/ 1.81)."
    por_id = {p["parcela_id"]: p for p in data["por_parcela"]}
    con_o4 = {pid for pid, p in por_id.items() if "O4" in p["oportunidades_aplicables"]}
    assert con_o4 == {"P10"}


def test_o5_o6_ficha_y_semaforo():
    data = _cargar_oportunidades()
    por_id = {p["parcela_id"]: p for p in data["por_parcela"]}

    con_o5 = {pid for pid, p in por_id.items() if "O5" in p["oportunidades_aplicables"]}
    assert con_o5 == {"P05", "P07", "P08"}

    con_o6 = {pid for pid, p in por_id.items() if "O6" in p["oportunidades_aplicables"]}
    assert con_o6 == {"P01", "P03", "P04", "P05", "P07", "P08", "P09"}

    assert por_id["P10"]["oportunidad_ficha"]["codigo"] == "O4"
    for pid in ("P01", "P03", "P04", "P09"):
        assert por_id[pid]["oportunidad_ficha"]["codigo"] == "O3"
    for pid in ("P02", "P05", "P07", "P08"):
        assert por_id[pid]["oportunidad_ficha"]["codigo"] == "O2"
    assert por_id["P06"]["oportunidad_ficha"]["codigo"] == "O1"

    # Ninguna oportunidad elegida para Ficha debe llevar decimales en su texto imprimible
    for pid, info in por_id.items():
        accion_ficha = info["oportunidad_ficha"]["accion_ficha"]
        assert not re.search(r"\d+\.\d+", accion_ficha), f"Decimal en accion_ficha de {pid}: {accion_ficha}"

    semaforo = data["semaforo_regional"]
    assert semaforo["linea"] == "Si estas 10 chacras siguen la recomendación: 7 tarwi o haba, 2 quinua y 1 papa."
    assert semaforo["conteo"] == {"tarwi_o_haba": 7, "quinua": 2, "papa": 1}


def test_calendario_mensual_y_textos_prohibidos():
    data = _cargar_oportunidades()
    orden_esperado = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7]

    for info in data["por_parcela"]:
        cal = info["calendario"]
        assert [m["mes_num"] for m in cal["meses"]] == orden_esperado
        assert cal["frase_resumen"]
        assert cal["aria_label"].startswith("Calendario agrícola agosto a julio")
        if info["parcela_id"] in {"P02", "P05", "P07", "P08", "P10"}:
            seguros = [m["mes_largo"] for m in cal["meses"] if m["ventana_segura"]]
            assert seguros[0] == "noviembre"

    texto_completo = json.dumps(data, ensure_ascii=False).lower()
    for prohibido in (
        "pronóstico de precio",
        "el precio será",
        "rendimiento garantizado",
        "4 semanas de adelanto",
        "78/100",
    ):
        assert prohibido not in texto_completo

    # Regla de la tabla cooperativa / Supabase
    total_esperado = sum(len(p["oportunidades_aplicables"]) for p in data["por_parcela"])
    assert len(data["filas_supabase"]) == total_esperado == 30


def test_etl_incluye_oportunidades():
    import etl_supabase

    assert Path(etl_supabase.__file__).exists()
    contenido = Path(etl_supabase.__file__).read_text(encoding="utf-8")
    assert '"oportunidades"' in contenido
    assert "parcela_id,codigo" in contenido
