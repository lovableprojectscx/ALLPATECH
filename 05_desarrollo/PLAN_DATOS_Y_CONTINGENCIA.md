# MUYU — Plan de datos y contingencia (15/11/2026)

Regla: la demo NUNCA depende de un solo dato. Si una fuente no llega, se usa el respaldo y la cifra se marca con su `estado` real.

## 1. Inventario
| # | Dato | Fuente principal | Estado | Respaldo (plan B) | Estado del respaldo |
|---|---|---|---|---|---|
| 1 | Temperatura, helada, lluvia diaria (1981–2026) | NASA POWER | ✅ Listo | — | — |
| 2 | Lluvia satelital + anomalía | GPM IMERG (Giovanni) | ✅ Listo | POWER PRECTOTCORR | ya está |
| 3 | Suelo (arcilla, pH) | SoilGrids | ✅ 10/10 | Piso altitudinal (ilustrativo) | ya está |
| 4 | Mercado de papa (ingreso, precio) | EMMSA/SIEA | ✅ 2024–2026 | — | — |
| 5 | Intención de siembra | ENIS | ✅ Perú + Ayacucho (+19.3 % papa) | — | — |
| 6 | Altura de cada chacra | NASADEM (AppEEARS v1) | ⏳ En cola | Copernicus DEM 90 m (ya en `parcelas_demo_v1.csv`) | ✅ ya está (estimado) |
| 7 | Humedad del suelo | SMAP (AppEEARS v0 38 % / v1) | ⏳ | **POWER GWETROOT** (humedad de raíz, ya descargada) | ✅ ya está |
| 8 | Verdor de la chacra (NDVI) | HLS 30 m (AppEEARS v1) | ⏳ | **MODIS MOD13Q1 250 m** vía ORNL DAAC (API sin login, minutos) | por hacer |
| 9 | Estrés hídrico | ECOSTRESS ESI (AppEEARS v1) | ⏳ | Si no hay pasadas sobre Ayacucho → `evidencia_insuficiente` | — |
| 10 | Rendimiento por cultivo en Ayacucho | SIEA/DRA | ❌ | Rendimiento nacional 20.6 t/ha (estimado) | ✅ |
| 11 | T base de la tuna | Tesis (Nayeli) | ❌ | Semanas = `no_disponible` | ✅ |
| 12 | Texto de la ficha (ES/quechua) | Anthropic API | opcional | Plantillas fijas en ES; quechua "pendiente" | ✅ |

## 2. Niveles de demo
- **Nivel 1 (YA FUNCIONA):** POWER + IMERG + SoilGrids + mercado + ENIS + DEM Copernicus. Alcanza para: anomalía, helada, sobreoferta, comparador A/B/C y plan de rotación.
- **Nivel 2:** + NDVI (MODIS o HLS) + humedad del suelo (GWETROOT o SMAP). Agrega "cómo está la chacra hoy".
- **Nivel 3:** + NASADEM 30 m + ECOSTRESS. Precisión por chacra.

**Decisión:** el video y la página se arman con el Nivel 1. Los niveles 2 y 3 se agregan si llegan a tiempo.

## 3. Cómo importar cada uno cuando llegue
- **AppEEARS (v0 o v1):** Explore → icono de descarga → bajar TODOS los `*-results.csv` → guardarlos en `05_desarrollo/data/raw/appeears/<nombre_solicitud>/`. Antigravity los procesa con `engine/procesar_appeears.py`, filtrando nubes con Fmask (HLS) y valores de relleno.
- **MODIS NDVI (plan B):** Antigravity llama a `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=..&longitude=..&startDate=A2024001&endDate=A2026305&kmAboveBelow=0&kmLeftRight=0` para las 10 parcelas. No necesita login. Escala del NDVI = 0.0001.
- **POWER GWETROOT:** ya está en los crudos POWER. Solo falta agregarlo a `clima_mensual.json`.

## 4. Plazos y cortes
- Si AppEEARS v1 no termina en 24 h → se queda el plan B (MODIS + GWETROOT + DEM Copernicus).
- Ninguna fuente nueva entra después de que se graba el video.
