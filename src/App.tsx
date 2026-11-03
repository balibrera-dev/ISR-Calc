import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, FileDown, FileSpreadsheet, FileUp, Moon, Plus, Sun, Trash } from 'lucide-react';
import type { Transaction } from './types';
import { computeSummary, txYear } from './lib/tax';
import { rulesForYear } from './lib/rules';
import { todayISO } from './lib/format';
import { loadTransactions, saveTransactions, THEME_KEY } from './lib/storage';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import SummaryPanel from './components/SummaryPanel';
import LegalPanel from './components/LegalPanel';
import YearTabs from './components/YearTabs';
import YearAlerts from './components/YearAlerts';
import { yearAlerts } from './lib/alerts';
import Dialog from './components/Dialog';
import { btn } from './components/ui';

type Notice = { kind: 'ok' | 'error'; text: string; details?: string[] };
/** null = cerrado; 'new' = nueva transacción; Transaction = edición. */
type DialogState = null | 'new' | Transaction;

const CURRENT_YEAR = new Date().getFullYear();

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions);
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  useEffect(() => {
    if (notice?.kind !== 'ok') return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  /** Transacciones agrupadas por ejercicio fiscal (año de la fecha). */
  const byYear = useMemo(() => {
    const map = new Map<number, Transaction[]>([[CURRENT_YEAR, []]]);
    for (const t of transactions) {
      const y = txYear(t);
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(t);
    }
    return map;
  }, [transactions]);

  const years = useMemo(() => [...byYear.keys()].sort((a, b) => a - b), [byYear]);
  const counts = useMemo(() => new Map([...byYear].map(([y, l]) => [y, l.length])), [byYear]);

  // Si el año activo se queda sin transacciones (p. ej. al borrarlo), vuelve al año actual.
  useEffect(() => {
    if (!byYear.has(year)) setYear(CURRENT_YEAR);
  }, [byYear, year]);

  const visible = byYear.get(year) ?? [];
  const rules = useMemo(() => rulesForYear(year), [year]);
  const summary = useMemo(() => computeSummary(visible, year), [visible, year]);
  const alerts = useMemo(() => yearAlerts(visible, summary, rules), [visible, summary, rules]);

  const editing = dialog && dialog !== 'new' ? dialog : null;
  const defaultDate = year === CURRENT_YEAR ? todayISO() : `${year}-12-31`;

  const save = (t: Transaction, keepOpen: boolean) => {
    const isEdit = transactions.some((x) => x.id === t.id);
    setTransactions((list) => {
      const i = list.findIndex((x) => x.id === t.id);
      if (i === -1) return [...list, t];
      const copy = [...list];
      copy[i] = t;
      return copy;
    });
    if (!keepOpen) setDialog(null);
    if (txYear(t) !== year) setYear(txYear(t));
    setNotice({
      kind: 'ok',
      text: `${isEdit ? 'Transacción actualizada' : 'Transacción agregada'} en el ejercicio ${txYear(t)}.`,
    });
  };

  const remove = (t: Transaction) => {
    if (!confirm(`¿Eliminar "${t.concept || 'transacción'}" por $${t.grossAmount.toFixed(2)}?`)) return;
    setTransactions((list) => list.filter((x) => x.id !== t.id));
  };

  const clearYear = () => {
    if (!confirm(`¿Eliminar todas las transacciones de ${year}? Esta acción no se puede deshacer. Exporta un respaldo antes.`))
      return;
    setTransactions((list) => list.filter((t) => txYear(t) !== year));
  };

  const exportExcel = async () => {
    const io = await import('./lib/io');
    io.exportXlsx(
      transactions,
      years.filter((y) => counts.get(y)).map((y) => [y, computeSummary(byYear.get(y)!, y)]),
    );
  };

  const onImport = async (file: File) => {
    try {
      const { parseWorkbook, mergeTransactions } = await import('./lib/io');
      const { transactions: incoming, errors } = parseWorkbook(await file.arrayBuffer());
      if (!incoming.length) {
        setNotice({ kind: 'error', text: 'No se encontraron transacciones válidas en el archivo.', details: errors });
        return;
      }
      const r = mergeTransactions(transactions, incoming);
      setTransactions(r.list);
      const importedYears = [...new Set(incoming.map(txYear))].sort();
      setNotice({
        kind: errors.length ? 'error' : 'ok',
        text: `Importación: ${r.added} nuevas, ${r.updated} actualizadas en ${importedYears.length} ejercicio(s) (${importedYears.join(', ')})${errors.length ? `, ${errors.length} filas omitidas` : ''}.`,
        details: errors,
      });
    } catch {
      setNotice({ kind: 'error', text: 'No se pudo leer el archivo. Usa formato .xlsx o .csv.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
          <div className="mr-auto flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-700 text-white">
              <Calculator className="size-5" />
            </span>
            <div>
              <h1 className="text-lg leading-tight font-bold">ISR Calc</h1>
              <p className="text-xs text-slate-500">Renta personal · El Salvador</p>
            </div>
          </div>
          <button className={btn.primary} onClick={() => setDialog('new')}>
            <Plus className="size-4" /> <span className="hidden sm:inline">Nueva transacción</span>
            <span className="sm:hidden">Nueva</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
          <button className={btn.secondary} onClick={() => fileRef.current?.click()} title="Importar .xlsx o .csv">
            <FileUp className="size-4" /> <span className="hidden md:inline">Importar</span>
          </button>
          <button
            className={btn.secondary}
            onClick={exportExcel}
            disabled={!transactions.length}
            title="Exportar todo a Excel (una hoja de resumen por año)"
          >
            <FileSpreadsheet className="size-4" /> <span className="hidden md:inline">Excel</span>
          </button>
          <button
            className={btn.secondary}
            onClick={() => import('./lib/io').then((io) => io.exportCsv(transactions))}
            disabled={!transactions.length}
            title="Exportar todas las transacciones a CSV"
          >
            <FileDown className="size-4" /> <span className="hidden md:inline">CSV</span>
          </button>
          <button
            className={btn.ghost}
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>
        <div className="mx-auto max-w-7xl px-4">
          <YearTabs years={years} active={year} counts={counts} onChange={setYear} />
        </div>
      </header>

      {notice && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div
            role="status"
            className={`rounded-lg border px-4 py-3 text-sm ${notice.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200'}`}
          >
            <div className="flex justify-between gap-4">
              <span>{notice.text}</span>
              <button className="text-xs underline" onClick={() => setNotice(null)}>
                Cerrar
              </button>
            </div>
            {notice.details && notice.details.length > 0 && (
              <ul className="mt-2 max-h-32 list-disc overflow-auto pl-5 text-xs">
                {notice.details.slice(0, 50).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <main
        id={`panel-${year}`}
        role="tabpanel"
        aria-labelledby={`tab-${year}`}
        className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        <div className="min-w-0 space-y-6">
          <YearAlerts alerts={alerts} />
          <TransactionList
            transactions={visible}
            editingId={editing?.id ?? null}
            onEdit={(t) => setDialog(t)}
            onDelete={remove}
          />
          <LegalPanel rules={rules} taxableIncome={summary.taxableIncome} />
          {visible.length > 0 && (
            <button className={`${btn.ghost} gap-2 px-2 text-xs`} onClick={clearYear}>
              <Trash className="size-3.5" /> Borrar ejercicio {year}
            </button>
          )}
        </div>
        <aside className="order-first min-w-0 lg:sticky lg:top-36 lg:order-none lg:self-start">
          <SummaryPanel summary={summary} rules={rules} />
        </aside>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-slate-500">
        Tus datos se guardan solo en este navegador (localStorage). Nada se envía a un servidor. Exporta a Excel de vez
        en cuando como respaldo.
      </footer>

      <Dialog
        open={dialog !== null}
        title={editing ? 'Editar transacción' : 'Nueva transacción'}
        onClose={() => setDialog(null)}
      >
        <TransactionForm
          editing={editing}
          defaultDate={defaultDate}
          onSave={save}
          onCancel={() => setDialog(null)}
        />
      </Dialog>
    </div>
  );
}
