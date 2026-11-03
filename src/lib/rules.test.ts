import { describe, expect, it } from 'vitest';
import { aguinaldoRuleFor, rulesForYear } from './rules';

describe('rulesForYear', () => {
  it('uses the 2011 table before 2025 and the reformed one after', () => {
    expect(rulesForYear(2024).brackets[0].hasta).toBe(4064);
    expect(rulesForYear(2025).brackets[0].hasta).toBe(6600);
    expect(rulesForYear(2030).brackets[0].hasta).toBe(6600);
  });

  it('lists the year changes first and flags unverified aguinaldo years', () => {
    const r2025 = rulesForYear(2025);
    expect(r2025.notes[0].kind).toBe('cambio');
    expect(r2025.notes.some((n) => n.title.includes('Reforma Art. 37'))).toBe(true);
    expect(rulesForYear(2020).notes.some((n) => n.kind === 'aviso' && n.title.includes('Aguinaldo'))).toBe(true);
    expect(rulesForYear(2026).notes.some((n) => n.kind === 'aviso')).toBe(false);
  });
});

describe('aguinaldoRuleFor', () => {
  it('uses decree caps when known and the base law otherwise', () => {
    expect(aguinaldoRuleFor(2021)).toMatchObject({ cap: 1100, verified: true });
    expect(aguinaldoRuleFor(2024)).toMatchObject({ cap: 1500, verified: true });
    expect(aguinaldoRuleFor(2020)).toMatchObject({ cap: 608.34, verified: false });
    expect(aguinaldoRuleFor(2027)).toMatchObject({ cap: 817.6, verified: false });
  });
});
