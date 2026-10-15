import type { FaiscaMood } from '../types'
import { LANGS, t, type Lang, type Strings, type Text } from './i18n.ts'
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

type Err = Strings['custom']['err']

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

/** Os validadores de campo, falando no idioma de `err`. */
function fields(err: Err) {
  const fail = (msg: string): never => {
    throw new Invalid(msg)
  }
  const obj = (v: unknown, w: string): Record<string, unknown> => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(err.object(w))
    return v as Record<string, unknown>
  }
  const str = (v: unknown, w: string): string => {
    if (typeof v !== 'string' || v.length === 0) fail(err.text(w))
    return v as string
  }
  const optStr = (v: unknown, w: string): string | undefined => (v === undefined ? undefined : str(v, w))
  /** Um texto: uma string, ou `{ "pt": "…", "en": "…", "es": "…" }`. */
  const text = (v: unknown, w: string): Text => {
    if (typeof v === 'string') return str(v, w)
    const o = obj(v, w)
    const out: Partial<Record<Lang, string>> = {}
    for (const [k, val] of Object.entries(o)) {
      if (!LANGS.includes(k as Lang)) fail(err.text(`${w}.${k}`))
      out[k as Lang] = str(val, `${w}.${k}`)
    }
    if (Object.keys(out).length === 0) fail(err.empty(w))
    return out
  }
  const optText = (v: unknown, w: string): Text | undefined => (v === undefined ? undefined : text(v, w))
  const hex = (v: unknown, w: string): Hex => {
    if (typeof v !== 'string' || !HEX.test(v)) fail(err.hex(w))
    return (v as string).toLowerCase() as Hex
  }
  const hexList = (v: unknown, w: string): Hex[] => {
    const list = typeof v === 'string' ? [v] : Array.isArray(v) ? v : fail(err.colorOrList(w))
    if (list.length === 0) fail(err.empty(w))
    return list.map((c, i) => hex(c, `${w}[${i}]`))
  }
  const id = (v: unknown, w: string): string => {
    const s = str(v, w)
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(s)) fail(err.id(w, s))
    return s
  }
  const glyph = (v: unknown, w: string, fallback: string): string => {
    if (v === undefined) return fallback
    const s = str(v, w)
    const chars = Array.from(s)
    if (chars.length !== 1 || !isNarrow(chars[0]!)) fail(err.glyph(w))
    return s
  }
  return { fail, obj, str, optStr, text, optText, hex, hexList, id, glyph }
}

/** Um tema a partir do JSON do usuário. */
export function parseTheme(raw: unknown, lang: Lang = 'en'): Theme {
  const f = fields(t(lang).custom.err)
  const j = f.obj(raw, 'theme')
  const p = f.obj(j.palette, 'palette')
  const palette = {
    fg: f.hex(p.fg, 'palette.fg'),
    dim: f.hex(p.dim, 'palette.dim'),
    accent: f.hex(p.accent, 'palette.accent'),
    accent2: f.hex(p.accent2 ?? p.accent, 'palette.accent2'),
    ok: f.hex(p.ok, 'palette.ok'),
    warn: f.hex(p.warn, 'palette.warn'),
    danger: f.hex(p.danger, 'palette.danger'),
  }
  const g = j.glyphs === undefined ? {} : f.obj(j.glyphs, 'glyphs')
  const m = j.mascot === undefined ? {} : f.obj(j.mascot, 'mascot')
  const body = m.body === undefined ? [palette.accent] : f.hexList(m.body, 'mascot.body')
  const face = m.face === undefined ? palette.fg : f.hex(m.face, 'mascot.face')
  const spark = m.spark === undefined ? [palette.accent2] : f.hexList(m.spark, 'mascot.spark')
  const error = m.error === undefined ? palette.danger : f.hex(m.error, 'mascot.error')
  const errorSpark = m.errorSpark === undefined ? palette.dim : f.hex(m.errorSpark, 'mascot.errorSpark')

  const mascotColor = (cell: MascotCell): Hex => {
    if (cell.mood === 'error') return cell.part === 'spark' ? errorSpark : error
    if (cell.part === 'spark') return spark[(cell.tick + cell.col) % spark.length]!
    if (cell.part === 'face') return face
    // Uma cor por linha do mascote; a última se repete se faltar.
    return body[Math.min(cell.row, body.length - 1)]!
  }

  return {
    id: f.id(j.id, 'id'),
    name: f.text(j.name, 'name'),
    palette,
    barGradient: j.barGradient === undefined ? [palette.accent2, palette.accent] : f.hexList(j.barGradient, 'barGradient'),
    glyphs: {
      full: f.glyph(g.full, 'glyphs.full', '▰'),
      empty: f.glyph(g.empty, 'glyphs.empty', '▱'),
      sep: f.glyph(g.sep, 'glyphs.sep', '·'),
      spark: f.glyph(g.spark, 'glyphs.spark', '✦'),
    },
    mascotColor,
  }
}

/** Um mascote a partir do JSON do usuário; humores ausentes usam o `idle`. */
export function parseMascot(raw: unknown, lang: Lang = 'en'): Mascot {
  const err = t(lang).custom.err
  const f = fields(err)

  const frame = (v: unknown, w: string): Frame => {
    if (!Array.isArray(v) || v.length === 0 || v.length > MASCOT_ROWS) f.fail(err.rows(w, MASCOT_ROWS))
    const rows = (v as unknown[]).map((line, r) => {
      if (typeof line !== 'string') f.fail(err.text(`${w}[${r}]`))
      const chars = Array.from(line as string)
      if (chars.length > MASCOT_COLUMNS) f.fail(err.tooLong(`${w}[${r}]`, chars.length, MASCOT_COLUMNS))
      const bad = chars.find(ch => !isNarrow(ch))
      if (bad !== undefined) f.fail(err.notNarrow(`${w}[${r}]`, bad))
      return (line as string) + ' '.repeat(MASCOT_COLUMNS - chars.length)
    })
    while (rows.length < MASCOT_ROWS) rows.push(' '.repeat(MASCOT_COLUMNS))
    return rows as unknown as Frame
  }

  const clipOf = (v: unknown, w: string): Clip => {
    if (!Array.isArray(v) || v.length === 0) f.fail(err.frames(w))
    const frames: Frame[] = []
    const holds: number[] = []
    ;(v as unknown[]).forEach((step, i) => {
      const s = f.obj(step, `${w}[${i}]`)
      frames.push(frame(s.frame, `${w}[${i}].frame`))
      const hold = s.hold === undefined ? 2 : s.hold
      if (typeof hold !== 'number' || !Number.isInteger(hold) || hold < 1 || hold > 200) f.fail(err.hold(`${w}[${i}].hold`))
      holds.push(hold as number)
    })
    return { frames, holds }
  }

  const j = f.obj(raw, 'mascot')
  const clipsIn = f.obj(j.clips, 'clips')
  if (clipsIn.idle === undefined) f.fail(err.idleRequired)
  const unknownMood = Object.keys(clipsIn).find(k => !MOODS.includes(k as FaiscaMood))
  if (unknownMood) f.fail(err.unknownMood(unknownMood, MOODS.join(', ')))
  const idle = clipOf(clipsIn.idle, 'clips.idle')
  const clips = Object.fromEntries(
    MOODS.map(mood => [mood, clipsIn[mood] === undefined ? idle : clipOf(clipsIn[mood], `clips.${mood}`)]),
  ) as Record<FaiscaMood, Clip>

  const name = f.str(j.name, 'name')
  const miniIn = j.mini === undefined ? {} : f.obj(j.mini, 'mini')
  const miniIdle = f.optStr(miniIn.idle, 'mini.idle') ?? name
  const mini = Object.fromEntries(MOODS.map(mood => [mood, f.optStr(miniIn[mood], `mini.${mood}`) ?? miniIdle])) as Record<FaiscaMood, string>

  const labelsIn = j.labels === undefined ? {} : f.obj(j.labels, 'labels')
  const labels: Partial<Record<FaiscaMood, Text>> = {}
  for (const mood of MOODS) {
    const l = f.optText(labelsIn[mood], `labels.${mood}`)
    if (l !== undefined) labels[mood] = l
  }

  const colorsIn = j.colors === undefined ? {} : f.obj(j.colors, 'colors')
  const colors: NonNullable<Mascot['colors']> = {}
  for (const [themeId, partsRaw] of Object.entries(colorsIn)) {
    const parts = f.obj(partsRaw, `colors.${themeId}`)
    const out: Partial<Record<'body' | 'face' | 'spark', Hex>> = {}
    for (const part of ['body', 'face', 'spark'] as const) {
      if (parts[part] !== undefined) out[part] = f.hex(parts[part], `colors.${themeId}.${part}`)
    }
    colors[themeId] = out
  }

  const petLabel = f.optText(j.petLabel, 'petLabel')
  return {
    id: f.id(j.id, 'id'),
    name,
    description: f.optText(j.description, 'description') ?? {
      pt: t('pt').custom.defaultDescription,
      en: t('en').custom.defaultDescription,
      es: t('es').custom.defaultDescription,
    },
    ...(petLabel !== undefined ? { petLabel } : {}),
    sparks: typeof j.sparks === 'string' ? j.sparks : '✦✧·*',
    face: typeof j.face === 'string' ? j.face : '',
    labels,
    colors,
    clips,
    mini,
  }
}

/** Lê os arquivos de temas e de mascotes; um arquivo inválido vira uma linha de erro. */
export function loadCustom(themeFiles: readonly CustomFile[], mascotFiles: readonly CustomFile[], lang: Lang = 'en'): Loaded {
  const err = t(lang).custom.err
  const out: Loaded = { themes: [], mascots: [], errors: [] }
  const each = <T>(kind: string, files: readonly CustomFile[], parse: (raw: unknown) => T, push: (v: T) => void) => {
    for (const file of files) {
      if (!file.name.endsWith('.json') || file.name.startsWith('_')) continue
      try {
        push(parse(JSON.parse(file.text)))
      } catch (e) {
        const why = e instanceof Invalid ? e.message : e instanceof SyntaxError ? err.json(e.message) : String(e)
        out.errors.push(`${kind}/${file.name}: ${why}`)
      }
    }
  }
  each('temas', themeFiles, raw => parseTheme(raw, lang), v => out.themes.push(v))
  each('mascotes', mascotFiles, raw => parseMascot(raw, lang), v => out.mascots.push(v))
  return out
}

/** Os arquivos de exemplo que `/faisca exemplos` escreve na pasta. */
export const EXAMPLE_THEME = {
  id: 'my-theme',
  name: { en: 'My theme', pt: 'Meu tema', es: 'Mi tema' },
  palette: { fg: '#e6e6e6', dim: '#6b6b6b', accent: '#ff8c42', accent2: '#4fc3f7', ok: '#81c784', warn: '#ffd54f', danger: '#e57373' },
  barGradient: ['#4fc3f7', '#ff8c42'],
  glyphs: { full: '█', empty: '░', sep: '·', spark: '✦' },
  mascot: { body: ['#ffb074', '#ff8c42', '#d9672a'], face: '#ffffff', spark: ['#4fc3f7', '#ffd54f'] },
}

export const EXAMPLE_MASCOT = {
  id: 'my-mascot',
  name: 'Cube',
  description: { en: 'a little block that blinks', pt: 'um bloquinho que pisca', es: 'un bloquecito que parpadea' },
  petLabel: { en: 'poke', pt: 'cutucar', es: 'pinchar' },
  sparks: '*·!?z',
  face: 'o-^x',
  labels: {
    thinking: { en: 'pondering', pt: 'matutando', es: 'cavilando' },
    happy: { en: 'done!', pt: 'feito!', es: '¡hecho!' },
  },
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
