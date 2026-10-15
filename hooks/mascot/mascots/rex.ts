import { clip, type Mascot } from '../clip.ts'

const HEAD = '      ▄▀█▄ '
const BODY = ' ▌  ▄███▀▀ '
const BODY2 = ' ▐  ▄███▀▀ '
const LEGS = '  ▀█▀ ▀    '
const LEGS2 = '  ▀ ▀█▀    '

/** Rex: o T-rex de pixel; corre quando o Claude trabalha e ruge no carinho. */
export const rex: Mascot = {
  id: 'rex',
  name: 'Rex',
  description: 'T-rex de pixel: corre quando o Claude trabalha, ruge quando termina',
  petLabel: 'rugir',
  sparks: '·*?zZ;!~RAW',
  face: 'x-',
  labels: {
    idle: 'de guarda',
    sleep: 'hibernando',
    thinking: 'farejando',
    tool: 'caçando',
    writing: 'correndo',
    happy: 'presa abatida',
    error: 'tropeçou',
    melting: 'extinção à vista',
    pet: 'RAWR!',
  },
  clips: {
    idle: clip(
      [[HEAD, BODY, LEGS], 10],
      [[HEAD, BODY2, LEGS], 6],
      [['      ▄-█▄ ', BODY, LEGS], 1],
      [[HEAD, BODY, LEGS], 8],
      [[HEAD, BODY2, LEGS], 6],
    ),
    sleep: clip(
      [['  z   ▄▄█▄ ', BODY, '  ▀▀▀▀▀    '], 6],
      [[' z    ▄▄█▄ ', BODY, '  ▀▀▀▀▀    '], 6],
      [['Z     ▄▄█▄ ', BODY2, '  ▀▀▀▀▀    '], 6],
    ),
    thinking: clip(
      [[' ?    ▄▀█▄ ', BODY, LEGS], 3],
      [['  ?   ▄▀█▄ ', BODY2, LEGS], 3],
    ),
    tool: clip(
      [[HEAD, BODY, LEGS], 1],
      [[HEAD, BODY2, '· ▀ ▀█▀    '], 1],
      [[HEAD, BODY, ' ·▀█▀ ▀    '], 1],
      [[HEAD, BODY2, '· ▀ ▀█▀    '], 1],
    ),
    writing: clip(
      [['  *   ▄▀█▄ ', BODY, LEGS], 1],
      [['      ▄▀█▄*', BODY2, '· ▀ ▀█▀    '], 1],
      [[' *    ▄▀█▄ ', BODY, ' ·▀█▀ ▀    '], 1],
      [['      ▄▀█▄ ', BODY2, '· ▀ ▀█▀  * '], 1],
    ),
    happy: clip(
      [['  !   ▄▀█▄ ', BODY, '   ▀▀      '], 2],
      [[HEAD, BODY2, LEGS], 2],
      [['  !!  ▄▀█▄ ', BODY, '   ▀▀      '], 2],
      [[HEAD, BODY, LEGS], 3],
    ),
    error: clip(
      [['      ▄x█▄ ', BODY, LEGS2], 3],
      [['    ! ▄x█▄ ', BODY2, LEGS2], 3],
    ),
    melting: clip(
      [['    ; ▄▀█▄ ', BODY, LEGS], 4],
      [['   ;  ▄▀█▄~', BODY2, LEGS], 4],
    ),
    pet: clip(
      [['  RAWR▄▀█▄ ', BODY, LEGS], 3],
      [[' RAWR!▄▀█▄ ', BODY2, LEGS2], 3],
      [['  RAWR▄▀█▄ ', BODY, LEGS], 3],
    ),
  },
  mini: {
    idle: '▄▀█▄',
    sleep: 'z▄▄█▄',
    thinking: '?▄▀█▄',
    tool: '·▄▀█▄',
    writing: '*▄▀█▄',
    happy: '!▄▀█▄',
    error: '▄x█▄',
    melting: ';▄▀█▄',
    pet: 'RAWR▄▀█▄',
  },
}
