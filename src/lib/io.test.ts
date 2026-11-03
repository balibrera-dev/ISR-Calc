import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { detectDateOrder, mergeTransactions, parseWorkbook, rowsToTransactions } from './io';
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

describe('historical CSV with Vialidad, Comment, UNICO and MM/DD/YYYY dates', () => {
  const csv = [
    'Fecha,Concepto,Tipo,Monto Bruto,Frecuencia,Vialidad,ISSS,AFP,Renta Retenida,Comment',
    '10/23/2026,"EMPRESA, S.A. DE C.V",SALARY_FORMAL,576.92,CATORCENAL,,12.69,41.83,44.96,',
    '1/16/2026,"EMPRESA, S.A. DE C.V",SALARY_FORMAL,576.92,CATORCENAL,3.43,12.69,41.83,44.96,',
    ',,,,,,,,,',
    '12/10/2025,"EMPRESA, S.A. DE C.V",SALARY_FORMAL,1236.26,UNICO,,0,0,0,Pago de Aguinaldo',
    '7/24/2020,"EMPRESA, S.A. DE C.V",SALARY_FORMAL,,CATORCENAL,,,,,',
  ].join('\n');
  const { transactions, errors } = parseWorkbook(new TextEncoder().encode(csv).buffer as ArrayBuffer);

  it('detects US month/day order and keeps commas inside quoted concepts', () => {
    expect(transactions.map((t) => t.date)).toEqual(['2026-10-23', '2026-01-16', '2025-12-10']);
    expect(transactions[0].concept).toBe('EMPRESA, S.A. DE C.V');
  });

  it('imports vialidad, comments and one-time payments', () => {
    expect(transactions[1].vialidadAmount).toBe(3.43);
    expect(transactions[0].vialidadAmount).toBeUndefined();
    expect(transactions[2]).toMatchObject({ type: 'AGUINALDO', comment: 'Pago de Aguinaldo', grossAmount: 1236.26 });
  });

  it('skips blank rows and reports rows without an amount', () => {
    expect(errors).toEqual(['Fila 6: monto bruto inválido']);
  });
});

describe('detectDateOrder', () => {
  it('defaults to day/month and switches when the second part exceeds 12', () => {
    expect(detectDateOrder(['01/02/2026', '15/03/2026'])).toBe('DMY');
    expect(detectDateOrder(['1/2/2026', '3/15/2026'])).toBe('MDY');
  });
});

describe('aguinaldo import', () => {
  it('turns UNICO salary rows mentioning aguinaldo, or with an Aguinaldo column, into the Aguinaldo type', () => {
    const { transactions } = rowsToTransactions([
      { Fecha: '2025-12-10', Tipo: 'Salario', 'Monto Bruto': 1236.26, Frecuencia: 'UNICO', Comentario: 'Pago de Aguinaldo' },
      { Fecha: '2022-12-23', Tipo: 'Salario', 'Monto Bruto': 551.1, Frecuencia: 'CATORCENAL', Comentario: 'Ajuste de Aguinaldo' },
      { Fecha: '2025-12-11', Tipo: 'Salario', 'Monto Bruto': 100, Frecuencia: 'MENSUAL', Aguinaldo: 'Sí' },
      { Fecha: '2025-12-12', Tipo: 'Salario', 'Monto Bruto': 100, Frecuencia: 'UNICO', Comentario: 'aguinaldo', Aguinaldo: 'No' },
    ]);
    expect(transactions.map((t) => t.type)).toEqual(['AGUINALDO', 'SALARY_FORMAL', 'AGUINALDO', 'SALARY_FORMAL']);
  });
});

describe('aguinaldo type', () => {
  it('accepts "Aguinaldo" as Tipo', () => {
    const { transactions } = rowsToTransactions([{ Fecha: '2024-12-12', Tipo: 'Aguinaldo', 'Monto Bruto': 900 }]);
    expect(transactions[0].type).toBe('AGUINALDO');
  });
});
