# PROMPT ANTIGRAVITY 08 — UI/UX: perfiles, menos saturación y correcciones visuales + GitHub

Mándalo DESPUÉS de terminar el prompt 07 (datos). Lee `.agent/rules/muyu.md`. Revisé tus 6 capturas: va bien encaminado, pero está saturado y parece solo para cooperativas.

## B0. Entrada por perfil y menos saturación (prioridad 2, la más visible)
Jack revisó las capturas: **se ve saturado y parece hecho solo para cooperativas.** MUYU tiene 3 públicos y cada uno debe ver SU pantalla, no todas.

**Pantalla de entrada (nueva, la primera que se ve):** "¿Quién eres?", con 3 botones grandes de ícono + texto:
1. **"Trabajo en una cooperativa"** → vista Cooperativa.
2. **"Trabajo en la DRA o la municipalidad"** → vista Región.
3. **"Soy agricultor"** → elige su chacra en una lista de nombres y ve SOLO su ficha (sin menús ni gráficos). Es la misma ficha que la cooperativa manda por WhatsApp; el enlace abre directo `/ficha/<chacra>`.
- Guarda la elección (localStorage, con try/catch) y deja un enlace pequeño "Cambiar de perfil".
- Las pestañas de arriba se cambian por el nombre del perfil y "Cambiar".

**Reglas contra la saturación (en todas las vistas):**
- **Una sola acción principal por pantalla** (botón Quinua). Las demás, como enlace o botón secundario.
- **Inicio de Cooperativa = 2 bloques:** las 3 tarjetas "Esta campaña" y "Tus chacras". Nada más. El detalle de la chacra se abre al tocarla (una página o un panel aparte, no debajo de la lista).
- **Tarjetas de alerta más cortas:** título "Qué hacer" + 1 frase. La explicación ("Más calor de lo normal…") va en una línea pequeña, o dentro de "Ver de dónde sale este dato".
- **Insignias:** máximo 1 por bloque, no una por fila.
- **Lista de chacras:** muestra de 6 en 6 y luego "Ver todas". En el celular, una chacra por fila: nombre, altura, la recomendación con su ícono y nada más.
- **Más aire:** usa espacios de 24–32 px entre bloques y no más de 3 colores por pantalla además de los neutros.
- Prueba de saturación: la vista inicial de cada perfil en el celular (390×844) debe caber en **máximo 2 pantallas de alto**. Captúralo.

**Fuera de esta fase (no los agregues):** comerciantes, inversores y ONG. Si quieres, deja una línea al pie: "Próximamente: más perfiles".

## Correcciones de gráficos
G1. **El título del gráfico de temperatura es falso.** "Cada mes de 2026 fue más caluroso que lo normal" no es cierto: mayo quedó por debajo de lo normal y abril casi igual. Cámbialo por **"Desde junio, cada mes fue más caluroso que lo normal"**. Agrega una prueba que verifique el título contra los datos (todos los meses citados con anomalía > 0).
G2. **Gráfico "Papa que llega a Lima":** noviembre de 2026 está incompleto (hasta el día 13) y se ve como un desplome. Muéstralo rayado o claro con la etiqueta "mes en curso", o quítalo del gráfico. El eje Y debe decir "toneladas" con separador de miles (60 000).
G3. Verifica que la UI muestre "Verdor de la chacra" en P01–P08 (un minigráfico del ciclo del año) y "Sin dato todavía" en P09 y P10. Nota en "Ver de dónde sale": "MODIS 250 m: el píxel incluye cercos y árboles alrededor de la chacra".
G4. Si el prompt 07 dejó la tarjeta de la tuna con "unos 10 días de adelanto", muéstrala así: "Tu tuna lleva unos 10 días de adelanto" (y el supuesto, dentro de "Ver de dónde sale este dato").

## B. Diseño para la gente (prioridad 2)
B1. **Nombres, no códigos:** "Chacra de Huanta", "Chacra alta de Chiara 1", "Chacra alta de Vinchos". Nada de `chiara_alta_2` con guion bajo. El código P01 va en gris pequeño. Lo mismo en la ficha ("Chacra de Huanta", no "P01 · huanta").
B2. **Estrategias con nombre simple** (como pedía el prompt 06): A = "Seguir con papa", B = "Cuidar el agua (quinua)", C = "Recuperar el suelo (haba o tarwi)".
B3. **Comparador más corto:**
   - Quita la fila "Plagas" (está fuera de esta fase; ponlo en una línea al pie: "Plagas: en la siguiente fase").
   - Quita la fecha "2026-10-31" de cada insignia; la fecha ya está en la barra superior y dentro de "Ver de dónde sale este dato".
   - "Clima y suelo" aparece como "Ejemplo": si se calcula con datos reales es "Calculado"; si no, explica por qué es ejemplo.
   - En el celular, el comparador va **cerrado** detrás de un botón "Comparar opciones" (hoy la pantalla mide más de 5,000 px).
B4. P10 Vilcashuamán recomienda "Siembra papa" justo cuando la tarjeta 3 avisa del riesgo de que sobre papa. Si se mantiene, agrega el porqué en una línea ("altura y suelo aptos; vende escalonado") o revisa la regla.

## C. GitHub y despliegue
C1. Tu log muestra `push ... Exited with code 1` antes del reporte. Confirma con `git ls-remote origin muyu-app` que la rama existe en GitHub y pega la salida.
C2. Sube estas correcciones a la misma rama `muyu-app` (sin force push).
C3. Para Vercel: abre el Pull Request de `muyu-app` → `main` (no lo fusiones; lo fusiono yo) y deja el link.

## Reporte
1. Archivos tocados. 2. pytest, vitest y build (salida real). 3. Capturas con Supabase conectado: pantalla de entrada + las 3 vistas de perfil, en escritorio y celular; altura de cada captura de celular. 4. Salida de `git ls-remote` y link del PR.
