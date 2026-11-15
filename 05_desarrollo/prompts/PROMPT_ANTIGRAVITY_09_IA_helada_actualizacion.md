# PROMPT ANTIGRAVITY 09 — "Explícamelo simple" con IA (Gemini), alerta de helada y datos a noviembre

Lee `.agent/rules/muyu.md`. Supabase: solo `gpnjqgdfwraqxoxzfwvn`. La app ya está en Vercel y lee Supabase (bien hecho).
Si todavía no hiciste el pulido anterior (zoom del mapa, "(opción B)", "Lo normal (2001–2025)", impresión), hazlo primero.

## A. Datos actualizados a noviembre (primero)
A1. Vuelve a correr la descarga de POWER hasta la última fecha disponible (POWER publica con algunos días de retraso; usa la fecha más reciente que traiga datos completos, sin días −999). Recalcula `clima_mensual`, `parcelas_demo` (heladas), la Prueba 1 de la tuna (hasta la nueva fecha) y la Prueba 1 de temperatura. Noviembre va como "mes en curso" (`estimado`).
A2. Vuelve a correr MODIS (solo descarga fechas nuevas; usa la caché).
A3. Crea `engine/actualizar_todo.py`: un solo comando que corre POWER, MODIS, mercado, los procesamientos, pytest y el ETL, en ese orden, y se detiene si algo falla.
A4. La barra superior debe tomar la fecha "Datos a …" de la fecha real más reciente en Supabase, no de un texto fijo.
A5. Reporta los valores nuevos de la tuna (GDD 2026, normal y días de adelanto) y las heladas por chacra.

## B. Alerta de helada (inicio de Cooperativa)
B1. Cuarta tarjeta de "Esta campaña", visible SOLO si alguna chacra tiene noches de helada (Tmin ajustada ≤ 0 °C, criterio SENAMHI) en la campaña:
   "Qué hacer: Protege la semilla y el almácigo en las chacras altas." · línea pequeña: "3 chacras altas tuvieron entre 12 y 14 noches de helada esta campaña." (usa los números reales y los nombres de las chacras).
B2. Color/semántica "hielo" (`--hielo` sobre `--noche`, o borde Noche con ícono de copo); insignia "Calculado". En "Ver de dónde sale": NASA POWER, ajuste por altura, umbral 0 °C (SENAMHI).
B3. Para que no sature: en el celular, las 4 tarjetas en carrusel horizontal o en 2×2 compacto. La regla de máximo 2 pantallas de alto se mantiene.

## C. Botón "Explícamelo simple" con IA (Gemini)
**Regla de oro: la IA solo redacta. Los números salen de Supabase y la IA no puede agregar ninguno.**

C1. **Edge Function de Supabase** `explicar-chacra` (Deno/TypeScript):
   - Recibe solo `parcela_id` (y `idioma`: `es`, `en` o `qu`).
   - **Lee los datos de esa chacra desde Supabase en el servidor** (parcela, plan, bandas, heladas, lluvia, tuna si aplica, NDVI y ENIS). NO confía en números que mande el navegador.
   - Llama a la API de Gemini con la clave del secreto `GEMINI_API_KEY` (`Deno.env.get`). **La clave nunca va en el código, en el frontend, en git ni en los logs.**
   - Modelo: usa un modelo Gemini Flash **vigente**. Revisa la documentación oficial de Google AI para el nombre exacto del modelo y el endpoint; no los adivines.
   - Instrucción al modelo (fija, en el servidor): "Eres un técnico agrario de Ayacucho. Explica en 3 frases cortas (máximo 15 palabras cada una), en palabras simples, qué hacer en esta chacra y por qué, usando SOLO los datos JSON dados. No agregues números, porcentajes, fechas ni cultivos que no estén en los datos. No prometas precios ni cosechas. Si un dato dice no_disponible, no lo menciones."
   - **Validación de la salida:** si la respuesta contiene un número que no está en los datos de entrada, o menciona un cultivo no recomendado, se descarta y se devuelve la explicación de **plantilla fija** (sin IA). Agrega una prueba de esta validación.
   - **Caché:** guarda la respuesta en la tabla `ia_explicaciones` (parcela_id, idioma, texto, modelo, creado_en, hash de los datos de entrada). Si los datos no cambiaron, devuelve la caché sin volver a llamar a Gemini. Activa RLS: anon solo SELECT; escribe únicamente la función, con la service role.
   - **Límites:** CORS solo para el dominio de Vercel y localhost; máximo 30 llamadas por minuto en total; tiempo máximo de 10 s y, si se pasa, la plantilla fija.
   - Quechua (`qu`): devuelve el texto con la etiqueta fija "Borrador automático en quechua — debe revisarlo un hablante".
C2. **Frontend:** en el detalle de la chacra y en la ficha, un botón secundario **"Explícamelo simple"** (no es la acción principal). Muestra el texto con la insignia **"Redactado por IA con estos datos"** y el enlace "Ver los datos usados". Estado de carga y, si falla, el texto de plantilla sin mensaje de error técnico.
C3. **No hay chat libre.** No agregues un campo de texto para preguntas.
C4. Despliega la función con el MCP de Supabase (o la CLI). **NO configures el secreto tú:** Jack pone `GEMINI_API_KEY` en Supabase → Edge Functions → Secrets. Deja los pasos en `web/README.md`. Si el secreto no existe, la función devuelve la plantilla.

## D. Pruebas y despliegue
- pytest (actualizar_todo, la tuna con la nueva fecha y la alerta de helada).
- vitest: la tarjeta de helada aparece solo si hay heladas; el botón IA muestra la insignia; ante un fallo se ve la plantilla; no hay ningún campo de chat.
- Prueba de la validación de la Edge Function (respuesta con un número inventado → plantilla).
- Advisors de seguridad de Supabase: 0 alertas.
- Commit a `main` (Vercel redespliega). Capturas: inicio de Cooperativa (escritorio y celular) y el botón IA abierto.

## Reporte
1. Nueva fecha de los datos y valores de la tuna y las heladas. 2. Archivos tocados. 3. Edge Function: nombre, modelo usado (con el link a la documentación), y prueba con y sin secreto. 4. pytest, vitest y build. 5. Advisors. 6. Capturas. 7. Pendientes.
