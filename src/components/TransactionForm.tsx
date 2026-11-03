import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Save, Wand2, X } from 'lucide-react';
import type { FrequencyType, Transaction, TransactionType } from '../types';
import { FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '../types';
import { round2, suggestSocialSecurity } from '../lib/tax';
import { newId, todayISO } from '../lib/format';
import { Card, Field, btn, inputCls } from './ui';

interface Props {
  editing: Transaction | null;
  onSave: (t: Transaction) => void;
  onCancelEdit: () => void;
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
  isAguinaldo: boolean;
  autoSS: boolean;
}

const emptyState = (prev?: FormState): FormState => ({
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
  isAguinaldo: false,
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
  isAguinaldo: !!t.isAguinaldo,
  autoSS: false,
});

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export default function TransactionForm({ editing, onSave, onCancelEdit }: Props) {
  const [f, setF] = useState<FormState>(() => (editing ? fromTx(editing) : emptyState()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setF(editing ? fromTx(editing) : emptyState());
    setError(null);
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
      if (f.isAguinaldo) tx.isAguinaldo = true;
      if (num(f.vialidadAmount) > 0) tx.vialidadAmount = round2(num(f.vialidadAmount));
    }
    onSave(tx);
    setError(null);
    if (!editing) setF((prev) => emptyState(prev));
  };

  const conceptLabel = isSalary ? 'Empleador' : f.type === 'INDEPENDENT_FEES' ? 'Cliente / concepto' : 'Proveedor / concepto';

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{editing ? 'Editar transacción' : 'Nueva transacción'}</h2>
        {editing && (
          <button type="button" className={btn.ghost} onClick={onCancelEdit} aria-label="Cancelar edición">
            <X className="size-4" />
          </button>
        )}
      </div>
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
              placeholder={isSalary ? 'Ej. Empresa S.A. de C.V.' : isDeductible ? 'Ej. Hospital / Colegio' : 'Ej. Cliente XYZ'}
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
          <Field label="Renta retenida ($)" hint="Usualmente 10% en servicios profesionales.">
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
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="size-4 accent-teal-700"
                checked={f.isAguinaldo}
                onChange={(e) => set('isAguinaldo', e.target.checked)}
              />
              Es aguinaldo <span className="text-xs text-slate-500">(exento de renta hasta $1,500 por año)</span>
            </label>
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
              placeholder="Ej. Bono, aguinaldo, ajuste de vacaciones"
              maxLength={500}
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className={`${btn.primary} flex-1`}>
            {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
            {editing ? 'Guardar cambios' : 'Agregar transacción'}
          </button>
          {editing && (
            <button type="button" className={btn.secondary} onClick={onCancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
