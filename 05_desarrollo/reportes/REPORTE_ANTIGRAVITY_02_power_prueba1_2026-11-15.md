Analyzed REVISIONES_2026-11-15.md:L1-126
Ran list all files in 05_desarrollo
Edited REQUISITOS_FUNCIONALES_Y_NO_FUNCIONALES.md
Ran probe elevations of Chiara and Vinchos candidates
Ran probe elevations in Vinchos highland
Used tool: invoke_subagent

Estoy verificando en imagen satelital las coordenadas candidatas sobre `3,550 m` en la zona alta de Chiara y Vinchos para confirmar que correspondan a campos de cultivo reales antes de generar `parcelas_demo_v1.csv` y correr el script unificado de NASA POWER.

Analyzed final_step_24.png
Ran verify DEM elevations of 3 refined satellite parcels
Created parcelas_demo_v1.csv
Edited fetch_power.py
Ran run fetch_power.py for 10 parcels and Prueba 1

Ya actualicé [REQUISITOS_FUNCIONALES_Y_NO_FUNCIONALES.md](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/03_datos_y_arquitectura/REQUISITOS_FUNCIONALES_Y_NO_FUNCIONALES.md), verifiqué en imagen satelital las 3 chacras sobre `3,550 m` y generé [parcelas_demo_v1.csv](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/parcelas_demo_v1.csv). Ahora está corriendo [fetch_power.py](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/engine/fetch_power.py) (`1981–2026` por celda única + normal `1991–2020` + caché de SoilGrids + `prueba1_tuna_huanta.json`); apenas termine te entrego el reporte completo.

Analyzed prueba1_tuna_huanta.json:L1-88
Ran summarize cached 10 parcels and SoilGrids fallbacks

Listo. Completé el ajuste del documento de requisitos y ejecuté las tareas de datos **3.1 a 3.4**.

---

### 1. Archivos creados o modificados
* **[REQUISITOS_FUNCIONALES_Y_NO_FUNCIONALES.md](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/03_datos_y_arquitectura/REQUISITOS_FUNCIONALES_Y_NO_FUNCIONALES.md)** *(modificado)*: actualizado con las decisiones de alcance y los ajustes de la sección 2.
* **[parcelas_demo_v1.csv](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/parcelas_demo_v1.csv)** *(creado; se conserva intacto `parcelas_appeears_v0.csv`)*: 10 parcelas con columnas `elev_dem_m`, `fuente_coord` y `es_aproximada`, reemplazando `P05`, `P07` y `P08` por chacras reales sobre `3,550 m` en Chiara y Vinchos.
* **[fetch_power.py](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/engine/fetch_power.py)** *(modificado / unificado)*: descarga `1981–2026` una vez por celda POWER única, calcula la normal `1991–2020`, aplica ajuste térmico por altitud, cuenta heladas/racha seca/lluvia `≥ 1 mm`, cachea SoilGrids con fallback y genera los JSON procesados.
* **Crudos en `05_desarrollo/data/raw/`** *(creados)*: 4 archivos JSON (`power_r154_c169_19810101_20261031.json`, `power_r153_c169_...`, `power_r153_c168_...`, `power_r152_c169_...`) correspondientes a las **4 celdas únicas** que cubren las 10 parcelas.
* **[prueba1_tuna_huanta.json](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/processed/prueba1_tuna_huanta.json)** *(creado)*: salida de Prueba 1 (`P01 Huanta`) con normal `1991–2020`, anomalías `jul–oct 2026`, ranking `1981–2026` y `estado` por valor.
* **[normales_1991_2020_celdas.json](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/processed/normales_1991_2020_celdas.json)** *(creado)*: normales diarias (`doy 1..366`) `1991–2020` de las 4 celdas POWER.
* **[parcelas_demo.json](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/processed/parcelas_demo.json)** *(creado)*: caché completo de las 10 parcelas (elevación DEM, ajuste térmico, heladas/racha seca/lluvia `2025-07-01` a `2026-06-30` y suelo).

---

### 2. Cambios hechos en el documento de requisitos (`REQUISITOS_FUNCIONALES_Y_NO_FUNCIONALES.md`)
* **Alcance y actores:** cooperativa como usuario principal, DRA Ayacucho como vista secundaria, agricultor sin app (recibe ficha en texto imprimible o para WhatsApp). Fuera de demo: predicción de precios, pesos de usuario, ficha A5/audio, balance hídrico, cumplimiento orgánico completo, `−20 %` lluvia, Sentinel-2, almacenamiento papa/tarwi y modelos de plagas.
* **RF-02 y RF-05:** normal cambiada de `2006–2025` a **`1991–2020`** (serie POWER desde **`1981`**); eliminado el criterio de `≥ 4 semanas` y marcado que `T_base = 10 °C` era de prueba (semanas quedan en `no_disponible` hasta tener `T_base` y GDD de tuna con fuente).
* **RF-08 y RF-10:** poscosecha reducido a **2 reglas** (chuño/tunta `> 3,500 m` + helada + `I_m > 1`; secado quinua `> 12 %`); cumplimiento en cooperativa reducido a **"rotación con leguminosa ✓/✗"**.
* **RF-12 y RF-13:** ficha solo en texto (ES + quechua revisado por hablante, sin A5/audio); escenario solo **`+1 °C`**.
* **RF-15 y RF-16 (nuevos):** procedencia obligatoria por cifra (`estado` + `dato_hasta`, faltantes como `"no disponible"`, sin fuente → `evidencia_insuficiente`) y **radar en bandas** (`alto` / `medio` / `bajo`; plagas en `evidencia_insuficiente`).
* **RNF-04:** mantenida la paleta validada (`#007755`, `#003F6E`, `#B83A00` + `#FAF8F5` / `#1C1917`, con `● ■ ▲`); brandkit v1 excluido de semáforos hasta decisión del equipo.

---

### 3. Resultado de la Prueba 1 (`P01 Huanta` — normal `1991–2020`, serie `1981–2026`, `46` años)
Archivo: [prueba1_tuna_huanta.json](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/processed/prueba1_tuna_huanta.json) (`dato_hasta: 2026-10-31`):

| Mes / Periodo 2026 | `T2M` celda (`estado: observado`) | Normal `1991–2020` | Anomalía vs `1991–2020` | Puesto en `1981–2026` | `T2M` ajustada parcela (`+4.03 °C`, `estado: estimado`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Julio** | `9.10 °C` | `7.77 °C` | **`+1.34 °C`** | **`3 / 46`** | `13.13 °C` |
| **Agosto** | `9.72 °C` | `8.37 °C` | **`+1.35 °C`** | **`3 / 46`** | `13.75 °C` |
| **Septiembre** | `10.80 °C` | `9.22 °C` | **`+1.58 °C`** | **`1 / 46`** | `14.83 °C` |
| **Octubre** | `10.96 °C` | `9.83 °C` | **`+1.13 °C`** | **`3 / 46`** | `14.99 °C` |
| **Acumulado Jul–Sep** | `9.87 °C` | `8.44 °C` | **`+1.42 °C`** | **`2 / 46`** | — |
| **Acumulado Jul–Oct** | `10.14 °C` | `8.79 °C` | **`+1.35 °C`** | **`2 / 46`** | — |

* **`adelanto_en_semanas`:** `"no disponible"` (`estado: "no_disponible"`, pendiente de `T_base` y GDD verificados de tuna).

---

### 4. Qué falló o quedó con fallback, y por qué
* **SoilGrids v2.0 (`rest.isric.org`):** **5 de 10 parcelas** (`P05 chiara_alta_2`, `P06 acocro`, `P07 chiara_alta_1`, `P08 vinchos_alta_1`, `P09 cangallo`) dieron **`The read operation timed out`** (timeout de 18 s). En esas 5 parcelas se aplicó el **fallback por piso altitudinal** (`estado: "estimado"`, `fallback_aplicado: true`). Las otras 5 (`P01`, `P02`, `P03`, `P04`, `P10`) respondieron con datos reales (`estado: "observado"`, arcilla `255–271 g/kg`, pH `6.1–7.1`).
* **NASA POWER (`1981–2026`):** las 4 celdas únicas descargaron completo sin fallos.

---

### 5. Supuestos tomados y verificación de coordenadas
* **Umbral de helada:** parámetro `--umbral-helada 0.0` °C (helada meteorológica estándar; marcado explícitamente en el JSON como *"pendiente de validar con SENAMHI por cultivo"*). Con ese umbral en la campaña `2025-07-01` a `2026-06-30`: `0` días en valles (`P01, P03, P04, P09`), `1–7` días en piso intermedio (`P02, P06, P10`) y **`10–12` días** en las 3 chacras sobre `3,550 m` (`P05, P07, P08`).
* **Gradiente térmico andino:** `--gradiente -4.35` °C/km (punto medio del rango documentado `−3.78` a `−4.93 °C/km` en [FUENTES_DATOS_SATELITALES_REVISADO.md](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/03_datos_y_arquitectura/FUENTES_DATOS_SATELITALES_REVISADO.md)), registrado en cada parcela junto con `elev_dem_m` y `power_cell_elev_m`.
* **Coordenadas nuevas (`> 3,550 m`) y verificación:** inspeccionadas visualmente en **Google Maps Satélite** (zoom 20 m):
  * `P05 chiara_alta_2` (`-13.3051, -74.2051`, `3,682.0 m` DEM): parcela agrícola con surcos paralelos de arado y rastrojo en parcelas vecinas (no pueblo ni cerro rocoso).
  * `P07 chiara_alta_1` (`-13.2965, -74.2159`, `3,584.0 m` DEM): campo de cultivo arado dentro de mosaico agrícola con cercos vivos y reservorio con geomembrana cercano.
  * `P08 vinchos_alta_1` (`-13.2847, -74.3799`, `3,589.0 m` DEM): terraza/chacra de ladera con parvas/gavillas alineadas de cosecha (verificado en captura satelital).
  * *Nota sobre elevación:* `elev_dem_m` se obtuvo con la API de elevación Open-Meteo (Copernicus DEM 90 m) como medida provisional mientras llega el recorte oficial de **NASADEM (30 m)** vía AppEEARS.

---

Si estás conforme con estos datos cacheados y la Prueba 1, el siguiente paso (3.5) es implementar el motor del **Comparador A/B/C** (en bandas `alto`/`medio`/`bajo` + `evidencia_insuficiente`) y el **planificador de rotación de 10 parcelas** sobre `parcelas_demo.json` y `cultivos_demo_base.json`. ¿Avanzamos con eso?