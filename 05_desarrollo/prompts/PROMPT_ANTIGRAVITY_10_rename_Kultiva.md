# PROMPT ANTIGRAVITY 10 — Cambio de nombre: MUYU → Kultiva (solo el nombre)

Mándalo DESPUÉS de terminar el prompt 09. Lee `.agent/rules/muyu.md`.

**Decisión del equipo:** la app ahora se llama **Kultiva**. Cambia SOLO el nombre visible. El logo (los arcos de colores), los colores, la tipografía, la frase "Sabe lo que viene. Siembra lo que conviene." y todo lo demás se quedan igual.

## Qué cambiar
1. **Textos visibles (ES y EN):** barra superior, pantalla "¿Quién eres?", ficha del agricultor (encabezado y el texto de "Copiar para WhatsApp"), versión impresa, mensajes de carga y de error, y el `aria-label` del logo ("Logo de Kultiva").
2. **`index.html`:** `<title>Kultiva — Ayacucho</title>`, la meta description y, si existen, las etiquetas Open Graph (og:title, og:site_name).
3. **i18n:** todas las cadenas con "MUYU" o "Muyu" en `web/src/i18n/`.
4. **Edge Function `explicar-chacra`:** si el texto fijo del sistema o la plantilla nombran a MUYU, cámbialo por Kultiva. Invalida la caché de `ia_explicaciones` solo si el texto guardado contiene "MUYU".
5. **README** de `web/` y de la raíz del repo: el nombre del proyecto pasa a "Kultiva".
6. **Frase de la ficha:** "El satélite avisa, la chacra decide." se queda.

## Qué NO cambiar (evita romper cosas)
- **No renombres** archivos, carpetas, componentes ni variables internas (`MuyuLogo.tsx`, `muyu.test.tsx`, `.agent/rules/muyu.md` y las tablas de Supabase se quedan como están). Solo el texto que ve la gente.
- No toques el proyecto de Supabase, las migraciones ni las variables de entorno.
- No cambies el logo SVG.

## Pruebas
- vitest: ninguna cadena visible contiene "MUYU" o "Muyu" en ES ni en EN (búsqueda en el DOM renderizado de las 4 pantallas: entrada, Cooperativa, Región y Ficha); el `<title>` dice "Kultiva".
- Ajusta las pruebas que esperaban "MUYU".
- `npm run build`, commit a `main` y verifica que Vercel redespliegue.

## Reporte
1. Lista de archivos tocados. 2. `grep -ri "muyu" web/src` mostrando que solo quedan nombres internos (archivos, componentes, imports), ningún texto visible. 3. vitest y build (salida real). 4. Captura de la pantalla de entrada y de la ficha con el nombre nuevo.
