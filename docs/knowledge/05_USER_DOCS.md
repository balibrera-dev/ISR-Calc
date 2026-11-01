# 05 · USER DOCS

## Uso básico
1. Elige el ejercicio fiscal (arriba).
2. Agrega transacciones: salario (con ISSS/AFP autocalculados), honorarios (con renta retenida), gastos médicos o educativos.
3. El panel derecho muestra en vivo el impuesto (Art. 37 LIR), retenciones y saldo F11.

## Importar / exportar
- Exportar: **Excel** (hojas Transacciones, Resumen, Códigos) o **CSV** del ejercicio visible.
- Importar `.xlsx` / `.csv`. Columnas: `Fecha, Concepto, Tipo, Monto Bruto, Frecuencia, ISSS, AFP, Renta Retenida, ID, Creado`.
  - `Tipo`: código (`SALARY_FORMAL`…) o texto ("Salario", "Honorarios", "Gasto médico", "Gasto educativo").
  - `Fecha`: `YYYY-MM-DD` o `DD/MM/YYYY`.
  - Filas con mismo `ID` se actualizan; sin ID se agregan.
