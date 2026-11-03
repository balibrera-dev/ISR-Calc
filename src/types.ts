export type FrequencyType = 'CATORCENAL' | 'QUINCENAL' | 'MENSUAL' | 'UNICO';

export type TransactionType =
  | 'SALARY_FORMAL' // Salario en planilla (relación de dependencia)
  | 'INDEPENDENT_FEES' // Honorarios / servicios profesionales
  | 'AGUINALDO' // Aguinaldo: exento hasta el tope del año, el excedente es gravado
  | 'INDEMNIZACION' // Indemnización por despido / retiro: exenta hasta 30 días de salario por año de servicio
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
  vialidadAmount?: number; // Contribución de vialidad retenida en planilla (no deducible de renta)

  // INDEMNIZACION (opcionales: sin ellos se asume la indemnización legal, exenta completa)
  serviceYears?: number; // Años de servicio
  baseSalary?: number; // Salario mensual base (promedio de los últimos 12 meses)

  taxWithheld: number;
  comment?: string; // Nota libre del usuario
  createdAt: string;
}

export interface TaxSummary {
  totalGrossSalary: number;
  totalISSS: number;
  totalAFP: number;
  totalVialidad: number; // Informativo: no afecta la renta imponible
  totalAguinaldo: number; // Aguinaldo recibido
  exemptAguinaldo: number; // Parte exenta (tope del año, ver rules.ts)
  taxableAguinaldo: number; // Excedente que se suma a la renta imponible
  totalIndemnizacion: number; // Indemnización recibida
  exemptIndemnizacion: number; // Parte exenta (Art. 4 num. 3)
  taxableIndemnizacion: number; // Excedente gravado
  fixedSalaryDeduction: number; // $1,600 si solo hay salarios y son ≤ $9,100
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
  AGUINALDO: 'Aguinaldo',
  INDEMNIZACION: 'Indemnización por despido',
  DEDUCTIBLE_MEDICAL: 'Gasto médico deducible',
  DEDUCTIBLE_EDU: 'Gasto educativo deducible',
};

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  CATORCENAL: 'Catorcenal',
  QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual',
  UNICO: 'Pago único',
};

export const isIncome = (t: TransactionType) =>
  t === 'SALARY_FORMAL' || t === 'INDEPENDENT_FEES' || t === 'AGUINALDO' || t === 'INDEMNIZACION';
