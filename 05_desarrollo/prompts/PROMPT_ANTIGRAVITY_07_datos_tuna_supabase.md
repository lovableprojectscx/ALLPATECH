# PROMPT ANTIGRAVITY 07 — Backend/datos: tuna (T base), conexión Supabase y datos del comparador

Lee `.agent/rules/muyu.md`. Supabase: solo el proyecto `gpnjqgdfwraqxoxzfwvn`. Revisé tu reporte de MODIS (8 de 10) y del I_m: todo OK.

## Tareas
1. **Tuna (dato nuevo de la tesis, ya verificado):** en `cultivos_demo_base.json` → `T_base = 0 °C` (tesis Marcaquispe Capiso 2021, sección 3.3.5, citando a Hernández 2009); método residual GDD = (Tmax+Tmin)/2 − T_base; inicio = brotamiento de yemas florales; 889.63 GD hasta la antesis + 1,861.72 GD hasta la madurez = **2,751.31 GD**, 161 días; INIA Canaán, 2,730 m. Altura óptima de 2,600 a 2,800 m y temperatura media de 16 a 28 °C; con más de 30 °C hay madurez anticipada (Castro et al. 2009, citado por Nayeli).
   - Recalcula `prueba1_tuna_huanta.json`: GDD del 1 de julio al 31 de octubre de 2026 en P01 (celda ajustada por altura) contra la normal 1991–2020. **Valores esperados (tolerancia ±5):** 2026 = 1,865 GD; normal = 1,714 GD; diferencia = +151 GD; puesto 2/46; adelanto ≈ **10 días** (diferencia / GD diario normal de mediados de oct a mediados de nov ≈ 15.0). `estado: "estimado"`. Nota obligatoria: "Supone que el brotamiento empezó el 1 de julio; la fecha real de 2026 no se conoce."
   - En la tarjeta de calor de la UI: "Tu tuna lleva unos 10 días de adelanto" (en "Ver de dónde sale este dato": tesis UNSCH + NASA POWER + el supuesto).
   - Agrega pytest para estos valores.


2. **Modo sin conexión en las capturas:** las 3 vistas muestran "Sin conexión: mostrando la última copia guardada". Averigua si Supabase de verdad falla (falta `.env` en `web/`, una consulta mal hecha, columnas que no coinciden con zod o RLS) o si solo pasó en el entorno de las capturas. Repara la causa. Reporta qué era.
3. **Comparador A/B/C: el mercado ya existe.** "Riesgo de que sobre en el mercado: Sin dato suficiente" contradice la tarjeta 3. Usa ENIS (papa en Ayacucho +19.3 %): opción A (papa) = **Alto**, B (quinua) y C (leguminosa) = **Bajo**, con `estado: "estimado"`.
4. Humedad del suelo (GWETROOT) es un modelo, no una medición en la chacra: la insignia es **"Calculado"**, no "Medido".

## Reporte
1. Tabla de la Prueba 1 de la tuna (2026, normal, diferencia, puesto y días de adelanto). 2. Causa del modo sin conexión y cómo se arregló (y una consulta real con la clave anon que lo pruebe). 3. Archivos tocados. 4. Salida real de pytest y vitest. 5. Filas actualizadas en Supabase.
