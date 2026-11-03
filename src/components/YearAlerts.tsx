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

export default function YearAlerts({ alerts }: { alerts: YearAlert[] }) {
  if (!alerts.length) return null;
  return (
    <ul className="space-y-2" aria-label="Avisos del ejercicio">
      {alerts.map((a) => {
        const s = STYLE[a.level];
        return (
          <li key={a.title} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${s.cls}`}>
            <s.icon className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="text-xs opacity-90">{a.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
