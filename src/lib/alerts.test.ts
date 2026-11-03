import { describe, expect, it } from 'vitest';
import type { Transaction } from '../types';
import { computeSummary } from './tax';
import { rulesForYear } from './rules';
import { yearAlerts } from './alerts';

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36),
  date: '2026-03-31',
  concept: 'x',
  type: 'SALARY_FORMAL',
  grossAmount: 0,
  taxWithheld: 0,
  createdAt: '2026-01-31T00:00:00Z',
  ...p,
});
const alertsFor = (list: Transaction[]) => yearAlerts(list, computeSummary(list, 2026), rulesForYear(2026));

describe('yearAlerts', () => {
  it('is empty for salary only', () => {
    expect(alertsFor([tx({ grossAmount: 8000 })])).toEqual([]);
  });

  it('warns about the lost $1,600, IVA OK and pago a cuenta pending for a small business', () => {
    const a = alertsFor([tx({ grossAmount: 8000 }), tx({ type: 'BUSINESS_INCOME', grossAmount: 2000, taxWithheld: 10 })]);
    expect(a.map((x) => [x.level, x.title])).toEqual([
      ['warn', 'Sin deducción fija de $1,600.00'],
      ['ok', 'No necesitas inscribirte en IVA por tus ventas'],
      ['warn', 'Pago a cuenta pendiente'],
    ]);
  });

  it('asks to register for IVA above $5,714.29 and accepts a complete pago a cuenta', () => {
    const a = alertsFor([tx({ type: 'BUSINESS_INCOME', grossAmount: 4000, taxWithheld: 70 }), tx({ type: 'RENTAL_INCOME', grossAmount: 2000 })]);
    expect(a.map((x) => x.title)).toEqual(['Te toca inscribirte en IVA', 'Pago a cuenta al día']);
  });
});
