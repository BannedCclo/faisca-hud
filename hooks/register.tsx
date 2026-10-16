import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { FaiscaActivity, FaiscaDetail, FaiscaMetric, FaiscaMood, FaiscaPrefs, FaiscaUsage } from '../types'
import { checkAlerts, readings } from './alerts.ts'
import { EXAMPLE_MASCOT, EXAMPLE_THEME, loadCustom, type CustomFile } from './custom.ts'
import {
  ALL_ALIASES, LANGS, METRIC_ALIASES, detectLang, nextLang, pick, t, verbOf,
  type Lang, type Strings,
} from './i18n.ts'
import { MASCOT_COLUMNS, MASCOT_ROWS, frameAt } from './mascot/clip.ts'
import { getMascot, listMascots, nextMascot, setCustomMascots } from './mascot/index.ts'
import { effectiveMood, fileOf, labelFor, moodForTool } from './mascot/mood.ts'
import { mascotCells, mascotSvg } from './mascot/raster.ts'
import { compactLine, fullLines, type Line } from './meter.ts'
import { DEFAULT_PREFS, EMPTY_TURN, mergePrefs } from './state.ts'
import { getTheme, listThemes, nextTheme, setCustomThemes } from './themes/index.ts'
import { addStep, toUsage } from './usage.ts'

const COMMAND = 'faisca'
const RASTER_KEY = 'faisca'
const TICK_MS = 150
/** Abaixo disso a faixa cai para uma linha só. */
const FULL_MIN_COLUMNS = 70
/** Linhas em branco acima da faixa, para separá-la da resposta do Claude. */
const TOP_GAP = 1
const METRICS: readonly FaiscaMetric[] = ['ctx', 'turno', '5h', '7d', 'custo']

const prefs = atom({ plugin: 'faisca-hud', key: 'prefs' } as const, DEFAULT_PREFS)
const usage = atom({ plugin: 'faisca-hud', key: 'usage' } as const, null as FaiscaUsage | null)
const turn = atom({ plugin: 'faisca-hud', key: 'turn' } as const, EMPTY_TURN)
const activity = atom({ plugin: 'faisca-hud', key: 'activity' } as const, { mood: 'idle', since: 0 } as FaiscaActivity)
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
  activity: { mood: 'idle', since: 0 } as FaiscaActivity,
  ctxPercent: undefined as number | undefined,
  theme: getTheme(DEFAULT_PREFS.theme),
  mascot: getMascot(DEFAULT_PREFS.mascot),
  /** O idioma do Claude Code, para `lang: 'auto'`; lido no início da sessão. */
  detectedLang: 'en' as Lang,
}

type $ = EngineInterface

function langOf(p: FaiscaPrefs): Lang {
  return p.lang === 'auto' ? live.detectedLang : p.lang
}

/** O que a última leitura da pasta de personalização achou. */
const custom = { dir: '', themes: [] as string[], mascots: [] as string[], errors: [] as string[] }

/** `<pasta do Claude>/faisca-hud`: `CLAUDE_CONFIG_DIR`, ou `~/.claude`. */
async function customDir($: $): Promise<string> {
  const config = await $.env.get('CLAUDE_CONFIG_DIR')
  if (config) return `${config.replace(/[\\/]+$/, '')}/faisca-hud`
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? ''
  return `${home.replace(/[\\/]+$/, '')}/.claude/faisca-hud`
}

async function readJsonFiles($: $, dir: string): Promise<CustomFile[]> {
  if (!(await $.fs.exists(dir))) return []
  const files: CustomFile[] = []
  for (const entry of await $.fs.list(dir)) {
    if (entry.kind !== 'file' || !entry.name.endsWith('.json')) continue
    files.push({ name: entry.name, text: String(await $.fs.read(`${dir}/${entry.name}`)) })
  }
  return files
}

/** Lê os temas e mascotes do usuário e os põe nos registros. */
async function loadCustomFromDisk($: $, lang: Lang): Promise<void> {
  const s = t(lang).custom
  try {
    custom.dir = await customDir($)
    const loaded = loadCustom(
      await readJsonFiles($, `${custom.dir}/temas`),
      await readJsonFiles($, `${custom.dir}/mascotes`),
      lang,
    )
    setCustomThemes(loaded.themes)
    setCustomMascots(loaded.mascots)
    custom.themes = loaded.themes.map(x => x.id)
    custom.mascots = loaded.mascots.map(m => m.id)
    custom.errors = loaded.errors
  } catch (err) {
    custom.errors = [s.cantRead(custom.dir, String(err))]
  }
  if (custom.errors.length > 0) $.ui.toast(s.toast(custom.errors.length))
}

function customText(s: Strings): string {
  const c = s.custom
  const list = (ids: string[]) => (ids.length > 0 ? ids.join(', ') : c.none)
  return [
    `${c.folder}: ${custom.dir}`,
    `  ${c.themes}:   ${list(custom.themes)}   (${custom.dir}/temas/*.json)`,
    `  ${c.mascots}: ${list(custom.mascots)}   (${custom.dir}/mascotes/*.json)`,
    ...(custom.errors.length > 0 ? ['', c.withErrors, ...custom.errors.map(e => `  ✗ ${e}`)] : []),
  ].join('\n')
}

async function setMood($: $, mood: FaiscaMood, detail?: FaiscaDetail): Promise<void> {
  const next: FaiscaActivity = { mood, since: await $.clock.now(), ...(detail ? { detail } : {}) }
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

async function measure($: $, m: Parameters<typeof toUsage>[0]): Promise<void> {
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
  const a = t(langOf(p)).alerts
  for (const one of fired) $.ui.toast(a.crossed(a.names[one.key] ?? one.key, Math.round(one.percent), one.level))
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
  // Dormindo, o mascote respira devagar: um quadro a cada três ticks.
  if (mood === 'sleep' && live.tick % 3 !== 0) return
  const cells = mascotCells(live.theme, live.mascot, mood, live.tick)
  const r = await $.ui.blit({ requestId: live.bandId, key: RASTER_KEY, cells })
  if ('deny' in r && r.deny !== undefined) live.isRasterShown = false
}

function helpText(p: FaiscaPrefs, s: Strings): string {
  const c = s.cmd
  const lang = langOf(p)
  const on = (b: boolean) => (b ? c.on : c.off)
  const metrics = METRICS.map(m => `${p.metrics[m] ? '✦' : '·'} ${s.metricNames[m]}`).join('  ')
  const width = Math.max(...c.help.map(([k]) => k.length)) + 2
  return [
    c.header(pick(getTheme(p.theme).name, lang), p.isMinimized),
    c.status(getMascot(p.mascot).name, on(p.hasMascot), on(p.hasAlerts), t(lang).langName, p.lang === 'auto'),
    `${c.metricsLine} ${metrics}`,
    '',
    ...c.help.map(([k, v]) => `/faisca ${k.padEnd(width)}${v}`),
    '',
    c.keys,
  ].join('\n')
}

async function runCommand($: $, args: string): Promise<string> {
  const [word = '', ...rest] = args.trim().split(/\s+/).filter(Boolean)
  const arg = rest.join(' ').toLowerCase()
  const onOff = (x: string) => (x === 'on' ? true : x === 'off' ? false : undefined)
  const p0 = await read($, prefs)
  const lang = langOf(p0)
  const s = t(lang)
  const c = s.cmd
  const verb = word === '' ? 'help' : verbOf(word)

  switch (verb) {
    case 'help':
      return helpText(p0, s)
    case 'theme': {
      if (!arg) {
        return listThemes()
          .map(th => `${th.id === p0.theme ? '✦' : '·'} ${th.id}  —  ${pick(th.name, lang)}`)
          .join('\n')
      }
      const theme = listThemes().find(th => th.id === arg || pick(th.name, lang).toLowerCase().startsWith(arg))
      if (!theme) return c.noTheme(arg, listThemes().map(th => th.id).join(', '))
      await setPrefs($, p => ({ ...p, theme: theme.id }))
      return c.themeSet(pick(theme.name, lang))
    }
    case 'min':
      await setPrefs($, p => ({ ...p, isMinimized: true }))
      return c.minSet
    case 'max':
      await setPrefs($, p => ({ ...p, isMinimized: false }))
      return c.maxSet
    case 'mascot': {
      if (!arg) {
        return listMascots()
          .map(m => `${m.id === p0.mascot ? '✦' : '·'} ${m.id.padEnd(7)} ${m.name} — ${pick(m.description, lang)}`)
          .join('\n')
      }
      const v = onOff(arg)
      if (v !== undefined) {
        await setPrefs($, p => ({ ...p, hasMascot: v }))
        const name = getMascot(p0.mascot).name
        return v ? c.mascotBack(name) : c.mascotGone(name)
      }
      const mascot = listMascots().find(m => m.id === arg || m.name.toLowerCase() === arg)
      if (!mascot) return c.noMascot(arg, listMascots().map(m => m.id).join(', '))
      await setPrefs($, p => ({ ...p, mascot: mascot.id, hasMascot: true }))
      await setMood($, 'happy', { kind: 'arrived', mascot: mascot.name })
      return c.mascotSet(mascot.name, pick(mascot.description, lang))
    }
    case 'language': {
      if (arg === 'auto') {
        await setPrefs($, p => ({ ...p, lang: 'auto' }))
        $.ui.invalidate('ui.render')
        return t(live.detectedLang).cmd.langAuto(t(live.detectedLang).langName)
      }
      const chosen = LANGS.find(l => l === arg)
      if (!chosen) return c.langUsage
      await setPrefs($, p => ({ ...p, lang: chosen }))
      $.ui.invalidate('ui.render')
      return t(chosen).cmd.langSet(t(chosen).langName)
    }
    case 'alerts': {
      const v = onOff(arg)
      if (v === undefined) return c.alertsUsage
      await setPrefs($, p => ({ ...p, hasAlerts: v }))
      return v ? c.alertsOn : c.alertsOff
    }
    case 'spinner': {
      const v = onOff(arg)
      if (v === undefined) return c.spinnerUsage
      await setPrefs($, p => ({ ...p, hidesSpinner: !v }))
      $.ui.invalidate('ui.render')
      return v ? c.spinnerOn : c.spinnerOff
    }
    case 'metrics': {
      const wanted = arg.split(/[\s,]+/).filter(Boolean)
      if (wanted.length === 0) return c.metricsUsage
      const all = wanted.some(w => ALL_ALIASES.includes(w))
      const keyOf = (w: string) => METRICS.find(m => METRIC_ALIASES[m].includes(w))
      const unknown = wanted.filter(w => !ALL_ALIASES.includes(w) && keyOf(w) === undefined)
      if (unknown.length > 0) {
        return c.metricsUnknown(unknown.join(', '), [...METRICS.map(m => s.metricNames[m]), s.allWord].join(', '))
      }
      const picked = new Set(wanted.map(keyOf).filter(Boolean))
      const metrics = Object.fromEntries(METRICS.map(m => [m, all || picked.has(m)])) as Record<FaiscaMetric, boolean>
      await setPrefs($, p => ({ ...p, metrics }))
      return c.metricsSet(METRICS.filter(m => metrics[m]).map(m => s.metricNames[m]).join(', ') || c.metricsNone)
    }
    case 'folder':
      return customText(s)
    case 'reload': {
      await loadCustomFromDisk($, lang)
      const p = await read($, prefs)
      live.theme = getTheme(p.theme)
      live.mascot = getMascot(p.mascot)
      $.ui.invalidate('ui.render')
      return `${s.custom.reloaded}\n\n${customText(s)}`
    }
    case 'examples': {
      const dir = custom.dir || (await customDir($))
      const written: string[] = []
      for (const [path, data] of [
        [`${dir}/temas/_exemplo-tema.json`, EXAMPLE_THEME],
        [`${dir}/mascotes/_exemplo-mascote.json`, EXAMPLE_MASCOT],
      ] as const) {
        if (await $.fs.exists(path)) continue
        await $.fs.write(path, JSON.stringify(data, null, 2) + '\n')
        written.push(path)
      }
      return [
        written.length > 0 ? `${s.custom.created}\n${written.map(w => `  ${w}`).join('\n')}` : s.custom.examplesExist,
        '',
        s.custom.examplesHint,
      ].join('\n')
    }
    case 'reset':
      await setPrefs($, () => DEFAULT_PREFS)
      return c.reset
    default:
      return `${c.unknownVerb(word)}\n\n${helpText(p0, s)}`
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      const settings = await $.settings.read()
      live.detectedLang = detectLang(settings.language, await $.env.get('LANG'))
    } catch {
      live.detectedLang = 'en'
    }
    const saved = mergePrefs(await $.store.get('prefs'))
    await loadCustomFromDisk($, langOf(saved))
    await update($, prefs, () => saved)
    live.theme = getTheme(saved.theme)
    live.mascot = getMascot(saved.mascot)
    await setMood($, 'idle')
    await measure($, await $.session.usage())
    await $.command.register({
      name: COMMAND,
      description: t(langOf(saved)).cmd.description,
      argumentHint: `[${(['theme', 'mascot', 'language', 'min', 'max', 'metrics', 'alerts', 'spinner', 'folder', 'reload', 'examples', 'reset'] as const).map(v => t(langOf(saved)).verbs[v]).join('|')}]`,
    })
    $.clock.every(TICK_MS, () => void tick($))

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => ({ text: await runCommand($, e.args) })).catch(
    () => ({ text: t(live.detectedLang).cmd.stumbled }),
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
    if (e.agentId === undefined && u !== null) await update($, turn, x => addStep(x, u))
    return result
  })

  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    await update($, turn, x => ({ ...x, tools: { ...x.tools, [tool]: (x.tools[tool] ?? 0) + 1 } }))
    const file = fileOf(e as unknown as Record<string, unknown>)
    const fact = { tool, ...(file ? { file } : {}) }
    await setMood($, moodForTool(tool), { kind: 'tool', ...fact })
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError) await setMood($, 'error', { kind: 'toolFailed', ...fact })
    else if (live.isWorking) await setMood($, 'thinking')
    return ran
  }).catch(($, e, next) => next(e)) // só observa: se falhar, a ferramenta segue como seria

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      live.isWorking = false
      const endedAt = await $.clock.now()
      await update($, turn, x => ({ ...x, endedAt }))
      const u = e.usage
      if (u) {
        // O total do turno é a palavra final; os passos somados eram a prévia.
        await update($, turn, x => ({
          ...x,
          input: u.input_tokens,
          output: u.output_tokens,
          cacheRead: u.cache_read_input_tokens,
          cacheWrite: u.cache_creation_input_tokens,
        }))
      }
      if (e.reason === 'answer') await setMood($, 'happy')
      else if (e.reason === 'aborted') await setMood($, 'idle', { kind: 'aborted' })
      else await setMood($, 'error', { kind: e.reason === 'refusal' ? 'refusal' : 'apiError' })
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
    const [p, u, tr, act] = await Promise.all([read($, prefs), read($, usage), read($, turn), read($, activity)])
    const now = await $.clock.now()
    const lang = langOf(p)
    const s = t(lang)
    const theme = getTheme(p.theme)
    const mascotDef = getMascot(p.mascot)
    live.theme = theme
    live.mascot = mascotDef
    live.activity = act
    live.ctxPercent = u?.ctxPercent
    live.isWorking = e.props.isWorking
    // Depois de um reload no meio do turno, o relógio volta a contar do início certo.
    if (tr.startedAt !== undefined) live.turnStartedAt = tr.startedAt
    live.bandId = e.requestId

    const mood = effectiveMood(act, now, u?.ctxPercent, e.props.isWorking)
    live.shownMood = mood
    const label = labelFor(act, mood, mascotDef, lang)
    const input = { usage: u, turn: tr, mood, mascot: mascotDef, label, isWorking: e.props.isWorking, prefs: p, theme, now, s }
    // Só o terminal mede o espaço em células; no desktop o tamanho vem da página.
    const isTerminal = e.surface === 'terminal'
    const isCompact = p.isMinimized || (isTerminal && (e.props.bodyColumns < FULL_MIN_COLUMNS || e.props.maxRows < MASCOT_ROWS + TOP_GAP))
    // Sem espaço nem para a linha do medidor e o respiro, o respiro cede.
    const topGap = !isTerminal || e.props.maxRows > TOP_GAP ? TOP_GAP : 0

    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    // Só o terminal desenha `Raster`; nas outras a chave pode existir e não pintar nada.
    const Raster = isTerminal && 'Raster' in els ? els.Raster : undefined
    const Svg = !isTerminal && 'Svg' in els ? els.Svg : undefined

    const drawLine = (line: Line) => (
      <Text wrap="truncate-end">
        {line.map(seg => (
          <Text color={seg.color} bold={seg.bold}>
            {seg.text}
          </Text>
        ))}
      </Text>
    )

    const toggleMin = () => void setPrefs($, x => ({ ...x, isMinimized: !x.isMinimized }))
    const cycleTheme = () => void setPrefs($, x => ({ ...x, theme: nextTheme(x.theme).id }))
    const cycleLang = () => void setPrefs($, x => ({ ...x, lang: nextLang(langOf(x)) }))
    const pet = () => void setMood($, 'pet')
    const cycleMascot = async () => {
      const chosen = await setPrefs($, x => ({ ...x, mascot: nextMascot(x.mascot).id, hasMascot: true }))
      await setMood($, 'happy', { kind: 'arrived', mascot: getMascot(chosen.mascot).name })
    }
    const langButton = <Button key="idioma" plain hotkey="l" label={lang.toUpperCase()} dimColor onPress={cycleLang} />

    if (isCompact) {
      live.isRasterShown = false
      return (
        <Box key="faixa" flexDirection="row" justifyContent="space-between" marginTop={topGap}>
          {drawLine(compactLine(input))}
          <Box flexDirection="row" gap={1}>
            <Button key="tema" plain hotkey="t" label={s.buttons.theme} dimColor onPress={cycleTheme} />
            {langButton}
            <Button key="min" plain hotkey="m" label={p.isMinimized ? 'max' : 'min'} dimColor onPress={toggleMin} />
          </Box>
        </Box>
      )
    }

    const figure = Raster !== undefined ? (
      <Raster key={RASTER_KEY} columns={MASCOT_COLUMNS} rows={MASCOT_ROWS} cells={mascotCells(theme, mascotDef, mood, live.tick)} />
    ) : Svg !== undefined ? (
      <Svg key="mascote-svg" alt={mascotDef.name} {...mascotSvg(theme, mascotDef, mood, live.tick)} />
    ) : (
      frameAt(mascotDef, mood, 0).map(row => <Text color={theme.palette.accent}>{row}</Text>)
    )
    // O nome vai embaixo, centrado na largura do mascote, quando a faixa tem a linha a mais.
    const hasNameRow = !isTerminal || e.props.maxRows >= MASCOT_ROWS + 1 + topGap
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
    const petLabel = mascotDef.petLabel !== undefined ? pick(mascotDef.petLabel, lang) : s.buttons.pet

    return (
      <Box key="faixa" flexDirection="row" gap={1} marginTop={topGap}>
        {mascot}
        <Box flexDirection="column" flexGrow={1}>
          {lines.map(drawLine)}
          <Box flexDirection="row" justifyContent="space-between">
            {drawLine(last)}
            <Box flexDirection="row" gap={1}>
              <Button key="tema" plain hotkey="t" label={s.buttons.theme} dimColor onPress={cycleTheme} />
              <Button key="mascote" plain hotkey="b" label={s.buttons.mascot} dimColor onPress={() => void cycleMascot()} />
              {langButton}
              <Button key="min" plain hotkey="m" label="min" dimColor onPress={toggleMin} />
              {p.hasMascot ? <Button key="carinho" plain hotkey="p" label={petLabel} dimColor onPress={pet} /> : null}
            </Box>
          </Box>
        </Box>
      </Box>
    )
  })
}
