import type { Mascot } from './clip.ts'
import { bit } from './mascots/bit.ts'
import { faisca } from './mascots/faisca.ts'
import { kage } from './mascots/kage.ts'
import { rex } from './mascots/rex.ts'

const MASCOTS: Mascot[] = []

/** Novo mascote: um arquivo em mascot/mascots/ e uma chamada aqui embaixo. */
export function registerMascot(mascot: Mascot): void {
  const at = MASCOTS.findIndex(one => one.id === mascot.id)
  if (at === -1) MASCOTS.push(mascot)
  else MASCOTS[at] = mascot
}

registerMascot(bit)
registerMascot(rex)
registerMascot(kage)
registerMascot(faisca)

export const DEFAULT_MASCOT = bit.id

let custom: readonly Mascot[] = []

/**
 * Os mascotes do usuário (pasta `faisca-hud/mascotes/`), trocados de uma vez a
 * cada carga; um id igual ao de um mascote embutido o substitui.
 */
export function setCustomMascots(mascots: readonly Mascot[]): void {
  custom = mascots
}

export function listMascots(): readonly Mascot[] {
  const ids = new Set(custom.map(m => m.id))
  return [...MASCOTS.filter(m => !ids.has(m.id)), ...custom]
}

export function getMascot(id: string): Mascot {
  return listMascots().find(one => one.id === id) ?? bit
}

export function nextMascot(id: string): Mascot {
  const all = listMascots()
  const at = all.findIndex(one => one.id === id)
  return all[(at + 1) % all.length] ?? bit
}
