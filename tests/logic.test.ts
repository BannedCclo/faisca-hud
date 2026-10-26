import { describe, expect, test } from 'claude-code/testing'

import { checkAlerts } from '../hooks/alerts.ts'
import type { FaiscaMood } from '../types'
import { MASCOT_COLUMNS, MASCOT_ROWS, frameAt, partOf } from '../hooks/mascot/clip.ts'
import { getMascot, listMascots, nextMascot } from '../hooks/mascot/index.ts'
import { describeTool, effectiveMood, fileOf, labelFor, labelForMood, SLEEP_AFTER_MS } from '../hooks/mascot/mood.ts'
import { LANGS, detectLang, nextLang, pick, t, verbOf, type Lang } from '../hooks/i18n.ts'
import { encodeCells, mascotCells, toBase64 } from '../hooks/mascot/raster.ts'
import { mergePrefs } from '../hooks/state.ts'
import { getTheme, listThemes, mix, nextTheme, sample } from '../hooks/themes/index.ts'
import { addSpend, addStep, spendNow, formatDuration, formatReset, formatTokens, formatTools, toUsage } from '../hooks/usage.ts'
import { fullLines } from '../hooks/meter.ts'
import { EMPTY_SPEND, EMPTY_TURN, mergeSpend } from '../hooks/state.ts'

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

  test('registro: Faísca por padrão, ciclo passa por todos e volta', () => {
    expect(listMascots().map(m => m.id)).toEqual(['faisca', 'bit', 'rex', 'kage'])
    expect(getMascot('nao-existe').id).toBe('faisca')
    let id = 'faisca'
    const seen: string[] = []
    for (let i = 0; i < 4; i++) {
      id = nextMascot(id).id
      seen.push(id)
    }
    expect(seen).toEqual(['bit', 'rex', 'kage', 'faisca'])
  })

  test('ferramentas viram frases de ação no idioma, com o arquivo', () => {
    const d = (tool: string, args: Record<string, unknown>, lang: Lang) => describeTool(tool, fileOf(args), lang)
    expect(d('Edit', { file_path: 'C:\\x\\hooks\\meter.ts' }, 'pt')).toBe('editando meter.ts')
    expect(d('Write', { file_path: '/a/README.md' }, 'pt')).toBe('criando README.md')
    expect(d('Read', { file_path: '/a/b/usage.ts' }, 'pt')).toBe('lendo usage.ts')
    expect(d('Read', {}, 'pt')).toBe('lendo')
    expect(d('Bash', { command: 'ls' }, 'pt')).toBe('rodando comando')
    expect(d('Grep', { pattern: 'x', path: '/a' }, 'pt')).toBe('buscando no código')
    expect(d('mcp__shadcn__add', {}, 'pt')).toBe('usando add (shadcn)')
    expect(d('Desconhecida', {}, 'pt')).toBe('usando Desconhecida')
    expect(d('Edit', { file_path: '/a/meter.ts' }, 'en')).toBe('editing meter.ts')
    expect(d('Bash', {}, 'en')).toBe('running command')
    expect(d('Read', { file_path: '/a/x.ts' }, 'es')).toBe('leyendo x.ts')
    expect(d('Grep', {}, 'es')).toBe('buscando en el código')
  })

  test('rótulos próprios do mascote vencem os padrão, em cada idioma', () => {
    expect(labelForMood('happy', getMascot('bit'), 'pt')).toBe('concluído ✓')
    expect(labelForMood('happy', getMascot('bit'), 'en')).toBe('done ✓')
    expect(labelForMood('happy', getMascot('bit'), 'es')).toBe('completado ✓')
    expect(labelForMood('pet', getMascot('rex'), 'es')).toBe('RAWR!')
    expect(labelForMood('happy', getMascot('faisca'), 'pt')).toBe('pronto!')
    expect(labelForMood('happy', undefined, 'en')).toBe('done!')
    expect(labelForMood('sleep', undefined, 'es')).toBe('dormitando')
  })

  test('o texto da atividade é montado no idioma da hora', () => {
    const bit = getMascot('bit')
    const tool = { mood: 'writing' as const, since: 0, detail: { kind: 'tool' as const, tool: 'Edit', file: 'a.ts' } }
    expect(labelFor(tool, 'writing', bit, 'pt')).toBe('editando a.ts')
    expect(labelFor(tool, 'writing', bit, 'en')).toBe('editing a.ts')
    // O humor efetivo já mudou (o passageiro venceu): vale o rótulo do humor.
    expect(labelFor(tool, 'thinking', bit, 'en')).toBe('processing')
    const failed = { mood: 'error' as const, since: 0, detail: { kind: 'toolFailed' as const, tool: 'Bash' } }
    expect(labelFor(failed, 'error', bit, 'es')).toBe('falló: ejecutando comando')
    const arrived = { mood: 'happy' as const, since: 0, detail: { kind: 'arrived' as const, mascot: 'Rex' } }
    expect(labelFor(arrived, 'happy', bit, 'en')).toBe('Rex is here')
    // Estado antigo, sem detail (de antes da 0.3): cai no rótulo do humor.
    expect(labelFor({ mood: 'idle', since: 0 }, 'idle', bit, 'pt')).toBe('em espera')
  })

  test('idioma: detecção pelos settings e pelo LANG, ciclo e texto multilíngue', () => {
    expect(detectLang('Portuguese', undefined)).toBe('pt')
    expect(detectLang('português', undefined)).toBe('pt')
    expect(detectLang('Spanish', 'pt_BR.UTF-8')).toBe('es')
    expect(detectLang('japanese', 'pt_BR')).toBe('en')
    expect(detectLang(undefined, 'es_ES.UTF-8')).toBe('es')
    expect(detectLang(undefined, undefined)).toBe('en')
    expect([nextLang('pt'), nextLang('en'), nextLang('es')]).toEqual(['en', 'es', 'pt'])
    expect(pick({ pt: 'oi', en: 'hi' }, 'es')).toBe('hi')
    expect(pick({ pt: 'oi' }, 'en')).toBe('oi')
    expect(pick('igual', 'es')).toBe('igual')
    expect(verbOf('mascota')).toBe('mascot')
    expect(verbOf('recarregar')).toBe('reload')
    expect(verbOf('language')).toBe('language')
    expect(verbOf('xyz')).toBeUndefined()
  })

  test('todo idioma tem todos os textos, na mesma forma', () => {
    const shape = (o: unknown): unknown =>
      typeof o === 'function' ? 'fn' : Array.isArray(o) ? o.map(shape) : typeof o === 'object' && o !== null
        ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)]).sort())
        : typeof o
    const pt = shape(t('pt'))
    expect(shape(t('en'))).toEqual(pt)
    expect(shape(t('es'))).toEqual(pt)
    for (const m of listMascots()) {
      for (const lang of LANGS) {
        expect(pick(m.description, lang).length).toBeGreaterThan(0)
        for (const mood of MOODS) expect(labelForMood(mood, m, lang).length).toBeGreaterThan(0)
      }
    }
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
      s: t('pt'),
    }
    const text = (line: { text: string }[]) => line.map(s => s.text).join('')
    const working = fullLines({ ...base, turn: { ...EMPTY_TURN, startedAt: 1000 }, mood: 'thinking', label: 'processando', isWorking: true, now: 13_500 })
    expect(text(working.at(-1)!)).toContain('processando… 12s')
    const done = fullLines({ ...base, turn: { ...EMPTY_TURN, startedAt: 1000, endedAt: 35_000 }, mood: 'happy', label: 'concluído ✓', isWorking: false, now: 36_000 })
    expect(text(done.at(-1)!)).toContain('concluído ✓ em 34s')
    const idle = fullLines({ ...base, turn: { ...EMPTY_TURN, startedAt: 1000, endedAt: 35_000 }, mood: 'idle', label: 'em espera', isWorking: false, now: 99_000 })
    expect(text(idle.at(-1)!)).not.toContain('34s')
    const doneEn = fullLines({ ...base, s: t('en'), turn: { ...EMPTY_TURN, startedAt: 1000, endedAt: 35_000 }, mood: 'happy', label: 'done ✓', isWorking: false, now: 36_000 })
    expect(text(doneEn.at(-1)!)).toContain('done ✓ in 34s')
    expect(text(doneEn[0]!)).toContain('turn ↑')
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

  test('addSpend acumula na janela de 5h e recomeça quando ela vira', () => {
    const step = { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 999, cache_creation_input_tokens: 40, model: 'x' }
    const a = addSpend(EMPTY_SPEND, 'W1', step)
    expect(a).toEqual({ resetsAt: 'W1', tokens: 70 })
    expect(addSpend(a, 'W1', step).tokens).toBe(140)
    expect(addSpend(a, 'W2', step)).toEqual({ resetsAt: 'W2', tokens: 70 })
    // medida atrasada (janela mais antiga que a guardada) soma, sem zerar
    const late = addSpend({ resetsAt: '2026-10-15T15:00:00Z', tokens: 100 }, '2026-10-15T10:00:00Z', step)
    expect(late).toEqual({ resetsAt: '2026-10-15T15:00:00Z', tokens: 170 })
    expect(spendNow(a, 'W1')).toBe(70)
    expect(spendNow(a, 'W2')).toBe(0)
    expect(mergeSpend({ tokens: -1 })).toEqual(EMPTY_SPEND)
    expect(mergeSpend({ resetsAt: 'W1', tokens: 5 })).toEqual({ resetsAt: 'W1', tokens: 5 })
  })

  test('a linha dos limites mostra os tokens da janela de 5h', () => {
    const m = {
      usage: { ctxWindow: 200_000, fiveHour: { percent: 21 } },
      turn: EMPTY_TURN, mood: 'idle' as const, mascot: getMascot('bit'), label: 'x', isWorking: false,
      prefs: mergePrefs(null), theme: getTheme('synthwave'), now: 0, s: t('pt'), spend5h: 1_250_000,
    }
    const text = fullLines(m).map(l => l.map(s => s.text).join('')).join('\n')
    expect(text).toContain('5h')
    expect(text).toContain('1.25M tokens')
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
    expect(mergePrefs(null).mascot).toBe('faisca')
    const p = mergePrefs({ theme: 'terracota', metrics: { ctx: false } })
    expect(p.theme).toBe('terracota')
    expect(p.mascot).toBe('faisca')
    expect(mergePrefs({ mascot: 'rex' }).mascot).toBe('rex')
    expect(p.metrics).toEqual({ ctx: false, turno: true, '5h': true, '7d': true, custo: true })
  })
})
