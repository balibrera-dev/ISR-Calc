export type FrequencyType = 'CATORCENAL' | 'QUINCENAL' | 'MENSUAL';

export type TransactionType =
  | 'SALARY_FORMAL' // Salario en planilla (relación de dependencia)
  | 'INDEPENDENT_FEES' // Honorarios / servicios profesionales
  | 'DEDUCTIBLE_MEDICAL' // Deducción por gastos médicos
  | 'DEDUCTIBLE_EDU'; // Deducción por gastos educativos

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  concept: string;
  type: TransactionType;
  grossAmount: number;

  // SALARY_FORMAL
  frequency?: FrequencyType;
  isssAmount?: number;
  afpAmount?: number;

  taxWithheld: number;
  createdAt: string;
}

export interface TaxSummary {
  totalGrossSalary: number;
  totalISSS: number;
  totalAFP: number;
  netSalarySubjectToTax: number;

  totalIndependentFees: number;

  grossDeductibleMedical: number;
  appliedDeductibleMedical: number;

  grossDeductibleEdu: number;
  appliedDeductibleEdu: number;

  taxableIncome: number;
  calculatedTax: number;
  totalTaxWithheld: number;
  finalBalance: number; // > 0 a pagar, < 0 devolución
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  SALARY_FORMAL: 'Salario (planilla)',
  INDEPENDENT_FEES: 'Honorarios / servicios profesionales',
  DEDUCTIBLE_MEDICAL: 'Gasto médico deducible',
  DEDUCTIBLE_EDU: 'Gasto educativo deducible',
};

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  CATORCENAL: 'Catorcenal',
  QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual',
};

export const isIncome = (t: TransactionType) => t === 'SALARY_FORMAL' || t === 'INDEPENDENT_FEES';
