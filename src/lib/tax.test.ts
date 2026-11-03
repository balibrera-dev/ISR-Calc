import { describe, expect, it } from 'vitest';
import { computeAnnualTax, computeSummary, findBracket, suggestSocialSecurity } from './tax';
import type { Transaction } from '../types';

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36),
  date: '2026-01-31',
  concept: 'x',
  type: 'SALARY_FORMAL',
  grossAmount: 0,
  taxWithheld: 0,
  createdAt: '2026-01-31T00:00:00Z',
  ...p,
});

describe('computeAnnualTax (Art. 37 LIR, tabla 2011, ejercicios <= 2024)', () => {
  it.each([
    [0, 0],
    [-5, 0],
    [4064, 0],
    [4064.01, 212.12],
    [9142.86, 720.01],
    [9142.87, 720.0],
    [15000, 1891.43],
    [22857.14, 3462.86],
    [22857.15, 3462.86],
    [30000, 5605.72],
  ])('renta %d -> impuesto %d', (income, tax) => {
    expect(computeAnnualTax(income, 2024)).toBeCloseTo(tax, 2);
  });

  it('brackets are continuous at their limits', () => {
    expect(findBracket(9142.86, 2024).tramo).toBe('II');
    expect(findBracket(9142.87, 2024).tramo).toBe('III');
    expect(findBracket(22857.15, 2024).tramo).toBe('IV');
  });
});

describe('computeAnnualTax (reforma 2025: exento hasta $6,600)', () => {
  it.each([
    [6600, 0],
    [6600.01, 212.12],
    [8000, 352.12],
    [15000, 1891.43],
    [30000, 5605.72],
  ])('renta %d -> impuesto %d', (income, tax) => {
    expect(computeAnnualTax(income, 2025)).toBeCloseTo(tax, 2);
    expect(computeAnnualTax(income)).toBeCloseTo(tax, 2);
  });

  it('uses the old table only before 2025', () => {
    expect(computeAnnualTax(5000, 2024)).toBeCloseTo(305.72, 2);
    expect(computeAnnualTax(5000, 2025)).toBe(0);
  });
});

describe('aguinaldo', () => {
  it('exempts up to the cap of each year and taxes the excess', () => {
    const s = computeSummary([
      tx({ grossAmount: 14000 }),
      tx({ type: 'AGUINALDO', grossAmount: 1200, frequency: undefined }),
      tx({ type: 'AGUINALDO', date: '2025-12-10', grossAmount: 1800, frequency: undefined }),
    ]);
    expect(s.totalAguinaldo).toBe(3000);
    expect(s.exemptAguinaldo).toBe(2700);
    expect(s.taxableAguinaldo).toBe(300);
    expect(s.netSalarySubjectToTax).toBe(14000);
    expect(s.taxableIncome).toBe(14300);
  });

  it('uses $1,100 in 2021 and the base law (2 minimum wages) in 2020', () => {
    const ag = (date: string, amount: number) =>
      computeSummary([tx({ type: 'AGUINALDO', date, grossAmount: amount, frequency: undefined })], Number(date.slice(0, 4)));
    expect(ag('2021-12-15', 1300).taxableAguinaldo).toBe(200);
    expect(ag('2020-12-15', 813.77).exemptAguinaldo).toBe(608.34);
    expect(ag('2020-12-15', 813.77).taxableAguinaldo).toBeCloseTo(205.43, 2);
  });

  it('keeps the $1,600 fixed deduction when aguinaldo is fully exempt', () => {
    const s = computeSummary(
      [tx({ grossAmount: 7000, date: '2025-06-30' }), tx({ type: 'AGUINALDO', date: '2025-12-15', grossAmount: 600, frequency: undefined })],
      2025,
    );
    expect(s.fixedSalaryDeduction).toBe(1600);
  });
});

describe('suggestSocialSecurity', () => {
  it('caps ISSS at $30/month', () => {
    expect(suggestSocialSecurity(2000, 'MENSUAL')).toEqual({ isss: 30, afp: 145 });
    expect(suggestSocialSecurity(1000, 'QUINCENAL').isss).toBe(15);
    expect(suggestSocialSecurity(800, 'MENSUAL')).toEqual({ isss: 24, afp: 58 });
  });
});

describe('computeSummary', () => {
  it('nets salary, adds fees, caps deductions at $800 and computes the balance', () => {
    const s = computeSummary([
      tx({ grossAmount: 1500, isssAmount: 30, afpAmount: 108.75, taxWithheld: 120 }),
      tx({ grossAmount: 1500, isssAmount: 30, afpAmount: 108.75, taxWithheld: 120 }),
      tx({ type: 'INDEPENDENT_FEES', grossAmount: 1000, taxWithheld: 100 }),
      tx({ type: 'DEDUCTIBLE_MEDICAL', grossAmount: 950 }),
      tx({ type: 'DEDUCTIBLE_EDU', grossAmount: 300 }),
    ]);
    expect(s.netSalarySubjectToTax).toBe(2722.5);
    expect(s.appliedDeductibleMedical).toBe(800);
    expect(s.appliedDeductibleEdu).toBe(300);
    expect(s.taxableIncome).toBe(2622.5);
    expect(s.calculatedTax).toBe(0);
    expect(s.totalTaxWithheld).toBe(340);
    expect(s.finalBalance).toBe(-340);
  });

  it('positive balance means tax due', () => {
    const s = computeSummary([tx({ type: 'INDEPENDENT_FEES', grossAmount: 30000, taxWithheld: 3000 })]);
    expect(s.calculatedTax).toBeCloseTo(5605.72, 2);
    expect(s.finalBalance).toBeCloseTo(2605.72, 2);
  });
});

describe('vialidad', () => {
  it('is totalled but does not reduce taxable income', () => {
    const s = computeSummary([tx({ grossAmount: 10000, vialidadAmount: 3.43 })]);
    expect(s.totalVialidad).toBe(3.43);
    expect(s.taxableIncome).toBe(10000);
  });
});

describe('fixed $1,600 salaried deduction', () => {
  it('applies only with salary-only income up to $9,100, replacing medical/edu', () => {
    const low = computeSummary([tx({ grossAmount: 9000 }), tx({ type: 'DEDUCTIBLE_MEDICAL', grossAmount: 500 })], 2024);
    expect(low.fixedSalaryDeduction).toBe(1600);
    expect(low.appliedDeductibleMedical).toBe(0);
    expect(low.taxableIncome).toBe(7400);
    expect(computeSummary([tx({ grossAmount: 9100.01 })]).fixedSalaryDeduction).toBe(0);
    expect(computeSummary([tx({ grossAmount: 5000 }), tx({ type: 'INDEPENDENT_FEES', grossAmount: 100 })]).fixedSalaryDeduction).toBe(0);
  });
});

describe('indemnización', () => {
  const ind = (p: Partial<Transaction>) => tx({ type: 'INDEMNIZACION', date: '2022-06-30', ...p });

  it('is fully exempt when years or salary are missing (legal indemnización)', () => {
    const s = computeSummary([tx({ grossAmount: 14000, date: '2022-12-31' }), ind({ grossAmount: 4000 })], 2022);
    expect(s.totalIndemnizacion).toBe(4000);
    expect(s.exemptIndemnizacion).toBe(4000);
    expect(s.taxableIndemnizacion).toBe(0);
    expect(s.taxableIncome).toBe(14000);
  });

  it('taxes only what exceeds 30 days of salary per year of service', () => {
    const s = computeSummary(
      [tx({ grossAmount: 14000, date: '2022-12-31' }), ind({ grossAmount: 5000, serviceYears: 3, baseSalary: 1200 })],
      2022,
    );
    expect(s.exemptIndemnizacion).toBe(3600);
    expect(s.taxableIndemnizacion).toBe(1400);
    expect(s.taxableIncome).toBe(15400);
  });
});
