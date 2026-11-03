import type { TaxSummary, Transaction } from '../types';
import type { YearRules } from './rules';
import { round2 } from './tax';
import { money } from './format';

export interface YearAlert {
  level: 'ok' | 'warn' | 'info';
  title: string;
  detail: string;
  /** Detalle opcional (p. ej. boletas afectadas). */
  items?: string[];
}

/** Art. 28 Ley de IVA: ¢50,000 en ventas de 12 meses o ¢20,000 en activos (a ¢8.75 por dólar). */
export const IVA_SALES_THRESHOLD = 5714.29;
export const IVA_ASSETS_THRESHOLD = 2285.71;
/** Art. 151 Código Tributario: pago a cuenta general de personas naturales con negocio. */
export const PAGO_A_CUENTA_RATE = 0.0175;

/** Avisos del ejercicio según el tipo de transacciones que tiene. */
export function yearAlerts(list: Transaction[], s: TaxSummary, rules: YearRules): YearAlert[] {
  const alerts: YearAlert[] = [];
  const sales = round2(s.totalBusinessIncome + s.totalRentalIncome);
  const other = sales + s.totalIndependentFees;

  if (other > 0 && s.totalGrossSalary + s.totalAguinaldo > 0) {
    const wouldQualify = s.totalGrossSalary <= rules.fixedSalaryDeductionLimit;
    alerts.push({
      level: wouldQualify ? 'warn' : 'info',
      title: `Sin deducción fija de ${money(rules.fixedSalaryDeduction)}`,
      detail: wouldQualify
        ? `Por tener ingresos que no son salario (negocio, alquiler u honorarios) ya no aplica la deducción fija de los asalariados, aunque tu salario no pase de ${money(rules.fixedSalaryDeductionLimit)}.`
        : `Esa deducción es solo para quien tiene únicamente salario de hasta ${money(rules.fixedSalaryDeductionLimit)}; con ingresos de negocio, alquiler u honorarios no aplica.`,
    });
  }

  if (sales > 0) {
    alerts.push(
      sales >= IVA_SALES_THRESHOLD
        ? {
            level: 'warn',
            title: 'Te toca inscribirte en IVA',
            detail: `Tus ventas y alquileres del año suman ${money(sales)}, arriba de ${money(IVA_SALES_THRESHOLD)}. Con eso debes estar inscrito como contribuyente de IVA desde el mes subsiguiente a pasar el monto.`,
          }
        : {
            level: 'ok',
            title: 'No necesitas inscribirte en IVA por tus ventas',
            detail: `Tus ventas y alquileres del año suman ${money(sales)}, bajo ${money(IVA_SALES_THRESHOLD)}. Igual te tocaría si tus activos del negocio llegan a ${money(IVA_ASSETS_THRESHOLD)}.`,
          },
    );
  }

  if (s.totalBusinessIncome > 0) {
    const expected = round2(s.totalBusinessIncome * PAGO_A_CUENTA_RATE);
    const paid = round2(
      list.filter((t) => t.type === 'BUSINESS_INCOME').reduce((a, t) => a + (Number(t.taxWithheld) || 0), 0),
    );
    alerts.push(
      paid + 0.01 >= expected
        ? {
            level: 'ok',
            title: 'Pago a cuenta al día',
            detail: `Registraste ${money(paid)} de pago a cuenta; el 1.75% de tus ventas es ${money(expected)}.`,
          }
        : {
            level: 'warn',
            title: 'Pago a cuenta pendiente',
            detail: `El 1.75% de tus ventas es ${money(expected)} y registraste ${money(paid)}. Se declara cada mes en el F14; lo pagado se resta en el F11.`,
          },
    );
  }
  return alerts;
}
