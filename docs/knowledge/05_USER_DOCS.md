# 05 · USER DOCS

## Uso básico
1. Cada ejercicio fiscal tiene su pestaña; el año sale de la fecha de cada transacción.
2. Botón **Nueva transacción** (diálogo; "Agregar y otra" para cargar varias seguidas). Agrega transacciones: salario (con ISSS/AFP autocalculados), honorarios (con renta retenida), gastos médicos o educativos.
3. El panel derecho muestra en vivo el impuesto (Art. 37 LIR), retenciones y saldo F11.

## Aguinaldo
- Regístralo con el tipo **Aguinaldo** (no como salario ni honorarios). La app separa sola la parte exenta y la gravada según el año de la fecha.
- Topes: 2021 $1,100; 2022–2026 $1,500 (decretos transitorios). Otros años usan la ley base (2 salarios mínimos de comercio) y se marcan "por confirmar".
- Si tu aguinaldo no pasa del tope, no suma nada a tu renta imponible; igual conviene registrarlo para tener el historial completo.

## Indemnización por despido
- Regístrala con el tipo **Indemnización por despido**. Normalmente no paga renta: está exenta hasta 30 días de salario por cada año de servicio, y la indemnización legal completa cabe en ese tope.
- Si llenas años de servicio y salario mensual base, la app calcula el tope y grava solo el excedente. Si los dejas vacíos, la toma como exenta completa.
- Lo demás de la liquidación va aparte: vacaciones proporcionales como salario, aguinaldo proporcional como Aguinaldo.

## Negocio propio y alquileres
- **Ventas de negocio propio:** el total vendido (puede ser por mes). En "Pago a cuenta pagado" anota lo que pagaste en el F14 (1.75% de las ventas).
- **Alquiler cobrado:** el total cobrado por alquilar un inmueble.
- **Costo o gasto de negocio/alquiler:** facturas de lo que gastaste para vender o mantener el inmueble. Se restan de ventas y alquileres; si no tienes el detalle, puedes poner directamente tu ganancia como venta.
- Cada año muestra avisos: si pierdes la deducción de $1,600, si te toca inscribirte en IVA y si te falta pago a cuenta.

## Revisión de boletas
- Cada año revisa tus salarios: ISSS cobrado de más (máx. $30 al mes), AFP arriba del 7.25%, boletas repetidas o de más, y si la renta retenida cuadra con las tablas de retención.
- Si la renta cuadra y aun así el F11 te sale a pagar, es normal: las tablas asumen la deducción de $1,600 que no te aplica si ganas más de $9,100.

## Importar / exportar
- Exportar: **Excel** con todas las transacciones + una hoja `Resumen AAAA` por año + Códigos; **CSV** con todas las transacciones. Úsalo como respaldo (los datos viven solo en el navegador).
- Importar `.xlsx` / `.csv`. Columnas: `Fecha, Concepto, Tipo, Monto Bruto, Frecuencia, ISSS, AFP, Vialidad, Renta Retenida, Comentario, ID, Creado` (también acepta `Comment`).
  - `Tipo`: código (`SALARY_FORMAL`…) o texto ("Salario", "Honorarios", "Gasto médico", "Gasto educativo").
  - `Fecha`: `YYYY-MM-DD`, `DD/MM/YYYY` o `MM/DD/YYYY` (se detecta por archivo: si algún segundo número es > 12, es MM/DD).
  - `Frecuencia`: `CATORCENAL`, `QUINCENAL`, `MENSUAL` o `UNICO`.
  - Filas vacías se ignoran; filas sin monto se reportan y se omiten.
  - Filas con mismo `ID` se actualizan; sin ID se agregan.
