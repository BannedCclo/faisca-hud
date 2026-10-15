import { describe, expect, test } from 'claude-code/testing'

import { EXAMPLE_MASCOT, EXAMPLE_THEME, isNarrow, loadCustom, parseMascot, parseTheme } from '../hooks/custom.ts'
import { MASCOT_COLUMNS, frameAt } from '../hooks/mascot/clip.ts'
import { getMascot, listMascots, setCustomMascots } from '../hooks/mascot/index.ts'
import { mascotCells } from '../hooks/mascot/raster.ts'
import { getTheme, listThemes, setCustomThemes } from '../hooks/themes/index.ts'

const file = (name: string, data: unknown) => ({ name, text: typeof data === 'string' ? data : JSON.stringify(data) })

function bodyColorAt(themeId: string, mascotId: string, row: number, col: number): number {
  const cells = mascotCells(getTheme(themeId), getMascot(mascotId), 'idle', 0)
  const words = new Uint32Array(Uint8Array.from(atob(cells), c => c.charCodeAt(0)).buffer)
  return words[(row * MASCOT_COLUMNS + col) * 3 + 1]!
}

describe('personalização', () => {
  test('os exemplos que /faisca exemplos escreve são válidos', () => {
    expect(parseTheme(EXAMPLE_THEME).id).toBe('meu-tema')
    const m = parseMascot(EXAMPLE_MASCOT)
    expect(m.id).toBe('meu-mascote')
    // Humor sem clipe próprio usa o idle; linha curta é completada até 11.
    expect(m.clips.tool).toEqual(m.clips.idle)
    expect(Array.from(m.clips.idle.frames[0]![0]).length).toBe(MASCOT_COLUMNS)
    expect(m.mini.sleep).toBe('[o o]')
  })

  test('erros dizem o arquivo e o campo, e não derrubam os outros', () => {
    const r = loadCustom(
      [file('bom.json', EXAMPLE_THEME), file('ruim.json', { ...EXAMPLE_THEME, id: 'x', palette: { ...EXAMPLE_THEME.palette, fg: 'vermelho' } })],
      [
        file('quebrado.json', '{ isso não é json'),
        file('largo.json', { ...EXAMPLE_MASCOT, id: 'largo', clips: { idle: [{ frame: ['あいう'] }] } }),
        file('comprido.json', { ...EXAMPLE_MASCOT, id: 'comprido', clips: { idle: [{ frame: ['123456789012'] }] } }),
        file('_rascunho.json', '{ ignorado'),
        file('leia-me.txt', 'ignorado'),
      ],
    )
    expect(r.themes.map(t => t.id)).toEqual(['meu-tema'])
    expect(r.mascots).toEqual([])
    expect(r.errors).toHaveLength(4)
    expect(r.errors[0]).toContain('temas/ruim.json: palette.fg')
    expect(r.errors.find(e => e.startsWith('mascotes/quebrado.json'))).toContain('JSON inválido')
    expect(r.errors.find(e => e.startsWith('mascotes/largo.json'))).toContain('largura 1')
    expect(r.errors.find(e => e.startsWith('mascotes/comprido.json'))).toContain('12 caracteres')
  })

  test('validações de id, humor e hold', () => {
    expect(() => parseMascot({ ...EXAMPLE_MASCOT, id: 'Com Espaço' })).toThrow('id')
    expect(() => parseMascot({ ...EXAMPLE_MASCOT, clips: { ...EXAMPLE_MASCOT.clips, dancing: EXAMPLE_MASCOT.clips.idle } })).toThrow('humor desconhecido')
    expect(() => parseMascot({ ...EXAMPLE_MASCOT, clips: { idle: [{ frame: ['a'], hold: 0 }] } })).toThrow('hold')
    expect(() => parseMascot({ ...EXAMPLE_MASCOT, clips: {} })).toThrow('clips.idle')
    expect(() => parseTheme({ ...EXAMPLE_THEME, glyphs: { full: 'ab' } })).toThrow('glyphs.full')
  })

  test('largura de caractere', () => {
    expect(isNarrow('█')).toBe(true)
    expect(isNarrow('▛')).toBe(true)
    expect(isNarrow('あ')).toBe(false)
    expect(isNarrow('Ａ')).toBe(false)
    expect(isNarrow('😀')).toBe(false)
  })

  test('registro: personalizados entram na lista e substituem embutidos de mesmo id', () => {
    const before = listThemes().length
    setCustomThemes([parseTheme(EXAMPLE_THEME), parseTheme({ ...EXAMPLE_THEME, id: 'nord', name: 'Meu Nord' })])
    setCustomMascots([parseMascot(EXAMPLE_MASCOT)])
    try {
      expect(listThemes()).toHaveLength(before + 1)
      expect(getTheme('nord').name).toBe('Meu Nord')
      expect(getTheme('meu-tema').name).toBe('Meu tema')
      expect(listMascots().at(-1)?.id).toBe('meu-mascote')
    } finally {
      setCustomThemes([])
      setCustomMascots([])
    }
    expect(listThemes()).toHaveLength(before)
    expect(getTheme('nord').name).toBe('Nord')
  })

  test('tema personalizado pinta o corpo por linha; colors do mascote vence o tema', () => {
    const m = parseMascot({
      ...EXAMPLE_MASCOT,
      colors: { 'meu-tema': { body: '#123456' } },
    })
    setCustomThemes([parseTheme(EXAMPLE_THEME)])
    setCustomMascots([m])
    try {
      const col = Array.from(frameAt(m, 'idle', 0)[0]).findIndex(ch => ch === '┌')
      expect(bodyColorAt('meu-tema', 'meu-mascote', 0, col)).toBe(0x123456)
      // Em outro tema, sem override, vale a cor do tema.
      expect(bodyColorAt('synthwave', 'meu-mascote', 0, col)).toBe(0xff3cc7)
    } finally {
      setCustomThemes([])
      setCustomMascots([])
    }
  })
})
