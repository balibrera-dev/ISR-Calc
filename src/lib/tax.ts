import type { FrequencyType, Transaction, TaxSummary } from '../types';

/** Redondeo a centavos evitando errores de coma flotante. */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Tabla anual de retención / cálculo, Art. 37 Ley de Impuesto sobre la Renta (LIR).
 * Impuesto = (renta - exceso) * tasa + cuotaFija, para el tramo donde cae la renta.
 */
export interface TaxBracket {
  tramo: string;
  desde: number;
  hasta: number | null;
  tasa: number;
  exceso: number;
  cuotaFija: number;
}

export const ANNUAL_TAX_BRACKETS: TaxBracket[] = [
  { tramo: 'I', desde: 0.01, hasta: 4064.0, tasa: 0, exceso: 0, cuotaFija: 0 },
  { tramo: 'II', desde: 4064.01, hasta: 9142.86, tasa: 0.1, exceso: 4064.0, cuotaFija: 212.12 },
  { tramo: 'III', desde: 9142.87, hasta: 22857.14, tasa: 0.2, exceso: 9142.86, cuotaFija: 720.0 },
  { tramo: 'IV', desde: 22857.15, hasta: null, tasa: 0.3, exceso: 22857.14, cuotaFija: 3462.86 },
];

export const DEDUCTION_CAP_MEDICAL = 800;
export const DEDUCTION_CAP_EDU = 800;

export const ISSS_RATE = 0.03;
/** Salario máximo cotizable al ISSS: $1,000 mensuales (cotización máxima $30/mes). */
export const ISSS_MONTHLY_SALARY_CAP = 1000;
export const AFP_RATE = 0.0725;

export const PERIODS_PER_YEAR: Record<FrequencyType, number> = {
  MENSUAL: 12,
  QUINCENAL: 24,
  CATORCENAL: 26,
};

export function findBracket(taxableIncome: number): TaxBracket {
  const income = round2(taxableIncome);
  return (
    ANNUAL_TAX_BRACKETS.find((b) => b.hasta === null || income <= b.hasta) ??
    ANNUAL_TAX_BRACKETS[ANNUAL_TAX_BRACKETS.length - 1]
  );
}

/** Impuesto determinado anual según Art. 37 LIR. */
export function computeAnnualTax(taxableIncome: number): number {
  if (!(taxableIncome > 0)) return 0;
  const b = findBracket(taxableIncome);
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

export function computeSummary(transactions: Transaction[]): TaxSummary {
  let totalGrossSalary = 0;
  let totalISSS = 0;
  let totalAFP = 0;
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

  const netSalarySubjectToTax = Math.max(0, totalGrossSalary - totalISSS - totalAFP);
  const appliedDeductibleMedical = Math.min(grossDeductibleMedical, DEDUCTION_CAP_MEDICAL);
  const appliedDeductibleEdu = Math.min(grossDeductibleEdu, DEDUCTION_CAP_EDU);
  const taxableIncome = Math.max(
    0,
    netSalarySubjectToTax + totalIndependentFees - appliedDeductibleMedical - appliedDeductibleEdu,
  );
  const calculatedTax = computeAnnualTax(taxableIncome);

  return {
    totalGrossSalary: round2(totalGrossSalary),
    totalISSS: round2(totalISSS),
    totalAFP: round2(totalAFP),
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
