# PROMPT ANTIGRAVITY 05 — Backend: corrección del I_m y reintento de MODIS

Lee `.agent/rules/muyu.md`. Supabase: SOLO el proyecto `gpnjqgdfwraqxoxzfwvn`.

## Revisión del reporte 04 y tareas
0.1/0.2 Revisé tu reporte 04: migraciones, fuentes (14), GWETROOT y pruebas, todo OK. MODIS quedó vacío y está bien que no inventaras nada.

0.3 **Corrige el índice de saturación (I_m). Hoy no sirve:** los 30 meses con valor dan I_m > 1 (de 1.002 a 1.198) y todos salen como "riesgo de saturación". La causa es que el abastecimiento a Lima crece cada año, así que cualquier mes supera al promedio de los años anteriores.
   - Nueva definición: **I_m = ingreso del mes / ingreso del mismo mes del año anterior.**
   - Bandas: **> 1.05 = "riesgo de saturación"**, **0.95–1.05 = "oferta normal"** y **< 0.95 = "oferta baja"**. Pruebas: ene-2024 = 1.053 → riesgo; mar-2026 = 0.997 → normal.
   - `estado` de I_m: **siempre "estimado"** (es un cálculo; regla 4). Nunca "observado".
   - Nota obligatoria en la UI y en el JSON: "Mide volumen que entra a Lima, no predice precio. Entre 2023 y 2026 la correlación entre la variación del volumen y la del precio fue baja (r = 0.18, n = 31)."
   - En la tarjeta de mercado, la señal principal es la **concentración de siembra** (ENIS: papa en Ayacucho +19.3 %) y el I_m va como apoyo.
   - Actualiza pytest, el JSON y Supabase (ETL).
0.4 MODIS: corre de nuevo `fetch_modis_ndvi.py` UNA vez, con la red estable. Si vuelve a fallar, deja `ndvi_parcelas` vacía y sigue (el NDVI llegará de HLS por AppEEARS).


## Reporte
1. Archivos tocados. 2. Tabla de I_m (2023–2026) con banda y estado. 3. Resultado de MODIS. 4. Salida real de pytest, vitest y build. 5. Filas actualizadas en Supabase.
