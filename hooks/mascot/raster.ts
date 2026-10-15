import type { FaiscaMood } from '../../types'
import { hexToInt, type Theme } from '../themes/index.ts'
import { MASCOT_COLUMNS, MASCOT_ROWS, frameAt, partOf, type Mascot } from './clip.ts'

/** A cor "padrão do terminal" no formato do Raster (bit 24 sozinho). */
export const DEFAULT_COLOR = 0x01000000

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Base64 padrão com preenchimento: o ambiente do mod pode não ter `toBase64`. */
export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0
    const n = (a << 16) | (b << 8) | c
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? B64[n & 63]! : '='
  }
  return out
}

/** Linhas de texto + cores → células do Raster (triplas u32 little-endian). */
export function encodeCells(
  rows: readonly string[],
  columns: number,
  colorOf: (ch: string, row: number, col: number) => number,
): string {
  const words = new Uint32Array(columns * rows.length * 3)
  rows.forEach((line, r) => {
    const chars = Array.from(line)
    for (let c = 0; c < columns; c++) {
      const ch = chars[c] ?? ' '
      const at = (r * columns + c) * 3
      words[at] = ch.codePointAt(0) ?? 32
      words[at + 1] = ch === ' ' ? DEFAULT_COLOR : colorOf(ch, r, c)
      words[at + 2] = DEFAULT_COLOR
    }
  })
  // Uint32Array já é little-endian em todo hardware em que o mod roda.
  return toBase64(new Uint8Array(words.buffer))
}

/** O quadro do mascote no tick, pintado pelo tema. */
export function mascotCells(theme: Theme, mascot: Mascot, mood: FaiscaMood, tick: number): string {
  const frame = frameAt(mascot, mood, tick)
  const own = mascot.colors?.[theme.id]
  return encodeCells(frame, MASCOT_COLUMNS, (ch, row, col) => {
    const part = partOf(mascot, ch)
    return hexToInt(own?.[part] ?? theme.mascotColor({ mascot: mascot.id, part, mood, row, col, rows: MASCOT_ROWS, tick }))
  })
}
