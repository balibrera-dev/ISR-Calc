# 05 · USER DOCS

## Uso básico
1. Cada ejercicio fiscal tiene su pestaña; el año sale de la fecha de cada transacción.
2. Botón **Nueva transacción** (diálogo; "Agregar y otra" para cargar varias seguidas). Agrega transacciones: salario (con ISSS/AFP autocalculados), honorarios (con renta retenida), gastos médicos o educativos.
3. El panel derecho muestra en vivo el impuesto (Art. 37 LIR), retenciones y saldo F11.

## Importar / exportar
- Exportar: **Excel** con todas las transacciones + una hoja `Resumen AAAA` por año + Códigos; **CSV** con todas las transacciones. Úsalo como respaldo (los datos viven solo en el navegador).
- Importar `.xlsx` / `.csv`. Columnas: `Fecha, Concepto, Tipo, Monto Bruto, Frecuencia, ISSS, AFP, Vialidad, Renta Retenida, Comentario, ID, Creado` (también acepta `Comment`).
  - `Tipo`: código (`SALARY_FORMAL`…) o texto ("Salario", "Honorarios", "Gasto médico", "Gasto educativo").
  - `Fecha`: `YYYY-MM-DD`, `DD/MM/YYYY` o `MM/DD/YYYY` (se detecta por archivo: si algún segundo número es > 12, es MM/DD).
  - `Frecuencia`: `CATORCENAL`, `QUINCENAL`, `MENSUAL` o `UNICO`.
  - Filas vacías se ignoran; filas sin monto se reportan y se omiten.
  - Filas con mismo `ID` se actualizan; sin ID se agregan.
