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
- `Transaction`: id, date (YYYY-MM-DD), concept, type, grossAmount, frequency?, isssAmount?, afpAmount?, vialidadAmount?, taxWithheld, comment?, createdAt
- `TransactionType`: SALARY_FORMAL | INDEPENDENT_FEES | DEDUCTIBLE_MEDICAL | DEDUCTIBLE_EDU
- `FrequencyType`: CATORCENAL | QUINCENAL | MENSUAL | UNICO (aguinaldo, bonos únicos)
- `TaxSummary`: ver `src/types.ts`

## Reglas fiscales (`src/lib/tax.ts`)
- `TAX_TABLE`: Art. 37 LIR anual
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
- `R-TAX-06`: Vialidad se registra y totaliza (`totalVialidad`) pero NO reduce la renta imponible
- `R-TAX-05`: Resumen por ejercicio fiscal (año de `date`), selector "Todos los años" disponible.
