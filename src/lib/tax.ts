import type { FrequencyType, Transaction, TaxSummary } from '../types';

/** Redondeo a centavos evitando errores de coma flotante. */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

import { ANNUAL_TAX_BRACKETS, ANNUAL_TAX_BRACKETS_2011, REFORM_2025_YEAR, rulesForYear, type TaxBracket } from './rules';

export { ANNUAL_TAX_BRACKETS, ANNUAL_TAX_BRACKETS_2011, REFORM_2025_YEAR, rulesForYear, type TaxBracket };

const CURRENT = rulesForYear(new Date().getFullYear());
export const DEDUCTION_CAP_MEDICAL = CURRENT.medicalCap;
export const DEDUCTION_CAP_EDU = CURRENT.eduCap;

export const ISSS_RATE = 0.03;
/** Salario máximo cotizable al ISSS: $1,000 mensuales (cotización máxima $30/mes). */
export const ISSS_MONTHLY_SALARY_CAP = 1000;
export const AFP_RATE = 0.0725;

export const PERIODS_PER_YEAR: Record<FrequencyType, number> = {
  MENSUAL: 12,
  QUINCENAL: 24,
  CATORCENAL: 26,
  UNICO: 12, // pagos únicos (aguinaldo, bonos): se usa el tope mensual de ISSS
};

/** Tabla del Art. 37 aplicable a un ejercicio fiscal (sin año: la vigente). */
export function bracketsForYear(year?: number): TaxBracket[] {
  return rulesForYear(year ?? new Date().getFullYear()).brackets;
}

export function findBracket(taxableIncome: number, year?: number): TaxBracket {
  const income = round2(taxableIncome);
  const table = bracketsForYear(year);
  return table.find((b) => b.hasta === null || income <= b.hasta) ?? table[table.length - 1];
}

/** Impuesto determinado anual según Art. 37 LIR. */
export function computeAnnualTax(taxableIncome: number, year?: number): number {
  if (!(taxableIncome > 0)) return 0;
  const b = findBracket(taxableIncome, year);
  if (b.tasa === 0) return 0;
  return round2((round2(taxableIncome) - b.exceso) * b.tasa + b.cuotaFija);
}

/** Cotizaciones sugeridas para un pago de salario, según su frecuencia. */
export function suggestSocialSecurity(gross: number, frequency: FrequencyType) {
  if (!(gross > 0)) return { isss: 0, afp: 0 };
  const periodCap = (ISSS_MONTHLY_SALARY_CAP * 12) / PERIODS_PER_YEAR[frequency];
  return {
    isss: round2(Math.min(gross, periodCap) * ISSS_RATE),
    afp: round2(gross * AFP_RATE),
  };
}

export const txYear = (t: Pick<Transaction, 'date'>) => Number(t.date.slice(0, 4));

/**
 * @param year ejercicio fiscal; define qué tabla del Art. 37 se usa. Sin año (vista "todos los años") usa la vigente.
 */
export function computeSummary(transactions: Transaction[], year?: number): TaxSummary {
  const rules = rulesForYear(year ?? new Date().getFullYear());
  const aguinaldoByYear = new Map<number, number>();
  let totalGrossSalary = 0;
  let totalISSS = 0;
  let totalAFP = 0;
  let totalVialidad = 0;
  let totalIndependentFees = 0;
  let grossDeductibleMedical = 0;
  let grossDeductibleEdu = 0;
  let totalTaxWithheld = 0;

  for (const t of transactions) {
    const amount = Number(t.grossAmount) || 0;
    switch (t.type) {
      case 'SALARY_FORMAL':
        totalGrossSalary += amount;
        totalISSS += Number(t.isssAmount) || 0;
        totalAFP += Number(t.afpAmount) || 0;
        totalVialidad += Number(t.vialidadAmount) || 0;
        break;
      case 'AGUINALDO':
        aguinaldoByYear.set(txYear(t), (aguinaldoByYear.get(txYear(t)) ?? 0) + amount);
        break;
      case 'INDEPENDENT_FEES':
        totalIndependentFees += amount;
        break;
      case 'DEDUCTIBLE_MEDICAL':
        grossDeductibleMedical += amount;
        break;
      case 'DEDUCTIBLE_EDU':
        grossDeductibleEdu += amount;
        break;
    }
    totalTaxWithheld += Number(t.taxWithheld) || 0;
  }

  // Aguinaldo: exento hasta el tope de su año; solo el excedente es renta gravada.
  let totalAguinaldo = 0;
  let exemptAguinaldo = 0;
  aguinaldoByYear.forEach((v, y) => {
    totalAguinaldo += v;
    exemptAguinaldo += Math.min(v, rulesForYear(y).aguinaldoCap);
  });
  const taxableAguinaldo = totalAguinaldo - exemptAguinaldo;
  const netSalarySubjectToTax = Math.max(0, totalGrossSalary - totalISSS - totalAFP);
  // Art. 29 num. 7: solo salarios y ≤ $9,100 → deducción fija de $1,600 (en lugar de médicos/educativos).
  const qualifiesFixed =
    totalIndependentFees === 0 &&
    totalGrossSalary + totalAguinaldo > 0 &&
    totalGrossSalary + taxableAguinaldo <= rules.fixedSalaryDeductionLimit;
  const fixedSalaryDeduction = qualifiesFixed ? rules.fixedSalaryDeduction : 0;
  const appliedDeductibleMedical = qualifiesFixed ? 0 : Math.min(grossDeductibleMedical, rules.medicalCap);
  const appliedDeductibleEdu = qualifiesFixed ? 0 : Math.min(grossDeductibleEdu, rules.eduCap);
  const taxableIncome = Math.max(
    0,
    netSalarySubjectToTax +
      taxableAguinaldo +
      totalIndependentFees -
      fixedSalaryDeduction -
      appliedDeductibleMedical -
      appliedDeductibleEdu,
  );
  const calculatedTax = computeAnnualTax(taxableIncome, year);

  return {
    totalGrossSalary: round2(totalGrossSalary),
    totalISSS: round2(totalISSS),
    totalAFP: round2(totalAFP),
    totalVialidad: round2(totalVialidad),
    totalAguinaldo: round2(totalAguinaldo),
    exemptAguinaldo: round2(exemptAguinaldo),
    taxableAguinaldo: round2(taxableAguinaldo),
    fixedSalaryDeduction,
    netSalarySubjectToTax: round2(netSalarySubjectToTax),
    totalIndependentFees: round2(totalIndependentFees),
    grossDeductibleMedical: round2(grossDeductibleMedical),
    appliedDeductibleMedical: round2(appliedDeductibleMedical),
    grossDeductibleEdu: round2(grossDeductibleEdu),
    appliedDeductibleEdu: round2(appliedDeductibleEdu),
    taxableIncome: round2(taxableIncome),
    calculatedTax,
    totalTaxWithheld: round2(totalTaxWithheld),
    finalBalance: round2(calculatedTax - totalTaxWithheld),
  };
}
