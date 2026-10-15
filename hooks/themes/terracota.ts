import type { MascotCell, Theme } from './index.ts'

const CLAY = '#d97757'
const RUST = '#b4532f'
const SAND = '#e8c39e'
const CREAM = '#f3e6d3'
const OLIVE = '#9aa66b'

function mascotColor(cell: MascotCell): `#${string}` {
  if (cell.mood === 'error') return cell.part === 'spark' ? '#8a6a5a' : '#c2452d'
  if (cell.part === 'spark') return (cell.tick + cell.col) % 6 < 3 ? SAND : '#ffb072'
  if (cell.part === 'face') return CREAM
  // Corpo: argila no alto, ferrugem embaixo, como barro cozido.
  return cell.row === 0 ? SAND : cell.row === 1 ? CLAY : RUST
}

export const terracota: Theme = {
  id: 'terracota',
  name: { pt: 'Terracota quente', en: 'Warm terracotta', es: 'Terracota cálida' },
  palette: {
    fg: CREAM,
    dim: '#9c8576',
    accent: CLAY,
    accent2: SAND,
    ok: OLIVE,
    warn: '#e0a34a',
    danger: '#c2452d',
  },
  barGradient: [SAND, CLAY, RUST],
  glyphs: { full: '●', empty: '○', sep: '·', spark: '❋' },
  mascotColor,
}
