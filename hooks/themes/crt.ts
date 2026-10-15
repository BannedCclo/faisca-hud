import type { MascotCell, Theme } from './index.ts'

const PHOSPHOR = '#33ff66'
const DEEP = '#1fae47'
const DARK = '#0f6b2a'
const GLOW = '#b6ffc8'

function mascotColor(cell: MascotCell): `#${string}` {
  if (cell.mood === 'error') return cell.part === 'spark' ? DARK : '#ff5f3a'
  // Faíscas tremeluzem como um fósforo que ainda não apagou.
  if (cell.part === 'spark') return (cell.tick + cell.col) % 5 === 0 ? DEEP : GLOW
  if (cell.part === 'face') return GLOW
  // Corpo: varredura de tubo, a linha do tick brilha um pouco mais.
  return cell.row === cell.tick % cell.rows ? PHOSPHOR : DEEP
}

export const crt: Theme = {
  id: 'crt',
  name: { pt: 'CRT Fósforo', en: 'CRT Phosphor', es: 'CRT Fósforo' },
  palette: {
    fg: '#b6ffc8',
    dim: '#2f7a45',
    accent: PHOSPHOR,
    accent2: '#9dffb5',
    ok: PHOSPHOR,
    warn: '#ffd23a',
    danger: '#ff5f3a',
  },
  barGradient: [DARK, DEEP, PHOSPHOR],
  glyphs: { full: '█', empty: '░', sep: '│', spark: '>' },
  mascotColor,
}
