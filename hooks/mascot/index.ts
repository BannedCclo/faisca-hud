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

export function listMascots(): readonly Mascot[] {
  return MASCOTS
}

export function getMascot(id: string): Mascot {
  return MASCOTS.find(one => one.id === id) ?? bit
}

export function nextMascot(id: string): Mascot {
  const at = MASCOTS.findIndex(one => one.id === id)
  return MASCOTS[(at + 1) % MASCOTS.length] ?? bit
}
