import type { FaiscaMood } from '../../types'

import { synthwave } from './synthwave.ts'
import { crt } from './crt.ts'
import { dracula } from './dracula.ts'
import { gruvbox } from './gruvbox.ts'
import { nord } from './nord.ts'
import { terracota } from './terracota.ts'

/** Uma cor em `#rrggbb`: o que `Text` pinta e o que o `Raster` converte. */
export type Hex = `#${string}`

export type Theme = {
  id: string
  name: string
  palette: {
    fg: Hex
    dim: Hex
    accent: Hex
    accent2: Hex
    ok: Hex
    warn: Hex
    danger: Hex
  }
  /** Cores do início ao fim de uma barra cheia; interpoladas célula a célula. */
  barGradient: readonly Hex[]
  glyphs: {
    full: string
    empty: string
    sep: string
    spark: string
  }
  /**
   * A cor de cada célula do mascote: `part` diz se é corpo, rosto ou faísca;
   * `row` e `col` dão a posição; `tick` anima brilho e cintilação.
   */
  mascotColor: (cell: MascotCell) => Hex
}

import type { MascotPart } from '../mascot/clip.ts'
export type { MascotPart }

export type MascotCell = {
  /** O id do mascote, para um tema que queira pintar um deles do seu jeito. */
  mascot: string
  part: MascotPart
  mood: FaiscaMood
  row: number
  col: number
  rows: number
  tick: number
}

const THEMES: Theme[] = []

/** Novo tema: um arquivo em themes/ e uma chamada aqui embaixo. */
export function registerTheme(theme: Theme): void {
  const at = THEMES.findIndex(one => one.id === theme.id)
  if (at === -1) THEMES.push(theme)
  else THEMES[at] = theme
}

registerTheme(synthwave)
registerTheme(terracota)
registerTheme(crt)
registerTheme(nord)
registerTheme(dracula)
registerTheme(gruvbox)

export const DEFAULT_THEME = synthwave.id

export function listThemes(): readonly Theme[] {
  return THEMES
}

export function getTheme(id: string): Theme {
  return THEMES.find(one => one.id === id) ?? synthwave
}

export function nextTheme(id: string): Theme {
  const at = THEMES.findIndex(one => one.id === id)
  return THEMES[(at + 1) % THEMES.length] ?? synthwave
}

export function hexToInt(hex: Hex): number {
  return Number.parseInt(hex.slice(1, 7), 16)
}

function intToHex(n: number): Hex {
  return `#${n.toString(16).padStart(6, '0')}`
}

/** Mistura duas cores; `t` de 0 (só `a`) a 1 (só `b`). */
export function mix(a: Hex, b: Hex, t: number): Hex {
  const x = hexToInt(a)
  const y = hexToInt(b)
  const k = Math.min(1, Math.max(0, t))
  let out = 0
  for (const shift of [16, 8, 0]) {
    const ca = (x >> shift) & 0xff
    const cb = (y >> shift) & 0xff
    out |= Math.round(ca + (cb - ca) * k) << shift
  }
  return intToHex(out)
}

/** A cor na posição `t` (0..1) de um gradiente de várias paradas. */
export function sample(stops: readonly Hex[], t: number): Hex {
  if (stops.length === 0) return '#ffffff'
  if (stops.length === 1) return stops[0]!
  const k = Math.min(1, Math.max(0, t)) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(k))
  return mix(stops[i]!, stops[i + 1]!, k - i)
}

/** A cor de um nível de uso: ok, atenção a partir de 70%, perigo a partir de 90%. */
export function levelColor(theme: Theme, percent: number): Hex {
  if (percent >= 90) return theme.palette.danger
  if (percent >= 70) return theme.palette.warn
  return theme.palette.ok
}
