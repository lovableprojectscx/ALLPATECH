# PROMPT ANTIGRAVITY 06 — UI/UX para la gente (cooperativa, DRA y agricultor) + GitHub

Mándalo DESPUÉS de terminar el prompt 05 (backend).
Lee antes: `.agent/rules/muyu.md`, `02_marca_y_ux/brandkit_v1/MUYU_Brandkit_v1.html`, `02_marca_y_ux/00_IDENTIDAD_MARCA_MUYU.md` y `05_desarrollo/PLAN_DATOS_Y_CONTINGENCIA.md`.

## FASE 1 — Para quién diseñamos (lee esto antes de dibujar cualquier pantalla)
La app NO es para ingenieros ni para científicos. Es para:

| Usuario | Quién es | Con qué la usa | Qué necesita en 10 segundos |
|---|---|---|---|
| **Técnico o gerente de cooperativa** (principal) | Agrónomo o técnico de campo; trabaja con 50–300 socios | **Celular**, a veces con mala señal, a pleno sol, en reuniones | "¿Qué le digo a cada socio que siembre esta campaña y por qué?" |
| **Especialista de la DRA Ayacucho** | Funcionario público; arma informes | Laptop en oficina; imprime y comparte | "¿Dónde hay riesgo este año y qué zonas van a sembrar lo mismo?" |
| **Agricultor** (no usa la app) | Productor de 0.5–3 ha; muchas veces quechuahablante | **Ficha impresa o por WhatsApp** que le entrega la cooperativa | "¿Qué siembro, cuándo y qué cuido?" |

### Reglas de lenguaje (obligatorias en toda la interfaz en español)
- **Primero la recomendación y después el dato.** Cada tarjeta responde "¿qué hago?" antes de "¿por qué?".
- **Prohibido en la vista principal:** anomalía, I_m, NDVI, GWETROOT, GDD, MERRA-2, celda, píxel, bbox, normal climatológica. Úsalos solo dentro de "Ver de dónde sale este dato".
- Traducciones obligatorias:
  - anomalía de temperatura → "más calor de lo normal (+1.6 °C)"
  - lluvia −44 % → "llovió casi la mitad de lo normal"
  - I_m / saturación → "riesgo de que sobre papa en el mercado"
  - NDVI → "verdor de la chacra"
  - humedad de raíz → "humedad del suelo"
  - helada ≤ 0 °C → "noches de helada"
  - elev_dem_m → "altura de la chacra"
- Insignias de `estado` en palabras simples, siempre con ícono + palabra: observado → **"Medido"**, estimado → **"Calculado"**, ilustrativo → **"Ejemplo"**, no_disponible → **"Sin dato"**.
- Fechas en palabras ("octubre de 2026"), números con 1 decimal como máximo y unidades conocidas (°C, mm, hectáreas, soles por kilo).
- **Divulgación progresiva:** cada cifra tiene un enlace "Ver de dónde sale este dato" que abre fuente, escala, fecha y explicación técnica (eso es lo que mirarán los jueces).
- Máximo 3 mensajes por pantalla en celular. Lo demás va en "Ver más".

## FASE 2 — Sistema de diseño (decisión tomada: no la cambies)
**A. Marca (estructura, navegación, títulos):** tokens del brandkit v1
- `--noche #14303A`: barra superior, títulos y texto principal.
- `--niebla #EEF2F1`: fondo de la app. Tarjetas en `#FFFFFF`.
- `--quinua #A3325F`: acento de marca (botón principal y enlaces).
- `--tarwi #2F7D4F`: solo rellenos o texto grande (≥ 24 px). **Para texto normal usa `--tarwi-texto #2A7046`** (contraste 5.3:1 sobre niebla; el original da 4.46 y no cumple AA).
- `--papa #D9A441` y `--hielo #9CC3D5`: **solo relleno, decoración o texto sobre Noche** (sobre fondo claro dan menos de 2:1). Hielo = helada/frío.
- Tipografía: **Outfit** (títulos) + **Source Sans 3** (texto), autohospedadas con `@fontsource`. Nada de llamadas a Google Fonts.

**B. Datos (estrategias y gráficos):** paleta validada, SIEMPRE con forma
- A Línea base `#B83A00` ▲ · B Escudo hídrico `#003F6E` ■ · C Regenerativa `#007755` ●
- Nunca uses Quinua y Tarwi juntas para distinguir categorías de datos (en deuteranopía se confunden).

Tokens en `web/src/styles/tokens.css`. CSS plano o CSS Modules; no agregues Tailwind ni kits de UI pesados. Se permite `lucide-react` (importa solo los íconos que uses).

## FASE 3 — Pantallas (diseña primero para celular de 360 px y luego adapta a 1280 px)
**Barra superior (Noche):** logo SVG del brandkit + "MUYU" · selector de vista (Cooperativa / DRA Ayacucho / Ficha) · ES/EN · "Datos actualizados a: octubre 2026" · aviso "Sin conexión: mostrando la última copia guardada" cuando se usa el respaldo JSON.

**1. Cooperativa (pantalla de inicio)**
- **"Esta campaña" (3 tarjetas cortas), cada una con "Qué hacer":**
  1) "☀️ Más calor de lo normal: septiembre 2026 fue el más caluroso en 46 años." → "Adelanta la cosecha de tuna y vigila el agua."
  2) "🌧️ Las lluvias se están retrasando: en octubre llovió casi la mitad de lo normal." → "Prefiere cultivos que aguanten la falta de agua (opción B)."
  3) "🥔 Mucha gente sembrará papa: en Ayacucho, +19 % más que antes." → "Riesgo de que sobre papa al cosechar. Considera rotar con tarwi o haba."
- **"Tus chacras":** lista en celular (mapa con un botón) y mapa + lista en escritorio. Cada chacra = tarjeta con nombre, altura y **una recomendación grande** ("Siembra tarwi") con el ícono y color de la estrategia, y 1 línea con el porqué.
- **Detalle de la chacra:** "Recomendación" arriba; "Por qué" en 3 viñetas (helada, lluvia, suelo); "Comparar opciones A/B/C" en bandas con palabras (Alto/Medio/Bajo), nunca números 0–100; botón **"Crear ficha para el socio"**.

**2. DRA Ayacucho**
- Titular en una frase: "2026 viene más caluroso y con lluvias tardías; la siembra de papa crece 19 %."
- 3 gráficos simples cuyo título es la conclusión: "Cada mes de 2026 fue más caluroso que lo normal", "En octubre llovió casi la mitad" y "Papa que llega a Lima cada mes" (con la nota: "no predice el precio").
- Botón "Imprimir / Descargar resumen".

**3. Ficha del agricultor (lo más importante para la gente)**
- 1 página. Arriba: nombre de la chacra o del socio y la campaña.
- **3 mensajes como máximo**, cada uno con un pictograma grande: "Qué sembrar", "Cuándo" y "Qué cuidar" (por ejemplo: "Noches de helada en julio: protege la semilla").
- Letra ≥ 20 px, frases de menos de 12 palabras y sin cifras técnicas.
- Botones "Imprimir" y "Copiar para WhatsApp" (texto plano con emojis simples).
- Quechua: "Traducción al quechua pendiente de revisión por hablante". No inventes la traducción.

## FASE 4 — Calidad UX
- Contraste AA; botones ≥ 48 px; texto base 18 px en celular; legible a pleno sol (nada de gris claro).
- Estados de carga, vacío y error en lenguaje simple ("No pudimos cargar el clima. Mostrando la copia del 31 de octubre").
- Accesible: `aria-label` en mapa y gráficos, foco visible, navegable con teclado.
- i18n ES/EN con diccionario en `web/src/i18n/`. En inglés, el mismo tono simple.
- Textos prohibidos (regla 5) ni en ES ni en EN.
- Bundle inicial < 250 KB gzip.

## FASE 5 — Pruebas y capturas
- vitest: insignias en palabras simples (Medido / Calculado / Ejemplo / Sin dato), ES/EN, banner sin conexión, ausencia de textos prohibidos (ES y EN), **ausencia de términos técnicos en la vista principal** (anomalía, NDVI, I_m, GWETROOT, celda) y que Tarwi no se use para texto pequeño.
- Prueba de lectura: genera la ficha de P05 y verifica que tenga 3 mensajes como máximo y ningún número con decimales.
- `npm run build` debe pasar.
- **Capturas** (Playwright o similar) de las 3 vistas en escritorio (1280×800) y celular (390×844), en `05_desarrollo/web/screenshots/`. Las voy a revisar.

## FASE 6 — GitHub (preparación segura)
6.1 **Escaneo de secretos ANTES de cualquier commit.** Busca `sb_secret_`, `SERVICE_ROLE`, `password`, `machine urs.earthdata` y `_netrc` en todo el árbol. Si aparece algo fuera de `.env` o `_netrc`, detente y repórtamelo.
6.2 `.gitignore` debe excluir: `.env`, `.env.*` (menos `.env.example`), `_netrc`, `data/raw/`, `node_modules/`, `dist/`, `_obsoleto/`, `.pytest_cache/` y `__pycache__/`.
6.3 El repo YA EXISTE: `https://github.com/lovableprojectscx/ALLPATECH.git`. NO crees otro.
   - Revisa si es **público o privado** (`gh repo view lovableprojectscx/ALLPATECH --json visibility`, o pregúntame). Si es público, sube solo `05_desarrollo/` (sin `data/raw/`), el README y la LICENSE; nada de `.agent/` ni de los PDF de terceros de `01_` a `03_`.
   - Revisa si ya tiene contenido (`git ls-remote`). **Si tiene commits: NO hagas force push ni sobrescribas nada.** Clónalo, agrega nuestro código en una rama nueva `muyu-app` y dime qué había antes.
   - Si está vacío: `git init`, `git remote add origin` con esa URL, primer commit en `main` y push.
   - Confirma con `git status` limpio y `git log --oneline -3`.
6.4 NO despliegues en Vercel (lo conecto yo). Deja en `web/README.md` los pasos: Root Directory `05_desarrollo/web`, framework Vite, variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (nunca la secret).

## Reporte
1. Archivos tocados. 2. Tokens finales con su contraste medido. 3. Salida real de vitest, pytest y build (tamaño del bundle). 4. Lista de capturas. 5. Resultado del escaneo de secretos. 6. Estado de GitHub (rama, último commit, visibilidad). 7. Supuestos y pendientes.
