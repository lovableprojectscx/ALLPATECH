# PROMPT ANTIGRAVITY 04 — Mercado en Supabase, fuentes completas y planes B (humedad + NDVI)

Lee `.agent/rules/muyu.md` y `05_desarrollo/PLAN_DATOS_Y_CONTINGENCIA.md` antes de empezar.
Supabase: SOLO el proyecto con ref `gpnjqgdfwraqxoxzfwvn`. Confírmalo antes de cada migración.

## Revisión del reporte 03
✅ Migración, RLS, ETL y la prueba anon (lectura sí, escritura no) están bien. Las filas cuadran (clima_mensual 2,200 = 4 × 46 × 12 − 8).
Nota: en `package-lock.json` cambié las URL de npmmirror a registry.npmjs.org (los hashes de integridad no cambian). No lo reviertas. Si vuelves a instalar desde el mirror, usa `--registry` solo en el comando y deja el lock apuntando a npmjs.org.

## A. Datos de mercado
A1. Mueve `05_desarrollo/data/raw/mercado/` a `05_desarrollo/data/mercado/`. `data/raw` está en .gitignore y esto sí debe versionarse. Usa copiar y luego mover el original a `_obsoleto`; no borres nada.
A2. Lee el `README_MERCADO.md` de esa carpeta. Ahí dice qué filas de 2024 tienen `verificacion = extraccion_automatica_revisar`: muéstralas en la UI con `estado: "estimado"` y una nota.
A3. Migración `0002_mercado.sql`: tablas `mercado_papa_mensual` (anio, mes, ingreso_t, precio_soles_kg, boletin_fuente, verificacion, estado, dato_hasta), `enis` (ambito, campana, variable, valor, fuente, estado, nota) y `produccion_region` (lo de `produccion_ayacucho.csv`). Activa RLS con SELECT solo para anon.
A4. Agrega estas tablas al ETL. Noviembre de 2026 es parcial (hasta el día 13): `estado: "estimado"` con nota "mes incompleto".
A5. Índice de sobreoferta de papa `I_m` = ingreso del mes / promedio del mismo mes en los años disponibles (2022–2025). Mientras haya menos de 3 años para ese mes, `estado: "estimado"`. Etiqueta en la UI: **"riesgo de saturación"** (no "el precio va a caer"). Prueba obligatoria: enero de 2024 tiene I_m > 1 y su precio bajó 48 % (Prueba 2).

## B. Tabla `fuentes` completa
B1. Llena `fuentes` con TODAS las fuentes, con nombre, URL, qué aporta, escala y fecha de corte: NASA POWER, GPM IMERG Late V07 (Giovanni), SoilGrids v2.0, Copernicus DEM 90 m (Open-Meteo), EMMSA/SIEA (boletines de papa), ENIS MIDAGRI 2025/26 y 2026/27, Ficha agrícola Ayacucho 2024, tesis Marcaquispe Capiso 2021 (tuna), MODIS MOD13Q1 (cuando exista) y NASADEM/SMAP/HLS/ECOSTRESS (`estado: "no_disponible"` hasta que llegue AppEEARS).
B2. Cada cifra en la UI enlaza a su fuente por `fuente_id`.

## C. Plan B: humedad del suelo
C1. Agrega GWETROOT (POWER) a `clima_mensual` como `humedad_suelo_raiz` (0–1), `estado: "observado"` y la nota "modelo MERRA-2, ~50 km, no es medición en la chacra".

## D. Plan B: NDVI con MODIS
D1. `engine/fetch_modis_ndvi.py`: NDVI MOD13Q1 (250 m, cada 16 días) de las 10 parcelas de `parcelas_demo_v1.csv`, de 2024-01 a 2026-10, usando la API REST de ORNL DAAC. **Revisa la documentación oficial** del web service para el endpoint y los parámetros exactos; no los adivines. Escala 0.0001. Descarta los píxeles de mala calidad (pixel reliability ≠ 0/1) y márcalos como `no_disponible`.
D2. Salida `data/processed/ndvi_parcelas.json` (menos de 1 MB), con caché, cargada a Supabase (tabla `ndvi_parcelas`, migración 0003 con RLS).
D3. Si la API no responde: no inventes; deja la tabla vacía y repórtalo.

## E. Pruebas
- pytest: Prueba 2 (I_m enero 2024 > 1), GWETROOT en rango 0–1, NDVI en rango −1 a 1, ningún faltante como 0, JSON menos de 1 MB.
- vitest: el texto "riesgo de saturación" aparece y nunca "precio va a caer"; la fuente de cada cifra se muestra.
- `npm run build` debe pasar.

## Reporte
1. Archivos tocados. 2. Migraciones aplicadas (ref confirmado). 3. Filas por tabla nueva. 4. Tabla I_m de 2024–2026 por mes. 5. NDVI: cuántas fechas válidas por parcela. 6. Salida real de pytest, vitest y build. 7. Pendientes y supuestos.
