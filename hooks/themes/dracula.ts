import type { MascotCell, Theme } from './index.ts'

// Paleta Dracula (draculatheme.com).
const PURPLE = '#bd93f9'
const PINK = '#ff79c6'
const GREEN = '#50fa7b'
const CYAN = '#8be9fd'
const YELLOW = '#f1fa8c'
const ORANGE = '#ffb86c'
const RED = '#ff5555'
const FG = '#f8f8f2'
const SPARKS: readonly `#${string}`[] = [GREEN, CYAN, YELLOW]

function mascotColor(cell: MascotCell): `#${string}` {
  if (cell.mood === 'error') return cell.part === 'spark' ? '#6272a4' : RED
  if (cell.part === 'spark') return SPARKS[(cell.tick + cell.col) % SPARKS.length]!
  if (cell.part === 'face') return FG
  // Corpo: rosa no alto, roxo no meio e embaixo, como uma capa de vampiro.
  return cell.row === 0 ? PINK : PURPLE
}

export const dracula: Theme = {
  id: 'dracula',
  name: { pt: 'Drácula', en: 'Dracula', es: 'Drácula' },
  palette: {
    fg: FG,
    dim: '#6272a4',
    accent: PURPLE,
    accent2: PINK,
    ok: GREEN,
    warn: ORANGE,
    danger: RED,
  },
  barGradient: [GREEN, CYAN, PURPLE, PINK],
  glyphs: { full: '▮', empty: '▯', sep: '·', spark: '✦' },
  mascotColor,
}
