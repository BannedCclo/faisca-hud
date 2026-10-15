import type { MascotCell, Theme } from './index.ts'

// Paleta Gruvbox dark (variantes "bright").
const YELLOW = '#fabd2f'
const ORANGE = '#fe8019'
const RED = '#fb4934'
const GREEN = '#b8bb26'
const AQUA = '#8ec07c'
const BLUE = '#83a598'
const FG = '#ebdbb2'

function mascotColor(cell: MascotCell): `#${string}` {
  if (cell.mood === 'error') return cell.part === 'spark' ? '#7c6f64' : RED
  if (cell.part === 'spark') return (cell.tick + cell.col) % 4 < 2 ? YELLOW : ORANGE
  if (cell.part === 'face') return FG
  // Corpo: amarelo quente no alto, laranja no meio, aqua embaixo.
  return cell.row === 0 ? YELLOW : cell.row === 1 ? ORANGE : AQUA
}

export const gruvbox: Theme = {
  id: 'gruvbox',
  name: 'Gruvbox',
  palette: {
    fg: FG,
    dim: '#928374',
    accent: ORANGE,
    accent2: AQUA,
    ok: GREEN,
    warn: YELLOW,
    danger: RED,
  },
  barGradient: [BLUE, AQUA, GREEN, YELLOW],
  glyphs: { full: '■', empty: '□', sep: '·', spark: '◆' },
  mascotColor,
}
