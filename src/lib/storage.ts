import type { Transaction } from '../types';
import { normalizeTransaction } from './validate';

export const STORAGE_KEY = 'isr-calc:v1:transactions';
export const THEME_KEY = 'isr-calc:theme';

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const r = normalizeTransaction(item as Record<string, unknown>);
      return r.ok ? [r.value] : [];
    });
  } catch {
    return [];
  }
}

export function saveTransactions(list: Transaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Almacenamiento lleno o bloqueado: se ignora para no romper la UI.
  }
}
