# Datos de mercado de papa (recolectados 15/11/2026)

## papa_emmsa_mensual.csv
Ingreso mensual total de papa al Gran Mercado Mayorista de Lima (GMML), en toneladas, y precio mayorista de la papa blanca (S/ por kg).
Fuente: EMMSA, elaborado por MIDAGRI-SIEA en los "Boletines de volumen y precio de papa" (cdn.www.gob.pe).

- Es el ingreso **total** a Lima, de todas las regiones. No es solo de Ayacucho.
- Ayacucho aporta entre el 3 % y el 22 % de la oferta semanal según la época (por ejemplo, 22 % en junio de 2023 y 3 % en enero de 2026).
- `verificacion = texto_pdf`: el número se leyó del texto del PDF oficial.
- `verificacion = extraccion_automatica_revisar` (2024, de febrero a diciembre): lo extrajo una herramienta y las columnas no venían rotuladas. **Hay que revisarlo a mano** con el PDF del boletín del 03-01-2025.
- **2025 completo y 2026 (enero a octubre completos; noviembre solo hasta el día 13)** se tomaron del boletín del 13-11-2026 (PDF descargado a mano por Jack). Julio de 2025 aparece revisado: S/ 1.20 (antes 1.17).
- **Faltan:** 2023 (feb–may y jul–sep).
- Dato de 2026: en marzo y abril el precio subió **+132 % y +103 %** frente a 2025 (S/ 1.81 y 1.83) con un volumen casi igual. Es lo contrario de enero de 2024: el precio no depende solo del volumen que entra a Lima.

## Prueba 2 (validada)
Enero 2024 contra enero 2023: el ingreso subió de 55,956 t a 58,948 t (**+5.3 %**) y el precio bajó de S/ 2.09 a S/ 1.09 (**−48 %**). Fuente: boletines del 07, 12, 14 y 22-02-2024.

## enis_papa.csv
ENIS nacional y de Ayacucho. **Para 2026/27, la papa en Ayacucho crece +19.3 % en área**, el segundo mayor aumento del país. Esto es clave para el índice de sobreoferta. Las hectáreas por provincia siguen pendientes.

## produccion_ayacucho.csv
Producción de papa y quinua en Ayacucho, superficie de papa y calendario de cosecha de quinua. El rendimiento de papa de Ayacucho sigue pendiente: por ahora se usa el promedio nacional de 20.6 t/ha, marcado como `estimado`.

## Pendiente: SIEA, rendimiento por cultivo en Ayacucho
No se encontró una descarga directa. Opción: el anuario "Perú: Producción agrícola" o el portal siea.midagri.gob.pe (consulta manual).
Referencia nacional: papa 2025 = 6.9 millones de t, 373,332 ha y 20.6 t/ha (Agraria.pe, 26-02-2026).
