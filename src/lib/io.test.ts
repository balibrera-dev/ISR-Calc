import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { mergeTransactions, parseWorkbook, rowsToTransactions } from './io';
import { parseDate, parseNumber } from './validate';

describe('validate helpers', () => {
  it('parses dates in several formats', () => {
    expect(parseDate('2026-03-15')).toBe('2026-03-15');
    expect(parseDate('15/03/2026')).toBe('2026-03-15');
    expect(parseDate(46096)).toBe('2026-03-15');
    expect(parseDate('31/02/2026')).toBeNull();
  });
  it('parses numbers with $ and thousand separators', () => {
    expect(parseNumber('$1,234.50')).toBe(1234.5);
    expect(parseNumber('12,5')).toBe(12.5);
    expect(parseNumber('abc')).toBeNull();
  });
});

describe('rowsToTransactions', () => {
  it('maps Spanish headers, labels and reports bad rows', () => {
    const { transactions, errors } = rowsToTransactions([
      { Fecha: '2026-01-31', Concepto: 'Empresa', Tipo: 'Salario', 'Monto Bruto': 1000, Frecuencia: 'mensual', ISSS: 30, AFP: 72.5, 'Renta Retenida': 50 },
      { Fecha: '05/02/2026', Concepto: 'Clínica', Tipo: 'Gasto médico', 'Monto Bruto': '$120.00', 'Renta Retenida': 9 },
      { Fecha: 'ayer', Tipo: 'SALARY_FORMAL', 'Monto Bruto': 1 },
      { Fecha: '', Tipo: '' },
    ]);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({ type: 'SALARY_FORMAL', frequency: 'MENSUAL', isssAmount: 30 });
    expect(transactions[1]).toMatchObject({ type: 'DEDUCTIBLE_MEDICAL', grossAmount: 120, taxWithheld: 0 });
    expect(errors).toEqual(['Fila 4: fecha inválida "ayer"']);
  });

  it('round-trips through a CSV workbook', () => {
    const csv = 'Fecha,Concepto,Tipo,Monto Bruto,Renta Retenida\n2026-04-01,Cliente A,INDEPENDENT_FEES,500,50\n';
    const buf = new TextEncoder().encode(csv).buffer as ArrayBuffer;
    const { transactions } = parseWorkbook(buf);
    expect(transactions[0]).toMatchObject({ date: '2026-04-01', grossAmount: 500, taxWithheld: 50 });
  });

  it('round-trips through xlsx', () => {
    const ws = XLSX.utils.aoa_to_sheet([['Fecha', 'Tipo', 'Monto Bruto'], ['2026-05-02', 'DEDUCTIBLE_EDU', 300]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    expect(parseWorkbook(out).transactions[0]).toMatchObject({ type: 'DEDUCTIBLE_EDU', grossAmount: 300 });
  });
});

describe('mergeTransactions', () => {
  it('replaces by id and appends new ones', () => {
    const a = rowsToTransactions([{ ID: 'a', Fecha: '2026-01-01', Tipo: 'Honorarios', 'Monto Bruto': 1 }]).transactions;
    const b = rowsToTransactions([
      { ID: 'a', Fecha: '2026-01-01', Tipo: 'Honorarios', 'Monto Bruto': 2 },
      { ID: 'b', Fecha: '2026-01-02', Tipo: 'Honorarios', 'Monto Bruto': 3 },
    ]).transactions;
    const r = mergeTransactions(a, b);
    expect(r).toMatchObject({ added: 1, updated: 1 });
    expect(r.list.find((t) => t.id === 'a')?.grossAmount).toBe(2);
  });
});
