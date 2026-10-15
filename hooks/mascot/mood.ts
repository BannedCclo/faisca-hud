import type { FaiscaActivity, FaiscaMood } from '../../types'
import { pick, t, type Lang, type Strings } from '../i18n.ts'
import type { Mascot } from './clip.ts'

/** Quanto tempo um humor passageiro dura antes de voltar ao de base. */
export const FLEETING_MS: Partial<Record<FaiscaMood, number>> = {
  happy: 3000,
  error: 2500,
  pet: 3500,
}

export const SLEEP_AFTER_MS = 2 * 60 * 1000
export const MELT_AT_PERCENT = 85

const WRITING_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit'])

export function moodForTool(tool: string): FaiscaMood {
  return WRITING_TOOLS.has(tool) ? 'writing' : 'tool'
}

type ToolAction = Exclude<keyof Strings['tools'], 'use'>

const TOOL_ACTIONS: Record<string, ToolAction> = {
  Edit: 'edit',
  MultiEdit: 'edit',
  Write: 'create',
  NotebookEdit: 'notebook',
  Read: 'read',
  Bash: 'run',
  PowerShell: 'run',
  Grep: 'grep',
  Glob: 'glob',
  WebFetch: 'fetch',
  WebSearch: 'search',
  Agent: 'agent',
  Task: 'agent',
  TodoWrite: 'todo',
  Skill: 'skill',
  ToolSearch: 'toolSearch',
}

/** As ações que dizem o arquivo junto: "editando meter.ts". */
const WITH_FILE = new Set<ToolAction>(['edit', 'create', 'read'])

function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
}

/** O nome do arquivo que a chamada de ferramenta toca, quando houver. */
export function fileOf(args: Readonly<Record<string, unknown>>): string | undefined {
  const path = [args.file_path, args.notebook_path, args.path].find(v => typeof v === 'string') as string | undefined
  return path === undefined ? undefined : baseName(path)
}

/** O que a ferramenta está fazendo: "editando meter.ts", "running command". */
export function describeTool(tool: string, file: string | undefined, lang: Lang): string {
  const s = t(lang).tools
  const action = TOOL_ACTIONS[tool]
  if (action !== undefined) return WITH_FILE.has(action) && file ? `${s[action]} ${file}` : s[action]
  const mcp = tool.split('__')
  if (mcp.length >= 3 && mcp[0] === 'mcp') return s.use(mcp.slice(2).join('__'), mcp[1])
  return s.use(tool)
}

/** O rótulo do humor: o do mascote, se ele tiver um próprio, senão o padrão. */
export function labelForMood(mood: FaiscaMood, mascot: Mascot | undefined, lang: Lang): string {
  const own = mascot?.labels?.[mood]
  return own !== undefined ? pick(own, lang) : t(lang).moods[mood]
}

/**
 * O texto ao lado da faísca: o do fato que causou o humor (a ferramenta, o
 * erro), ou o rótulo do humor quando o humor efetivo já é outro.
 */
export function labelFor(activity: FaiscaActivity, mood: FaiscaMood, mascot: Mascot, lang: Lang): string {
  const d = activity.detail
  if (mood !== activity.mood || d === undefined) return labelForMood(mood, mascot, lang)
  const s = t(lang).activity
  switch (d.kind) {
    case 'tool':
      return describeTool(d.tool, d.file, lang)
    case 'toolFailed':
      return s.failed(describeTool(d.tool, d.file, lang))
    case 'aborted':
      return s.aborted
    case 'refusal':
      return s.refusal
    case 'apiError':
      return s.apiError
    case 'arrived':
      return s.arrived(d.mascot)
  }
}

/**
 * O humor que o mascote mostra agora: o registrado, mas um passageiro que
 * passou do tempo volta ao de base, o ócio longo vira sono, e o contexto
 * quase cheio derrete o ócio.
 */
export function effectiveMood(
  activity: FaiscaActivity,
  now: number,
  ctxPercent: number | undefined,
  isWorking: boolean,
): FaiscaMood {
  const age = now - activity.since
  let mood = activity.mood
  const fleeting = FLEETING_MS[mood]
  if (fleeting !== undefined && age >= fleeting) {
    mood = isWorking ? 'thinking' : 'idle'
  }
  if (mood === 'idle' && !isWorking && age >= SLEEP_AFTER_MS) mood = 'sleep'
  if ((mood === 'idle' || mood === 'sleep') && (ctxPercent ?? 0) >= MELT_AT_PERCENT) {
    mood = 'melting'
  }
  return mood
}
