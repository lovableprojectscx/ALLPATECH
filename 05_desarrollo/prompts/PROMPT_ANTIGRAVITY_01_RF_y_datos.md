# Prompt para Antigravity — Requisitos funcionales ajustados + datos reales (Prueba 1)

Contexto: revisé tu reporte `05_desarrollo/reportes/REPORTE_ANTIGRAVITY_requisitos_funcionales_2026-11-15.md`. Los hallazgos A, C y D son correctos y muy útiles. Antes de seguir, aplica estas decisiones del equipo. Lee también `06_revisiones/REVISIONES_2026-11-15.md`.

## 1. Decisiones de alcance (obligatorias)

- **Usuario principal: la cooperativa.** Vista secundaria: gobierno regional (DRA Ayacucho). El agricultor NO usa la app: recibe una ficha (imprimible / texto para WhatsApp) que genera la cooperativa.
- **Núcleo técnico:** anomalía climática → índice de sobreoferta → comparador A/B/C → planificador de rotación de 10 parcelas → ficha.
- **Fuera de la demo (solo "siguiente fase"):** plagas, predicción de precios, pesos de usuario, ficha ampliada, balance hídrico, cumplimiento orgánico completo, escenario −20 % lluvia.
- **Escenario:** solo `+1 °C`.
- **Poscosecha:** solo 2 reglas: (a) chuño/tunta si `I_m > 1` + parcela > 3,500 m (NASADEM) + días de helada; (b) secado de quinua si humedad > 12 %. No implementar el "6.º cálculo ventana de venta" completo.
- **Entrega oficial:** video ≤ 30 s con subtítulos en inglés, o ≤ 7 diapositivas en inglés. Diseña las pantallas para que se entiendan en capturas.

## 2. Ajustes a tus requisitos

- **RF-02:** la anomalía se calcula contra la **normal 1991–2020** (POWER desde 1981), no contra 2006–2025.
- **RF-05:** no afirmar "~4 semanas de adelanto". La temperatura base de 10 °C es de prueba. Reportar solo: puesto de septiembre 2026 en la serie y anomalía en °C. Las semanas se calculan cuando existan `T_base` y grados-día de la tuna en `cultivos_demo_base.json` con fuente.
- **RF-09:** el bloque de cumplimiento se reduce a "rotación con leguminosa ✓/✗" por parcela.
- **RF-11:** solo `+1 °C`.
- **Agregar RF-12 (honestidad):** cada cifra lleva `estado` = `observado | estimado | ilustrativo | no_disponible` y `dato_hasta` (fecha). Lo faltante se muestra "no disponible", nunca 0. Si una regla o parámetro no tiene fuente verificada → estrategia en estado `evidencia_insuficiente`, sin puntaje.
- **Agregar RF-13:** radar en bandas (alto / medio / bajo); los números quedan internos.
- **RNF-01:** mantener la paleta validada para alertas y datos (`#007755`, `#003F6E`, `#B83A00` + `#FAF8F5` / `#1C1917`, con ● ■ ▲). La paleta del brandkit v1 está pendiente de decisión: no la uses en semáforos.

## 3. Tareas en este orden (no escribas más documentos hasta terminar 3.1–3.4)

1. **Coordenadas:** reemplaza 2 o 3 puntos de `parcelas_appeears_v0.csv` por chacras reales sobre 3,550 m (puna de Chiara o Vinchos), verificadas en imagen satelital (deben ser campos, no pueblos ni cerros). Guarda como `parcelas_demo_v1.csv` con columnas extra: `elev_dem_m`, `fuente_coord`, `es_aproximada`. No borres la v0.
2. **Un solo script de POWER:** unifica `engine/fetch_power.py` y `muyu_power.py` (si existe) en `engine/fetch_power.py`. Debe: descargar 1981–2026 **una vez por celda POWER única** (no por parcela), guardar crudo en `data/raw/`, calcular normal 1991–2020 por día del año, anomalía de temperatura mensual, días de helada (umbral como parámetro; marcar "pendiente de validar con SENAMHI"), racha seca más larga, días con lluvia ≥ 1 mm, y corrección térmica por altitud (`elev_dem_m − elev_celda_power`, gradiente como parámetro, rango −3.78 a −4.93 °C/km, registrar el valor usado).
3. **Caché:** SoilGrids y elevación de las 10 parcelas en `data/processed/`, con fallback por piso altitudinal donde falle. Nada de consultas en vivo en la demo salvo POWER con caché.
4. **Prueba 1 (tuna, Huanta):** genera `data/processed/prueba1_tuna_huanta.json` con: anomalía jul–oct 2026 vs normal 1991–2020, puesto de cada mes en la serie 1981–2026, `estado` de cada valor. Sin conversión a semanas.
5. Recién después: motor A/B/C y planificador con `cultivos_demo_base.json`.

## 4. Formato del reporte que espero al terminar

- Archivos creados o modificados (ruta y para qué).
- Resultado de la Prueba 1 con los números exactos y la normal usada.
- Qué falló o quedó con fallback, y por qué.
- Qué supuestos tomaste (umbral de helada, gradiente, etc.).
- No marques nada como "verificado" si no abriste la fuente.
