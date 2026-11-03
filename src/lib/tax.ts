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

/** Tabla original (D.L. 957, 2011): aplica a ejercicios hasta 2024. */
export const ANNUAL_TAX_BRACKETS_2011: TaxBracket[] = [
  { tramo: 'I', desde: 0.01, hasta: 4064.0, tasa: 0, exceso: 0, cuotaFija: 0 },
  { tramo: 'II', desde: 4064.01, hasta: 9142.86, tasa: 0.1, exceso: 4064.0, cuotaFija: 212.12 },
  { tramo: 'III', desde: 9142.87, hasta: 22857.14, tasa: 0.2, exceso: 9142.86, cuotaFija: 720.0 },
  { tramo: 'IV', desde: 22857.15, hasta: null, tasa: 0.3, exceso: 22857.14, cuotaFija: 3462.86 },
];

/**
 * Reforma de abril 2025 (vigente desde el 8 de mayo de 2025): renta exenta sube a $6,600 anuales ($550/mes).
 * Tramos III y IV sin cambios. Se aplica a los ejercicios 2025 en adelante.
 */
export const ANNUAL_TAX_BRACKETS: TaxBracket[] = [
  { tramo: 'I', desde: 0.01, hasta: 6600.0, tasa: 0, exceso: 0, cuotaFija: 0 },
  { tramo: 'II', desde: 6600.01, hasta: 9142.86, tasa: 0.1, exceso: 6600.0, cuotaFija: 212.12 },
  { tramo: 'III', desde: 9142.87, hasta: 22857.14, tasa: 0.2, exceso: 9142.86, cuotaFija: 720.0 },
  { tramo: 'IV', desde: 22857.15, hasta: null, tasa: 0.3, exceso: 22857.14, cuotaFija: 3462.86 },
];

export const DEDUCTION_CAP_MEDICAL = 800;
export const DEDUCTION_CAP_EDU = 800;
/** Aguinaldo exento de renta hasta $1,500 por año (decretos transitorios, confirmados para 2024–2026). */
export const AGUINALDO_EXEMPT_CAP = 1500;
/**
 * Deducción fija para quienes solo tienen salarios y ganan ≤ $9,100 al año (Art. 29 num. 7 LISR).
 * Con más ingresos no aplica: solo médicos/educativos (Arts. 32-33). Las tablas de retención sí la
 * asumen, por eso en el tramo III el impuesto anual suele quedar 20% × $1,600 = $320 arriba de lo retenido.
 */
export const FIXED_SALARY_DEDUCTION = 1600;
export const FIXED_SALARY_DEDUCTION_INCOME_LIMIT = 9100;

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

export const REFORM_2025_YEAR = 2025;

/** Tabla del Art. 37 aplicable a un ejercicio fiscal (sin año: la vigente). */
export function bracketsForYear(year?: number): TaxBracket[] {
  return year !== undefined && year < REFORM_2025_YEAR ? ANNUAL_TAX_BRACKETS_2011 : ANNUAL_TAX_BRACKETS;
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
        if (t.isAguinaldo) aguinaldoByYear.set(txYear(t), (aguinaldoByYear.get(txYear(t)) ?? 0) + amount);
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

  let exemptAguinaldo = 0;
  aguinaldoByYear.forEach((v) => (exemptAguinaldo += Math.min(v, AGUINALDO_EXEMPT_CAP)));
  const netSalarySubjectToTax = Math.max(0, totalGrossSalary - totalISSS - totalAFP - exemptAguinaldo);
  // Art. 29 num. 7: solo salarios y ≤ $9,100 → deducción fija de $1,600 (en lugar de médicos/educativos).
  const qualifiesFixed =
    totalIndependentFees === 0 &&
    totalGrossSalary > 0 &&
    totalGrossSalary - exemptAguinaldo <= FIXED_SALARY_DEDUCTION_INCOME_LIMIT;
  const fixedSalaryDeduction = qualifiesFixed ? FIXED_SALARY_DEDUCTION : 0;
  const appliedDeductibleMedical = qualifiesFixed ? 0 : Math.min(grossDeductibleMedical, DEDUCTION_CAP_MEDICAL);
  const appliedDeductibleEdu = qualifiesFixed ? 0 : Math.min(grossDeductibleEdu, DEDUCTION_CAP_EDU);
  const taxableIncome = Math.max(
    0,
    netSalarySubjectToTax +
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
    exemptAguinaldo: round2(exemptAguinaldo),
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
