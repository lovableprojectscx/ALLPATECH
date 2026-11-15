# MUYU — Guía de APIs externas y entorno de desarrollo

**Para:** Jack (motor y APIs) y quien programe
**Fecha:** 15 de noviembre de 2026 *(actualizada con el bloque de poscosecha, calidad y normas)*
**Base:** [ARQUITECTURA_API_Y_ATRIBUTOS.md](../03_datos_y_arquitectura/ARQUITECTURA_API_Y_ATRIBUTOS.md), `MUYU — Anticipa el clima, decide qué rotar` y `MUYU — Datos de poscosecha, calidad y normas: beneficio y uso` (15/11/2026).

> Regla del hackatón: **preprocesar, no consultar en vivo**. Solo NASA POWER se consulta en vivo durante la demo. Todo lo demás se descarga antes y se guarda en `data/processed/` como JSON o CSV.

---

## 1. Cuentas que hay que crear HOY (antes de programar)

| # | Cuenta | Para qué | Dónde | Costo | Quién |
|---|---|---|---|---|---|
| 1 | **NASA Earthdata Login** | SMAP, IMERG, ECOSTRESS, HLS, NASADEM (vía AppEEARS o `earthaccess`) | https://urs.earthdata.nasa.gov/users/new | Gratis | Jack |
| 2 | **Anthropic API** (u otro LLM) | Explicación en español y quechua de la ficha | https://console.anthropic.com | De pago por uso | Jack |
| 3 | (Opcional) **OpenTopography API key** | NASADEM por recorte, si AppEEARS demora | https://opentopography.org | Gratis | Jack |

NASA POWER, SoilGrids y PISCO (IRI) **no necesitan cuenta**.

Guardar credenciales en `.env` (nunca en el repo):

```env
EARTHDATA_USER=
EARTHDATA_PASS=
ANTHROPIC_API_KEY=
OPENTOPO_API_KEY=
```

---

## 2. APIs y fuentes, una por una

### 2.1 NASA POWER — clima diario (EN VIVO, sin key) ✅ verificado por el equipo el 14/11

- **Uso:** temperatura (grados-día, heladas), lluvia, ET0, anomalías.
- **Endpoint diario por punto:**

```http
GET https://power.larc.nasa.gov/api/temporal/daily/point
    ?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,WS2M,GWETROOT
    &community=AG
    &latitude=-12.94&longitude=-74.25
    &start=20060101&end=20261031
    &format=JSON
```

- **Respuesta:** `properties.parameter.<PARAM>.<YYYYMMDD>` → valor. Faltantes = `-999`.
- **Escala:** ~50 km. Etiquetar siempre en pantalla como "clima regional".
- **Para el modelo:** bajar 2006–2026 por cada provincia piloto y guardar en `data/raw/power_<provincia>.json`.
- Coordenadas a confirmar por Edwin/Nayeli (centroides de distrito agrícola, no la plaza de armas): Huanta, Huamanga, Cangallo, Vilcashuamán, La Mar.

### 2.2 AppEEARS (NASA LP DAAC) — SMAP, ECOSTRESS, HLS, NASADEM por punto (con Earthdata)

- **Uso:** humedad del suelo (SMAP), estrés hídrico (ECOSTRESS), vigor/NDVI (HLS), altitud y pendiente (NASADEM) para las 10 parcelas de la demo.
- **Base:** `https://appeears.earthdatacloud.nasa.gov/api/`
- **Flujo:**
  1. `POST /login` con usuario y contraseña de Earthdata (Basic Auth) → `token`.
  2. `GET /product` → confirmar nombres exactos de producto y capa (ej. `NASADEM_HGT.001`). **No adivinar versiones: copiarlas de esta respuesta.**
  3. `POST /task` con un JSON tipo `point`: fechas, capas y lista de coordenadas (las 10 parcelas).
  4. `GET /task/{task_id}` hasta `status = done` (puede tardar de minutos a horas: lanzarlo HOY).
  5. `GET /bundle/{task_id}` → descargar los CSV.
- **Header:** `Authorization: Bearer <token>`.
- **Guardar en:** `data/raw/appeears/`.
- Alternativa en Python: librería `earthaccess` (login con Earthdata) para IMERG o granulos completos.

### 2.3 ISRIC SoilGrids v2.0 — suelo (sin key) ✅ verificado por el equipo

```http
GET https://rest.isric.org/soilgrids/v2.0/properties/query
    ?lon=-74.25&lat=-12.94
    &property=clay&property=sand&property=soc&property=phh2o&property=nitrogen
    &depth=0-5cm&depth=15-30cm&value=mean
```

- ⚠️ El equipo comprobó que en zona urbana devuelve `null`. **Fallback obligatorio:** perfil por piso altitudinal + pregunta al agricultor (textura y último cultivo).
- Unidades: `clay`/`sand` en g/kg, `phh2o` en pH×10, `soc` en dg/kg.

### 2.4 SENAMHI PISCO (vía IRI Data Library) — clima peruano de alta resolución (sin key)

- **Base:** `https://iridl.ldeo.columbia.edu/SOURCES/.SENAMHI/.HSR/.PISCO/`
- ⚠️ **Ojo con las fechas disponibles:**
  - Temperatura PISCOt v1.1 diaria: **1981–2016**.
  - Precipitación PISCOp v2.1 mensual: hasta **julio 2025**.
- **Conclusión:** PISCO sirve para climatología histórica (normales y umbrales de helada). Para 2026 (prueba de la tuna) se usa **NASA POWER**.
- Descarga: en cada dataset, "Data Files" o "Expert Mode" → recorte por longitud/latitud → CSV o NetCDF.

### 2.5 FAO GAEZ v4 — idoneidad por cultivo (descarga de mapas)

- **Uso:** aptitud de papa, quinua, haba, etc. por zona.
- **Dónde:** portal de datos FAO GAEZ (buscar "GAEZ v4 data portal"). Descargar el GeoTIFF de idoneidad para cada cultivo y recortar a Ayacucho.
- ⚠️ No verificado aún: confirmar qué cultivos andinos tiene (puede no incluir tarwi; en ese caso usar reglas de Nayely con fuente INIA).

### 2.6 Sentinel-2 / HLS en grande (opcional)

- Solo si hace falta NDVI por área (no por punto): Microsoft Planetary Computer (catálogo STAC) o Google Earth Engine (requiere registro).
- Para la demo, AppEEARS por punto alcanza.

### 2.7 Datos de mercado y oferta del Perú (los consigue Nayely; ver su guía)

| Fuente | Formato | Uso |
|---|---|---|
| Boletines diarios de papa EMMSA/SIEA (gob.pe) | PDF | Ingreso a Lima por región y precio |
| ENIS — Intenciones de siembra (MIDAGRI) | PDF / tablas | Hectáreas que se piensan sembrar |
| SIEA — Producción, superficie y rendimiento | Por confirmar (Excel, CSV o PDF) | Entrenar el modelo de rendimiento |

### 2.8 LLM para la ficha (Anthropic API)

- Entrada: el `StrategyScore` ya calculado + datos de la parcela + ventana de poscosecha/excedente y uso nutricional de tarwi/haba.
- Salida: 3–4 frases sin jerga en español y una versión en quechua chanka (incluyendo las 2–3 líneas de reloj de poscosecha/transformación cuando aplique).
- ⚠️ El texto en quechua **debe revisarlo una persona quechuahablante** antes de mostrarlo en el pitch.
- El LLM **no calcula nada**: solo redacta lo que el motor ya decidió.

---

## 3. Estructura del repositorio (Motor de 6 cálculos)

```text
05_desarrollo/
├── .env                                    # credenciales (NO subir)
├── data/
│   ├── parcelas_appeears_v0.csv            # 10 parcelas piloto para AppEEARS (ya creado)
│   ├── cultivos_demo_base.json             # plantilla base de 4 cultivos (papa, quinua, tarwi, haba)
│   ├── poscosecha_calidad_normas.json      # reglas poscosecha, calidad, chuño/tunta, NTP y alertas ⚠
│   ├── evidencias_y_metricas_demo.json     # cadena de 6 cálculos, backtests y métricas demo
│   ├── raw/                                # descargas tal cual (POWER, AppEEARS, PISCO, PDFs)
│   └── processed/                          # JSON/CSV limpios que usa la app
│       ├── parcelas_demo.json              # 10 parcelas (coords, altitud NASADEM, historial)
│       ├── cultivos.json                   # matriz completa validada por Nayely (4 cultivos)
│       ├── oferta_papa_lima.csv            # EMMSA por región y mes (Nayely)
│       ├── enis_ayacucho.csv               # intenciones de siembra (Nayely)
│       └── rendimiento_siea.csv            # serie por provincia (Nayely)
├── engine/                                 # Python: cadena de 6 cálculos + pruebas
│   ├── fetch_power.py                      # descarga POWER y calcula grados-día (ya creado)
│   ├── gdd.py                              # cálculo 3: calendario de cosecha (adelanto/retraso)
│   ├── oferta.py                           # cálculos 1 y 4: oferta esperada e índice sobreoferta I_m
│   ├── rendimiento.py                      # cálculo 2: factor climático (IA) + reglas calidad (-4 °C / calor)
│   ├── estrategias.py                      # StrategyScore A/B/C + confianza y escala
│   ├── planificador.py                     # cálculo 5: asignación de rotación a 10 parcelas
│   └── poscosecha.py                       # cálculo 6: ventana de venta, chuño/tunta o harina si I > 1
├── api/                                    # FastAPI que sirve los resultados al frontend
└── web/                                    # frontend (Vista regional, Panel coop, Comparador, Ficha)
```

---

## 4. Orden de trabajo sugerido

1. **Hoy:** crear Earthdata y lanzar la tarea de AppEEARS con `data/parcelas_appeears_v0.csv` (es lo que más tarda).
2. **Hoy:** correr `fetch_power.py` para Huanta y confirmar la señal de la tuna (prueba 1).
3. Con los CSV de Nayely: índice de sobreoferta de papa (`oferta.py`) y prueba de enero 2024 (prueba 2).
4. `rendimiento.py` + `estrategias.py` con `cultivos.json` y reglas de calidad (`-4 °C` quinua en floración; calor/sequía en papa).
5. `planificador.py` para las 10 parcelas (reglas: no repetir familia, leguminosa obligatoria, volumen, restricciones como agua para desamargado de tarwi).
6. `poscosecha.py` (6.º cálculo): reloj de poscosecha (6–8 semanas papa sin frío; ≤ 12 % humedad quinua) + salida `chuño/tunta` (> 3,500 msnm con heladas, 4.9:1, NTP 011.401:2020) o `harina/papa seca` (zonas bajas, NTP 011.802) cuando `I > 1`.
7. API + frontend (sin añadir pantallas nuevas: integrar las 2–3 líneas de poscosecha/nutrición en la ficha y el bloque de cumplimiento orgánico/NTP en el panel de cooperativa).
8. Al final: ficha con LLM (ES/quechua) y escenario de lluvia/temperatura (si alcanza).

---

## 5. Contrato de salida para el frontend (extiende `StrategyScore`)

```typescript
export interface StrategyResult extends StrategyScore {
  confidence: "alta" | "media" | "baja";
  data_scale: "regional_50km" | "pisco_10km" | "parcela_30m";
  recommended: boolean;
  pros: string[];
  cons: string[];
}

export interface SupplyIndex {
  crop: "papa" | "quinua";
  month: string;            // "2027-03"
  index: number;            // >1 sobreoferta, <1 escasez
  regions: { name: string; expected_t: number }[];
}

export interface HarvestCalendar {
  crop: string;
  normal_date: string;      // ISO
  estimated_date: string;   // ISO, según grados-día del año
  shift_days: number;       // negativo = adelanto
}

export interface QualityRiskAlert {
  crop: "papa" | "quinua" | "tarwi" | "haba";
  severity: "vigilancia" | "alta";
  rule_summary: string;     // ej. "Pronóstico ~-4 °C en floración de quinua"
  source: string;           // ej. "CIREN; FAO Agris"
  unverified_flag?: boolean;
}

export interface PostharvestWindow {
  crop: "papa" | "quinua" | "tarwi" | "haba";
  recommended_storage_weeks: number | null;
  storage_alert: string;    // ej. "Vender en primeras semanas o procesar; sin frío brota tras 6-8 sem"
  surplus_option?: {
    applies: boolean;       // true si I_m > 1
    product: "chuño_tunta" | "harina_papa_seca" | null;
    yield_ratio_note: string; // ej. "~1 kg tunta por 5 kg papa fresca (4.9:1)"
    ntp_reference: string;    // ej. "NTP 011.401:2020"
  };
  nutrition_use_line?: string; // ej. línea simple para tarwi o haba
}

export interface CooperativeCompliance {
  parcel_id: string;
  rotation_history_ok: boolean;
  legume_in_cycle: boolean;
  years_without_prohibited_inputs: number;
  storage_moisture_ok: boolean;
  lot_traceability_id: string;
  applicable_norms: string[]; // ej. ["Ley 29196", "DS 002-2020-MINAGRI", "Reg. UE 2018/848"]
}
```
