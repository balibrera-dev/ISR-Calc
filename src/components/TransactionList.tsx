import { useMemo, useState } from 'react';
import { BriefcaseBusiness, GraduationCap, HeartPulse, Pencil, Search, Trash2, Wallet } from 'lucide-react';
import type { Transaction, TransactionType } from '../types';
import { FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '../types';
import { formatDate, money } from '../lib/format';
import { Card, btn, inputBase } from './ui';

const ICONS: Record<TransactionType, typeof Wallet> = {
  SALARY_FORMAL: Wallet,
  INDEPENDENT_FEES: BriefcaseBusiness,
  DEDUCTIBLE_MEDICAL: HeartPulse,
  DEDUCTIBLE_EDU: GraduationCap,
};

const BADGE: Record<TransactionType, string> = {
  SALARY_FORMAL: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
  INDEPENDENT_FEES: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
  DEDUCTIBLE_MEDICAL: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
  DEDUCTIBLE_EDU: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
};

interface Props {
  transactions: Transaction[];
  editingId: string | null;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

export default function TransactionList({ transactions, editingId, onEdit, onDelete }: Props) {
  const [filter, setFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => (filter === 'ALL' || t.type === filter) && (!q || t.concept.toLowerCase().includes(q) || (t.comment ?? '').toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [transactions, filter, query]);

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <h2 className="text-base font-semibold">
          Transacciones <span className="text-sm font-normal text-slate-500">({rows.length})</span>
        </h2>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
            <input
              className={`${inputBase} w-full pl-8 sm:w-44`}
              placeholder="Buscar concepto o nota"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar concepto"
            />
          </div>
          <select
            className={`${inputBase} min-w-0 flex-1 sm:w-44 sm:flex-none`}
            value={filter}
            onChange={(e) => setFilter(e.target.value as TransactionType | 'ALL')}
            aria-label="Filtrar por tipo"
          >
            <option value="ALL">Todos los tipos</option>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-500">
          {transactions.length === 0
            ? 'Aún no hay transacciones para este período. Agrega tu primer salario, honorario o gasto deducible.'
            : 'Ninguna transacción coincide con el filtro.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((t) => {
            const Icon = ICONS[t.type];
            const deductible = t.type === 'DEDUCTIBLE_MEDICAL' || t.type === 'DEDUCTIBLE_EDU';
            return (
              <li
                key={t.id}
                className={`flex items-center gap-3 px-5 py-3 ${editingId === t.id ? 'bg-teal-50 dark:bg-teal-950/40' : ''}`}
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${BADGE[t.type]}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.concept || TRANSACTION_TYPE_LABELS[t.type]}</p>
                  <p className="truncate text-xs text-slate-500">
                    {formatDate(t.date)} · {TRANSACTION_TYPE_LABELS[t.type]}
                    {t.frequency && ` · ${FREQUENCY_LABELS[t.frequency]}`}
                  </p>
                  {t.comment && (
                    <p className="truncate text-xs text-slate-600 italic dark:text-slate-400" title={t.comment}>
                      {t.comment}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold tabular-nums ${deductible ? 'text-slate-600 dark:text-slate-300' : ''}`}>
                    {money(t.grossAmount)}
                  </p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {t.type === 'SALARY_FORMAL' && (
                      <span className="hidden sm:inline">
                        ISSS {money(t.isssAmount ?? 0)} · AFP {money(t.afpAmount ?? 0)} ·{' '}
                        {t.vialidadAmount ? `Vialidad ${money(t.vialidadAmount)} · ` : ''}
                      </span>
                    )}
                    {!deductible && `Ret. ${money(t.taxWithheld)}`}
                    {deductible && 'Deducible'}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <button className={btn.ghost} onClick={() => onEdit(t)} aria-label="Editar">
                    <Pencil className="size-4" />
                  </button>
                  <button
                    className={`${btn.ghost} hover:text-red-600`}
                    onClick={() => onDelete(t)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
