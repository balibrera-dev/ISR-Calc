import { useEffect, useRef } from 'react';

interface Props {
  years: number[];
  active: number;
  counts: Map<number, number>;
  onChange: (y: number) => void;
}

/** Una pestaña por ejercicio fiscal; el año sale de la fecha de cada transacción. */
export default function YearTabs({ years, active, counts, onChange }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  return (
    <div
      role="tablist"
      aria-label="Ejercicio fiscal"
      className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800"
      onKeyDown={(e) => {
        const i = years.indexOf(active);
        if (e.key === 'ArrowRight' && i < years.length - 1) onChange(years[i + 1]);
        if (e.key === 'ArrowLeft' && i > 0) onChange(years[i - 1]);
      }}
    >
      {years.map((y) => {
        const selected = y === active;
        return (
          <button
            key={y}
            ref={selected ? activeRef : undefined}
            role="tab"
            id={`tab-${y}`}
            aria-selected={selected}
            aria-controls={`panel-${y}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(y)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              selected
                ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {y}
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 tabular-nums dark:bg-slate-800 dark:text-slate-400">
              {counts.get(y) ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
