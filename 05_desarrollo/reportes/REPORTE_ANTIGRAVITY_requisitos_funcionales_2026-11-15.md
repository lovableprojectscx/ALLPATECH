Searched spaceappschallenge.org for "Field Shift" "Adapting Farms with NASA Data" 2026
Searched spaceappschallenge.org for "project-submission-guide" judging criteria Impact Creativity Validity Relevance Presentation
Searched spaceappschallenge.org for site:spaceappschallenge.org/resources/project-submission-guide "Project Demo" video slides
Searched spaceappschallenge.org for site:spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/ considerations objectives
Ran probe POWER cells and SoilGrids for 10 parcels
Searched spaceappschallenge.org for "project-submission-guide" "30 seconds" OR "2 minutes" OR "7 slides" 2026

Estoy consultando en vivo las 10 coordenadas de [parcelas_appeears_v0.csv](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/parcelas_appeears_v0.csv) contra NASA POWER y SoilGrids (y acabo de verificar las reglas oficiales 2026 del reto *Field Shift* y de envío de demo). Apenas termine esa comprobación en segundo plano te presento el análisis completo de requisitos funcionales y recomendaciones técnicas/innovadoras.

Ran check DEM elevations and Huanta 2026 POWER signal
Ran check monthly Jul-Oct 2026 vs 2006-2025 Huanta anomaly

Antes de escribir código, puse a prueba en vivo las **10 coordenadas actuales** de [parcelas_appeears_v0.csv](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/parcelas_appeears_v0.csv), la señal histórica de **NASA POWER (`2006–2026`)**, la disponibilidad real de **SoilGrids v2.0** y las reglas vigentes del reto en **NASA Space Apps 2026**.

Esas comprobaciones revelaron **4 hallazgos críticos** que condicionan directamente los requisitos funcionales y evitan fallos en la demo.

---

## 1. Hallazgos críticos tras investigar los datos reales en vivo

### A. Desfase de altitud y agrupación de celdas en `parcelas_appeears_v0.csv`
Al consultar las 10 parcelas contra **NASA POWER** y su elevación puntual DEM (`Open-Meteo` / Copernicus DEM):

| ID | Zona (`Category`) | Elevación puntual DEM | Elevación celda POWER (`~50 km`) | Impacto directo en el sistema |
| :--- | :--- | :---: | :---: | :--- |
| `P01` | `huanta` | `2,667 m` | `3,592.73 m` | Diferencia de `−926 m` |
| `P02` | `quinua` | `3,273 m` | `3,592.73 m` | Comparte celda con `P01, P03, P04, P05, P08` |
| `P03` | `acosvinchos` | `2,848 m` | `3,592.73 m` | Diferencia de `−745 m` |
| `P04` | `pacaycasa` | `2,588 m` | `3,592.73 m` | Diferencia de **`−1,005 m`** |
| `P05` | `tambillo` | `3,086 m` | `3,592.73 m` | Misma celda que Huanta |
| `P06` | `acocro` | `3,245 m` | `2,788.98 m` | Celda vecina más baja (`+456 m`) |
| `P07` | `chiara` | `3,358 m` | `3,868.23 m` | Debajo de `3,500 m` en ese punto |
| `P08` | `socos` | `3,350 m` | `3,592.73 m` | Misma celda que Huanta |
| `P09` | `cangallo` | `2,564 m` | `3,868.23 m` | Diferencia de **`−1,304 m`** |
| `P10` | `vilcashuaman` | `3,419 m` | `3,246.24 m` | Máxima elevación actual (`< 3,500 m`) |

**Tres consecuencias técnicas obligatorias:**
1. **Ninguna de las 10 coordenadas actuales supera los `3,500 msnm`** (`máx. 3,419 m` en `P10`). Si la Regla 4 de [poscosecha_calidad_normas.json](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/poscosecha_calidad_normas.json) activa **chuño/tunta solo sobre `3,500 msnm`**, **nunca se activaría** con estas coordenadas —a menos que el código usara erróneamente la altura de celda POWER (`3,592 m`), lo cual recomendaría chuño en valles cálidos como Huanta o Pacaycasa.
2. **6 de 10 parcelas caen en la misma celda POWER (`3,592.73 m`).** La diferenciación entre parcelas vecinas **no** puede venir de POWER, sino de `NASADEM (30 m)`, `SoilGrids`, `ECOSTRESS`, `HLS/Sentinel-2` y las restricciones del agricultor.
3. **Temperaturas absolutas vs anomalía relativa:** No se puede evaluar `T_min ≤ −4 °C` (helada de quinua) o `T2M` para `GDD` usando la celda POWER cruda sin corregir altitud (`PISCOt` o gradiente andino `−3.78` a `−4.93 °C/km` documentado en [FUENTES_DATOS_SATELITALES_REVISADO.md](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/03_datos_y_arquitectura/FUENTES_DATOS_SATELITALES_REVISADO.md)).

### B. La Prueba 1 (Tuna 2026 en Huanta) SÍ tiene señal fuerte en NASA POWER, pero requiere ajuste
En `P01 Huanta` (`2006–2026`):
* **Septiembre 2026** fue el **septiembre más cálido de los 21 años (`rank 1/21`, `10.80 °C` vs `9.49 °C` histórico, `+1.31 °C`)**.
* El trimestre **Julio–Septiembre 2026** fue **`rank 2/21` (`+1.21 °C` sobre 2006–2025)**.
* En `GDD (T_base = 10 °C)` sobre la celda cruda a `3,593 m` el porcentaje se infla artificialmente a **`+160.1%`** (`108.3` vs `41.6`) porque la celda roza los `10 °C`. Al ajustar `+4.0 °C` hacia la altura real del valle (`2,667 m`, gradiente andino), el acumulado Jul–Sep 2026 es **`459.2` vs `347.3` histórico (`+32.2%`)** —aproximadamente **~4 semanas de adelanto térmico ya visible a fines de septiembre**, antes de la maduración temprana reportada a fines de octubre.

### C. SoilGrids v2.0 falló en 5 de 10 coordenadas en vivo por timeout
Al consultar `rest.isric.org` (`timeout=15s`), **`P02, P04, P05, P07, P09` dieron timeout**, mientras `P01, P03, P06, P08, P10` respondieron (`arcilla 259–293 g/kg`, `pH 6.3–7.0`). Esto confirma que **SoilGrids debe estar 100% preprocesado en disco con fallback por piso altitudinal**, nunca consultado en vivo durante la demo.

### D. Regla oficial de envío en NASA Space Apps 2026
Según la guía oficial (*Project Submission Guide* en `spaceappschallenge.org`), el **Project Demo** global admite **video máximo de 30 segundos** (con subtítulos en inglés) **o presentación de máximo 7 diapositivas** (en inglés). Como los documentos actuales mencionan *"video de 2 minutos"* (útil si hay pitch local/regional), conviene prever ambos formatos desde el diseño de pantallas.

---

## 2. Evaluación de Requisitos Funcionales (RF) del Sistema MUYU

Alineados con las **4 vistas** (sin añadir pantallas nuevas), la **cadena de 6 cálculos** y los criterios del reto *Field Shift* (*diseño práctico centrado en el agricultor, comparación de trade-offs, manejo de suelo/agua/erosión y uso honesto de datos NASA*):

### Bloque I — Datos, Escala y Calibración (Base del sistema)
| ID | Requisito Funcional | Criterio de resolución y validación |
| :--- | :--- | :--- |
| **RF-01** | **Preprocesamiento desacoplado de red** | Solo **NASA POWER** (con caché local de respaldo) puede consultarse en vivo. `parcelas_demo.json`, `cultivos.json`, `poscosecha_calidad_normas.json`, `ENIS`, `EMMSA`, `SIEA`, `PISCO` histórico, `SoilGrids`, `NASADEM/ECOSTRESS/HLS` se leen desde `05_desarrollo/data/processed/`. Tiempo de respuesta `< 5 s`. |
| **RF-02** | **Separación explícita de escala y altitud** | Cada parcela almacena `elevacion_parcela_m` (`NASADEM 30 m`) y `pendiente_pct` independientes de `power_cell_elev_m`. Las anomalías relativas (`ΔT`, percentiles) se calculan contra la serie de la propia celda POWER (`2006–2026`); las temperaturas absolutas (`T_min` helada, `GDD`, poscosecha) aplican referencia `PISCOt` o ajuste altitudinal explícito (`−3.78` a `−4.93 °C/km`). |
| **RF-03** | **Trazabilidad e incertidumbre visible** | Toda recomendación expone `data_scale` (`"regional_50km"`, `"pisco_1km_10km"`, `"parcela_30m"`), `confidence` (`"alta"`, `"media"`, `"baja"`), fuente normativa y aviso si un dato usa fallback o tiene marca `⚠` pendiente de validación. |

### Bloque II — Motor de Decisión en 6 Pasos
| ID | Requisito Funcional | Entradas → Regla / Modelo → Salidas |
| :--- | :--- | :--- |
| **RF-04** | **Oferta esperada e Índice de Sobreoferta $I_m$ (Cálculos 1, 2 y 4)** | **Entradas:** `ENIS` + `SIEA` histórico + anomalías `POWER` + ingresos `EMMSA`.<br>**Proceso:** Modelo de rendimiento `F_clima` (regresión/árboles comparado contra promedio histórico con honestidad) → `Oferta_z` → `I_m = Σ Oferta / Promedio 5 años`.<br>**Salida:** Semáforo numérico (`I_m > 1` riesgo sobreoferta; `I_m < 1` oportunidad escasez) + verificación histórica **enero 2024**. |
| **RF-05** | **Calendario GDD y Alertas de Calidad (Cálculo 3 + Reglas Calidad)** | **Entradas:** `T2M_MAX`, `T2M_MIN` (ajustados), `T_base` y `GDD_cosecha` por cultivo.<br>**Proceso:** Acumulación desde el 1 de julio y contraste contra normal `2006–2025` (**Prueba Tuna 2026**). Dispara `QualityRiskAlert`: quinua `T_min ~ −4 °C` en floración (alerta alta); papa mes cálido y seco (alerta menor materia seca / fritura oscura). |
| **RF-06** | **Comparador A/B/C y Optimizador de 10 Parcelas (Cálculo 5)** | **Entradas:** 10 parcelas (`parcelas_demo.json`), `cultivos.json`, meta de volumen de cooperativa y restricciones del agricultor (`secano/riego`, `mano_obra`, `autoconsumo`, **`agua_para_desamargado_tarwi`**).<br>**Proceso:** Calcula `StrategyScore` (A Línea Base / B Escudo Hídrico / C Regenerativa) en 5 ejes (`agua`, `suelo`, `riesgo climático`, `plagas`, `mercado`) y asigna cultivo óptimo a cada parcela prohibiendo repetir familia botánica y exigiendo al menos una leguminosa (`tarwi` o `haba`) por ciclo. |
| **RF-07** | **Reloj de Poscosecha y Salida de Excedente (Cálculo 6)** | **Entradas:** Cultivo asignado/cosechado, fecha estimada de cosecha, `T2M` de la zona, `altitud_parcela_m` (`> 3,500 msnm` y días de helada) e índice `I_m`.<br>**Proceso:** Determina semanas seguras de almacenamiento (papa `6–8 sem` sin frío; quinua recomendar secado si humedad `> 12%`; tarwi desamargado `≤ 4 días` a `16 °C`). Si **`I_m > 1`**, ofrece transformación según piso: **chuño/tunta** (`~4.9:1`, `NTP 011.401:2020`) si `> 3,500 msnm` con heladas, o **harina/papa seca** (`NTP 011.802`) en zonas más bajas. |

### Bloque III — Las 4 Vistas, Cumplimiento y Ficha Bilingüe
| ID | Requisito Funcional | Qué resuelve para el usuario real |
| :--- | :--- | :--- |
| **RF-08** | **Vista Regional (DRA Ayacucho / Compradores)** | Muestra por distrito/región el índice `I_m` de papa, las regiones que abastecen Lima (`EMMSA`) y la anomalía térmica/hídrica actual frente al histórico. |
| **RF-09** | **Panel de Cooperativa + Cumplimiento Orgánico/NTP** | Tabla interactiva de las 10 parcelas (con Don Santos destacado): cultivo previo, cultivo asignado, aporte al volumen de la cooperativa, alertas de vulnerabilidad (`pendiente > 15%`, helada, sequía) y **bloque de cumplimiento**: rotación con leguminosa, años sin sustancias prohibidas, humedad al almacenar (`≤ 12%` quinua), trazabilidad por lote y normas (`Ley 29196`, `DS 002-2020-MINAGRI`, `Reg. UE 2018/848`, `NTP`). |
| **RF-10** | **Comparador A/B/C + Ficha del Agricultor (ES / Quechua Chanka)** | Vista comparativa accesible al sol (`#FAF8F5`, `#1C1917`, 3 colores `━━━ ●` / `- · - ■` / `--- ▲`) + **Ficha imprimible/audio** en lenguaje llano con: (1) qué rotar y por qué, (2) **2–3 líneas de reloj de poscosecha y salida de excedente**, (3) **uso nutricional/valor de tarwi o haba**, y (4) cierre *"El satélite avisa, la chacra decide"*. El LLM solo redacta, nunca calcula. |
| **RF-11** | **Simulador de Escenario "¿Qué pasa si…?"** *(prioridad media/opcional)* | Control simple (`±1 °C` o `−20% lluvia`) que recalcula en tiempo real los 5 ejes del Comparador, las alertas de calidad (`−4 °C` / calor en papa) y la asignación de la cooperativa. |

### Requisitos No Funcionales (RNF) clave
* **RNF-01 (Legibilidad bajo sol andino y daltonismo):** Fondo `#FAF8F5`, tinta `#1C1917`, estrictamente máximo 3 colores (`#007755`, `#003F6E`, `#B83A00`) con trazo + símbolo obligatorio, texto `≥ 16 pt` y botones `≥ 48 × 48 dp` (según [00_IDENTIDAD_MARCA_MUYU.md](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/02_marca_y_ux/00_IDENTIDAD_MARCA_MUYU.md)).
* **RNF-02 (Honestidad científica):** Cero precios predichos y cero mediciones químicas/de sabor atribuidas al satélite. Todo umbral propuesto con `⚠` se etiqueta como *"referencia técnica pendiente de validación local"*.

---

## 3. Recomendaciones Estratégicas, Innovadoras y Creativas

Para que el sistema no sea *"otro visor de mapas con clima"*, sino una solución memorable frente a los criterios **Creativity, Validity, Data Use e Impact** de NASA Space Apps:

### 1. Innovación central: "Ventana Térmica Dual" (Helada = Amenaza + Oportunidad)
Ninguna plataforma del benchmark (ni SENAMHI, ni GEOGLAM, ni Plantix/OneSoil) convierte una alerta climática adversa en una oportunidad comercial concreta.
* **Cómo implementarlo de forma intuitiva:** Cuando el motor detecta noches de helada (`≤ 0 °C` / `−4 °C`) en parcelas `> 3,500 msnm` **y** `I_m > 1` para papa, muestra una tarjeta dual conectada:
  * **En quinua:** *"Riesgo alto en floración (`−4 °C`) → evitar siembra tardía / proteger."*
  * **En papa nativa excedente:** *"Ventana abierta para chuño/tunta (`10 t → ~2 t` aprox., `NTP 011.401:2020`)."*
  Esto conecta en un solo vistazo **clima NASA + mercado peruano + conocimiento ancestral andino**.

### 2. Innovación técnica (Data Use): "Lupa de Escala Real" (50 km vs 30 m)
Los jurados de la NASA penalizan duramente cuando un equipo usa datos de `~50 km` como si midieran una parcela de `1 ha`.
* **Cómo convertir esa debilidad en fortaleza visual:** Incluir un pequeño componente explicativo dentro del Comparador llamado **"¿De dónde sale cada dato?"** que muestre gráficamente:
  * **Capa Regional (`~50 km` NASA POWER):** *Compartida por las 6 parcelas del valle de Huamanga/Huanta — mide anomalía térmica de la campaña.*
  * **Capa Parcela (`30–250 m` NASADEM / ECOSTRESS / SoilGrids + ficha local):** *Explica por qué la parcela de Don Santos recibe una recomendación distinta a la del socio de arriba (`+700 m` más alto).*

### 3. Innovación en Validación (Validity): "Selector Backtest 2024 / 2026" dentro de la misma App
En lugar de contar las dos pruebas hacia atrás solo en diapositivas, coloca un selector superior en la **Vista Regional**:
* **`[ Hoy / Campaña 2026–27 ]`** · **`[ Prueba 1: Jul–Sep 2026 (Adelanto Tuna) ]`** · **`[ Prueba 2: Ene 2024 (Caída Papa −48%) ]`**
* Al pulsar **Prueba 1**, el sistema muestra la serie real `2006–2026` de Huanta destacando que **septiembre 2026 fue `rank 1/21` (`+1.31 °C`)** y la señal ya avisaba `~4 semanas` antes. Al pulsar **Prueba 2**, muestra `I_m > 1` junto al desplome real de `S/ 2.09 → S/ 1.09/kg`. Demuestra validez en vivo en 10 segundos.

### 4. Innovación centrada en el agricultor (Impact): "Tarjeta de Taller Imprimible + Audio Chanka"
Como el agricultor no instala app:
* En la vista de **Ficha del Agricultor**, añade un botón **"Imprimir / Compartir tarjeta de campo"** (formato limpio `A5` en `#FAF8F5` listo para talleres de cooperativa/proyecto Vidas) y un **botón de reproducción de audio** con el resumen hablado de la ficha en español sencillo y quechua chanka (pregrabado/revisado por un hablante para el caso de Don Santos, de modo que nunca falle ni invente pronunciación en vivo).

### 5. Ajustes inmediatos recomendados antes de programar el motor
1. **Corregir el gradiente altitudinal en [parcelas_appeears_v0.csv](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/parcelas_appeears_v0.csv):** Ajustar 2 o 3 coordenadas (por ejemplo sectores altos reales de **Chiara**, **Acocro** o **Vinchos**) para que queden efectivamente entre **`3,550 y 3,900 msnm`** según DEM. Así el piloto tendrá los **3 pisos reales** (`valle tuna/papa ~2,600 m`, `intermedio quinua/tarwi ~3,200 m`, `alto chuño/tunta > 3,550 m`) sin forzar datos.
2. **Pre-cachear SoilGrids y POWER en `05_desarrollo/data/processed/`:** Usar un script de ingesta que agrupe por celda POWER única (en vez de hacer 10 descargas redundantes), aplique la corrección térmica por desnivel `NASADEM − POWER_geom[2]` y guarde el suelo ya resuelto (con el fallback donde haga falta).
3. **Planificar la demo en dos cortes desde el inicio:** Un corte ultracompacto de **30 segundos / 7 slides** para el envío oficial en `spaceappschallenge.org` y el recorrido completo de **2 minutos** para la presentación.

---

## Siguiente paso sugerido

Si estás de acuerdo con este análisis de requisitos funcionales, te propongo empezar preparando el escenario base en este orden:
1. **Consolidar un documento `REQUISITOS_FUNCIONALES.md`** en `03_datos_y_arquitectura/` (opcional) **o pasar directo a corregir los 2–3 puntos altoandinos (`> 3,500 msnm`)** de [parcelas_appeears_v0.csv](file:///c:/Users/jacks/Downloads/NASA_SPACE_APPS_2026/05_desarrollo/data/parcelas_appeears_v0.csv).
2. **Descargar y guardar en `data/raw/` y `data/processed/`** los datos reales de **NASA POWER (`2006–2026`)**, **elevación DEM puntual** y **SoilGrids** de las 10 parcelas, validando automáticamente la **Prueba 1 (Tuna 2026)**.

¿Ajustamos primero las coordenadas altoandinas en `parcelas_appeears_v0.csv` y generamos la base preprocesada de las 10 parcelas + Prueba 1?