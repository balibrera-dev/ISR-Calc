import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { YearAlert } from '../lib/alerts';

const STYLE: Record<YearAlert['level'], { icon: typeof Info; cls: string }> = {
  ok: {
    icon: CheckCircle2,
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  },
  warn: {
    icon: AlertTriangle,
    cls: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  },
  info: {
    icon: Info,
    cls: 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
  },
};

function AlertList({ alerts, label }: { alerts: YearAlert[]; label: string }) {
  if (!alerts.length) return null;
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</h2>
      <ul className="space-y-2" aria-label={label}>
        {alerts.map((a) => {
          const s = STYLE[a.level];
          return (
            <li key={a.title} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${s.cls}`}>
              <s.icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs opacity-90">{a.detail}</p>
                {a.items && a.items.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-xs tabular-nums opacity-90">
                    {a.items.slice(0, 12).map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                    {a.items.length > 12 && <li>y {a.items.length - 12} más</li>}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function YearAlerts({ year, payslips }: { year: YearAlert[]; payslips: YearAlert[] }) {
  if (!year.length && !payslips.length) return null;
  return (
    <div className="space-y-4">
      <AlertList alerts={payslips} label="Revisión de boletas" />
      <AlertList alerts={year} label="Avisos del año" />
    </div>
  );
}
