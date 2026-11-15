# PROMPT ANTIGRAVITY 05 — UI/UX profesional con el brandkit, pendientes y publicación (GitHub)

Lee `.agent/rules/muyu.md`, `02_marca_y_ux/brandkit_v1/MUYU_Brandkit_v1.html`, `02_marca_y_ux/00_IDENTIDAD_MARCA_MUYU.md` y `05_desarrollo/PLAN_DATOS_Y_CONTINGENCIA.md` antes de empezar.

## FASE 0 — Pendientes del prompt 04 (primero esto)
0.1 MODIS NDVI: los fallos fueron por un corte de red ("Could not resolve host"), no del servicio. Reintenta solo las parcelas sin datos, con 1–2 hilos, 3 reintentos y 10 s de espera. Corre pytest y el ETL. Reporta cuántas parcelas tienen NDVI real.
0.2 Si alguna parcela sigue sin datos, se marca `no_disponible`. Nunca la rellenes.

## FASE 1 — Sistema de diseño (decisión tomada: no la cambies)
Hay dos capas de color y cada una tiene su función:

**A. Marca (estructura, navegación, títulos):** tokens del brandkit v1
- `--noche #14303A` (barra superior, títulos, texto principal)
- `--niebla #EEF2F1` (fondo de la app); tarjetas en `#FFFFFF`
- `--quinua #A3325F` (acento de marca: botón principal y enlaces)
- `--tarwi #2F7D4F` solo en rellenos o texto grande (≥ 24 px). **Para texto normal usa `--tarwi-texto #2A7046`** (contraste 5.3:1 sobre niebla; el original da 4.46 y no cumple AA)
- `--papa #D9A441` y `--hielo #9CC3D5`: **solo como relleno o decoración, o como texto sobre Noche** (sobre fondo claro dan menos de 2:1). Hielo = semántica de helada/frío.
- Tipografía: **Outfit** (títulos) + **Source Sans 3** (texto), autohospedadas con `@fontsource`. Nada de llamadas a Google Fonts.

**B. Datos (estrategias y gráficos):** la paleta validada, SIEMPRE con forma
- A Línea base `#B83A00` ▲ · B Escudo hídrico `#003F6E` ■ · C Regenerativa `#007755` ●
- Nunca uses Quinua y Tarwi juntas para distinguir categorías de datos: en deuteranopía se confunden (ΔE 10.8).

**C. Insignias de `estado`** (color + ícono + palabra; nunca solo color):
- observado = círculo lleno · estimado = medio círculo · ilustrativo = contorno punteado · no_disponible = gris con guion "—" y el texto "no disponible".

Pon todos los tokens en `web/src/styles/tokens.css` (variables CSS). Usa CSS plano o CSS Modules; no agregues Tailwind ni un kit de UI pesado. Se permite `lucide-react` para íconos (importa solo los que uses).

## FASE 2 — Pantallas (responsivas: celular 360 px y escritorio 1280 px)
**Barra superior (Noche):** logo SVG del brandkit + "MUYU" · selector de vista (Cooperativa / DRA Ayacucho / Ficha del agricultor) · selector ES/EN · chip "Datos hasta: <fecha>" · aviso "Modo sin conexión: datos locales" cuando se usa el respaldo JSON.

**1. Cooperativa (vista principal)**
- Franja de alertas arriba (3 tarjetas, con cifra grande, fuente y estado):
  1) "Septiembre 2026: el más cálido en 46 años (+1.58 °C)" — NASA POWER
  2) "Octubre 2026: 44 % menos lluvia de lo normal" — GPM IMERG
  3) "Papa en Ayacucho: +19.3 % de intención de siembra → riesgo de saturación" — ENIS MIDAGRI
- Mapa (Leaflet) de las 10 parcelas, con marcador = forma + color de la estrategia recomendada. Al tocar una parcela se abre el panel de detalle: altura (y su fuente), días de helada, suelo, humedad de raíz, NDVI (minigráfico), comparador A/B/C en bandas y regla de chuño/tunta.
- Tabla del plan de rotación (10 parcelas): cultivo previo (ilustrativo), cultivo asignado, ✓/✗ de leguminosa y estrategia.

**2. DRA Ayacucho**
- Gráfico de anomalía de temperatura mensual 2026 contra la normal 1991–2020 (banda de la normal + línea de 2026).
- Lluvia jul–oct 2026 contra 2001–2025 (barras con mediana).
- Índice de saturación de papa (I_m) por mes 2024–2026, con la Prueba 2 marcada (enero 2024: +5.3 El repo YA EXISTE: `https://github.com/lovableprojectscx/ALLPATECH.git`. NO crees otro.
   - Primero revisa si es **público o privado** (`gh repo view lovableprojectscx/ALLPATECH --json visibility`, o pregúntame). Si es público: además del escaneo de secretos, NO subas `.agent/`, ni los PDF de terceros de `01_` a `03_`, ni datos que no sean nuestros; sube solo `05_desarrollo/` (sin `data/raw/`), el README y la LICENSE.
   - Revisa si ya tiene contenido (`git ls-remote`). **Si tiene commits, NO hagas force push ni sobrescribas nada:** clónalo, agrega nuestro código en una rama nueva `muyu-app` y dime qué había antes.
   - Si está vacío: `git init` en la raíz, `git remote add origin` con esa URL, primer commit, rama `main` y push.
   - Confirma con `git status` limpio y `git log --oneline -3`.
5.4 NO despliegues en Vercel: lo conecto yo desde el panel. Deja en `web/README.md` los pasos: Root Directory `05_desarrollo/web`, framework Vite, y las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (nunca la secret).

## Reporte
1. Resultado de MODIS (parcelas con datos). 2. Archivos tocados. 3. Tokens finales con su contraste medido. 4. Salida real de vitest, pytest y build (tamaño del bundle). 5. Lista de capturas. 6. Resultado del escaneo de secretos. 7. Estado de GitHub (URL del repo o comandos pendientes). 8. Supuestos y pendientes.
