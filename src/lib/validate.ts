import type { FrequencyType, Transaction, TransactionType } from '../types';
import { FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '../types';
import { round2 } from './tax';
import { newId } from './format';

const TYPES = Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[];
const FREQS = Object.keys(FREQUENCY_LABELS) as FrequencyType[];

const strip = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const TYPE_ALIASES: Record<string, TransactionType> = {
  salario: 'SALARY_FORMAL',
  'salario (planilla)': 'SALARY_FORMAL',
  planilla: 'SALARY_FORMAL',
  honorarios: 'INDEPENDENT_FEES',
  'honorarios / servicios profesionales': 'INDEPENDENT_FEES',
  'servicios profesionales': 'INDEPENDENT_FEES',
  'gasto medico': 'DEDUCTIBLE_MEDICAL',
  'gasto medico deducible': 'DEDUCTIBLE_MEDICAL',
  medico: 'DEDUCTIBLE_MEDICAL',
  'gasto educativo': 'DEDUCTIBLE_EDU',
  'gasto educativo deducible': 'DEDUCTIBLE_EDU',
  educativo: 'DEDUCTIBLE_EDU',
  colegiatura: 'DEDUCTIBLE_EDU',
};

export function parseType(v: unknown): TransactionType | null {
  if (typeof v !== 'string') return null;
  const up = v.trim().toUpperCase();
  if ((TYPES as string[]).includes(up)) return up as TransactionType;
  return TYPE_ALIASES[strip(v)] ?? null;
}

export function parseFrequency(v: unknown): FrequencyType | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  const up = strip(v).toUpperCase();
  return (FREQS as string[]).includes(up) ? (up as FrequencyType) : undefined;
}

export function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[$\s]/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export type DateOrder = 'DMY' | 'MDY';

/** Acepta YYYY-MM-DD, DD/MM/YYYY (o MM/DD/YYYY con order='MDY'), serial de Excel o Date. */
export function parseDate(v: unknown, order: DateOrder = 'DMY'): string | null {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ok = (y: number, m: number, d: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
      ? `${y}-${pad(m)}-${pad(d)}`
      : null;
  };
  if (v instanceof Date && !isNaN(v.getTime())) return ok(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === 'number' && v > 0) {
    const dt = new Date(Math.round((v - 25569) * 86400000));
    return ok(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  if (typeof v !== 'string') return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ok(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const [a, b, y] = [+m[1], +m[2], +m[3]];
    return order === 'MDY' ? (ok(y, a, b) ?? ok(y, b, a)) : (ok(y, b, a) ?? ok(y, a, b));
  }
  return null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Valida y normaliza un objeto plano a Transaction. */
export function normalizeTransaction(
  raw: Record<string, unknown>,
  dateOrder: DateOrder = 'DMY',
): Result<Transaction> {
  const type = parseType(raw.type);
  if (!type) return { ok: false, error: `tipo inválido "${String(raw.type ?? '')}"` };
  const date = parseDate(raw.date, dateOrder);
  if (!date) return { ok: false, error: `fecha inválida "${String(raw.date ?? '')}"` };
  const gross = parseNumber(raw.grossAmount);
  if (gross === null || gross < 0) return { ok: false, error: 'monto bruto inválido' };
  const withheld = parseNumber(raw.taxWithheld) ?? 0;
  if (withheld < 0) return { ok: false, error: 'renta retenida negativa' };

  const t: Transaction = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    date,
    concept: String(raw.concept ?? '').trim(),
    type,
    grossAmount: round2(gross),
    taxWithheld: type === 'DEDUCTIBLE_MEDICAL' || type === 'DEDUCTIBLE_EDU' ? 0 : round2(withheld),
    ...(String(raw.comment ?? '').trim() ? { comment: String(raw.comment).trim().slice(0, 500) } : {}),
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : new Date().toISOString(),
  };
  if (type === 'SALARY_FORMAL') {
    t.frequency = parseFrequency(raw.frequency) ?? 'MENSUAL';
    t.isssAmount = round2(Math.max(0, parseNumber(raw.isssAmount) ?? 0));
    t.afpAmount = round2(Math.max(0, parseNumber(raw.afpAmount) ?? 0));
    const vialidad = parseNumber(raw.vialidadAmount);
    if (vialidad) t.vialidadAmount = round2(Math.max(0, vialidad));
  }
  return { ok: true, value: t };
}
