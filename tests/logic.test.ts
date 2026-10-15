import { describe, expect, test } from 'claude-code/testing'

import { checkAlerts } from '../hooks/alerts.ts'
import type { FaiscaMood } from '../types'
import { MASCOT_COLUMNS, MASCOT_ROWS, frameAt, partOf } from '../hooks/mascot/clip.ts'
import { getMascot, listMascots, nextMascot } from '../hooks/mascot/index.ts'
import { describeTool, effectiveMood, labelForMood, SLEEP_AFTER_MS } from '../hooks/mascot/mood.ts'
import { encodeCells, mascotCells, toBase64 } from '../hooks/mascot/raster.ts'
import { mergePrefs } from '../hooks/state.ts'
import { getTheme, listThemes, mix, nextTheme, sample } from '../hooks/themes/index.ts'
import { addStep, formatDuration, formatReset, formatTokens, formatTools, toUsage } from '../hooks/usage.ts'
import { fullLines } from '../hooks/meter.ts'
import { EMPTY_TURN } from '../hooks/state.ts'

const MOODS: FaiscaMood[] = ['idle', 'sleep', 'thinking', 'tool', 'writing', 'happy', 'error', 'melting', 'pet']

describe('mascotes', () => {
  test('todo quadro de todo mascote tem 3 linhas de 11 caracteres do BMP', () => {
    const bad: string[] = []
    for (const mascot of listMascots()) {
      for (const mood of MOODS) {
        const clip = mascot.clips[mood]
        if (clip.frames.length === 0 || clip.frames.length !== clip.holds.length) bad.push(`${mascot.id}/${mood}: clipe vazio ou holds errados`)
        for (const frame of clip.frames) {
          if (frame.length !== MASCOT_ROWS) bad.push(`${mascot.id}/${mood}: ${frame.length} linhas`)
          for (const row of frame) {
            const chars = Array.from(row)
            if (chars.length !== MASCOT_COLUMNS) bad.push(`${mascot.id}/${mood}: "${row}" tem ${chars.length}`)
            for (const ch of chars) if ((ch.codePointAt(0) ?? 0) > 0xffff) bad.push(`${mascot.id}/${mood}: "${ch}" fora do BMP`)
          }
        }
        if (!mascot.mini[mood]) bad.push(`${mascot.id}/${mood}: sem versão compacta`)
      }
    }
    expect(bad).toEqual([])
  })

  test('registro: robô por padrão, ciclo passa por todos e volta', () => {
    expect(listMascots().map(m => m.id)).toEqual(['bit', 'rex', 'kage', 'faisca'])
    expect(getMascot('nao-existe').id).toBe('bit')
    let id = 'bit'
    const seen: string[] = []
    for (let i = 0; i < 4; i++) {
      id = nextMascot(id).id
      seen.push(id)
    }
    expect(seen).toEqual(['rex', 'kage', 'faisca', 'bit'])
  })

  test('ferramentas viram frases de ação em português, com o arquivo', () => {
    expect(describeTool('Edit', { file_path: 'C:\\x\\hooks\\meter.ts' })).toBe('editando meter.ts')
    expect(describeTool('Write', { file_path: '/a/README.md' })).toBe('criando README.md')
    expect(describeTool('Read', { file_path: '/a/b/usage.ts' })).toBe('lendo usage.ts')
    expect(describeTool('Read', {})).toBe('lendo')
    expect(describeTool('Bash', { command: 'ls' })).toBe('rodando comando')
    expect(describeTool('Grep', { pattern: 'x', path: '/a' })).toBe('buscando no código')
    expect(describeTool('mcp__shadcn__add', {})).toBe('usando add (shadcn)')
    expect(describeTool('Desconhecida', {})).toBe('usando Desconhecida')
  })

  test('rótulos próprios do mascote vencem os padrão', () => {
    expect(labelForMood('happy', getMascot('bit'))).toBe('concluído ✓')
    expect(labelForMood('pet', getMascot('rex'))).toBe('RAWR!')
    expect(labelForMood('happy', getMascot('faisca'))).toBe('pronto!')
    expect(labelForMood('happy')).toBe('pronto!')
  })

  test('partes: LED do robô é rosto, antena é corpo, faísca é efeito', () => {
    const bit = getMascot('bit')
    expect(partOf(bit, '■')).toBe('face')
    expect(partOf(bit, '┴')).toBe('body')
    expect(partOf(bit, '*')).toBe('spark')
  })

  test('o corpo de todo mascote segue as cores do tema', () => {
    const bodyColor = (theme: string, mascot: string) => {
      const cells = mascotCells(getTheme(theme), getMascot(mascot), 'idle', 0)
      const words = new Uint32Array(Uint8Array.from(atob(cells), c => c.charCodeAt(0)).buffer)
      const frame = frameAt(getMascot(mascot), 'idle', 0)
      // A primeira célula de corpo da linha do meio.
      const col = Array.from(frame[1]).findIndex(ch => ch !== ' ' && partOf(getMascot(mascot), ch) === 'body')
      return words[(1 * MASCOT_COLUMNS + col) * 3 + 1]
    }
    for (const m of listMascots()) {
      expect(bodyColor('synthwave', m.id)).not.toBe(bodyColor('terracota', m.id))
    }
    // Synthwave pinta a linha do meio de roxo; terracota, de argila.
    expect(bodyColor('synthwave', 'bit')).toBe(0x9b5cff)
    expect(bodyColor('terracota', 'bit')).toBe(0xd97757)
  })

  test('frameAt percorre o clipe em loop respeitando os holds', () => {
    const m = getMascot('faisca')
    const idle = m.clips.idle
    expect(frameAt(m, 'idle', 0)).toEqual(idle.frames[0])
    const total = idle.holds.reduce((a, b) => a + b, 0)
    expect(frameAt(m, 'idle', total)).toEqual(idle.frames[0])
    expect(frameAt(m, 'idle', idle.holds[0]!)).toEqual(idle.frames[1])
  })
})

describe('humor', () => {
  const at = (mood: Parameters<typeof effectiveMood>[0]['mood'], since = 0) => ({ mood, label: '', since })

  test('passageiros voltam ao de base depois do tempo', () => {
    expect(effectiveMood(at('happy'), 1000, 10, false)).toBe('happy')
    expect(effectiveMood(at('happy'), 5000, 10, false)).toBe('idle')
    expect(effectiveMood(at('error'), 5000, 10, true)).toBe('thinking')
    expect(effectiveMood(at('pet'), 4000, 10, false)).toBe('idle')
  })

  test('ócio longo vira sono; contexto cheio derrete', () => {
    expect(effectiveMood(at('idle'), SLEEP_AFTER_MS + 1, 10, false)).toBe('sleep')
    expect(effectiveMood(at('idle'), 10, 90, false)).toBe('melting')
    expect(effectiveMood(at('sleep'), 10, 90, false)).toBe('melting')
    expect(effectiveMood(at('writing'), 10, 95, true)).toBe('writing')
  })
})

describe('alertas', () => {
  test('um aviso por cruzamento, com rearme abaixo do limiar', () => {
    let state: Record<string, number> = {}
    let r = checkAlerts(state, { ctx: 50 })
    expect(r.fired).toHaveLength(0)
    r = checkAlerts(r.next, { ctx: 82 })
    expect(r.fired.map(f => f.level)).toEqual([80])
    r = checkAlerts(r.next, { ctx: 84 })
    expect(r.fired).toHaveLength(0)
    r = checkAlerts(r.next, { ctx: 95 })
    expect(r.fired.map(f => f.level)).toEqual([90])
    // Compactou: caiu para 30%, rearma tudo.
    r = checkAlerts(r.next, { ctx: 30 })
    expect(r.next).toEqual({})
    r = checkAlerts(r.next, { ctx: 91 })
    expect(r.fired.map(f => f.level)).toEqual([90])
    state = r.next
    expect(state).toEqual({ ctx: 90 })
  })

  test('cada métrica tem seu próprio estado e ignora leituras ausentes', () => {
    const r = checkAlerts({}, { ctx: 10, '5h': 85, '7d': undefined })
    expect(r.fired.map(f => f.key)).toEqual(['5h'])
    expect(r.next).toEqual({ '5h': 80 })
  })
})

describe('formatação', () => {
  test('tokens', () => {
    expect(formatTokens(950)).toBe('950')
    expect(formatTokens(12_100)).toBe('12.1k')
    expect(formatTokens(200_000)).toBe('200k')
    expect(formatTokens(1_250_000)).toBe('1.25M')
    expect(formatTokens(2_000_000)).toBe('2M')
  })

  test('reset', () => {
    const now = Date.parse('2026-10-15T10:00:00Z')
    expect(formatReset('2026-10-15T10:45:00Z', now)).toBe('45m')
    expect(formatReset('2026-10-15T12:14:00Z', now)).toBe('2h14')
    expect(formatReset('2026-10-19T10:00:00Z', now)).toBe('4d')
    expect(formatReset(undefined, now)).toBe('')
  })

  test('duração do turno', () => {
    expect(formatDuration(9_400)).toBe('9s')
    expect(formatDuration(64_000)).toBe('1m04s')
    expect(formatDuration(3_725_000)).toBe('1h02m')
  })

  test('o estado mostra o tempo corrido e, ao terminar, quanto levou', () => {
    const base = {
      usage: null,
      mascot: getMascot('bit'),
      prefs: mergePrefs(null),
      theme: getTheme('synthwave'),
    }
    const text = (line: { text: string }[]) => line.map(s => s.text).join('')
    const working = fullLines({ ...base, turn: { ...EMPTY_TURN, startedAt: 1000 }, mood: 'thinking', label: 'processando', isWorking: true, now: 13_500 })
    expect(text(working.at(-1)!)).toContain('processando… 12s')
    const done = fullLines({ ...base, turn: { ...EMPTY_TURN, startedAt: 1000, endedAt: 35_000 }, mood: 'happy', label: 'concluído ✓', isWorking: false, now: 36_000 })
    expect(text(done.at(-1)!)).toContain('concluído ✓ em 34s')
    const idle = fullLines({ ...base, turn: { ...EMPTY_TURN, startedAt: 1000, endedAt: 35_000 }, mood: 'idle', label: 'em espera', isWorking: false, now: 99_000 })
    expect(text(idle.at(-1)!)).not.toContain('34s')
  })

  test('ferramentas mais usadas primeiro, MCP encurtado', () => {
    expect(formatTools({ Edit: 2, Bash: 3, mcp__shadcn__add: 1, Read: 1 })).toBe('Bash ×3  Edit ×2  add ×1')
  })
})

describe('uso', () => {
  test('toUsage lê contexto, limites e custo', () => {
    const u = toUsage({
      context: { tokens: 116_000, window: 200_000, percent: 58 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 21, resetsAt: '2026-10-15T12:00:00Z' },
        { kind: 'seven_day', percentUsed: 9 },
      ],
      cost: { usd: 1.82 },
    })
    expect(u).toEqual({
      ctxTokens: 116_000,
      ctxWindow: 200_000,
      ctxPercent: 58,
      fiveHour: { percent: 21, resetsAt: '2026-10-15T12:00:00Z' },
      sevenDay: { percent: 9 },
      costUsd: 1.82,
    })
  })

  test('addStep soma os quatro contadores', () => {
    const step = { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 30, cache_creation_input_tokens: 40, model: 'x' }
    const t = addStep(addStep(EMPTY_TURN, step), step)
    expect(t).toMatchObject({ input: 20, output: 40, cacheRead: 60, cacheWrite: 80 })
  })
})

describe('temas e raster', () => {
  test('registro: seis temas, ciclo e fallback', () => {
    expect(listThemes().map(t => t.id)).toEqual(['synthwave', 'terracota', 'crt', 'nord', 'dracula', 'gruvbox'])
    expect(nextTheme('synthwave').id).toBe('terracota')
    expect(nextTheme('terracota').id).toBe('crt')
    expect(nextTheme('gruvbox').id).toBe('synthwave')
    expect(getTheme('nao-existe').id).toBe('synthwave')
  })

  test('todo tema tem cores válidas e glifos de uma célula', () => {
    const bad: string[] = []
    const hex = /^#[0-9a-f]{6}$/i
    for (const theme of listThemes()) {
      for (const [name, color] of Object.entries(theme.palette)) if (!hex.test(color)) bad.push(`${theme.id}.${name}=${color}`)
      for (const color of theme.barGradient) if (!hex.test(color)) bad.push(`${theme.id}.barGradient=${color}`)
      for (const [name, glyph] of Object.entries(theme.glyphs)) {
        if (Array.from(glyph).length !== 1 || (glyph.codePointAt(0) ?? 0) > 0xffff) bad.push(`${theme.id}.${name}="${glyph}"`)
      }
      for (const mascot of listMascots()) {
        for (const mood of MOODS) {
          for (const part of ['body', 'face', 'spark'] as const) {
            for (let tick = 0; tick < 6; tick++) {
              const c = theme.mascotColor({ mascot: mascot.id, part, mood, row: tick % 3, col: 3, rows: 3, tick })
              if (!hex.test(c)) bad.push(`${theme.id}/${mascot.id}/${mood}/${part}=${c}`)
            }
          }
        }
      }
    }
    expect(bad).toEqual([])
  })

  test('mistura de cores', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(sample(['#ff0000', '#0000ff'], 0)).toBe('#ff0000')
    expect(sample(['#ff0000', '#0000ff'], 1)).toBe('#0000ff')
  })

  test('base64 confere com btoa', () => {
    const bytes = Uint8Array.of(1, 2, 3, 250, 251)
    expect(toBase64(bytes)).toBe(btoa(String.fromCharCode(...bytes)))
  })

  test('células: colunas × linhas × 12 bytes', () => {
    const b64 = encodeCells(['ab', 'c'], 2, () => 0xff0000)
    expect(atob(b64).length).toBe(2 * 2 * 12)
    for (const theme of listThemes()) {
      for (const mascot of listMascots()) {
        for (const mood of MOODS) {
          expect(atob(mascotCells(theme, mascot, mood, 3)).length).toBe(MASCOT_COLUMNS * MASCOT_ROWS * 12)
        }
      }
    }
  })

  test('mergePrefs tolera lixo e completa métricas novas', () => {
    expect(mergePrefs(null).theme).toBe('synthwave')
    expect(mergePrefs(null).mascot).toBe('bit')
    const p = mergePrefs({ theme: 'terracota', metrics: { ctx: false } })
    expect(p.theme).toBe('terracota')
    expect(p.mascot).toBe('bit')
    expect(mergePrefs({ mascot: 'rex' }).mascot).toBe('rex')
    expect(p.metrics).toEqual({ ctx: false, turno: true, '5h': true, '7d': true, custo: true })
  })
})
