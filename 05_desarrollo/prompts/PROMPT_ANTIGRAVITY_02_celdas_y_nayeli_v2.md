# PROMPT ANTIGRAVITY 02 — Corregir celdas POWER + cambios Nayeli v2 (luego motor A/B/C)

Revisé tu reporte contra los archivos. La Prueba 1 está bien. Hay un error de rejilla que hay que corregir ANTES del motor.

## FASE A — Correcciones (obligatorias)

### A1. Corrige `cell_key` en `engine/fetch_power.py`
La rejilla meteorológica de POWER (MERRA-2) tiene sus CENTROS en múltiplos de 0.5° (lat) y 0.625° (lon). Usa el centro más cercano:
```python
lat_idx = round(lat / 0.5); lon_idx = round(lon / 0.625)
```
Prueba de que hoy está mal: `power_r152_c169_*.json` y `power_r153_c168_*.json` son idénticos en todas las variables (misma celda descargada dos veces).
Agrupación esperada después del cambio: {P01,P02,P03,P04}, {P05,P07,P08,P09}, {P06}, {P10}.
- Descarga solo las celdas que faltan (P06 y P10), con 1981-01-01 a 2026-10-31.
- Nombra los crudos con la nueva clave y conserva los antiguos en `data/raw/_obsoleto/` (no los borres).
- Agrega una verificación automática: si dos celdas distintas devuelven T2M idéntico, avisa en la consola.
- Recalcula `parcelas_demo.json`, `normales_1991_2020_celdas.json` y `prueba1_tuna_huanta.json` (este último no debería cambiar; confírmalo).

### A2. Suelo de respaldo
- Reintenta SoilGrids para las 5 parcelas que fallaron: tiempo de espera de 60 s y 3 reintentos con espera de 5/15/30 s.
- Si aun así falla, deja los valores de respaldo con `estado: "ilustrativo"` (no "estimado") y `fuente: "valor referencial por piso altitudinal, sin medición"`.

### A3. Cambios de Nayeli v2 en `REQUISITOS_FUNCIONALES_Y_NO_FUNCIONALES.md` y en `cultivos_demo_base.json` / `poscosecha_calidad_normas.json`
1. RF-06 (a): ELIMINA la regla de la quinua "≈ −4 °C en floración" y cualquier porcentaje de pérdida (vienen de CIREN Chile, no aplican). Cámbiala por: "día con Tmin ajustada ≤ 0 °C (helada meteorológica, criterio SENAMHI) durante la floración → señal de RIESGO de helada", sin porcentaje de pérdida.
2. RF-08 chuño/tunta: sin rendimiento fijo. Quita cualquier "4.9:1", "10 t → 2 t" o similar. La regla solo recomienda considerar la transformación; no calcula kilos.
3. Secado de la quinua: la humedad la ingresa el usuario (campo manual). Si no se ingresa, la regla queda en `no_disponible`.
4. Tuna: GDD de referencia = 2,751.31 °C·día y 161 días (periodo reproductivo, tesis Marcaquispe Capiso 2021, UNSCH, INIA Canaán), con `estado: "estimado"`. La `T_base` y el evento de inicio quedan en `"pendiente"`: las semanas de adelanto siguen como `no_disponible`. NO inventes la T_base.

## FASE B — Solo si la Fase A pasa todas las verificaciones
Implementa el paso 3.5: el comparador A/B/C en bandas (`alto`/`medio`/`bajo` + `evidencia_insuficiente`) y el planificador de rotación de las 10 parcelas sobre `parcelas_demo.json` y `cultivos_demo_base.json`, siguiendo RF-11, RF-15 y RF-16. Reglas del planificador: no repetir familia en la misma parcela, al menos una leguminosa en la rotación y chuño solo en parcelas con `elev_dem_m > 3,500` + helada + `I_m > 1` (si `I_m` todavía no existe, queda en `no_disponible`; NO lo inventes).
Colores: A #B83A00 ▲, B #003F6E ■, C #007755 ●.

## Reporte final (formato)
1. Archivos creados/modificados.
2. Tabla parcela → celda nueva → cambio en días de helada y Tmin (antes/después).
3. Confirmación de que la Prueba 1 no cambió (valores).
4. Resultado de SoilGrids (cuáles respondieron).
5. Cambios exactos en los requisitos (texto anterior → texto nuevo).
6. Fase B: qué se hizo o por qué no se hizo.
7. Supuestos tomados. No marques nada como "observado" si no viene de una medición.
