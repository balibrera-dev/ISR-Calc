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

describe('computeAnnualTax (Art. 37 LIR)', () => {
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
    expect(computeAnnualTax(income)).toBeCloseTo(tax, 2);
  });

  it('brackets are continuous at their limits', () => {
    expect(findBracket(9142.86).tramo).toBe('II');
    expect(findBracket(9142.87).tramo).toBe('III');
    expect(findBracket(22857.15).tramo).toBe('IV');
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
