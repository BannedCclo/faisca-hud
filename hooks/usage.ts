import type { SessionContextUsage, SessionCost, SessionRateLimit, TurnUsage } from 'claude-code'

import type { FaiscaSpend, FaiscaTurn, FaiscaUsage } from '../types'

/** O que `$.session.usage()` e `session.measure` trazem, no formato da faixa. */
export function toUsage(m: {
  context: SessionContextUsage
  rateLimits: readonly SessionRateLimit[]
  cost?: SessionCost
}): FaiscaUsage {
  const limit = (kind: string) => {
    const one = m.rateLimits.find(r => r.kind === kind)
    return one === undefined
      ? undefined
      : { percent: one.percentUsed, ...(one.resetsAt ? { resetsAt: one.resetsAt } : {}) }
  }
  const out: FaiscaUsage = { ctxWindow: m.context.window }
  if (m.context.tokens !== undefined) out.ctxTokens = m.context.tokens
  if (m.context.percent !== undefined) out.ctxPercent = m.context.percent
  const fiveHour = limit('five_hour')
  const sevenDay = limit('seven_day')
  if (fiveHour) out.fiveHour = fiveHour
  if (sevenDay) out.sevenDay = sevenDay
  if (m.cost) out.costUsd = m.cost.usd
  return out
}

/** Soma o custo de um passo do turno ao que o turno já gastou. */
export function addStep(turn: FaiscaTurn, u: TurnUsage): FaiscaTurn {
  return {
    ...turn,
    input: turn.input + u.input_tokens,
    output: turn.output + u.output_tokens,
    cacheRead: turn.cacheRead + u.cache_read_input_tokens,
    cacheWrite: turn.cacheWrite + u.cache_creation_input_tokens,
  }
}

/**
 * Soma o que um passo custou à janela de 5h. Se a janela mudou (`resetsAt`
 * diferente do guardado), a contagem recomeça do zero.
 */
export function addSpend(prev: FaiscaSpend, resetsAt: string | undefined, u: TurnUsage): FaiscaSpend {
  // Uma sessão com a medida atrasada não zera a janela que outra já abriu.
  const isOlder = resetsAt !== undefined && prev.resetsAt !== undefined && Date.parse(resetsAt) < Date.parse(prev.resetsAt)
  if (isOlder) return { ...prev, tokens: prev.tokens + stepTokens(u) }
  const base = prev.resetsAt === resetsAt ? prev.tokens : 0
  const tokens = base + stepTokens(u)
  return resetsAt === undefined ? { tokens } : { resetsAt, tokens }
}

function stepTokens(u: TurnUsage): number {
  return u.input_tokens + u.output_tokens + u.cache_creation_input_tokens
}

/** Tokens gastos na janela atual; 0 se o que está guardado é de uma janela que já passou. */
export function spendNow(spend: FaiscaSpend, resetsAt: string | undefined): number {
  return spend.resetsAt === resetsAt ? spend.tokens : 0
}

/** 950 → "950", 12_100 → "12.1k", 1_250_000 → "1.25M". */
export function formatTokens(n: number): string {
  if (n < 1000) return String(Math.round(n))
  if (n < 1_000_000) {
    const k = n / 1000
    return `${k >= 100 ? Math.round(k) : trim(k.toFixed(1))}k`
  }
  return `${trim((n / 1_000_000).toFixed(2))}M`
}

function trim(s: string): string {
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

/** 9_000 → "9s", 64_000 → "1m04s", 3_725_000 → "1h02m". */
export function formatDuration(ms: number): string {
  const secs = Math.max(0, Math.floor(ms / 1000))
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m${String(secs % 60).padStart(2, '0')}s`
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}m`
}

export function formatUsd(usd: number): string {
  return usd < 10 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(1)}`
}

/** Quanto falta para `resetsAt`: "45m", "2h14", "4d". */
export function formatReset(resetsAt: string | undefined, now: number): string {
  if (!resetsAt) return ''
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at)) return ''
  const mins = Math.max(0, Math.round((at - now) / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h${String(mins % 60).padStart(2, '0')}`
  return `${Math.round(hours / 24)}d`
}

/** "Edit ×2 Bash ×3", das mais usadas para as menos, até `max` ferramentas. */
export function formatTools(tools: Record<string, number>, max = 3): string {
  return Object.entries(tools)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([name, n]) => `${shortTool(name)} ×${n}`)
    .join('  ')
}

function shortTool(name: string): string {
  // mcp__servidor__ferramenta → ferramenta
  const parts = name.split('__')
  return parts.length >= 3 ? parts.slice(2).join('__') : name
}
