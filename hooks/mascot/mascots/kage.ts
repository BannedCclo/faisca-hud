import { clip, type Mascot } from '../clip.ts'

const HOOD = '  ▄█████▄~ '
const HOOD2 = '  ▄█████▄≈ '
const EYES = '  █ ▬ ▬ █  '
const BASE = '   ▀█▀█▀   '

/** Kage: ninja de capuz; olhos em fenda, lâmina rápida, faixa ao vento. */
export const kage: Mascot = {
  id: 'kage',
  name: 'Kage',
  description: {
    pt: 'ninja de capuz: silencioso, olhos em fenda, ataca com a lâmina ao editar',
    en: 'hooded ninja: silent, slit eyes, strikes with the blade when editing',
    es: 'ninja encapuchado: silencioso, ojos rasgados, ataca con la hoja al editar',
  },
  petLabel: { pt: 'saudar', en: 'salute', es: 'saludar' },
  sparks: '~≈x+*/\\zZ;!✓',
  face: '▬^×◦',
  labels: {
    idle: { pt: 'à espreita', en: 'lurking', es: 'al acecho' },
    sleep: { pt: 'meditando', en: 'meditating', es: 'meditando' },
    thinking: { pt: 'observando', en: 'watching', es: 'observando' },
    tool: { pt: 'infiltrando', en: 'infiltrating', es: 'infiltrándose' },
    writing: { pt: 'golpeando', en: 'striking', es: 'atacando' },
    happy: { pt: 'missão cumprida', en: 'mission accomplished', es: 'misión cumplida' },
    error: { pt: 'emboscado', en: 'ambushed', es: 'emboscado' },
    melting: { pt: 'sob pressão', en: 'under pressure', es: 'bajo presión' },
    pet: { pt: 'reverência', en: 'bow', es: 'reverencia' },
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
