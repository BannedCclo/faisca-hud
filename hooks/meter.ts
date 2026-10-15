import type { FaiscaMood, FaiscaPrefs, FaiscaTurn, FaiscaUsage } from '../types'
import type { Mascot } from './mascot/clip.ts'
import { levelColor, sample, type Hex, type Theme } from './themes/index.ts'
import { formatDuration, formatReset, formatTokens, formatTools, formatUsd } from './usage.ts'

/** Um trecho de texto com estilo; uma linha da faixa é uma lista deles. */
export type Seg = { text: string; color?: Hex; bold?: boolean }
export type Line = Seg[]

export type MeterInput = {
  usage: FaiscaUsage | null
  turn: FaiscaTurn
  mood: FaiscaMood
  mascot: Mascot
  /** O que escrever ao lado da faísca (`escrevendo Edit`, `pensando`). */
  label: string
  isWorking: boolean
  prefs: FaiscaPrefs
  theme: Theme
  now: number
}

/** Uma barra de `width` células, preenchida em gradiente até `percent`. */
export function bar(theme: Theme, percent: number, width: number): Line {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))
  const segs: Line = []
  for (let i = 0; i < width; i++) {
    if (i < filled) {
      segs.push({ text: theme.glyphs.full, color: sample(theme.barGradient, width <= 1 ? 0 : i / (width - 1)) })
    } else {
      segs.push({ text: theme.glyphs.empty, color: theme.palette.dim })
    }
  }
  return segs
}

function pct(theme: Theme, percent: number): Seg {
  return { text: ` ${Math.round(percent)}%`, color: levelColor(theme, percent), bold: true }
}

function dim(theme: Theme, text: string): Seg {
  return { text, color: theme.palette.dim }
}

function ctxLine(m: MeterInput): Line {
  const { theme, usage, turn, prefs } = m
  const line: Line = []
  if (prefs.metrics.ctx) {
    line.push(dim(theme, 'ctx '))
    if (usage?.ctxPercent !== undefined) {
      line.push(...bar(theme, usage.ctxPercent, 10), pct(theme, usage.ctxPercent))
      if (usage.ctxTokens !== undefined) {
        line.push(dim(theme, `  ${formatTokens(usage.ctxTokens)}/${formatTokens(usage.ctxWindow)}`))
      }
    } else {
      line.push(...bar(theme, 0, 10), dim(theme, usage ? ` 0/${formatTokens(usage.ctxWindow)}` : ' …'))
    }
  }
  if (prefs.metrics.turno) {
    if (line.length > 0) line.push(dim(theme, `  ${theme.glyphs.sep}  `))
    line.push(
      dim(theme, 'turno '),
      { text: `↑${formatTokens(turn.input + turn.cacheWrite)}`, color: theme.palette.accent2 },
      { text: ` ↓${formatTokens(turn.output)}`, color: theme.palette.accent },
      dim(theme, ` ⟲${formatTokens(turn.cacheRead)}`),
    )
  }
  return line
}

function limitsLine(m: MeterInput): Line {
  const { theme, usage, prefs, now } = m
  const line: Line = []
  const limit = (name: '5h' | '7d', l: { percent: number; resetsAt?: string } | undefined) => {
    if (!prefs.metrics[name] || l === undefined) return
    if (line.length > 0) line.push({ text: '   ' })
    line.push(dim(theme, `${name} `), ...bar(theme, l.percent, 8), pct(theme, l.percent))
    const reset = formatReset(l.resetsAt, now)
    if (reset) line.push(dim(theme, ` ${reset}`))
  }
  limit('5h', usage?.fiveHour)
  limit('7d', usage?.sevenDay)
  if (prefs.metrics.custo && usage?.costUsd !== undefined) {
    if (line.length > 0) line.push({ text: '   ' })
    line.push({ text: formatUsd(usage.costUsd), color: theme.palette.accent2, bold: true })
  }
  if (line.length === 0 && (prefs.metrics['5h'] || prefs.metrics['7d'])) {
    line.push(dim(theme, 'limites 5h/7d aparecem após a 1ª resposta'))
  }
  return line
}

function activityLine(m: MeterInput): Line {
  const { theme, turn, mood, label, isWorking, now } = m
  const tools = formatTools(turn.tools)
  // Durante o turno, o tempo corrido; logo depois, quanto o turno levou.
  const elapsed =
    turn.startedAt === undefined
      ? undefined
      : isWorking
        ? now - turn.startedAt
        : mood === 'happy' && turn.endedAt !== undefined
          ? turn.endedAt - turn.startedAt
          : undefined
  return [
    { text: `${theme.glyphs.spark} `, color: theme.palette.accent },
    { text: label + (isWorking && mood !== 'happy' ? '…' : ''), color: theme.palette.fg },
    ...(elapsed !== undefined ? [{ text: ` ${isWorking ? '' : 'em '}${formatDuration(elapsed)}`, color: theme.palette.accent2 }] : []),
    ...(tools ? [dim(theme, `  ${tools}`)] : []),
  ]
}

/** As três linhas da faixa completa: contexto+turno, limites+custo, atividade. */
export function fullLines(m: MeterInput): Line[] {
  return [ctxLine(m), limitsLine(m), activityLine(m)].filter(l => l.length > 0)
}

/** Uma linha só, para o modo minimizado ou terminais estreitos. */
export function compactLine(m: MeterInput): Line {
  const { theme, usage, prefs } = m
  const line: Line = []
  if (prefs.hasMascot) line.push({ text: `${m.mascot.mini[m.mood]} `, color: theme.palette.accent })
  line.push(dim(theme, 'ctx '))
  const ctx = usage?.ctxPercent ?? 0
  line.push(...bar(theme, ctx, 6), pct(theme, ctx))
  if (usage?.fiveHour) line.push(dim(theme, '  5h'), pct(theme, usage.fiveHour.percent))
  if (usage?.sevenDay && prefs.metrics['7d']) line.push(dim(theme, '  7d'), pct(theme, usage.sevenDay.percent))
  if (usage?.costUsd !== undefined) {
    line.push({ text: `  ${formatUsd(usage.costUsd)}`, color: theme.palette.accent2, bold: true })
  }
  return line
}
