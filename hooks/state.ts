import type { FaiscaPrefs, FaiscaSpend, FaiscaTurn } from '../types'
import { DEFAULT_MASCOT } from './mascot/index.ts'
import { DEFAULT_THEME } from './themes/index.ts'

export const DEFAULT_PREFS: FaiscaPrefs = {
  theme: DEFAULT_THEME,
  mascot: DEFAULT_MASCOT,
  isMinimized: false,
  hasMascot: true,
  hasAlerts: true,
  hidesSpinner: true,
  metrics: { ctx: true, turno: true, '5h': true, '7d': true, custo: true },
  lang: 'auto',
}

export const EMPTY_TURN: FaiscaTurn = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  tools: {},
}

export const EMPTY_SPEND: FaiscaSpend = { tokens: 0 }

/** Lê o gasto da janela de 5h guardado no disco, ignorando o que não for válido. */
export function mergeSpend(saved: unknown): FaiscaSpend {
  if (typeof saved !== 'object' || saved === null) return EMPTY_SPEND
  const s = saved as Partial<FaiscaSpend>
  if (typeof s.tokens !== 'number' || !Number.isFinite(s.tokens) || s.tokens < 0) return EMPTY_SPEND
  return typeof s.resetsAt === 'string' ? { resetsAt: s.resetsAt, tokens: s.tokens } : { tokens: s.tokens }
}

/** Junta preferências salvas (possivelmente antigas ou parciais) com o padrão. */
export function mergePrefs(saved: unknown): FaiscaPrefs {
  if (typeof saved !== 'object' || saved === null) return DEFAULT_PREFS
  const s = saved as Partial<FaiscaPrefs>
  return {
    theme: typeof s.theme === 'string' ? s.theme : DEFAULT_PREFS.theme,
    mascot: typeof s.mascot === 'string' ? s.mascot : DEFAULT_PREFS.mascot,
    isMinimized: s.isMinimized === true,
    hasMascot: s.hasMascot !== false,
    hasAlerts: s.hasAlerts !== false,
    hidesSpinner: s.hidesSpinner !== false,
    metrics: { ...DEFAULT_PREFS.metrics, ...(s.metrics ?? {}) },
    lang: s.lang === 'pt' || s.lang === 'en' || s.lang === 'es' ? s.lang : 'auto',
  }
}
