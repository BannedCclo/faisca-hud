import type { FaiscaUsage } from '../types'

export const THRESHOLDS = [80, 90] as const
/** Quantos pontos abaixo do limiar a leitura precisa cair para o alerta rearmar. */
export const REARM_GAP = 5

const NAMES: Record<string, string> = {
  ctx: 'Contexto',
  '5h': 'Limite de 5h',
  '7d': 'Limite semanal',
}

export type Fired = { key: string; level: number; percent: number; text: string }

export function readings(u: FaiscaUsage): Record<string, number | undefined> {
  return { ctx: u.ctxPercent, '5h': u.fiveHour?.percent, '7d': u.sevenDay?.percent }
}

/**
 * Compara as leituras com o maior limiar já avisado de cada métrica.
 * Dispara um aviso por cruzamento para cima; rearma quando a leitura cai
 * `REARM_GAP` pontos abaixo do limiar (ex. depois de uma compactação).
 */
export function checkAlerts(
  prev: Readonly<Record<string, number>>,
  now: Record<string, number | undefined>,
): { next: Record<string, number>; fired: Fired[] } {
  const next: Record<string, number> = { ...prev }
  const fired: Fired[] = []
  for (const [key, percent] of Object.entries(now)) {
    if (percent === undefined) continue
    let level = next[key] ?? 0
    while (level > 0 && percent < level - REARM_GAP) {
      level = [...THRESHOLDS].reverse().find(t => t < level) ?? 0
    }
    const reached = [...THRESHOLDS].reverse().find(t => percent >= t) ?? 0
    if (reached > level) {
      fired.push({
        key,
        level: reached,
        percent,
        text: `✦ ${NAMES[key] ?? key} em ${Math.round(percent)}% (passou de ${reached}%)`,
      })
      level = reached
    }
    if (level === 0) delete next[key]
    else next[key] = level
  }
  return { next, fired }
}
