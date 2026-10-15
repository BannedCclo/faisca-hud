export type FaiscaMood =
  | 'idle'
  | 'sleep'
  | 'thinking'
  | 'tool'
  | 'writing'
  | 'happy'
  | 'error'
  | 'melting'
  | 'pet'

export type FaiscaMetric = 'ctx' | 'turno' | '5h' | '7d' | 'custo'

export type FaiscaPrefs = {
  theme: string
  mascot: string
  isMinimized: boolean
  hasMascot: boolean
  hasAlerts: boolean
  /** Esconde a linha nativa "✻ Pensando… (12s · tokens)" do Claude Code. */
  hidesSpinner: boolean
  metrics: Record<FaiscaMetric, boolean>
  /** Idioma da faixa e do /faisca; `auto` segue o `language` do Claude Code. */
  lang: 'auto' | 'pt' | 'en' | 'es'
}

export type FaiscaLimit = { percent: number; resetsAt?: string }

export type FaiscaUsage = {
  ctxTokens?: number
  ctxWindow: number
  ctxPercent?: number
  fiveHour?: FaiscaLimit
  sevenDay?: FaiscaLimit
  costUsd?: number
}

export type FaiscaTurn = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  tools: Record<string, number>
  /** `$.clock.now()` de quando o turno começou e de quando terminou. */
  startedAt?: number
  endedAt?: number
}

/**
 * O que causou o humor, para a faixa escrever no idioma da hora: guarda o
 * fato (ferramenta, arquivo), não o texto pronto.
 */
export type FaiscaDetail =
  | { kind: 'tool'; tool: string; file?: string }
  | { kind: 'toolFailed'; tool: string; file?: string }
  | { kind: 'aborted' }
  | { kind: 'refusal' }
  | { kind: 'apiError' }
  | { kind: 'arrived'; mascot: string }

export type FaiscaActivity = {
  mood: FaiscaMood
  /** `$.clock.now()` de quando o humor começou. */
  since: number
  detail?: FaiscaDetail
}

declare module 'claude-code' {
  interface PluginState {
    'faisca-hud': {
      prefs: FaiscaPrefs
      usage: FaiscaUsage | null
      turn: FaiscaTurn
      activity: FaiscaActivity
      alerted: Record<string, number>
    }
  }
}
