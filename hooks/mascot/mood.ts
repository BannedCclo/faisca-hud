import type { FaiscaActivity, FaiscaMood } from '../../types'
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

const TOOL_ACTIONS: Record<string, string> = {
  Edit: 'editando',
  MultiEdit: 'editando',
  Write: 'criando',
  NotebookEdit: 'editando notebook',
  Read: 'lendo',
  Bash: 'rodando comando',
  PowerShell: 'rodando comando',
  Grep: 'buscando no código',
  Glob: 'procurando arquivos',
  WebFetch: 'lendo página',
  WebSearch: 'pesquisando na web',
  Agent: 'delegando a um agente',
  Task: 'delegando a um agente',
  TodoWrite: 'organizando tarefas',
  Skill: 'carregando skill',
  ToolSearch: 'buscando ferramentas',
}

function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
}

/**
 * O que a ferramenta está fazendo, em português: "editando meter.ts",
 * "rodando comando", "usando add (shadcn)". `args` são os argumentos da
 * chamada; deles só se lê o caminho do arquivo, quando houver.
 */
export function describeTool(tool: string, args: Readonly<Record<string, unknown>>): string {
  const file = [args.file_path, args.notebook_path, args.path].find(v => typeof v === 'string') as string | undefined
  const action = TOOL_ACTIONS[tool]
  if (action !== undefined) {
    const withFile = ['editando', 'criando', 'lendo'].includes(action)
    return withFile && file ? `${action} ${baseName(file)}` : action
  }
  const mcp = tool.split('__')
  if (mcp.length >= 3 && mcp[0] === 'mcp') return `usando ${mcp.slice(2).join('__')} (${mcp[1]})`
  return `usando ${tool}`
}

/** O rótulo do humor: o do mascote, se ele tiver um próprio, senão o padrão. */
export function labelForMood(mood: FaiscaMood, mascot?: Mascot): string {
  const own = mascot?.labels?.[mood]
  if (own !== undefined) return own
  switch (mood) {
    case 'idle':
      return 'à toa'
    case 'sleep':
      return 'cochilando'
    case 'thinking':
      return 'pensando'
    case 'tool':
      return 'mexendo'
    case 'writing':
      return 'escrevendo'
    case 'happy':
      return 'pronto!'
    case 'error':
      return 'ops'
    case 'melting':
      return 'derretendo'
    case 'pet':
      return 'feliz ♡'
  }
}

/**
 * O humor que a Faísca mostra agora: o registrado, mas um passageiro que
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
