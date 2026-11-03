import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Save, Wand2 } from 'lucide-react';
import type { FrequencyType, Transaction, TransactionType } from '../types';
import { FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '../types';
import { round2, suggestSocialSecurity } from '../lib/tax';
import { aguinaldoRuleFor } from '../lib/rules';
import { money } from '../lib/format';
import { newId, todayISO } from '../lib/format';
import { Field, btn, inputCls } from './ui';

interface Props {
  editing: Transaction | null;
  /** Fecha inicial para una transacción nueva (según la pestaña activa). */
  defaultDate: string;
  /** keepOpen: el usuario eligió "Agregar y otra". */
  onSave: (t: Transaction, keepOpen: boolean) => void;
  onCancel: () => void;
}

interface FormState {
  date: string;
  concept: string;
  type: TransactionType;
  grossAmount: string;
  frequency: FrequencyType;
  isssAmount: string;
  afpAmount: string;
  vialidadAmount: string;
  taxWithheld: string;
  comment: string;
  autoSS: boolean;
}

const emptyState = (prev?: Partial<FormState>): FormState => ({
  date: prev?.date ?? todayISO(),
  concept: '',
  type: prev?.type ?? 'SALARY_FORMAL',
  grossAmount: '',
  frequency: prev?.frequency ?? 'MENSUAL',
  isssAmount: '',
  afpAmount: '',
  vialidadAmount: '',
  taxWithheld: '',
  comment: '',
  autoSS: true,
});

const fromTx = (t: Transaction): FormState => ({
  date: t.date,
  concept: t.concept,
  type: t.type,
  grossAmount: String(t.grossAmount),
  frequency: t.frequency ?? 'MENSUAL',
  isssAmount: t.isssAmount !== undefined ? String(t.isssAmount) : '',
  afpAmount: t.afpAmount !== undefined ? String(t.afpAmount) : '',
  vialidadAmount: t.vialidadAmount ? String(t.vialidadAmount) : '',
  taxWithheld: String(t.taxWithheld),
  comment: t.comment ?? '',
  autoSS: false,
});

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export default function TransactionForm({ editing, defaultDate, onSave, onCancel }: Props) {
  const [f, setF] = useState<FormState>(() => (editing ? fromTx(editing) : emptyState({ date: defaultDate })));
  const [error, setError] = useState<string | null>(null);
  const keepOpen = useRef(false);

  useEffect(() => {
    setF(editing ? fromTx(editing) : emptyState({ date: defaultDate }));
    setError(null);
    // Solo al cambiar de transacción: con "Agregar y otra" se conservan tipo, fecha y frecuencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const isSalary = f.type === 'SALARY_FORMAL';
  const isDeductible = f.type === 'DEDUCTIBLE_MEDICAL' || f.type === 'DEDUCTIBLE_EDU';

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((prev) => {
      const next = { ...prev, [k]: v };
      if (next.type === 'SALARY_FORMAL' && next.autoSS && (k === 'grossAmount' || k === 'frequency' || k === 'type')) {
        const s = suggestSocialSecurity(num(next.grossAmount), next.frequency);
        next.isssAmount = next.grossAmount ? String(s.isss) : '';
        next.afpAmount = next.grossAmount ? String(s.afp) : '';
      }
      return next;
    });

  const applySuggestion = () => {
    const s = suggestSocialSecurity(num(f.grossAmount), f.frequency);
    setF((p) => ({ ...p, isssAmount: String(s.isss), afpAmount: String(s.afp), autoSS: true }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const keep = keepOpen.current;
    keepOpen.current = false;
    const gross = Number(f.grossAmount);
    if (!f.date) return setError('Ingresa la fecha.');
    if (!Number.isFinite(gross) || gross <= 0) return setError('El monto bruto debe ser mayor que $0.00.');
    const withheld = isDeductible ? 0 : num(f.taxWithheld);
    if (withheld < 0 || num(f.isssAmount) < 0 || num(f.afpAmount) < 0 || num(f.vialidadAmount) < 0)
      return setError('Los montos no pueden ser negativos.');

    const tx: Transaction = {
      id: editing?.id ?? newId(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      date: f.date,
      concept: f.concept.trim(),
      type: f.type,
      grossAmount: round2(gross),
      taxWithheld: round2(withheld),
    };
    if (f.comment.trim()) tx.comment = f.comment.trim();
    if (isSalary) {
      tx.frequency = f.frequency;
      tx.isssAmount = round2(num(f.isssAmount));
      tx.afpAmount = round2(num(f.afpAmount));
      if (num(f.vialidadAmount) > 0) tx.vialidadAmount = round2(num(f.vialidadAmount));
    }
    onSave(tx, keep);
    setError(null);
    if (!editing) setF((prev) => emptyState(prev));
  };

  const isAguinaldo = f.type === 'AGUINALDO';
  const conceptLabel =
    isSalary || isAguinaldo ? 'Empleador' : f.type === 'INDEPENDENT_FEES' ? 'Cliente / concepto' : 'Proveedor / concepto';
  const agYear = Number(f.date.slice(0, 4)) || new Date().getFullYear();
  const agRule = aguinaldoRuleFor(agYear);
  const agHint = `Exento hasta ${money(agRule.cap)} en ${agYear}${agRule.verified ? '' : ' (por confirmar)'}; el excedente paga renta.`;

  return (
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tipo">
          <select className={inputCls} value={f.type} onChange={(e) => set('type', e.target.value as TransactionType)}>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <input type="date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label={conceptLabel}>
            <input
              className={inputCls}
              value={f.concept}
              onChange={(e) => set('concept', e.target.value)}
              placeholder={isSalary || isAguinaldo ? 'Ej. Empresa S.A. de C.V.' : isDeductible ? 'Ej. Hospital / Colegio' : 'Ej. Cliente XYZ'}
              maxLength={120}
            />
          </Field>
        </div>
        <Field label="Monto bruto ($)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className={inputCls}
            value={f.grossAmount}
            onChange={(e) => set('grossAmount', e.target.value)}
            placeholder="0.00"
            required
          />
        </Field>
        {isSalary ? (
          <Field label="Frecuencia de pago">
            <select
              className={inputCls}
              value={f.frequency}
              onChange={(e) => set('frequency', e.target.value as FrequencyType)}
            >
              {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        ) : !isDeductible ? (
          <Field
            label="Renta retenida ($)"
            hint={isAguinaldo ? agHint : 'Usualmente 10% en servicios profesionales.'}
          >
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className={inputCls}
              value={f.taxWithheld}
              onChange={(e) => set('taxWithheld', e.target.value)}
              placeholder="0.00"
            />
          </Field>
        ) : (
          <p className="self-end pb-2 text-xs text-slate-500">
            Se deduce hasta $800.00 anuales por cada categoría (médico y educativo).
          </p>
        )}

        {isSalary && (
          <>
            <Field label="ISSS retenido ($)">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className={inputCls}
                value={f.isssAmount}
                onChange={(e) => setF((p) => ({ ...p, isssAmount: e.target.value, autoSS: false }))}
                placeholder="0.00"
              />
            </Field>
            <Field label="AFP retenido ($)">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className={inputCls}
                value={f.afpAmount}
                onChange={(e) => setF((p) => ({ ...p, afpAmount: e.target.value, autoSS: false }))}
                placeholder="0.00"
              />
            </Field>
            <Field label="Renta retenida ($)">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className={inputCls}
                value={f.taxWithheld}
                onChange={(e) => set('taxWithheld', e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Vialidad ($)" hint="Informativo, no se deduce de la renta.">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className={inputCls}
                value={f.vialidadAmount}
                onChange={(e) => set('vialidadAmount', e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <div className="flex items-end sm:col-span-2">
              <button type="button" className={`${btn.secondary} w-full`} onClick={applySuggestion}>
                <Wand2 className="size-4" /> Recalcular ISSS / AFP
              </button>
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <Field label="Comentario (opcional)">
            <input
              className={inputCls}
              value={f.comment}
              onChange={(e) => set('comment', e.target.value)}
              placeholder="Ej. Bono, ajuste de vacaciones"
              maxLength={500}
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className={`${btn.primary} flex-1`}>
            {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
            {editing ? 'Guardar cambios' : 'Agregar'}
          </button>
          {!editing && (
            <button type="submit" className={btn.secondary} onClick={() => (keepOpen.current = true)}>
              Agregar y otra
            </button>
          )}
          <button type="button" className={btn.secondary} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
  );
}
