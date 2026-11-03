import * as XLSX from 'xlsx';
import type { Transaction, TaxSummary } from '../types';
import { FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '../types';
import { normalizeTransaction, type DateOrder } from './validate';

/** Columnas del archivo: encabezado en español -> campo del modelo. */
export const COLUMNS: { header: string; key: keyof Transaction }[] = [
  { header: 'Fecha', key: 'date' },
  { header: 'Concepto', key: 'concept' },
  { header: 'Tipo', key: 'type' },
  { header: 'Monto Bruto', key: 'grossAmount' },
  { header: 'Frecuencia', key: 'frequency' },
  { header: 'ISSS', key: 'isssAmount' },
  { header: 'AFP', key: 'afpAmount' },
  { header: 'Vialidad', key: 'vialidadAmount' },
  { header: 'Aguinaldo', key: 'isAguinaldo' },
  { header: 'Renta Retenida', key: 'taxWithheld' },
  { header: 'Comentario', key: 'comment' },
  { header: 'ID', key: 'id' },
  { header: 'Creado', key: 'createdAt' },
];

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const HEADER_LOOKUP = new Map<string, keyof Transaction>();
for (const c of COLUMNS) {
  HEADER_LOOKUP.set(strip(c.header), c.key);
  HEADER_LOOKUP.set(strip(c.key), c.key);
}
for (const [alias, key] of [
  ['comment', 'comment'],
  ['comentarios', 'comment'],
  ['nota', 'comment'],
  ['notas', 'comment'],
  ['renta', 'taxWithheld'],
  ['monto', 'grossAmount'],
] as const)
  HEADER_LOOKUP.set(alias, key);

function toRows(list: Transaction[]) {
  return [...list]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({
      Fecha: t.date,
      Concepto: t.concept,
      Tipo: t.type,
      'Monto Bruto': t.grossAmount,
      Frecuencia: t.frequency ?? '',
      ISSS: t.isssAmount ?? '',
      AFP: t.afpAmount ?? '',
      Vialidad: t.vialidadAmount ?? '',
      Aguinaldo: t.isAguinaldo ? 'Sí' : '',
      'Renta Retenida': t.taxWithheld,
      Comentario: t.comment ?? '',
      ID: t.id,
      Creado: t.createdAt,
    }));
}

function summaryRows(s: TaxSummary, year: number | 'all') {
  return [
    ['Ejercicio fiscal', year === 'all' ? 'Todos' : year],
    ['Salarios brutos', s.totalGrossSalary],
    ['(-) ISSS', s.totalISSS],
    ['(-) AFP', s.totalAFP],
    ['Vialidad (informativo, no deducible)', s.totalVialidad],
    ['(-) Aguinaldo exento (máx. $1,500/año)', s.exemptAguinaldo],
    ['Salario neto gravado', s.netSalarySubjectToTax],
    ['Honorarios brutos', s.totalIndependentFees],
    ['(-) Deducción fija asalariados (≤ $9,100)', s.fixedSalaryDeduction],
    ['Gastos médicos (facturados)', s.grossDeductibleMedical],
    ['Gastos médicos (aplicados, máx. $800)', s.appliedDeductibleMedical],
    ['Gastos educativos (facturados)', s.grossDeductibleEdu],
    ['Gastos educativos (aplicados, máx. $800)', s.appliedDeductibleEdu],
    ['Renta neta imponible', s.taxableIncome],
    ['Impuesto determinado (Art. 37 LIR)', s.calculatedTax],
    ['Total renta retenida', s.totalTaxWithheld],
    [s.finalBalance >= 0 ? 'Saldo a pagar' : 'Saldo a devolver', Math.abs(s.finalBalance)],
  ];
}

function legendRows() {
  return [
    ['Código', 'Descripción'],
    ...Object.entries(TRANSACTION_TYPE_LABELS),
    [],
    ...Object.entries(FREQUENCY_LABELS),
  ];
}

export function exportXlsx(list: Transaction[], summary: TaxSummary, year: number | 'all') {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(toRows(list), { header: COLUMNS.map((c) => c.header) });
  ws['!cols'] = [12, 32, 20, 14, 13, 10, 10, 10, 10, 15, 36, 38, 26].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
  const sum = XLSX.utils.aoa_to_sheet(summaryRows(summary, year));
  sum['!cols'] = [{ wch: 42 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, sum, 'Resumen');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(legendRows()), 'Códigos');
  XLSX.writeFile(wb, `isr-calc-${year === 'all' ? 'todos' : year}.xlsx`);
}

export function exportCsv(list: Transaction[], year: number | 'all') {
  const ws = XLSX.utils.json_to_sheet(toRows(list), { header: COLUMNS.map((c) => c.header) });
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `isr-calc-${year === 'all' ? 'todos' : year}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportResult {
  transactions: Transaction[];
  errors: string[];
}

/** Lee la primera hoja (o "Transacciones") de un .xlsx/.xls/.csv. */
export function parseWorkbook(data: ArrayBuffer): ImportResult {
  // raw: true deja los CSV como texto, para interpretar fechas y montos nosotros (evita que SheetJS adivine el formato).
  const wb = XLSX.read(data, { type: 'array', cellDates: true, raw: true });
  const sheetName = wb.SheetNames.includes('Transacciones') ? 'Transacciones' : wb.SheetNames[0];
  if (!sheetName) return { transactions: [], errors: ['El archivo no contiene hojas.'] };
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
    defval: '',
    raw: true,
    blankrows: true, // mantiene la numeración de filas del archivo en los mensajes de error
  });
  return rowsToTransactions(rows);
}

/**
 * Detecta si las fechas de texto del archivo son DD/MM/AAAA o MM/DD/AAAA (formato de Excel en inglés).
 * Si algún segundo número es > 12 el archivo es MM/DD; si no, se asume DD/MM.
 */
export function detectDateOrder(values: unknown[]): DateOrder {
  let mdy = 0;
  let dmy = 0;
  for (const v of values) {
    const m = typeof v === 'string' ? v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-]\d{4}$/) : null;
    if (!m) continue;
    if (+m[2] > 12) mdy++;
    if (+m[1] > 12) dmy++;
  }
  return mdy > dmy ? 'MDY' : 'DMY';
}

export function rowsToTransactions(rows: Record<string, unknown>[]): ImportResult {
  const transactions: Transaction[] = [];
  const errors: string[] = [];
  const mappedRows = rows.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      const key = HEADER_LOOKUP.get(strip(k));
      if (key) mapped[key] = typeof v === 'string' ? v.trim() : v;
    }
    return mapped;
  });
  const order = detectDateOrder(mappedRows.map((r) => r.date));
  mappedRows.forEach((mapped, i) => {
    if (Object.values(mapped).every((v) => v === '' || v === undefined)) return;
    const r = normalizeTransaction(mapped, order);
    if (r.ok) transactions.push(r.value);
    else errors.push(`Fila ${i + 2}: ${r.error}`);
  });
  return { transactions, errors };
}

/** Une importadas con existentes; reemplaza por ID si ya existe. */
export function mergeTransactions(existing: Transaction[], incoming: Transaction[]) {
  const byId = new Map(existing.map((t) => [t.id, t]));
  let added = 0;
  let updated = 0;
  for (const t of incoming) {
    if (byId.has(t.id)) updated++;
    else added++;
    byId.set(t.id, t);
  }
  return { list: [...byId.values()], added, updated };
}
