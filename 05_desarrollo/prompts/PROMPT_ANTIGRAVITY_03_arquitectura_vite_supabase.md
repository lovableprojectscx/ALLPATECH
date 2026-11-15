# PROMPT ANTIGRAVITY 03 — Arquitectura web (React + Vite + Supabase + Vercel) y pruebas

Antes de empezar, lee y respeta `.agent/rules/muyu.md` (reglas permanentes).

## Revisión de tu reporte 02 (verificado contra los archivos)
✅ `cell_key` corregida, 4 celdas distintas sin duplicados, la Prueba 1 no cambió, SoilGrids 10/10, se quitaron los términos de CIREN y Nayeli v2 está aplicado. Buen trabajo.
⚠️ Corrige esto: en `plan_rotacion_demo.json` cada parcela dice `"estado": "estimado"`, pero el cultivo previo es `ilustrativo`. Por la regla 3, el plan debe ser `"ilustrativo"` hasta que haya historial real.

## Decisión de arquitectura (ya tomada; no la cambies)
- **No usamos React Server Components.** RSC requiere un framework como Next.js; con Vite la app es una SPA. El trabajo pesado NO va al navegador: se hace antes, en Python.
- Flujo: `Python (engine) → data/processed/*.json (agregados pequeños) → script ETL → Supabase (Postgres) → frontend React lee con supabase-js → desplegado en Vercel`.
- Respaldo: si Supabase no responde, el frontend carga los mismos JSON desde `public/data/` (modo demo sin conexión). Ambas fuentes deben devolver la misma forma (mismo contrato).

## FASE A — Datos agregados (Python)
A1. `engine/procesar_imerg.py`: lee los CSV de Giovanni en `data/raw/imerg/` (saltando las 9 líneas de cabecera; valor de relleno −9999.9 → no_disponible) y genera `data/processed/imerg_mensual.json` con, para jul–oct: total 2026, media y mediana 2001–2025, % de anomalía, puesto (de más seco a más lluvioso), días ≥ 1 mm, `estado: "observado"` y `dato_hasta`.
   Valores esperados (prueba automática; tolerancia ±0.2): total 2026 = Jul 24.6, Ago 35.3, Sep 49.1, Oct 38.0 mm; media 2001–2025 = 14.1, 21.5, 31.6, 68.3 mm; Oct 2026 = −44 % (6.º más seco de 26 años).
   Agrega una nota: es el promedio de la zona −74.4,−13.3,−74.0,−12.8 (IMERG Late V07, 0.1°), no de cada chacra.
A2. `engine/agregar_clima_mensual.py`: a partir de los crudos POWER, genera `data/processed/clima_mensual.json` por celda y mes (1981–2026): T2M, Tmin, lluvia, normal 1991–2020, anomalía y puesto. Debe pesar menos de 1 MB.
A3. Pruebas en `engine/tests/` con pytest:
   - `cell_key` agrupa {P01–P04}, {P05,P07,P08,P09}, {P06}, {P10}.
   - La Prueba 1 reproduce Sep 2026 = +1.58 °C y puesto 1/46.
   - Ningún valor faltante sale como 0.
   - El chuño nunca se activa con `elev_dem_m ≤ 3,500`.
   - IMERG da los valores de A1.
   - Ningún JSON de `data/processed/` pesa más de 1 MB.

## FASE B — Supabase
B1. `supabase/migrations/0001_muyu.sql` con las tablas: `parcelas`, `celdas_power`, `clima_mensual`, `lluvia_imerg_mensual`, `estrategias_bandas`, `plan_rotacion`, `fuentes`. Cada tabla de datos lleva las columnas `estado` (CHECK con los 4 valores) y `dato_hasta`. RLS activado y política SELECT solo para `anon`.
B2. `engine/etl_supabase.py`: lee los JSON de `data/processed/` y hace upsert con la service role (leída desde `.env`, nunca escrita en el código). Tiene un modo `--dry-run` que solo valida.
B3. `.env.example` con los nombres de las variables (sin valores) y `.gitignore` que incluya `.env`, `_netrc`, `data/raw/` y `node_modules`.
No crees el proyecto en Supabase: Jack lo crea y te pasa la URL. Deja todo listo para correr.

## FASE C — Frontend (React + Vite + TypeScript)
C1. Crea `web/` con Vite + React + TS. Librerías: `@supabase/supabase-js`, `@tanstack/react-query` (caché), `zod` (validación de contratos), `recharts` (gráficos) y `react-leaflet` (mapa de 10 puntos). No agregues más sin justificarlo.
C2. Capa de datos `web/src/data/`: un único `getX()` por recurso que intenta Supabase y, si falla, usa `public/data/*.json`. Todo pasa por esquemas zod que exigen `estado` y `dato_hasta`.
C3. Vistas (en esqueleto funcional, sin pulir el diseño): (1) Cooperativa: mapa de parcelas + comparador A/B/C en bandas + plan de rotación; (2) DRA: anomalía de temperatura y lluvia por mes; (3) Ficha del agricultor en texto imprimible (español; el quechua queda como "pendiente de revisión por hablante").
C4. Rendimiento: carga diferida de rutas (`React.lazy`), los gráficos reciben datos ya agregados (máximo unos cientos de puntos), React Query con `staleTime` largo. Meta: bundle inicial < 250 KB gzip.
C5. Cada cifra en la UI muestra su `estado` (insignia) y la fuente. Accesibilidad: color + forma, contraste AA.
C6. Pruebas con Vitest + Testing Library: que el esquema zod rechace datos sin `estado`, que el valor faltante se muestre "no disponible", que el respaldo JSON funcione si Supabase falla, y que el comparador no muestre números 0–100.

## FASE D — Vercel
D1. `web/vercel.json` (SPA: rewrites a `index.html`). Documenta en `web/README.md` cómo poner `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel.
D2. `npm run build` debe pasar; reporta el tamaño del bundle.

## Reporte final (formato)
1. Archivos creados/modificados.
2. Salida real de `pytest` y `vitest` (cuántas pasan y cuántas fallan).
3. Tabla IMERG generada (comparada con los valores esperados).
4. Tamaño de cada JSON procesado y del bundle.
5. Qué quedó pendiente y por qué.
6. Supuestos.
