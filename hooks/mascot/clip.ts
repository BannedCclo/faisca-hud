import type { FaiscaMood } from '../../types'

/** Cada quadro tem 3 linhas de exatamente MASCOT_COLUMNS caracteres de largura 1. */
export const MASCOT_COLUMNS = 11
export const MASCOT_ROWS = 3

export type Frame = readonly [string, string, string]

/** Uma animação: os quadros e quantos ticks (~150ms) cada um fica na tela. */
export type Clip = { frames: readonly Frame[]; holds: readonly number[] }

export type MascotPart = 'body' | 'face' | 'spark'

export type Mascot = {
  id: string
  name: string
  /** Uma linha: quem é, para o /faisca mascote. */
  description: string
  clips: Record<FaiscaMood, Clip>
  /** A versão de uma linha, para o modo compacto. */
  mini: Record<FaiscaMood, string>
  /** Caracteres pintados como faísca/efeito e como rosto; o resto é corpo. */
  sparks: string
  face: string
  /** Rótulos próprios por humor (o robô não "fica feliz ♡", ele recalibra). */
  labels?: Partial<Record<FaiscaMood, string>>
  /** O texto do botão de interação (hotkey `p`). */
  petLabel: string
  /**
   * Cores próprias do mascote num tema, por parte, acima das do tema:
   * `{ nord: { body: '#88c0d0' } }` pinta o corpo assim só no nord.
   */
  colors?: Record<string, Partial<Record<MascotPart, `#${string}`>>>
}

export function clip(...steps: Array<[Frame, number]>): Clip {
  return { frames: steps.map(([f]) => f), holds: steps.map(([, n]) => n) }
}

/** O quadro de um clipe no tick dado (em loop). */
export function frameAt(mascot: Mascot, mood: FaiscaMood, tick: number): Frame {
  const { frames, holds } = mascot.clips[mood]
  const total = holds.reduce((a, b) => a + b, 0)
  let t = ((tick % total) + total) % total
  for (let i = 0; i < frames.length; i++) {
    const hold = holds[i]!
    if (t < hold) return frames[i]!
    t -= hold
  }
  return frames[0]!
}

export function partOf(mascot: Mascot, ch: string): MascotPart {
  if (mascot.sparks.includes(ch)) return 'spark'
  if (mascot.face.includes(ch)) return 'face'
  return 'body'
}
