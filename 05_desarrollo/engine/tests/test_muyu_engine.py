import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

import pytest

ENGINE_DIR = Path(__file__).resolve().parent.parent
DESARROLLO_DIR = ENGINE_DIR.parent
DATA_DIR = DESARROLLO_DIR / "data"
PROCESSED_DIR = DATA_DIR / "processed"

sys.path.insert(0, str(ENGINE_DIR))

from estrategias_y_planificador import comparar_abc_parcela, planificar_rotacion_10_parcelas  # noqa: E402
from fetch_power import cell_key  # noqa: E402
from procesar_imerg import leer_csv_giovanni, procesar_imerg  # noqa: E402
from procesar_mercado import procesar_mercado  # noqa: E402


def test_cell_key_agrupa_cuatro_celdas_esperadas():
    csv_path = DATA_DIR / "parcelas_demo_v1.csv"
    grupos = defaultdict(list)
    with csv_path.open("r", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            ck = cell_key(float(row["Latitude"]), float(row["Longitude"]))
            grupos[ck].append(row["ID"])

    conjuntos = {frozenset(v) for v in grupos.values()}
    esperados = {
        frozenset(["P01", "P02", "P03", "P04"]),
        frozenset(["P05", "P07", "P08", "P09"]),
        frozenset(["P06"]),
        frozenset(["P10"]),
    }
    assert conjuntos == esperados


def test_prueba1_reproduce_sep_2026():
    p1 = json.loads((PROCESSED_DIR / "prueba1_tuna_huanta.json").read_text(encoding="utf-8"))
    sep = next(m for m in p1["mensual_2026"] if m["mes_num"] == 9)
    assert sep["anomalia_c"] == pytest.approx(1.58, abs=0.01)
    assert sep["puesto_1981_2026"] == 1
    assert sep["total_anios_serie"] == 46
    assert p1["gdd_tuna_jul1_oct31"]["estado"] == "estimado"


def test_ningun_valor_faltante_sale_como_cero():
    parcelas = json.loads((PROCESSED_DIR / "parcelas_demo.json").read_text(encoding="utf-8"))
    cultivos = json.loads((DATA_DIR / "cultivos_demo_base.json").read_text(encoding="utf-8"))

    plan = planificar_rotacion_10_parcelas(parcelas, cultivos, im_papa=None, humedad_quinua_pct=None)
    assert plan["_metadata"]["im_papa"] == "no disponible"
    assert plan["_metadata"]["humedad_quinua_pct"] == "no disponible"
    assert plan["resumen_planificador"]["chuno_activado_estado"] == "no_disponible"

    for item in plan["plan_rotacion_10_parcelas"]:
        assert item["estado"] == "ilustrativo"
        assert item["chuno_tunta"]["im_papa"] == "no disponible"
        assert item["chuno_tunta"]["estado_regla"] == "no_disponible"

    for comp in plan["comparador_abc_por_parcela"]:
        for k, est in comp["estrategias"].items():
            rb = est["radar_bandas"]
            expected_mercado = "alto" if k == "A" else "bajo"
            assert rb["mercado_y_sobreoferta"]["banda"] == expected_mercado
            assert rb["mercado_y_sobreoferta"]["estado"] == "estimado"
            assert rb["riesgo_plagas"]["banda"] == "evidencia_insuficiente"
            assert rb["riesgo_plagas"]["estado"] == "no_disponible"


def test_chuno_nunca_se_activa_con_elevacion_menor_igual_3500():
    cultivos = json.loads((DATA_DIR / "cultivos_demo_base.json").read_text(encoding="utf-8"))
    cultivos_por_id = {c["id"]: c for c in cultivos["cultivos"]}

    parcela_borde = {
        "id": "P_TEST_3500",
        "distrito": "test",
        "elev_dem_m": 3500.0,
        "dato_hasta": "2026-10-31",
        "clima_campana_2025_2026": {
            "t2m_media_ajustada_c": 10.0,
            "tmin_absoluta_ajustada_c": -3.0,
            "dias_helada": 15,
            "racha_seca_max_dias": 10,
        },
        "suelo": {"ph": 6.2},
    }
    comp = comparar_abc_parcela(parcela_borde, cultivos_por_id, "haba", im_papa=1.5)
    alertas_a = comp["estrategias"]["A"]["alertas"]
    assert not any("Considerar transformacion a chuno" in a["mensaje"] for a in alertas_a)

    plan = planificar_rotacion_10_parcelas({"parcelas": [parcela_borde]}, cultivos, im_papa=1.5)
    assert plan["plan_rotacion_10_parcelas"][0]["chuno_tunta"]["elegible_altitud_y_helada"] is False
    assert plan["plan_rotacion_10_parcelas"][0]["chuno_tunta"]["estado_regla"] == "no_aplica"


def test_imerg_valores_esperados_y_fill_value(tmp_path):
    res = procesar_imerg()
    por_mes = {m["mes_num"]: m for m in res["meses_jul_oct"]}

    assert por_mes[7]["total_2026_mm"] == pytest.approx(24.6, abs=0.2)
    assert por_mes[8]["total_2026_mm"] == pytest.approx(35.3, abs=0.2)
    assert por_mes[9]["total_2026_mm"] == pytest.approx(49.1, abs=0.2)
    assert por_mes[10]["total_2026_mm"] == pytest.approx(38.0, abs=0.2)

    assert por_mes[7]["media_2001_2025_mm"] == pytest.approx(14.1, abs=0.2)
    assert por_mes[8]["media_2001_2025_mm"] == pytest.approx(21.5, abs=0.2)
    assert por_mes[9]["media_2001_2025_mm"] == pytest.approx(31.6, abs=0.2)
    assert por_mes[10]["media_2001_2025_mm"] == pytest.approx(68.3, abs=0.2)

    assert por_mes[10]["anomalia_pct"] == pytest.approx(-44.0, abs=1.0)
    assert por_mes[10]["puesto_seco_2001_2026"] == 6

    # Verificar manejo de fill value -9999.9
    csv_fake = tmp_path / "fake.csv"
    cabecera = "\n".join([f"H{i}:,x" for i in range(9)])
    csv_fake.write_text(f"{cabecera}\n2026-10-01,-9999.9\n2026-10-02,1.5\n", encoding="utf-8")
    filas = leer_csv_giovanni(csv_fake)
    assert filas[0] == ("2026-10-01", None)
    assert filas[1] == ("2026-10-02", 1.5)


def test_todos_los_json_procesados_pesan_menos_de_1_mb():
    json_files = list(PROCESSED_DIR.glob("*.json"))
    assert len(json_files) >= 5
    for jf in json_files:
        assert jf.stat().st_size < 1_048_576, f"{jf.name} excede 1 MB"


def test_prueba2_mercado_im_enero_2024_y_nov_parcial():
    res = procesar_mercado()
    p2 = res["prueba2_ene_2024"]
    assert p2["im_enero_2024"] == pytest.approx(1.053, abs=0.001)
    assert p2["variacion_precio_pct"] < -45.0
    assert p2["etiqueta"] == "riesgo de saturación"
    assert p2["estado"] == "estimado"

    mar_2026 = next(r for r in res["mercado_papa_mensual"] if r["anio"] == 2026 and r["mes"] == 3)
    assert mar_2026["im_papa"] == pytest.approx(0.997, abs=0.001)
    assert mar_2026["etiqueta_riesgo"] == "oferta normal"
    assert mar_2026["estado"] == "estimado"

    for r in res["mercado_papa_mensual"]:
        if r["im_papa"] != "no disponible":
            assert r["estado"] == "estimado"
        else:
            assert r["estado"] == "no_disponible"

    assert "r = 0.18, n = 31" in res["_metadata"]["nota_im"]

    nov_2026 = next(r for r in res["mercado_papa_mensual"] if r["anio"] == 2026 and r["mes"] == 11)
    assert nov_2026["estado"] == "no_disponible"
    assert "mes incompleto" in nov_2026["nota"]
    assert nov_2026["im_papa"] == "no disponible"


def test_gwetroot_en_rango_0_a_1():
    clima = json.loads((PROCESSED_DIR / "clima_mensual.json").read_text(encoding="utf-8"))
    valores = []
    for info in clima["celdas"].values():
        for r in info["registros"]:
            gw = r.get("humedad_suelo_raiz")
            if isinstance(gw, (int, float)):
                assert 0.0 <= gw <= 1.0
                valores.append(gw)
    assert len(valores) > 100


def test_ndvi_en_rango_menos_1_a_1():
    ndvi_path = PROCESSED_DIR / "ndvi_parcelas.json"
    if not ndvi_path.exists():
        pytest.skip("ndvi_parcelas.json aun no generado")
    data = json.loads(ndvi_path.read_text(encoding="utf-8"))
    for p in data.get("parcelas", []):
        for r in p.get("registros", []):
            val = r.get("ndvi")
            if isinstance(val, (int, float)):
                assert -1.0 <= val <= 1.0
                assert r["pixel_reliability"] in (0, 1)
            else:
                assert val == "no disponible"
                assert r["estado"] == "no_disponible"


def test_prueba1_tuna_gdd_tbase_0():
    data = json.loads((PROCESSED_DIR / "prueba1_tuna_huanta.json").read_text(encoding="utf-8"))
    assert data["_metadata"]["dato_hasta"] >= "2026-11-12"
    gdd = data["gdd_tuna_jul1_oct31"]
    assert gdd["t_base_c"] == 0.0
    assert gdd["gdd_2026"] == pytest.approx(2046.7, abs=10.0)
    assert gdd["gdd_normal_1991_2020"] == pytest.approx(1895.3, abs=10.0)
    assert gdd["diferencia_gd"] == pytest.approx(151.4, abs=5.0)
    assert gdd["puesto_1981_2026"] == 2
    assert gdd["total_anios_serie"] == 46
    assert gdd["adelanto_dias"] == pytest.approx(10.1, abs=1.0)
    assert gdd["estado"] == "estimado"
    assert "1 de julio" in gdd["nota"]
    nov = [m for m in data["mensual_2026"] if m["mes_num"] == 11]
    assert len(nov) == 1
    assert nov[0]["estado_celda"] == "estimado"
    assert nov[0]["nota"] == "mes en curso"


def test_actualizar_todo_orden_pasos():
    import actualizar_todo

    nombres = [n for n, _ in actualizar_todo.construir_pasos(dry_run=True)]
    assert len(nombres) == 8
    assert "POWER" in nombres[0]
    assert "MODIS" in nombres[1]
    assert "Mercado" in nombres[2]
    assert "pytest" in nombres[6]
    assert "ETL" in nombres[7]


def test_alerta_helada_chacras_altas():
    parcelas = json.loads((PROCESSED_DIR / "parcelas_demo.json").read_text(encoding="utf-8"))["parcelas"]
    altas_con_helada = [
        p for p in parcelas if p["elev_dem_m"] > 3500 and p["clima_campana_2025_2026"]["dias_helada"] > 0
    ]
    assert len(altas_con_helada) == 3
    assert {p["id"] for p in altas_con_helada} == {"P05", "P07", "P08"}
    for p in altas_con_helada:
        assert p["dato_hasta"] >= "2026-11-12"
        assert p["clima_campana_2025_2026"]["tmin_absoluta_ajustada_c"] <= 0.0
