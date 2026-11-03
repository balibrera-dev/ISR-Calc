import { AlertTriangle, BookOpen, ExternalLink, Sparkles } from 'lucide-react';
import type { LegalNote, YearRules } from '../lib/rules';
import { bracketIn, taxForOption } from '../lib/tax';
import { money } from '../lib/format';
import { Card } from './ui';

const KIND: Record<LegalNote['kind'], { icon: typeof BookOpen; label: string; cls: string }> = {
  cambio: {
    icon: Sparkles,
    label: 'Cambio del año',
    cls: 'text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/50',
  },
  aviso: {
    icon: AlertTriangle,
    label: 'Por confirmar',
    cls: 'text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50',
  },
  ley: { icon: BookOpen, label: 'Ley', cls: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800' },
};

export default function LegalPanel({
  rules,
  taxableIncome,
  onTableChange,
}: {
  rules: YearRules;
  taxableIncome: number;
  onTableChange: (id: string) => void;
}) {
  const current = bracketIn(taxableIncome, rules.brackets);
  return (
    <Card className="text-sm">
      <h2 className="text-base font-semibold">Marco legal · ejercicio {rules.year}</h2>
      <p className="mt-1 text-xs text-slate-500">{rules.bracketsLabel}</p>

      {rules.tableOptions.length > 1 && (
        <fieldset className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <legend className="px-1 text-xs font-medium text-amber-900 dark:text-amber-200">
            La tabla cambió a mitad de {rules.year}: ¿cómo calcular el F11?
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {rules.tableOptions.map((o) => {
              const on = o.id === rules.tableId;
              return (
                <label
                  key={o.id}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs ${on ? 'border-teal-600 bg-white ring-2 ring-teal-600/20 dark:bg-slate-900' : 'border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/60'}`}
                >
                  <input
                    type="radio"
                    name={`tabla-${rules.year}`}
                    className="sr-only"
                    checked={on}
                    onChange={() => onTableChange(o.id)}
                  />
                  <span className="block font-medium">{o.label}</span>
                  <span className="block text-slate-500">{o.detail}</span>
                  <span className="mt-1 block font-semibold tabular-nums">
                    Impuesto: {money(taxForOption(taxableIncome, o))}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-xs">
          <thead className="text-slate-500">
            <tr className="text-left">
              <th className="py-1 font-medium">Tramo</th>
              <th className="py-1 font-medium">Desde</th>
              <th className="py-1 font-medium">Hasta</th>
              <th className="py-1 text-right font-medium">%</th>
              <th className="py-1 text-right font-medium">Sobre exceso de</th>
              <th className="py-1 text-right font-medium">Cuota fija</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rules.brackets.map((b) => (
              <tr
                key={b.tramo}
                className={b.tramo === current.tramo ? 'font-semibold text-teal-700 dark:text-teal-400' : ''}
              >
                <td className="py-1">{b.tramo}</td>
                <td className="py-1">{money(b.desde)}</td>
                <td className="py-1">{b.hasta === null ? 'En adelante' : money(b.hasta)}</td>
                <td className="py-1 text-right">{b.tasa === 0 ? 'Exento' : `${b.tasa * 100}%`}</td>
                <td className="py-1 text-right">{b.exceso ? money(b.exceso) : '—'}</td>
                <td className="py-1 text-right">{money(b.cuotaFija)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-3">
        {rules.notes.map((n) => {
          const k = KIND[n.kind];
          return (
            <li key={n.title} className="flex gap-3">
              <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${k.cls}`} title={k.label}>
                <k.icon className="size-3.5" />
              </span>
              <div>
                <p className="font-medium">
                  {n.title}
                  {n.kind !== 'ley' && (
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${k.cls}`}>{k.label}</span>
                  )}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{n.detail}</p>
                {n.source && (
                  <a
                    href={n.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-teal-700 hover:underline dark:text-teal-400"
                  >
                    {n.source.label} <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-slate-500">
        Cálculo estimado con fines informativos. Verifica tu declaración (F11) con el Ministerio de Hacienda o un
        contador.
      </p>
    </Card>
  );
}
