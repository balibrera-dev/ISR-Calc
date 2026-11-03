# 01 · PROJECT PLAN (ISR Calc)

## Producto
- `APP_NAME`: ISR Calc (prompt original: "TaxFlow SV")
- `PURPOSE`: Registrar ingresos/deducciones y calcular saldo anual de Renta (F11) para personas naturales en El Salvador.
- `UI_LANGUAGE`: Español
- `BACKEND`: Ninguno. SPA 100% cliente.

## Stack
| Capa | Elección |
|---|---|
| Framework | React 18 + TypeScript (Vite) |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`), dark mode por clase `.dark` |
| Iconos | `lucide-react` |
| Excel/CSV | `xlsx` (SheetJS 0.18.5 de npm; carga diferida) |
| Persistencia | `localStorage` |
| Pruebas | Vitest |
| Hosting | Cloudflare Worker `isr-calc` (static assets) |

## Repo / Git
- `REPO`: github.com/balibrera-dev/ISR-Calc
- `DEFAULT_BRANCH`: `main`
- `FLOW`: rama por feature -> PR -> `main`

## Modelo de datos (`src/types.ts`)
- `Transaction`: id, date (YYYY-MM-DD), concept, type, grossAmount, frequency?, isssAmount?, afpAmount?, vialidadAmount?, serviceYears?, baseSalary?, taxWithheld, comment?, createdAt
- `TransactionType`: SALARY_FORMAL | INDEPENDENT_FEES | AGUINALDO | INDEMNIZACION | BUSINESS_INCOME | RENTAL_INCOME | BUSINESS_EXPENSE | DEDUCTIBLE_MEDICAL | DEDUCTIBLE_EDU
- `FrequencyType`: CATORCENAL | QUINCENAL | MENSUAL | UNICO (aguinaldo, bonos únicos)
- `TaxSummary`: ver `src/types.ts`

## Reglas fiscales (`src/lib/rules.ts` por año + `src/lib/tax.ts` cálculo)
- `R-RULES-01`: Todo lo que cambia por ejercicio (tabla Art. 37, topes, decretos, notas legales con fuente) va en `rulesForYear()` / `YEAR_OVERRIDES` de `src/lib/rules.ts`. Año nuevo o reforma = nuevo bloque ahí.
- `TAX_TABLE_2025+`: reforma abril 2025 (vigente 8-may-2025): Tramo I exento hasta **$6,600**; Tramo II 10% sobre exceso de $6,600 + $212.12 hasta $9,142.86; III y IV iguales. Se aplica a ejercicios ≥ 2025.
- `TAX_TABLE_2011` (ejercicios ≤ 2024): Art. 37 LIR anual
  | Tramo | Desde | Hasta | % | Sobre exceso de | Cuota fija |
  |---|---|---|---|---|---|
  | I | 0.01 | 4,064.00 | 0 | – | 0 |
  | II | 4,064.01 | 9,142.86 | 10 | 4,064.00 | 212.12 |
  | III | 9,142.87 | 22,857.14 | 20 | 9,142.86 | 720.00 |
  | IV | 22,857.15 | ∞ | 30 | 22,857.14 | 3,462.86 |
- `R-TAX-01`: Salario neto gravado = salario bruto − ISSS − AFP
- `R-TAX-02`: Renta imponible = salario neto + honorarios − médicos (máx $800) − educativos (máx $800), mínimo 0
- `R-TAX-03`: Saldo = impuesto − total retenido (>0 pagar, <0 devolución)
- `R-TAX-04`: ISSS sugerido 3% con tope salario $1,000/mes ($30/mes); AFP sugerido 7.25% sin tope. Ambos editables.
- `R-TAX-07`: Aguinaldo es su propio tipo (`AGUINALDO`). Exento hasta el tope de su año (`aguinaldoRuleFor` en `src/lib/rules.ts`): decretos transitorios 2021 $1,100; 2022–2026 $1,500. Sin decreto aplica Art. 4 num. 16 LISR = 2 salarios mínimos de comercio (2020: $608.34; 2027+: $817.60), marcado "por confirmar". Solo el excedente se suma a la renta imponible. Import convierte a AGUINALDO las filas de salario `UNICO` cuyo concepto/comentario dice "aguinaldo" o con columna `Aguinaldo` = Sí (también migra datos guardados con el viejo flag `isAguinaldo`). Nota: NO es "60 días de salario".
- `R-TAX-08`: Indemnización por despido (`INDEMNIZACION`), Art. 4 num. 3 LISR: exenta hasta 30 días de salario básico por año de servicio (`indemnizacionCap` en `src/lib/tax.ts` = años × salario mensual). Sin años o salario se asume la indemnización legal (C. Trabajo Art. 58), exenta completa. Solo el excedente se suma a la renta imponible. Vacaciones proporcionales van como salario; aguinaldo proporcional como Aguinaldo.
- `R-TAX-09`: Negocio propio y alquiler: ganancia = BUSINESS_INCOME + RENTAL_INCOME − BUSINESS_EXPENSE (mínimo 0; la pérdida no reduce el salario). Cualquier ingreso de negocio/alquiler quita la deducción fija de $1,600. En BUSINESS_INCOME el campo taxWithheld es el pago a cuenta (F14, 1.75%). Avisos por año en `src/lib/alerts.ts`: sin $1,600, IVA (Art. 28 Ley IVA: ventas de 12 meses ≥ $5,714.29 o activos ≥ $2,285.71; la app usa el total del año) y pago a cuenta pendiente.
- `R-TAX-10`: Revisión de boletas (`src/lib/payslips.ts`), solo avisos seguros: ISSS > $30 en un mes calendario o > 3% en una boleta; AFP > 7.25% del bruto (no se avisa AFP menor, porque bonos pueden no cotizar); boletas repetidas (fecha + monto); más pagos que los posibles por frecuencia; renta retenida (salario + aguinaldo + indemnización) vs tablas = impuesto(neto gravado − $1,600), tolerancia $25.
- `R-TAX-08`: Deducción fija $1,600 solo si los ingresos son exclusivamente salarios y ≤ $9,100 (Art. 29 num. 7); reemplaza médicos/educativos.
- `R-TAX-09` (explicación): tablas de retención asumen la deducción de $1,600 → en tramo III el F11 queda ~$320 (20% × $1,600) arriba de lo retenido para asalariados > $9,100.
- `R-TAX-06`: Vialidad se registra y totaliza (`totalVialidad`) pero NO reduce la renta imponible
- `R-TAX-05`: Resumen por ejercicio fiscal (año de `date`), selector "Todos los años" disponible.
