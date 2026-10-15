import type { FaiscaMood } from '../types'
import { MASCOT_COLUMNS, MASCOT_ROWS, type Clip, type Frame, type Mascot } from './mascot/clip.ts'
import type { Hex, MascotCell, Theme } from './themes/index.ts'

/**
 * Temas e mascotes do próprio usuário: arquivos `.json` em
 * `<pasta do Claude>/faisca-hud/temas/` e `.../mascotes/`. Arquivos que
 * começam com `_` são ignorados (servem de rascunho ou exemplo).
 */

export const MOODS: readonly FaiscaMood[] = ['idle', 'sleep', 'thinking', 'tool', 'writing', 'happy', 'error', 'melting', 'pet']

export type CustomFile = { name: string; text: string }
export type Loaded = { themes: Theme[]; mascots: Mascot[]; errors: string[] }

const HEX = /^#[0-9a-fA-F]{6}$/

/** Um caractere de largura 1 no terminal: do BMP e fora dos blocos largos (CJK, fullwidth). */
export function isNarrow(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  if (cp > 0xffff || cp < 0x20) return false
  const wide: Array<[number, number]> = [
    [0x1100, 0x115f], [0x2e80, 0xa4cf], [0xac00, 0xd7a3], [0xf900, 0xfaff],
    [0xfe30, 0xfe4f], [0xff00, 0xff60], [0xffe0, 0xffe6],
  ]
  return !wide.some(([a, b]) => cp >= a && cp <= b)
}

class Invalid extends Error {}

function fail(msg: string): never {
  throw new Invalid(msg)
}

function obj(v: unknown, where: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(`${where} precisa ser um objeto`)
  return v as Record<string, unknown>
}

function str(v: unknown, where: string): string {
  if (typeof v !== 'string' || v.length === 0) fail(`${where} precisa ser um texto`)
  return v
}

function optStr(v: unknown, where: string): string | undefined {
  return v === undefined ? undefined : str(v, where)
}

function hex(v: unknown, where: string): Hex {
  if (typeof v !== 'string' || !HEX.test(v)) fail(`${where} precisa ser uma cor "#rrggbb"`)
  return v.toLowerCase() as Hex
}

function hexList(v: unknown, where: string): Hex[] {
  const list = typeof v === 'string' ? [v] : Array.isArray(v) ? v : fail(`${where} precisa ser uma cor ou uma lista de cores`)
  if (list.length === 0) fail(`${where} está vazio`)
  return list.map((c, i) => hex(c, `${where}[${i}]`))
}

function id(v: unknown, where: string): string {
  const s = str(v, where)
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(s)) fail(`${where} "${s}": use letras minúsculas, números e "-" (até 32)`)
  return s
}

function glyph(v: unknown, where: string, fallback: string): string {
  if (v === undefined) return fallback
  const s = str(v, where)
  const chars = Array.from(s)
  if (chars.length !== 1 || !isNarrow(chars[0]!)) fail(`${where} precisa ser um único caractere de largura 1`)
  return s
}

/** Um tema a partir do JSON do usuário. */
export function parseTheme(raw: unknown): Theme {
  const j = obj(raw, 'o tema')
  const p = obj(j.palette, 'palette')
  const palette = {
    fg: hex(p.fg, 'palette.fg'),
    dim: hex(p.dim, 'palette.dim'),
    accent: hex(p.accent, 'palette.accent'),
    accent2: hex(p.accent2 ?? p.accent, 'palette.accent2'),
    ok: hex(p.ok, 'palette.ok'),
    warn: hex(p.warn, 'palette.warn'),
    danger: hex(p.danger, 'palette.danger'),
  }
  const g = j.glyphs === undefined ? {} : obj(j.glyphs, 'glyphs')
  const m = j.mascot === undefined ? {} : obj(j.mascot, 'mascot')
  const body = m.body === undefined ? [palette.accent] : hexList(m.body, 'mascot.body')
  const face = m.face === undefined ? palette.fg : hex(m.face, 'mascot.face')
  const spark = m.spark === undefined ? [palette.accent2] : hexList(m.spark, 'mascot.spark')
  const error = m.error === undefined ? palette.danger : hex(m.error, 'mascot.error')
  const errorSpark = m.errorSpark === undefined ? palette.dim : hex(m.errorSpark, 'mascot.errorSpark')

  const mascotColor = (cell: MascotCell): Hex => {
    if (cell.mood === 'error') return cell.part === 'spark' ? errorSpark : error
    if (cell.part === 'spark') return spark[(cell.tick + cell.col) % spark.length]!
    if (cell.part === 'face') return face
    // Uma cor por linha do mascote; a última se repete se faltar.
    return body[Math.min(cell.row, body.length - 1)]!
  }

  return {
    id: id(j.id, 'id'),
    name: str(j.name, 'name'),
    palette,
    barGradient: j.barGradient === undefined ? [palette.accent2, palette.accent] : hexList(j.barGradient, 'barGradient'),
    glyphs: {
      full: glyph(g.full, 'glyphs.full', '▰'),
      empty: glyph(g.empty, 'glyphs.empty', '▱'),
      sep: glyph(g.sep, 'glyphs.sep', '·'),
      spark: glyph(g.spark, 'glyphs.spark', '✦'),
    },
    mascotColor,
  }
}

function frame(v: unknown, where: string): Frame {
  if (!Array.isArray(v) || v.length === 0 || v.length > MASCOT_ROWS) fail(`${where} precisa ter de 1 a ${MASCOT_ROWS} linhas`)
  const rows = v.map((line, r) => {
    if (typeof line !== 'string') fail(`${where}[${r}] precisa ser um texto`)
    const chars = Array.from(line)
    if (chars.length > MASCOT_COLUMNS) fail(`${where}[${r}] tem ${chars.length} caracteres; o máximo é ${MASCOT_COLUMNS}`)
    const bad = chars.find(ch => !isNarrow(ch))
    if (bad !== undefined) fail(`${where}[${r}]: "${bad}" não tem largura 1 no terminal`)
    return line + ' '.repeat(MASCOT_COLUMNS - chars.length)
  })
  while (rows.length < MASCOT_ROWS) rows.push(' '.repeat(MASCOT_COLUMNS))
  return rows as unknown as Frame
}

function clipOf(v: unknown, where: string): Clip {
  if (!Array.isArray(v) || v.length === 0) fail(`${where} precisa ser uma lista de quadros`)
  const frames: Frame[] = []
  const holds: number[] = []
  v.forEach((step, i) => {
    const s = obj(step, `${where}[${i}]`)
    frames.push(frame(s.frame, `${where}[${i}].frame`))
    const hold = s.hold === undefined ? 2 : s.hold
    if (typeof hold !== 'number' || !Number.isInteger(hold) || hold < 1 || hold > 200) fail(`${where}[${i}].hold precisa ser um inteiro de 1 a 200`)
    holds.push(hold)
  })
  return { frames, holds }
}

/** Um mascote a partir do JSON do usuário; humores ausentes usam o `idle`. */
export function parseMascot(raw: unknown): Mascot {
  const j = obj(raw, 'o mascote')
  const clipsIn = obj(j.clips, 'clips')
  if (clipsIn.idle === undefined) fail('clips.idle é obrigatório')
  const unknownMood = Object.keys(clipsIn).find(k => !MOODS.includes(k as FaiscaMood))
  if (unknownMood) fail(`clips.${unknownMood}: humor desconhecido (use ${MOODS.join(', ')})`)
  const idle = clipOf(clipsIn.idle, 'clips.idle')
  const clips = Object.fromEntries(
    MOODS.map(mood => [mood, clipsIn[mood] === undefined ? idle : clipOf(clipsIn[mood], `clips.${mood}`)]),
  ) as Record<FaiscaMood, Clip>

  const name = str(j.name, 'name')
  const miniIn = j.mini === undefined ? {} : obj(j.mini, 'mini')
  const miniIdle = optStr(miniIn.idle, 'mini.idle') ?? name
  const mini = Object.fromEntries(MOODS.map(mood => [mood, optStr(miniIn[mood], `mini.${mood}`) ?? miniIdle])) as Record<FaiscaMood, string>

  const labelsIn = j.labels === undefined ? {} : obj(j.labels, 'labels')
  const labels: Partial<Record<FaiscaMood, string>> = {}
  for (const mood of MOODS) {
    const l = optStr(labelsIn[mood], `labels.${mood}`)
    if (l !== undefined) labels[mood] = l
  }

  const colorsIn = j.colors === undefined ? {} : obj(j.colors, 'colors')
  const colors: NonNullable<Mascot['colors']> = {}
  for (const [themeId, partsRaw] of Object.entries(colorsIn)) {
    const parts = obj(partsRaw, `colors.${themeId}`)
    const out: Partial<Record<'body' | 'face' | 'spark', Hex>> = {}
    for (const part of ['body', 'face', 'spark'] as const) {
      if (parts[part] !== undefined) out[part] = hex(parts[part], `colors.${themeId}.${part}`)
    }
    colors[themeId] = out
  }

  return {
    id: id(j.id, 'id'),
    name,
    description: optStr(j.description, 'description') ?? 'mascote personalizado',
    petLabel: optStr(j.petLabel, 'petLabel') ?? 'interagir',
    sparks: typeof j.sparks === 'string' ? j.sparks : '✦✧·*',
    face: typeof j.face === 'string' ? j.face : '',
    labels,
    colors,
    clips,
    mini,
  }
}

/** Lê os arquivos de temas e de mascotes; um arquivo inválido vira uma linha de erro. */
export function loadCustom(themeFiles: readonly CustomFile[], mascotFiles: readonly CustomFile[]): Loaded {
  const out: Loaded = { themes: [], mascots: [], errors: [] }
  const each = <T>(kind: string, files: readonly CustomFile[], parse: (raw: unknown) => T, push: (t: T) => void) => {
    for (const file of files) {
      if (!file.name.endsWith('.json') || file.name.startsWith('_')) continue
      try {
        push(parse(JSON.parse(file.text)))
      } catch (err) {
        const why = err instanceof Invalid ? err.message : err instanceof SyntaxError ? `JSON inválido (${err.message})` : String(err)
        out.errors.push(`${kind}/${file.name}: ${why}`)
      }
    }
  }
  each('temas', themeFiles, parseTheme, t => out.themes.push(t))
  each('mascotes', mascotFiles, parseMascot, m => out.mascots.push(m))
  return out
}

/** Os arquivos de exemplo que `/faisca exemplos` escreve na pasta. */
export const EXAMPLE_THEME = {
  id: 'meu-tema',
  name: 'Meu tema',
  palette: { fg: '#e6e6e6', dim: '#6b6b6b', accent: '#ff8c42', accent2: '#4fc3f7', ok: '#81c784', warn: '#ffd54f', danger: '#e57373' },
  barGradient: ['#4fc3f7', '#ff8c42'],
  glyphs: { full: '█', empty: '░', sep: '·', spark: '✦' },
  mascot: { body: ['#ffb074', '#ff8c42', '#d9672a'], face: '#ffffff', spark: ['#4fc3f7', '#ffd54f'] },
}

export const EXAMPLE_MASCOT = {
  id: 'meu-mascote',
  name: 'Quadrado',
  description: 'um bloquinho que pisca',
  petLabel: 'cutucar',
  sparks: '*·!?z',
  face: 'o-^x',
  labels: { thinking: 'matutando', happy: 'feito!' },
  clips: {
    idle: [
      { frame: ['   ┌───┐', '   │o o│', '   └───┘'], hold: 12 },
      { frame: ['   ┌───┐', '   │- -│', '   └───┘'], hold: 1 },
    ],
    thinking: [
      { frame: ['   ┌───┐ ?', '   │o o│', '   └───┘'], hold: 3 },
      { frame: ['   ┌───┐  ', '   │o o│ ?', '   └───┘'], hold: 3 },
    ],
    happy: [{ frame: ['   ┌───┐ !', '   │^ ^│', '   └───┘'], hold: 3 }],
    error: [{ frame: ['   ┌───┐', '   │x x│', '   └───┘'], hold: 3 }],
  },
  mini: { idle: '[o o]', happy: '[^ ^]', error: '[x x]' },
}
