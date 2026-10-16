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

const SVG_CELL_W = 9
const SVG_CELL_H = 17

function escapeXml(ch: string): string {
  return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch
}

/**
 * O quadro como SVG, para superfícies sem `Raster` (desktop): cada caractere
 * vai na sua célula, então o alinhamento não depende da fonte da página.
 */
export function mascotSvg(theme: Theme, mascot: Mascot, mood: FaiscaMood, tick: number): { source: string; width: number; height: number } {
  const frame = frameAt(mascot, mood, tick)
  const own = mascot.colors?.[theme.id]
  const width = MASCOT_COLUMNS * SVG_CELL_W
  const height = MASCOT_ROWS * SVG_CELL_H
  let glyphs = ''
  frame.forEach((line, row) => {
    Array.from(line).forEach((ch, col) => {
      if (ch === ' ') return
      const part = partOf(mascot, ch)
      const color = own?.[part] ?? theme.mascotColor({ mascot: mascot.id, part, mood, row, col, rows: MASCOT_ROWS, tick })
      const x = col * SVG_CELL_W + SVG_CELL_W / 2
      const y = row * SVG_CELL_H + SVG_CELL_H - 4
      glyphs += `<text x="${x}" y="${y}" fill="${color}">${escapeXml(ch)}</text>`
    })
  })
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ` +
    `font-family="Consolas,Menlo,'DejaVu Sans Mono',monospace" font-size="14" font-weight="bold" text-anchor="middle">${glyphs}</svg>`
  return { source, width, height }
}
