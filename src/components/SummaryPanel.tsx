import { Info } from 'lucide-react';
import type { TaxSummary } from '../types';
import { ANNUAL_TAX_BRACKETS, DEDUCTION_CAP_EDU, DEDUCTION_CAP_MEDICAL, findBracket } from '../lib/tax';
import { money } from '../lib/format';
import { Card } from './ui';

function Row({ label, value, sub, strong, negative }: { label: string; value: number; sub?: string; strong?: boolean; negative?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'font-semibold' : ''}`}>
      <span className={strong ? '' : 'text-slate-600 dark:text-slate-400'}>
        {label}
        {sub && <span className="block text-xs font-normal text-slate-500">{sub}</span>}
      </span>
      <span className="tabular-nums">
        {negative && value > 0 ? '−' : ''}
        {money(value)}
      </span>
    </div>
  );
}

export default function SummaryPanel({ summary: s, year }: { summary: TaxSummary; year: number | 'all' }) {
  const bracket = findBracket(s.taxableIncome);
  const due = s.finalBalance > 0;
  const zero = s.finalBalance === 0;

  return (
    <div className="space-y-4">
      <Card
        className={
          zero
            ? ''
            : due
              ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
              : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
        }
      >
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Saldo F11 {year === 'all' ? '(todos los años)' : year}
        </p>
        <p
          className={`mt-1 text-3xl font-bold tabular-nums ${zero ? '' : due ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
        >
          {money(Math.abs(s.finalBalance))}
        </p>
        <p className="mt-1 text-sm font-medium">
          {zero ? 'Sin saldo pendiente' : due ? 'Impuesto a pagar' : 'Devolución a tu favor'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Impuesto determinado</p>
            <p className="font-semibold tabular-nums">{money(s.calculatedTax)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Renta retenida</p>
            <p className="font-semibold tabular-nums">{money(s.totalTaxWithheld)}</p>
          </div>
        </div>
      </Card>

      <Card className="text-sm">
        <h2 className="mb-2 text-base font-semibold">Detalle del cálculo</h2>
        <Row label="Salarios brutos" value={s.totalGrossSalary} />
        <Row label="ISSS" value={s.totalISSS} negative />
        <Row label="AFP" value={s.totalAFP} negative />
        <Row label="Salario neto gravado" value={s.netSalarySubjectToTax} strong />
        {s.totalVialidad > 0 && (
          <p className="flex justify-between py-1 text-xs text-slate-500">
            <span>Vialidad pagada (no deducible)</span>
            <span className="tabular-nums">{money(s.totalVialidad)}</span>
          </p>
        )}
        <hr className="my-2 border-slate-200 dark:border-slate-800" />
        <Row label="Honorarios brutos" value={s.totalIndependentFees} strong />
        <hr className="my-2 border-slate-200 dark:border-slate-800" />
        <Row
          label="Gastos médicos"
          sub={`Facturado ${money(s.grossDeductibleMedical)} · máx. ${money(DEDUCTION_CAP_MEDICAL)}`}
          value={s.appliedDeductibleMedical}
          negative
        />
        <Row
          label="Gastos educativos"
          sub={`Facturado ${money(s.grossDeductibleEdu)} · máx. ${money(DEDUCTION_CAP_EDU)}`}
          value={s.appliedDeductibleEdu}
          negative
        />
        <hr className="my-2 border-slate-200 dark:border-slate-800" />
        <Row label="Renta neta imponible" value={s.taxableIncome} strong />
        <Row label={`Impuesto (tramo ${bracket.tramo})`} value={s.calculatedTax} strong />
        <Row label="Renta retenida" value={s.totalTaxWithheld} negative />
        <Row label={due ? 'Saldo a pagar' : 'Saldo a devolver'} value={Math.abs(s.finalBalance)} strong />
      </Card>

      <Card className="text-sm">
        <h2 className="mb-2 text-base font-semibold">Tabla anual · Art. 37 LIR</h2>
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr className="text-left">
              <th className="py-1 font-medium">Tramo</th>
              <th className="py-1 font-medium">Desde</th>
              <th className="py-1 font-medium">Hasta</th>
              <th className="py-1 text-right font-medium">%</th>
              <th className="py-1 text-right font-medium">Cuota fija</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {ANNUAL_TAX_BRACKETS.map((b) => (
              <tr
                key={b.tramo}
                className={b.tramo === bracket.tramo ? 'font-semibold text-teal-700 dark:text-teal-400' : ''}
              >
                <td className="py-1">{b.tramo}</td>
                <td className="py-1">{money(b.desde)}</td>
                <td className="py-1">{b.hasta === null ? 'En adelante' : money(b.hasta)}</td>
                <td className="py-1 text-right">{b.tasa === 0 ? 'Exento' : `${b.tasa * 100}%`}</td>
                <td className="py-1 text-right">{money(b.cuotaFija)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 flex gap-2 text-xs text-slate-500">
          <Info className="size-4 shrink-0" />
          Cálculo estimado con fines informativos. Verifica tu declaración (F11) con el Ministerio de Hacienda o un
          contador.
        </p>
      </Card>
    </div>
  );
}
