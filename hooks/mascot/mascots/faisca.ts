import { clip, type Mascot } from '../clip.ts'

const BODY = '  /  ~  \\  '

/** Faísca: espírito de terminal feito de caracteres, pisca como cursor. */
export const faisca: Mascot = {
  id: 'faisca',
  name: 'Faísca',
  description: 'espírito de terminal; cintila, solta faíscas e derrete com contexto cheio',
  petLabel: 'carinho',
  sparks: '✦✧·.*♡zZ…,;',
  face: '◕‿◔_⊙×-^ᴗᵔ˘',
  clips: {
    idle: clip(
      [['    .✦.    ', '  ( ◕‿◕ )  ', BODY], 10],
      [['    ·✧·    ', '  ( ◕‿◕ )  ', BODY], 8],
      [['    .✦.    ', '  ( ◕‿◕ )  ', BODY], 6],
      [['    .✦.    ', '  ( -‿- )  ', BODY], 1],
      [['    .✦.    ', '  ( ◕‿◕ )  ', BODY], 4],
      [['    ·✧·    ', '  ( ◕‿◕ )  ', ' /   ~   \\ '], 6],
    ),
    sleep: clip(
      [['       z   ', '  ( -‿- )  ', BODY], 6],
      [['        z  ', '  ( -‿- ) z', BODY], 6],
      [['         Z ', '  ( -‿- )  ', ' /   ~   \\ '], 6],
    ),
    thinking: clip(
      [['  ✦  .     ', '  ( ◔_◔ )  ', BODY], 2],
      [['     .✦    ', '  ( ◔_◔ )  ', BODY], 2],
      [['     . ✦   ', '  ( ◔_◔ )  ', BODY], 2],
      [['       .   ', '  ( ◔_◔ ) ✦', BODY], 2],
      [['    .      ', '✦ ( ◔_◔ )  ', BODY], 2],
    ),
    tool: clip(
      [['    .✦.  ✦ ', '  ( ⊙_⊙ ) ·', '  /| ~ |\\  '], 2],
      [['  ✧ .✦.    ', '· ( ⊙_⊙ )  ', '  /| ~ |\\  '], 2],
      [['    .✦. ✧  ', '  ( ⊙_⊙ )✦ ', '  \\| ~ |/  '], 2],
    ),
    writing: clip(
      [['    .✦.  * ', '  ( ᵔᴗᵔ )┘ ', BODY], 2],
      [['    .✦. ✦  ', '  ( ᵔᴗᵔ )┐*', BODY], 2],
      [['    .✧.  ✦ ', '  ( ᵔᴗᵔ )┘ ', BODY], 2],
      [['    .✦. *  ', '  ( ᵔᴗᵔ )┐✧', BODY], 2],
    ),
    happy: clip(
      [[' \\( ^ᴗ^ )/ ', '    \\~/    ', '           '], 2],
      [['    .✦.    ', '  ( ^ᴗ^ )  ', BODY], 2],
      [['✦\\( ^ᴗ^ )/✦', '    \\~/    ', '           '], 2],
      [['    .✦.    ', '  ( ^ᴗ^ )  ', BODY], 3],
    ),
    error: clip(
      [['    . .    ', '  ( ×_× )  ', '  /  ~  \\ …'], 4],
      [['    .·.    ', '  ( ×_× )  ', '  /  ~  \\  '], 4],
    ),
    melting: clip(
      [['    .✦.    ', '  ( ◕_◕;)  ', '  /. ~ .\\  '], 4],
      [['    .✦.    ', '  ( ◕_◕;)  ', '  / ;~; \\  '], 4],
      [['    ·✧·    ', '  ( ◕_◕;)  ', '  /, ~ ,\\  '], 4],
    ),
    pet: clip(
      [['    .✦. ♡  ', '  ( ˘ᴗ˘ )  ', BODY], 3],
      [['  ♡ .✦.    ', '  ( ˘ᴗ˘ ) ♡', BODY], 3],
      [['    .✦.  ♡ ', '♡ ( ˘ᴗ˘ )  ', BODY], 3],
    ),
  },
  mini: {
    idle: '✦(◕‿◕)',
    sleep: 'z(-‿-)',
    thinking: '✦(◔_◔)',
    tool: '✦(⊙_⊙)',
    writing: '✦(ᵔᴗᵔ)┘',
    happy: '\\(^ᴗ^)/',
    error: '·(×_×)',
    melting: '✦(◕_◕;)',
    pet: '♡(˘ᴗ˘)',
  },
}
