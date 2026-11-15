# PROMPT ANTIGRAVITY 11 — Oportunidades y "Calendario de mi chacra"

Mándalo DESPUÉS de terminar el prompt 10 (nombre Kultiva).
Lee y sigue **`.agent/skills/kultiva-oportunidades/SKILL.md`** (definiciones, fórmulas, valores esperados y reglas) y `.agent/rules/muyu.md`.

## Tareas
1. **Motor:** crea `engine/oportunidades.py`, que calcula O1–O6 según la skill y genera `data/processed/oportunidades.json` (por chacra: qué oportunidades aplican, valores, estado, fuente y nota). Agrégalo a `actualizar_todo.py`.
2. **Supabase:** tabla `oportunidades` (migración nueva, RLS con SELECT solo para anon) y carga por ETL.
3. **UI, cambio de enfoque:** las tarjetas "Qué hacer" de Cooperativa pasan a ser **"Oportunidades de esta campaña"** (máximo 3 visibles + "Ver más"), con la acción en positivo según la skill. La alerta de helada del prompt 09 se convierte en la oportunidad O2.
4. **Calendario de mi chacra** en el detalle de cada chacra y en la ficha (versión simple), según la skill.
5. **Ficha del agricultor:** 1 oportunidad (la más importante de esa chacra) + el calendario simple.
6. **Vista Región:** la línea del semáforo regional y su nota de siguiente fase.
7. **Gemini ("Explícamelo simple"):** incluye las oportunidades de la chacra en los datos que recibe la Edge Function (siguen aplicando la validación de números y la plantilla de respaldo).
8. Pruebas de la skill + build + commit a `main` (Vercel redespliega).

## Reporte
1. Tabla de valores obtenidos contra los esperados (O1–O4). 2. Qué oportunidades aplican a cada chacra (las 10). 3. Archivos tocados. 4. pytest, vitest y build (salida real). 5. Capturas: inicio de Cooperativa, detalle de una chacra alta con el calendario, la ficha y la vista Región (escritorio y celular, con la altura de cada captura de celular).
