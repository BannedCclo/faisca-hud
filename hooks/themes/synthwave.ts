import type { MascotCell, Theme } from './index.ts'

const MAGENTA = '#ff3cc7'
const PURPLE = '#9b5cff'
const CYAN = '#2de2e6'
const SUN = '#ffd23f'

function mascotColor(cell: MascotCell): `#${string}` {
  if (cell.mood === 'error') return cell.part === 'spark' ? '#7a3b6b' : '#ff4f6d'
  if (cell.part === 'spark') {
    // Cintila entre ciano e amarelo-sol, defasado por coluna.
    return (cell.tick + cell.col) % 4 < 2 ? CYAN : SUN
  }
  if (cell.part === 'face') return cell.mood === 'pet' ? '#ffb3ec' : '#f5f0ff'
  // Corpo: gradiente vertical magenta → roxo → ciano.
  const t = cell.rows <= 1 ? 0 : cell.row / (cell.rows - 1)
  return t === 0 ? MAGENTA : t < 1 ? PURPLE : CYAN
}

export const synthwave: Theme = {
  id: 'synthwave',
  name: 'Synthwave neon',
  palette: {
    fg: '#f5f0ff',
    dim: '#7d6b9e',
    accent: MAGENTA,
    accent2: CYAN,
    ok: CYAN,
    warn: SUN,
    danger: '#ff4f6d',
  },
  barGradient: [CYAN, PURPLE, MAGENTA],
  glyphs: { full: '▰', empty: '▱', sep: '·', spark: '✦' },
  mascotColor,
}
