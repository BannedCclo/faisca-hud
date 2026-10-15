import { clip, type Mascot } from '../clip.ts'

const TOP = '   ┌─┴─┐   '
const EYES = '   │■ ■│   '
const BASE = '   └┬─┬┘   '

/** Bit: robô de manutenção, cabeça quadrada, olhos de LED e antena. */
export const bit: Mascot = {
  id: 'bit',
  name: 'Bit',
  description: 'robô de manutenção: LEDs, antena e braços mecânicos; superaquece com contexto cheio',
  petLabel: 'calibrar',
  sparks: '*·✓!~+z▌_',
  face: '■-x^◉',
  labels: {
    idle: 'em espera',
    sleep: 'modo economia',
    thinking: 'processando',
    tool: 'executando',
    writing: 'compilando',
    happy: 'concluído ✓',
    error: 'falha',
    melting: 'superaquecendo',
    pet: 'recalibrado',
  },
  clips: {
    idle: clip(
      [[TOP, EYES, BASE], 12],
      [['   ┌─╨─┐   ', EYES, BASE], 4],
      [[TOP, EYES, BASE], 6],
      [[TOP, '   │- -│   ', BASE], 1],
      [[TOP, EYES, BASE], 6],
      [['  ·┌─┴─┐·  ', EYES, BASE], 4],
    ),
    sleep: clip(
      [['   ┌─┴─┐ z ', '   │- -│   ', BASE], 6],
      [['   ┌─┴─┐  z', '   │- -│   ', BASE], 6],
      [['   ┌─╨─┐   ', '   │- -│ z ', BASE], 6],
    ),
    thinking: clip(
      [['   ┌─┴─┐ · ', '   │■■ │   ', BASE], 2],
      [['   ┌─╨─┐ * ', '   │ ■■│   ', BASE], 2],
      [['   ┌─┴─┐ · ', '   │■ ■│   ', BASE], 2],
      [['   ┌─╨─┐   ', '   │ ■■│ * ', BASE], 2],
    ),
    tool: clip(
      [['   ┌─┴─┐ * ', ' ─┤■ ■├─   ', BASE], 2],
      [['   ┌─╨─┐   ', '  ┤■ ■├── *', BASE], 2],
      [['   ┌─┴─┐ + ', ' ─┤■ ■├─   ', '   └┬─┬┘ · '], 2],
    ),
    writing: clip(
      [['   ┌─┴─┐ * ', '   │■ ■│ ▌ ', BASE], 2],
      [['   ┌─╨─┐   ', '   │■ ■│ _ ', BASE], 2],
      [['   ┌─┴─┐ · ', '   │■ ■│ ▌ ', '   └┬─┬┘ ─ '], 2],
      [['   ┌─╨─┐   ', '   │■ ■│ _ ', '   └┬─┬┘ ─ '], 2],
    ),
    happy: clip(
      [['  \\┌─┴─┐/  ', '   │^ ^│   ', BASE], 2],
      [['   ┌─┴─┐ ✓ ', '   │^ ^│   ', BASE], 3],
      [['  \\┌─╨─┐/  ', '   │^ ^│ ✓ ', BASE], 2],
      [['   ┌─┴─┐   ', '   │^ ^│   ', BASE], 3],
    ),
    error: clip(
      [['   ┌─┴─┐ ! ', '   │x x│   ', BASE], 3],
      [['   ┌─╳─┐   ', '   │x x│ ! ', BASE], 3],
    ),
    melting: clip(
      [['   ┌─┴─┐ ~ ', '   │■ ■│;  ', '   └┬─┬┘ ~ '], 4],
      [['   ┌─╨─┐  ~', '   │■ ■│ ; ', '   └┬─┬┘  ~'], 4],
    ),
    pet: clip(
      [['   ┌─┴─┐ + ', '   │◉ ◉│   ', BASE], 3],
      [['   ┌─╨─┐   ', '   │◉ ◉│ + ', BASE], 3],
      [['   ┌─┴─┐ ✓ ', '   │■ ■│   ', BASE], 3],
    ),
  },
  mini: {
    idle: '[■_■]',
    sleep: '[-_-]z',
    thinking: '[■■_]',
    tool: '─[■_■]─',
    writing: '[■_■]▌',
    happy: '\\[^_^]/',
    error: '[x_x]!',
    melting: '[■_■]~',
    pet: '[◉_◉]+',
  },
}
