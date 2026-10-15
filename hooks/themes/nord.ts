import type { MascotCell, Theme } from './index.ts'

// Paleta Nord (nordtheme.com): polar night, snow storm, frost e aurora.
const FROST_1 = '#8fbcbb'
const FROST_2 = '#88c0d0'
const FROST_3 = '#81a1c1'
const FROST_4 = '#5e81ac'
const SNOW = '#eceff4'
const AURORA_YELLOW = '#ebcb8b'
const AURORA_RED = '#bf616a'
const AURORA_GREEN = '#a3be8c'

function mascotColor(cell: MascotCell): `#${string}` {
  if (cell.mood === 'error') return cell.part === 'spark' ? '#4c566a' : AURORA_RED
  if (cell.part === 'spark') return (cell.tick + cell.col) % 4 < 2 ? SNOW : FROST_2
  if (cell.part === 'face') return SNOW
  // Corpo: do gelo claro no alto ao azul profundo embaixo.
  return cell.row === 0 ? FROST_1 : cell.row === 1 ? FROST_3 : FROST_4
}

export const nord: Theme = {
  id: 'nord',
  name: 'Nord',
  palette: {
    fg: '#d8dee9',
    dim: '#616e88',
    accent: FROST_2,
    accent2: FROST_1,
    ok: AURORA_GREEN,
    warn: AURORA_YELLOW,
    danger: AURORA_RED,
  },
  barGradient: [FROST_4, FROST_3, FROST_2, FROST_1],
  glyphs: { full: '━', empty: '─', sep: '·', spark: '✧' },
  mascotColor,
}
