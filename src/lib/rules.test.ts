import { describe, expect, it } from 'vitest';
import { rulesForYear } from './rules';

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
    expect(rulesForYear(2022).notes.some((n) => n.kind === 'aviso' && n.title.includes('Aguinaldo'))).toBe(true);
    expect(rulesForYear(2026).notes.some((n) => n.kind === 'aviso')).toBe(false);
  });
});
