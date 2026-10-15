import { clip, type Mascot } from '../clip.ts'

const HOOD = '  ▄█████▄~ '
const HOOD2 = '  ▄█████▄≈ '
const EYES = '  █ ▬ ▬ █  '
const BASE = '   ▀█▀█▀   '

/** Kage: ninja de capuz; olhos em fenda, lâmina rápida, faixa ao vento. */
export const kage: Mascot = {
  id: 'kage',
  name: 'Kage',
  description: 'ninja de capuz: silencioso, olhos em fenda, ataca com a lâmina ao editar',
  petLabel: 'saudar',
  sparks: '~≈x+*/\\zZ;!✓',
  face: '▬^×◦',
  labels: {
    idle: 'à espreita',
    sleep: 'meditando',
    thinking: 'observando',
    tool: 'infiltrando',
    writing: 'golpeando',
    happy: 'missão cumprida',
    error: 'emboscado',
    melting: 'sob pressão',
    pet: 'reverência',
  },
  clips: {
    idle: clip(
      [[HOOD, EYES, BASE], 6],
      [[HOOD2, EYES, BASE], 6],
      [[HOOD, EYES, BASE], 6],
      [[HOOD2, '  █ - - █  ', BASE], 1],
      [[HOOD, EYES, BASE], 6],
    ),
    sleep: clip(
      [[HOOD, '  █ - - █ z', BASE], 8],
      [[HOOD2, '  █ - - █  ', '   ▀█▀█▀ Z '], 8],
    ),
    thinking: clip(
      [[HOOD, '  █▬ ▬  █  ', BASE], 4],
      [[HOOD2, '  █  ▬ ▬█  ', BASE], 4],
    ),
    tool: clip(
      [[HOOD, EYES, '   ▀█▀█▀ + '], 2],
      [[HOOD2, '  █ ▬ ▬ █ x', BASE], 2],
      [[HOOD, EYES, '   ▀█▀█▀ x '], 2],
      [[HOOD2, '  █ ▬ ▬ █ +', BASE], 2],
    ),
    writing: clip(
      [[HOOD, '  █ ▬ ▬ █ /', BASE], 1],
      [[HOOD2, '  █ ▬ ▬ █--', BASE], 1],
      [[HOOD, '  █ ▬ ▬ █ \\', BASE], 1],
      [[HOOD2, EYES, '   ▀█▀█▀ * '], 2],
    ),
    happy: clip(
      [[HOOD, '  █ ^ ^ █ ✓', BASE], 3],
      [[HOOD2, '  █ ^ ^ █  ', BASE], 3],
    ),
    error: clip(
      [[HOOD, '  █ × × █ !', BASE], 3],
      [[HOOD2, '  █ × × █  ', BASE], 3],
    ),
    melting: clip(
      [[HOOD, '  █ ◦ ◦ █; ', BASE], 4],
      [[HOOD2, '  █ ◦ ◦ █ ;', BASE], 4],
    ),
    pet: clip(
      [[HOOD, EYES, BASE], 3],
      [['           ', HOOD, '  █ - - █  '], 4],
      [[HOOD2, '  █ ^ ^ █  ', BASE], 3],
    ),
  },
  mini: {
    idle: '[▬ ▬]~',
    sleep: '[- -]z',
    thinking: '[▬▬ ]',
    tool: '[▬ ▬]x',
    writing: '[▬ ▬]/',
    happy: '[^ ^]✓',
    error: '[× ×]!',
    melting: '[◦ ◦];',
    pet: '[- -]',
  },
}
