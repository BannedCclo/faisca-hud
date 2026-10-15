import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { FaiscaActivity, FaiscaMetric, FaiscaMood, FaiscaPrefs, FaiscaUsage } from '../types'
import { checkAlerts, readings } from './alerts.ts'
import { MASCOT_COLUMNS, MASCOT_ROWS, frameAt } from './mascot/clip.ts'
import { getMascot, listMascots, nextMascot } from './mascot/index.ts'
import { describeTool, effectiveMood, labelForMood, moodForTool } from './mascot/mood.ts'
import { mascotCells } from './mascot/raster.ts'
import { compactLine, fullLines, type Line } from './meter.ts'
import { DEFAULT_PREFS, EMPTY_TURN, mergePrefs } from './state.ts'
import { getTheme, listThemes, nextTheme } from './themes/index.ts'
import { addStep, toUsage } from './usage.ts'

const COMMAND = 'faisca'
const RASTER_KEY = 'faisca'
const TICK_MS = 150
/** Abaixo disso a faixa cai para uma linha só. */
const FULL_MIN_COLUMNS = 70
const METRICS: readonly FaiscaMetric[] = ['ctx', 'turno', '5h', '7d', 'custo']

const prefs = atom({ plugin: 'faisca-hud', key: 'prefs' } as const, DEFAULT_PREFS)
const usage = atom({ plugin: 'faisca-hud', key: 'usage' } as const, null as FaiscaUsage | null)
const turn = atom({ plugin: 'faisca-hud', key: 'turn' } as const, EMPTY_TURN)
const activity = atom(
  { plugin: 'faisca-hud', key: 'activity' } as const,
  { mood: 'idle', label: labelForMood('idle'), since: 0 } as FaiscaActivity,
)
const alerted = atom({ plugin: 'faisca-hud', key: 'alerted' } as const, {} as Record<string, number>)

/**
 * O espelho do estado que o animador lê a cada tick sem ir ao host.
 * A fonte da verdade é `$.state`; isto é só cache (some num reload, e o
 * próximo desenho da faixa o refaz).
 */
const live = {
  tick: 0,
  bandId: undefined as string | undefined,
  isRasterShown: false,
  isWorking: false,
  turnStartedAt: 0,
  shownSecond: -1,
  shownMood: 'idle' as FaiscaMood,
  activity: { mood: 'idle', label: labelForMood('idle'), since: 0 } as FaiscaActivity,
  ctxPercent: undefined as number | undefined,
  theme: getTheme(DEFAULT_PREFS.theme),
  mascot: getMascot(DEFAULT_PREFS.mascot),
}

type $ = EngineInterface

async function setMood($: $, mood: FaiscaMood, label = labelForMood(mood, live.mascot)): Promise<void> {
  const next: FaiscaActivity = { mood, label, since: await $.clock.now() }
  live.activity = next
  await update($, activity, () => next)
}

async function setPrefs($: $, fn: (p: FaiscaPrefs) => FaiscaPrefs): Promise<FaiscaPrefs> {
  await update($, prefs, fn)
  const value = await read($, prefs)
  live.theme = getTheme(value.theme)
  live.mascot = getMascot(value.mascot)
  await $.store.set('prefs', value)
  return value
}

async function measure(
  $: $,
  m: Parameters<typeof toUsage>[0],
): Promise<void> {
  const u = toUsage(m)
  live.ctxPercent = u.ctxPercent
  await update($, usage, () => u)
  const p = await read($, prefs)
  if (!p.hasAlerts) return
  const prev = await read($, alerted)
  const { next, fired } = checkAlerts(prev, readings(u))
  if (fired.length > 0 || Object.keys(next).length !== Object.keys(prev).length) {
    await update($, alerted, () => next)
  }
  for (const one of fired) $.ui.toast(one.text)
}

/** Um tick do animador: humor efetivo, redesenho se mudou, e o quadro novo. */
async function tick($: $): Promise<void> {
  live.tick += 1
  const now = await $.clock.now()
  const mood = effectiveMood(live.activity, now, live.ctxPercent, live.isWorking)
  // O relógio do turno anda de segundo em segundo: redesenha quando o segundo vira.
  const second = live.isWorking ? Math.floor((now - live.turnStartedAt) / 1000) : -1
  if (mood !== live.shownMood || second !== live.shownSecond) {
    live.shownMood = mood
    live.shownSecond = second
    $.ui.invalidate('ui.render')
  }
  if (!live.isRasterShown || live.bandId === undefined) return
  // Dormindo, a Faísca respira devagar: um quadro a cada três ticks.
  if (mood === 'sleep' && live.tick % 3 !== 0) return
  const cells = mascotCells(live.theme, live.mascot, mood, live.tick)
  const r = await $.ui.blit({ requestId: live.bandId, key: RASTER_KEY, cells })
  if ('deny' in r && r.deny !== undefined) live.isRasterShown = false
}

function helpText(p: FaiscaPrefs): string {
  const on = (b: boolean) => (b ? 'ligado' : 'desligado')
  const metrics = METRICS.map(m => `${p.metrics[m] ? '✦' : '·'} ${m}`).join('  ')
  return [
    `✦ Faísca HUD — tema ${getTheme(p.theme).name}, ${p.isMinimized ? 'minimizada' : 'completa'}`,
    `  mascote ${getMascot(p.mascot).name} (${on(p.hasMascot)}) · alertas ${on(p.hasAlerts)}`,
    `  métricas: ${metrics}`,
    '',
    '/faisca tema [nome]          troca o tema (sem nome: lista os temas)',
    '/faisca min | max            uma linha só | faixa completa',
    '/faisca mascote [nome]       troca o mascote (sem nome: lista os mascotes)',
    '/faisca mascote on|off       mostra ou esconde o mascote',
    '/faisca metricas a,b,…       quais métricas mostrar (ctx, turno, 5h, 7d, custo, todas)',
    '/faisca alertas on|off       avisos ao passar de 80% e 90%',
    '/faisca spinner on|off       mostra ou esconde a linha "Pensando…" nativa',
    '/faisca reset                volta tudo ao padrão',
    '',
    'Na faixa (ctrl+x tab ou clique para focar): t tema · b mascote · m minimizar · p interagir',
  ].join('\n')
}

async function runCommand($: $, args: string): Promise<string> {
  const [verb = '', ...rest] = args.trim().split(/\s+/).filter(Boolean)
  const arg = rest.join(' ').toLowerCase()
  const onOff = (s: string) => (s === 'on' ? true : s === 'off' ? false : undefined)

  switch (verb.toLowerCase()) {
    case '':
    case 'ajuda':
    case 'help':
      return helpText(await read($, prefs))
    case 'tema':
    case 'theme': {
      if (!arg) {
        const current = (await read($, prefs)).theme
        return listThemes()
          .map(t => `${t.id === current ? '✦' : '·'} ${t.id}  —  ${t.name}`)
          .join('\n')
      }
      const theme = listThemes().find(t => t.id === arg || t.name.toLowerCase().startsWith(arg))
      if (!theme) return `Tema "${arg}" não existe. Temas: ${listThemes().map(t => t.id).join(', ')}`
      await setPrefs($, p => ({ ...p, theme: theme.id }))
      return `✦ Tema: ${theme.name}`
    }
    case 'min':
      await setPrefs($, p => ({ ...p, isMinimized: true }))
      return '✦ Faixa minimizada (o medidor continua visível).'
    case 'max':
      await setPrefs($, p => ({ ...p, isMinimized: false }))
      return '✦ Faixa completa.'
    case 'mascote':
    case 'mascot': {
      const current = await read($, prefs)
      if (!arg) {
        return listMascots()
          .map(m => `${m.id === current.mascot ? '✦' : '·'} ${m.id.padEnd(7)} ${m.name} — ${m.description}`)
          .join('\n')
      }
      const v = onOff(arg)
      if (v !== undefined) {
        await setPrefs($, p => ({ ...p, hasMascot: v }))
        const name = getMascot(current.mascot).name
        return v ? `✦ ${name} voltou.` : `${name} saiu de cena (o medidor continua).`
      }
      const mascot = listMascots().find(m => m.id === arg || m.name.toLowerCase() === arg)
      if (!mascot) return `Mascote "${arg}" não existe. Mascotes: ${listMascots().map(m => m.id).join(', ')}`
      await setPrefs($, p => ({ ...p, mascot: mascot.id, hasMascot: true }))
      await setMood($, 'happy')
      return `✦ Mascote: ${mascot.name} — ${mascot.description}`
    }
    case 'alertas': {
      const v = onOff(arg)
      if (v === undefined) return 'Use /faisca alertas on ou /faisca alertas off.'
      await setPrefs($, p => ({ ...p, hasAlerts: v }))
      return v ? '✦ Alertas ligados.' : 'Alertas desligados.'
    }
    case 'spinner': {
      const v = onOff(arg)
      if (v === undefined) return 'Use /faisca spinner on (mostra a linha nativa) ou off (esconde).'
      await setPrefs($, p => ({ ...p, hidesSpinner: !v }))
      $.ui.invalidate('ui.render')
      return v ? 'Linha "Pensando…" nativa de volta.' : '✦ Linha nativa escondida: o estado fica na faixa.'
    }
    case 'metricas':
    case 'métricas': {
      const wanted = arg.split(/[\s,]+/).filter(Boolean)
      if (wanted.length === 0) return 'Diga quais: /faisca metricas ctx,turno,5h,7d,custo (ou todas).'
      const all = wanted.includes('todas')
      const unknown = wanted.filter(w => w !== 'todas' && !METRICS.includes(w as FaiscaMetric))
      if (unknown.length > 0) return `Métrica desconhecida: ${unknown.join(', ')}. Opções: ${METRICS.join(', ')}, todas.`
      const metrics = Object.fromEntries(
        METRICS.map(m => [m, all || wanted.includes(m)]),
      ) as Record<FaiscaMetric, boolean>
      await setPrefs($, p => ({ ...p, metrics }))
      return `✦ Métricas: ${METRICS.filter(m => metrics[m]).join(', ') || 'nenhuma (o contexto segue no modo compacto)'}`
    }
    case 'reset':
      await setPrefs($, () => DEFAULT_PREFS)
      return '✦ Preferências de volta ao padrão.'
    default:
      return `Não conheço "${verb}".\n\n${helpText(await read($, prefs))}`
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = mergePrefs(await $.store.get('prefs'))
    await update($, prefs, () => saved)
    live.theme = getTheme(saved.theme)
    live.mascot = getMascot(saved.mascot)
    await setMood($, 'idle')
    await measure($, await $.session.usage())
    await $.command.register({
      name: COMMAND,
      description: 'Faísca HUD: tema, modo compacto, mascote, métricas e alertas',
      argumentHint: '[tema|min|max|mascote|metricas|alertas|reset]',
    })
    $.clock.every(TICK_MS, () => void tick($))

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => ({ text: await runCommand($, e.args) })).catch(
    () => ({ text: 'A Faísca tropeçou nesse comando. Tente /faisca para ver as opções.' }),
  )

  on('session.measure', async ($, e, next) => {
    await measure($, e)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      live.isWorking = true
      live.turnStartedAt = await $.clock.now()
      const startedAt = live.turnStartedAt
      await update($, turn, () => ({ ...EMPTY_TURN, startedAt }))
      await setMood($, 'thinking')
    }
    return next(e)
  })

  // Tokens ao vivo: cada requisição do turno soma o que custou assim que responde.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const u = result.usage
    if (e.agentId === undefined && u !== null) await update($, turn, t => addStep(t, u))
    return result
  })

  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    await update($, turn, t => ({ ...t, tools: { ...t.tools, [tool]: (t.tools[tool] ?? 0) + 1 } }))
    const mood = moodForTool(tool)
    const doing = describeTool(tool, e as unknown as Record<string, unknown>)
    await setMood($, mood, doing)
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError) await setMood($, 'error', `falhou: ${doing}`)
    else if (live.isWorking) await setMood($, 'thinking')
    return ran
  }).catch(($, e, next) => next(e)) // só observa: se falhar, a ferramenta segue como seria

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      live.isWorking = false
      const endedAt = await $.clock.now()
      await update($, turn, t => ({ ...t, endedAt }))
      const u = e.usage
      if (u) {
        // O total do turno é a palavra final; os passos somados eram a prévia.
        await update($, turn, t => ({
          ...t,
          input: u.input_tokens,
          output: u.output_tokens,
          cacheRead: u.cache_read_input_tokens,
          cacheWrite: u.cache_creation_input_tokens,
        }))
      }
      if (e.reason === 'answer') await setMood($, 'happy')
      else if (e.reason === 'aborted') await setMood($, 'idle', 'interrompido')
      else await setMood($, 'error', e.reason === 'refusal' ? 'recusou' : 'erro na API')
    }
    return next(e)
  })

  // A faixa já diz o estado e o tempo: no terminal, a linha nativa do turno sai.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || !(await read($, prefs)).hidesSpinner) return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box display="none" />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      live.isRasterShown = false
      return next(e)
    }
    const [p, u, t, act] = await Promise.all([read($, prefs), read($, usage), read($, turn), read($, activity)])
    const now = await $.clock.now()
    const theme = getTheme(p.theme)
    const mascotDef = getMascot(p.mascot)
    live.theme = theme
    live.mascot = mascotDef
    live.activity = act
    live.ctxPercent = u?.ctxPercent
    live.isWorking = e.props.isWorking
    // Depois de um reload no meio do turno, o relógio volta a contar do início certo.
    if (t.startedAt !== undefined) live.turnStartedAt = t.startedAt
    live.bandId = e.requestId

    const mood = effectiveMood(act, now, u?.ctxPercent, e.props.isWorking)
    live.shownMood = mood
    const label = mood === act.mood ? act.label : labelForMood(mood, mascotDef)
    const input = { usage: u, turn: t, mood, mascot: mascotDef, label, isWorking: e.props.isWorking, prefs: p, theme, now }
    const isCompact = p.isMinimized || e.props.bodyColumns < FULL_MIN_COLUMNS || e.props.maxRows < 3

    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const Raster = 'Raster' in els ? els.Raster : undefined

    const drawLine = (line: Line) => (
      <Text wrap="truncate-end">
        {line.map(s => (
          <Text color={s.color} bold={s.bold}>
            {s.text}
          </Text>
        ))}
      </Text>
    )

    const toggleMin = () => void setPrefs($, x => ({ ...x, isMinimized: !x.isMinimized }))
    const cycleTheme = () => void setPrefs($, x => ({ ...x, theme: nextTheme(x.theme).id }))
    const pet = () => void setMood($, 'pet')
    const cycleMascot = async () => {
      const chosen = await setPrefs($, x => ({ ...x, mascot: nextMascot(x.mascot).id, hasMascot: true }))
      await setMood($, 'happy', `${getMascot(chosen.mascot).name} na área`)
    }

    if (isCompact) {
      live.isRasterShown = false
      return (
        <Box flexDirection="row" justifyContent="space-between">
          {drawLine(compactLine(input))}
          <Box flexDirection="row" gap={1}>
            <Button key="tema" plain hotkey="t" label="tema" dimColor onPress={cycleTheme} />
            <Button key="min" plain hotkey="m" label={p.isMinimized ? 'max' : 'min'} dimColor onPress={toggleMin} />
          </Box>
        </Box>
      )
    }

    const figure = Raster !== undefined ? (
      <Raster key={RASTER_KEY} columns={MASCOT_COLUMNS} rows={MASCOT_ROWS} cells={mascotCells(theme, mascotDef, mood, live.tick)} />
    ) : (
      frameAt(mascotDef, mood, 0).map(row => <Text color={theme.palette.accent}>{row}</Text>)
    )
    // O nome vai embaixo, centrado na largura do mascote, quando a faixa tem a linha a mais.
    const hasNameRow = e.props.maxRows >= MASCOT_ROWS + 1
    const mascot = !p.hasMascot ? null : (
      <Box flexDirection="column" width={MASCOT_COLUMNS} alignItems="center">
        {figure}
        {hasNameRow ? (
          <Text key="nome" color={theme.palette.accent} bold>
            {mascotDef.name}
          </Text>
        ) : null}
      </Box>
    )
    live.isRasterShown = p.hasMascot && Raster !== undefined

    const lines = fullLines(input)
    const last = lines.pop() ?? []

    return (
      <Box flexDirection="row" gap={1}>
        {mascot}
        <Box flexDirection="column" flexGrow={1}>
          {lines.map(drawLine)}
          <Box flexDirection="row" justifyContent="space-between">
            {drawLine(last)}
            <Box flexDirection="row" gap={1}>
              <Button key="tema" plain hotkey="t" label="tema" dimColor onPress={cycleTheme} />
              <Button key="mascote" plain hotkey="b" label="mascote" dimColor onPress={() => void cycleMascot()} />
              <Button key="min" plain hotkey="m" label="min" dimColor onPress={toggleMin} />
              {p.hasMascot ? <Button key="carinho" plain hotkey="p" label={mascotDef.petLabel} dimColor onPress={pet} /> : null}
            </Box>
          </Box>
        </Box>
      </Box>
    )
  })
}
