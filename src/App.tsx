import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, FileDown, FileSpreadsheet, FileUp, Moon, Sun, Trash } from 'lucide-react';
import type { Transaction } from './types';
import { computeSummary, txYear } from './lib/tax';
import { loadTransactions, saveTransactions, THEME_KEY } from './lib/storage';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import SummaryPanel from './components/SummaryPanel';
import { btn, inputBase } from './components/ui';

type Year = number | 'all';
type Notice = { kind: 'ok' | 'error'; text: string; details?: string[] };

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions);
  const [year, setYear] = useState<Year>(() => new Date().getFullYear());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveTransactions(transactions), [transactions]);

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

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    transactions.forEach((t) => set.add(txYear(t)));
    return [...set].sort((a, b) => b - a);
  }, [transactions]);

  const visible = useMemo(
    () => (year === 'all' ? transactions : transactions.filter((t) => txYear(t) === year)),
    [transactions, year],
  );
  const summary = useMemo(() => computeSummary(visible, year === 'all' ? undefined : year), [visible, year]);

  const save = (t: Transaction) => {
    setTransactions((list) => {
      const i = list.findIndex((x) => x.id === t.id);
      if (i === -1) return [...list, t];
      const copy = [...list];
      copy[i] = t;
      return copy;
    });
    if (editing) setEditing(null);
    if (year !== 'all' && txYear(t) !== year) setYear(txYear(t));
    setNotice({ kind: 'ok', text: editing ? 'Transacción actualizada.' : 'Transacción agregada.' });
  };

  const remove = (t: Transaction) => {
    if (!confirm(`¿Eliminar "${t.concept || 'transacción'}" por $${t.grossAmount.toFixed(2)}?`)) return;
    setTransactions((list) => list.filter((x) => x.id !== t.id));
    if (editing?.id === t.id) setEditing(null);
  };

  const clearPeriod = () => {
    const label = year === 'all' ? 'TODAS las transacciones' : `todas las transacciones de ${year}`;
    if (!confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer. Exporta un respaldo antes.`)) return;
    setTransactions((list) => (year === 'all' ? [] : list.filter((t) => txYear(t) !== year)));
    setEditing(null);
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
      setNotice({
        kind: errors.length ? 'error' : 'ok',
        text: `Importación: ${r.added} nuevas, ${r.updated} actualizadas${errors.length ? `, ${errors.length} filas omitidas` : ''}.`,
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-700 text-white">
              <Calculator className="size-5" />
            </span>
            <div>
              <h1 className="text-lg leading-tight font-bold">ISR Calc</h1>
              <p className="text-xs text-slate-500">Renta personal · El Salvador</p>
            </div>
          </div>
          <select
            className={inputBase}
            value={year}
            onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            aria-label="Ejercicio fiscal"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                Ejercicio {y}
              </option>
            ))}
            <option value="all">Todos los años</option>
          </select>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
          <button className={btn.secondary} onClick={() => fileRef.current?.click()} title="Importar .xlsx o .csv">
            <FileUp className="size-4" /> <span className="hidden sm:inline">Importar</span>
          </button>
          <button
            className={btn.secondary}
            onClick={() => import('./lib/io').then((io) => io.exportXlsx(visible, summary, year))}
            disabled={!visible.length}
            title="Exportar a Excel"
          >
            <FileSpreadsheet className="size-4" /> <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            className={btn.secondary}
            onClick={() => import('./lib/io').then((io) => io.exportCsv(visible, year))}
            disabled={!visible.length}
            title="Exportar a CSV"
          >
            <FileDown className="size-4" /> <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            className={btn.ghost}
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
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

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <TransactionForm editing={editing} onSave={save} onCancelEdit={() => setEditing(null)} />
          <TransactionList
            transactions={visible}
            editingId={editing?.id ?? null}
            onEdit={(t) => {
              setEditing(t);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDelete={remove}
          />
          {visible.length > 0 && (
            <button className={`${btn.ghost} gap-2 px-2 text-xs`} onClick={clearPeriod}>
              <Trash className="size-3.5" /> Borrar {year === 'all' ? 'todo' : `ejercicio ${year}`}
            </button>
          )}
        </div>
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <SummaryPanel summary={summary} year={year} />
        </aside>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-slate-500">
        Tus datos se guardan solo en este navegador (localStorage). Nada se envía a un servidor.
      </footer>
    </div>
  );
}
