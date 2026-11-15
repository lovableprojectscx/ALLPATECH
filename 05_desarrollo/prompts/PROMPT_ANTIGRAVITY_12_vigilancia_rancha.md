# PROMPT ANTIGRAVITY 12 — Vigilancia de la rancha

Mándalo DESPUÉS de terminar el prompt 11 (oportunidades).
Sigue `.agent/rules/muyu.md` como siempre. **No modifiques la skill `kultiva-oportunidades`**: todo lo de este prompt está aquí.

## Qué es
Una tarjeta que avisa a quien siembra papa que **revise sus hojas** cuando llovió seguido. No es un diagnóstico: Kultiva no detecta plagas. Cuenta los días de lluvia de la última semana, el mismo dato que usa la herramienta de discos del CIP (validada en Perú y Ecuador).

## Reglas
- **Datos:** `data/raw/imerg/imerg_serie_jul-oct2026.csv` y `imerg_serie_2001-2025.csv` (IMERG diario, promedio de la caja de Huanta; las filas de datos empiezan con la fecha). Día con lluvia = ≥ 1 mm.
- **Cálculo:** días con lluvia en los 7 días que terminan en la fecha, y la mediana 2001–2025 para la misma semana.
- **Niveles** (simplificación de Kultiva, no del CIP; ponlo en la nota): 0–2 = pocos · 3–4 = varios · 5–7 = frecuentes.
- **Valores esperados (tolerancia 0):** semana al 10 oct = 0 (normal 3) · al 17 oct = 1 (normal 3) · al 24 oct = 6 (normal 3) · **al 31 oct (último dato) = 4 (normal 4)**.
- **Solo en chacras con papa** en su plan.
- Si el último dato tiene más de 10 días, la tarjeta se muestra igual, pero con el aviso visible "Dato hasta el 31 de octubre".
- **Texto (varios o frecuentes):** "En la semana al 31 de octubre llovió 4 de 7 días en tu zona (lo normal: 4). Con lluvia seguida, la rancha avanza rápido. Revisa el envés de las hojas de tu papa, sobre todo si es una variedad que se ancha fácil." **Texto (pocos):** "Pocos días de lluvia esta semana: menos condiciones para la rancha. Sigue revisando."
- **Etiquetas:** Medido (los días de lluvia) / Calculado (el nivel).
- **Prohibido en esta tarjeta:** "riesgo de plaga alto/medio/bajo", "tu chacra tiene rancha", "detectamos", porcentajes de pérdida, dosis y nombres de fungicidas. Nada de rojo de alarma.
- **No uses POWER para esto:** con POWER diario daba 19 días favorables en un octubre seco en Huanta y 0 días todos los años en la puna.

## Tareas
1. `engine/vigilancia_rancha.py` → `data/processed/vigilancia_rancha.json` (fecha_fin, dias_lluvia, normal_mediana, nivel, estado, fuente "NASA GPM IMERG Late V07 (Giovanni)", nota). Agrégalo a `actualizar_todo.py`.
2. Migración nueva `vigilancia_rancha` (RLS, anon solo SELECT) y carga por ETL. Solo el proyecto gpnjqgdfwraqxoxzfwvn.
3. En la tabla `fuentes`, agrega como referencia (no como dato) el boletín agrometeorológico de SENAMHI y la herramienta de discos del CIP.
4. **UI:** una tarjeta "Revisa tu papa" en el detalle de las chacras con papa, con ícono de hoja + gota (lucide), el texto exacto, las etiquetas y los dos enlaces. **Va aparte de las tarjetas de oportunidades** (no cambies su lógica ni su máximo de 3). En la ficha solo sale si el nivel es "frecuentes".
5. Vista Región, una línea: "Siguiente fase: rancha con datos por hora (SENAMHI) y polilla y gorgojo con los modelos del CIP."
6. Esquema zod y respaldo en `public/data/vigilancia_rancha.json`.
7. **Pruebas:**
   - pytest: los 4 valores esperados.
   - vitest:
     - La tarjeta no aparece en chacras sin papa.
     - Con un dato viejo muestra "Dato hasta el …".
     - Ningún texto visible contiene las frases prohibidas.
   - Corre build y haz commit a `main` (sin data/raw, sin .agent, sin force push).

## Reporte
- Valores del JSON contra los esperados.
- Archivos tocados.
- Salida real de pytest, vitest y build.
- Captura de la tarjeta en escritorio y en 390 px.
