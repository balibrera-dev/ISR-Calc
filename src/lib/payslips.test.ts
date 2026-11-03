import { describe, expect, it } from 'vitest';
import type { Transaction } from '../types';
import { computeSummary, computeAnnualTax } from './tax';
import { rulesForYear } from './rules';
import { payslipAlerts } from './payslips';

const sal = (date: string, gross: number, p: Partial<Transaction> = {}): Transaction => ({
  id: Math.random().toString(36),
  date,
  concept: 'x',
  type: 'SALARY_FORMAL',
  frequency: 'MENSUAL',
  grossAmount: gross,
  isssAmount: 30,
  afpAmount: round(gross * 0.0725),
  taxWithheld: 0,
  createdAt: '2026-01-01T00:00:00Z',
  ...p,
});
const round = (n: number) => Math.round(n * 100) / 100;
const check = (list: Transaction[]) => payslipAlerts(list, computeSummary(list, 2024), rulesForYear(2024));

/** Doce meses de $1,500 con la renta exacta de las tablas repartida en 12. */
function cleanYear(): Transaction[] {
  const list = Array.from({ length: 12 }, (_, i) => sal(`2024-${String(i + 1).padStart(2, '0')}-28`, 1500));
  const s = computeSummary(list, 2024);
  const perMonth = round(computeAnnualTax(s.netSalarySubjectToTax - 1600, 2024) / 12);
  return list.map((t) => ({ ...t, taxWithheld: perMonth }));
}

describe('payslipAlerts', () => {
  it('is quiet (only the green renta check) for correct payslips', () => {
    const a = check(cleanYear());
    expect(a.map((x) => [x.level, x.title])).toEqual([['ok', 'Tu empresa te retuvo bien la renta']]);
  });

  it('flags ISSS above $30 in a month and AFP above 7.25%', () => {
    const list = cleanYear();
    list[0] = { ...list[0], isssAmount: 45 };
    list[1] = { ...list[1], afpAmount: 200 };
    const a = check(list);
    expect(a.find((x) => x.title === 'ISSS cobrado de más')?.items?.[0]).toContain('ene 2024');
    expect(a.find((x) => x.title === 'AFP mayor al 7.25% del bruto')?.items).toHaveLength(1);
  });

  it('flags duplicates and extra payments', () => {
    const list = cleanYear();
    list.push({ ...list[3], id: 'dup' });
    const a = check(list);
    const titles = a.map((x) => x.title);
    expect(titles).toContain('Boletas repetidas');
    expect(titles).toContain('Más pagos de los posibles en el año');
  });

  it('flags withholding that does not match the tables', () => {
    const list = cleanYear();
    list[5] = { ...list[5], taxWithheld: list[5].taxWithheld + 100 };
    expect(check(list).map((x) => x.title)).toEqual(['Te retuvieron renta de más']);
  });
});

describe('payslipAlerts on an unfinished year', () => {
  it('does not compare withholding before December', () => {
    const list = Array.from({ length: 10 }, (_, i) => sal(`2024-${String(i + 1).padStart(2, '0')}-28`, 1500, { taxWithheld: 120 }));
    const a = check(list);
    expect(a.map((x) => [x.level, x.title])).toEqual([['info', 'Renta: año sin cerrar']]);
    expect(a[0].detail).toContain('$1,200.00');
  });
});
