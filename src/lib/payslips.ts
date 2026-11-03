import type { FrequencyType, TaxSummary, Transaction } from '../types';
import { FREQUENCY_LABELS } from '../types';
import type { YearRules } from './rules';
import type { YearAlert } from './alerts';
import { AFP_RATE, ISSS_MONTHLY_SALARY_CAP, ISSS_RATE, computeAnnualTax, round2 } from './tax';
import { formatDate, money } from './format';

/** Diferencia que se tolera en la renta del año antes de avisar (redondeos, recálculos de junio/diciembre). */
export const WITHHOLDING_TOLERANCE = 25;
const MAX_PAYMENTS: Partial<Record<FrequencyType, number>> = { CATORCENAL: 27, QUINCENAL: 24, MENSUAL: 12 };
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Empleador de una boleta: primeras palabras del concepto, sin mayúsculas ni signos. */
export const employerKey = (t: Pick<Transaction, 'concept'>) =>
  t.concept
    .normalize('NFD')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/**
 * Revisa las boletas de salario del año. Solo avisa de lo que se puede afirmar con seguridad:
 * cobros de ISSS o AFP por encima de la ley, boletas repetidas o de más, y renta retenida que no
 * cuadra con las tablas de retención (que asumen la deducción fija de $1,600).
 */
export function payslipAlerts(list: Transaction[], s: TaxSummary, rules: YearRules): YearAlert[] {
  const salaries = list.filter((t) => t.type === 'SALARY_FORMAL');
  if (!salaries.length) return [];
  const alerts: YearAlert[] = [];

  const employers = new Set(salaries.map(employerKey));
  const multi = employers.size > 1;
  const who = (t: Transaction) => (multi ? ` · ${t.concept.slice(0, 30) || 'sin empleador'}` : '');

  // ISSS: 3% con salario máximo de $1,000 al mes → nunca más de $30 en un mes con el mismo empleador
  // (con dos empleadores, cada uno cotiza por separado).
  const isssCap = round2(ISSS_MONTHLY_SALARY_CAP * ISSS_RATE);
  const byMonth = new Map<string, { month: string; label: string; isss: number }>();
  for (const t of salaries) {
    const k = `${t.date.slice(0, 7)}|${employerKey(t)}`;
    const m = byMonth.get(k) ?? { month: t.date.slice(0, 7), label: who(t), isss: 0 };
    m.isss += t.isssAmount ?? 0;
    byMonth.set(k, m);
  }
  const isssMonths = [...byMonth.values()]
    .filter((m) => m.isss > isssCap + 0.01)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => `${monthLabel(m.month)}${m.label}: ${money(m.isss)} (máx. ${money(isssCap)})`);
  const isssSlips = salaries
    .filter((t) => (t.isssAmount ?? 0) > t.grossAmount * ISSS_RATE + 0.01)
    .map((t) => `${formatDate(t.date)}: ${money(t.isssAmount ?? 0)} sobre ${money(t.grossAmount)} (3% = ${money(t.grossAmount * ISSS_RATE)})`);
  if (isssMonths.length || isssSlips.length)
    alerts.push({
      level: 'warn',
      title: 'ISSS cobrado de más',
      detail: `El ISSS es 3% del salario, con un máximo de ${money(isssCap)} al mes por empleador. Revisa estas boletas y sus fechas. Si la empresa paga un mes por adelantado, puede sumar en el mes equivocado.`,
      items: [...isssMonths, ...isssSlips],
    });

  const afpSlips = salaries
    .filter((t) => (t.afpAmount ?? 0) > t.grossAmount * AFP_RATE + 0.01)
    .map((t) => `${formatDate(t.date)}: ${money(t.afpAmount ?? 0)} sobre ${money(t.grossAmount)} (7.25% = ${money(t.grossAmount * AFP_RATE)})`);
  if (afpSlips.length)
    alerts.push({
      level: 'warn',
      title: 'AFP mayor al 7.25% del bruto',
      detail: 'Tu cotización de AFP no debería pasar del 7.25% del salario de la boleta (salvo aportes voluntarios).',
      items: afpSlips,
    });

  // Boletas repetidas: misma fecha y mismo monto.
  const seen = new Map<string, number>();
  for (const t of salaries) {
    const k = `${t.date}|${t.grossAmount}|${employerKey(t)}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const dups = [...seen].filter(([, n]) => n > 1).map(([k, n]) => {
    const [d, g] = k.split('|');
    return `${formatDate(d)}: ${money(Number(g))} × ${n}`;
  });
  if (dups.length)
    alerts.push({ level: 'warn', title: 'Boletas repetidas', detail: 'Hay salarios con la misma fecha y monto.', items: dups });

  const counts = new Map<string, { f: FrequencyType; label: string; n: number }>();
  for (const t of salaries) {
    if (!t.frequency) continue;
    const k = `${t.frequency}|${employerKey(t)}`;
    const c = counts.get(k) ?? { f: t.frequency, label: who(t), n: 0 };
    c.n++;
    counts.set(k, c);
  }
  const extra = [...counts.values()]
    .filter((c) => MAX_PAYMENTS[c.f] !== undefined && c.n > MAX_PAYMENTS[c.f]!)
    .map((c) => `${FREQUENCY_LABELS[c.f]}${c.label}: ${c.n} pagos (máx. ${MAX_PAYMENTS[c.f]} en un año)`);
  if (extra.length)
    alerts.push({
      level: 'warn',
      title: 'Más pagos de los posibles en el año',
      detail: 'Puede haber una boleta duplicada o con el año mal escrito.',
      items: extra,
    });

  // Renta: las tablas de retención calculan sobre salario − ISSS − AFP − $1,600.
  const withheld = round2(
    list
      .filter((t) => t.type === 'SALARY_FORMAL' || t.type === 'AGUINALDO' || t.type === 'INDEMNIZACION')
      .reduce((a, t) => a + (Number(t.taxWithheld) || 0), 0),
  );
  const expected = computeAnnualTax(
    Math.max(0, s.netSalarySubjectToTax + s.taxableAguinaldo + s.taxableIndemnizacion - rules.fixedSalaryDeduction),
    rules.year,
  );
  const diff = round2(withheld - expected);
  // Sin boletas de diciembre el año no está completo: la tabla anual da menos impuesto que lo que la
  // empresa retiene mes a mes (y el recálculo de diciembre aún no ocurre), así que no se compara.
  const lastMonth = Math.max(...salaries.map((t) => Number(t.date.slice(5, 7))));
  if (lastMonth < 12) {
    alerts.push({
      level: 'info',
      title: 'Renta: año sin cerrar',
      detail: `Llevas ${money(withheld)} retenidos hasta ${MONTHS[lastMonth - 1]}. La comparación con las tablas se hace con el año completo, porque en junio y diciembre la empresa recalcula la renta y ajusta la retención.`,
    });
    return alerts;
  }
  alerts.push(
    Math.abs(diff) <= WITHHOLDING_TOLERANCE
      ? {
          level: 'ok',
          title: 'Tu empresa te retuvo bien la renta',
          detail:
            s.finalBalance > 0.005 && s.fixedSalaryDeduction === 0
              ? `Te retuvieron ${money(withheld)}, justo lo que dicen las tablas de Hacienda. Aun así, en el F11 te toca pagar ${money(s.finalBalance)}: las tablas te descuentan ${money(rules.fixedSalaryDeduction)} que la ley solo da a quien gana hasta ${money(rules.fixedSalaryDeductionLimit)} al año, y tú ganas más.`
              : `Te retuvieron ${money(withheld)}, justo lo que dicen las tablas de Hacienda.`,
        }
      : multi && diff < 0
        ? {
            level: 'info',
            title: 'Dos empleadores: falta renta por retener',
            detail: `Te retuvieron ${money(withheld)} y por el total del año corresponderían ${money(expected)} (−${money(Math.abs(diff))}). Es normal: cada empleador retiene como si fuera tu único salario, así que con un salario pequeño el segundo no retiene nada. La diferencia se paga en el F11.`,
          }
        : {
          level: 'warn',
          title: diff > 0 ? 'Te retuvieron renta de más' : 'Te retuvieron menos renta de la esperada',
          detail: `Te retuvieron ${money(withheld)} y las tablas de retención dan ${money(expected)} (${diff > 0 ? '+' : '−'}${money(Math.abs(diff))}). Puede ser una boleta mal ingresada o con la fecha mal${rules.year === 2025 ? ', un cambio de empleador o el cambio de tablas de mayo 2025' : ' o un cambio de empleador'}.`,
        },
  );
  return alerts;
}
