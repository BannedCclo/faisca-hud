import type { FaiscaMood } from '../types'

/** Os idiomas da interface do mod. */
export type Lang = 'pt' | 'en' | 'es'
export const LANGS: readonly Lang[] = ['pt', 'en', 'es']

/** Um texto em vários idiomas; uma string sozinha vale para todos. */
export type Text = string | Partial<Record<Lang, string>>

/** O texto no idioma pedido; senão inglês, português, ou o primeiro que houver. */
export function pick(text: Text | undefined, lang: Lang): string {
  if (text === undefined) return ''
  if (typeof text === 'string') return text
  return text[lang] ?? text.en ?? text.pt ?? Object.values(text).find(v => typeof v === 'string') ?? ''
}

/** O idioma a partir do `language` dos settings do Claude Code ou do `LANG`. */
export function detectLang(settingsLanguage: unknown, envLang: string | undefined): Lang {
  const s = typeof settingsLanguage === 'string' ? settingsLanguage.toLowerCase() : ''
  if (/portug|^pt\b|brasil/.test(s)) return 'pt'
  if (/span|espa|castell|^es\b/.test(s)) return 'es'
  if (s) return 'en'
  const env = (envLang ?? '').toLowerCase()
  if (env.startsWith('pt')) return 'pt'
  if (env.startsWith('es')) return 'es'
  return 'en'
}

export function nextLang(lang: Lang): Lang {
  return LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]!
}

/** Os subcomandos do /faisca: um nome canônico e os apelidos em cada idioma. */
export type Verb =
  | 'help' | 'theme' | 'mascot' | 'min' | 'max' | 'metrics' | 'alerts' | 'spinner'
  | 'language' | 'folder' | 'reload' | 'examples' | 'reset'

export const VERB_ALIASES: Record<Verb, readonly string[]> = {
  help: ['ajuda', 'help', 'ayuda'],
  theme: ['tema', 'theme'],
  mascot: ['mascote', 'mascot', 'mascota'],
  min: ['min'],
  max: ['max'],
  metrics: ['metricas', 'métricas', 'metrics'],
  alerts: ['alertas', 'alerts'],
  spinner: ['spinner'],
  language: ['idioma', 'language', 'lang'],
  folder: ['pasta', 'folder', 'carpeta'],
  reload: ['recarregar', 'reload', 'recargar'],
  examples: ['exemplos', 'examples', 'ejemplos'],
  reset: ['reset'],
}

export function verbOf(word: string): Verb | undefined {
  const w = word.toLowerCase()
  return (Object.keys(VERB_ALIASES) as Verb[]).find(v => VERB_ALIASES[v].includes(w))
}

/** As métricas (chaves internas em português) e como cada idioma as chama. */
export const METRIC_ALIASES: Record<'ctx' | 'turno' | '5h' | '7d' | 'custo', readonly string[]> = {
  ctx: ['ctx'],
  turno: ['turno', 'turn'],
  '5h': ['5h'],
  '7d': ['7d'],
  custo: ['custo', 'cost', 'costo'],
}
export const ALL_ALIASES = ['todas', 'all', 'todo']

export type Strings = {
  langName: string
  verbs: Record<Verb, string>
  metricNames: Record<'ctx' | 'turno' | '5h' | '7d' | 'custo', string>
  allWord: string
  meter: { turn: string; limitsPending: string; doneIn: string }
  buttons: { theme: string; mascot: string; pet: string }
  moods: Record<FaiscaMood, string>
  tools: {
    edit: string; create: string; notebook: string; read: string; run: string; grep: string
    glob: string; fetch: string; search: string; agent: string; todo: string; skill: string
    toolSearch: string; use: (name: string, server?: string) => string
  }
  activity: { failed: (doing: string) => string; aborted: string; refusal: string; apiError: string; arrived: (name: string) => string }
  alerts: { names: Record<string, string>; crossed: (name: string, percent: number, level: number) => string }
  custom: {
    toast: (n: number) => string
    cantRead: (dir: string, why: string) => string
    folder: string
    themes: string
    mascots: string
    none: string
    withErrors: string
    reloaded: string
    created: string
    examplesExist: string
    examplesHint: string
    defaultDescription: string
    err: {
      object: (w: string) => string
      text: (w: string) => string
      hex: (w: string) => string
      colorOrList: (w: string) => string
      empty: (w: string) => string
      id: (w: string, s: string) => string
      glyph: (w: string) => string
      rows: (w: string, max: number) => string
      tooLong: (w: string, n: number, max: number) => string
      notNarrow: (w: string, ch: string) => string
      frames: (w: string) => string
      hold: (w: string) => string
      idleRequired: string
      unknownMood: (key: string, list: string) => string
      json: (msg: string) => string
    }
  }
  cmd: {
    description: string
    stumbled: string
    on: string
    off: string
    minimized: string
    full: string
    header: (theme: string, minimized: boolean) => string
    status: (mascot: string, mascotOn: string, alerts: string, lang: string, auto: boolean) => string
    metricsLine: string
    help: Array<[string, string]>
    keys: string
    unknownVerb: (v: string) => string
    noTheme: (arg: string, list: string) => string
    themeSet: (name: string) => string
    minSet: string
    maxSet: string
    noMascot: (arg: string, list: string) => string
    mascotSet: (name: string, desc: string) => string
    mascotBack: (name: string) => string
    mascotGone: (name: string) => string
    alertsUsage: string
    alertsOn: string
    alertsOff: string
    spinnerUsage: string
    spinnerOn: string
    spinnerOff: string
    metricsUsage: string
    metricsUnknown: (bad: string, options: string) => string
    metricsSet: (list: string) => string
    metricsNone: string
    langSet: (name: string) => string
    langAuto: (name: string) => string
    langUsage: string
    reset: string
  }
}

const pt: Strings = {
  langName: 'Português',
  verbs: {
    help: 'ajuda', theme: 'tema', mascot: 'mascote', min: 'min', max: 'max', metrics: 'metricas',
    alerts: 'alertas', spinner: 'spinner', language: 'idioma', folder: 'pasta', reload: 'recarregar',
    examples: 'exemplos', reset: 'reset',
  },
  metricNames: { ctx: 'ctx', turno: 'turno', '5h': '5h', '7d': '7d', custo: 'custo' },
  allWord: 'todas',
  meter: { turn: 'turno', limitsPending: 'limites 5h/7d aparecem após a 1ª resposta', doneIn: 'em ' },
  buttons: { theme: 'tema', mascot: 'mascote', pet: 'interagir' },
  moods: {
    idle: 'à toa', sleep: 'cochilando', thinking: 'pensando', tool: 'mexendo', writing: 'escrevendo',
    happy: 'pronto!', error: 'ops', melting: 'derretendo', pet: 'feliz ♡',
  },
  tools: {
    edit: 'editando', create: 'criando', notebook: 'editando notebook', read: 'lendo', run: 'rodando comando',
    grep: 'buscando no código', glob: 'procurando arquivos', fetch: 'lendo página', search: 'pesquisando na web',
    agent: 'delegando a um agente', todo: 'organizando tarefas', skill: 'carregando skill',
    toolSearch: 'buscando ferramentas', use: (n, s) => (s ? `usando ${n} (${s})` : `usando ${n}`),
  },
  activity: {
    failed: d => `falhou: ${d}`, aborted: 'interrompido', refusal: 'recusou', apiError: 'erro na API',
    arrived: n => `${n} na área`,
  },
  alerts: {
    names: { ctx: 'Contexto', '5h': 'Limite de 5h', '7d': 'Limite semanal' },
    crossed: (n, p, l) => `✦ ${n} em ${p}% (passou de ${l}%)`,
  },
  custom: {
    toast: n => `✦ faisca-hud: ${n} personalização(ões) com erro — /faisca pasta`,
    cantRead: (d, w) => `não consegui ler ${d}: ${w}`,
    folder: 'Pasta de personalização',
    themes: 'temas',
    mascots: 'mascotes',
    none: 'nenhum',
    withErrors: 'Com erro (ignorados):',
    reloaded: '✦ Personalizações recarregadas.',
    created: '✦ Criei:',
    examplesExist: 'Os exemplos já existem na pasta.',
    examplesHint: 'Arquivos que começam com "_" são ignorados. Copie um exemplo para um nome sem "_"\n(ex. temas/meu-tema.json), edite e rode /faisca recarregar.',
    defaultDescription: 'mascote personalizado',
    err: {
      object: w => `${w} precisa ser um objeto`,
      text: w => `${w} precisa ser um texto`,
      hex: w => `${w} precisa ser uma cor "#rrggbb"`,
      colorOrList: w => `${w} precisa ser uma cor ou uma lista de cores`,
      empty: w => `${w} está vazio`,
      id: (w, s) => `${w} "${s}": use letras minúsculas, números e "-" (até 32)`,
      glyph: w => `${w} precisa ser um único caractere de largura 1`,
      rows: (w, m) => `${w} precisa ter de 1 a ${m} linhas`,
      tooLong: (w, n, m) => `${w} tem ${n} caracteres; o máximo é ${m}`,
      notNarrow: (w, c) => `${w}: "${c}" não tem largura 1 no terminal`,
      frames: w => `${w} precisa ser uma lista de quadros`,
      hold: w => `${w} precisa ser um inteiro de 1 a 200`,
      idleRequired: 'clips.idle é obrigatório',
      unknownMood: (k, l) => `clips.${k}: humor desconhecido (use ${l})`,
      json: m => `JSON inválido (${m})`,
    },
  },
  cmd: {
    description: 'Faísca HUD: tema, mascote, idioma, modo compacto, métricas e alertas',
    stumbled: 'A Faísca tropeçou nesse comando. Tente /faisca para ver as opções.',
    on: 'ligado',
    off: 'desligado',
    minimized: 'minimizada',
    full: 'completa',
    header: (t, m) => `✦ Faísca HUD — tema ${t}, ${m ? 'minimizada' : 'completa'}`,
    status: (m, mo, a, l, auto) => `  mascote ${m} (${mo}) · alertas ${a} · idioma ${l}${auto ? ' (automático)' : ''}`,
    metricsLine: '  métricas:',
    help: [
      ['tema [nome]', 'troca o tema (sem nome: lista os temas)'],
      ['mascote [nome]', 'troca o mascote (sem nome: lista os mascotes)'],
      ['mascote on|off', 'mostra ou esconde o mascote'],
      ['idioma [pt|en|es|auto]', 'idioma da faixa (auto: o do Claude Code)'],
      ['min | max', 'uma linha só | faixa completa'],
      ['metricas a,b,…', 'quais métricas mostrar (ctx, turno, 5h, 7d, custo, todas)'],
      ['alertas on|off', 'avisos ao passar de 80% e 90%'],
      ['spinner on|off', 'mostra ou esconde a linha "Pensando…" nativa'],
      ['pasta', 'onde ficam seus temas e mascotes, e o que foi carregado'],
      ['recarregar', 'relê seus temas e mascotes sem reiniciar'],
      ['exemplos', 'cria arquivos de exemplo na pasta para você copiar'],
      ['reset', 'volta tudo ao padrão'],
    ],
    keys: 'Na faixa (ctrl+x tab ou clique para focar): t tema · b mascote · l idioma · m minimizar · p interagir',
    unknownVerb: v => `Não conheço "${v}".`,
    noTheme: (a, l) => `Tema "${a}" não existe. Temas: ${l}`,
    themeSet: n => `✦ Tema: ${n}`,
    minSet: '✦ Faixa minimizada (o medidor continua visível).',
    maxSet: '✦ Faixa completa.',
    noMascot: (a, l) => `Mascote "${a}" não existe. Mascotes: ${l}`,
    mascotSet: (n, d) => `✦ Mascote: ${n} — ${d}`,
    mascotBack: n => `✦ ${n} voltou.`,
    mascotGone: n => `${n} saiu de cena (o medidor continua).`,
    alertsUsage: 'Use /faisca alertas on ou /faisca alertas off.',
    alertsOn: '✦ Alertas ligados.',
    alertsOff: 'Alertas desligados.',
    spinnerUsage: 'Use /faisca spinner on (mostra a linha nativa) ou off (esconde).',
    spinnerOn: 'Linha "Pensando…" nativa de volta.',
    spinnerOff: '✦ Linha nativa escondida: o estado fica na faixa.',
    metricsUsage: 'Diga quais: /faisca metricas ctx,turno,5h,7d,custo (ou todas).',
    metricsUnknown: (b, o) => `Métrica desconhecida: ${b}. Opções: ${o}.`,
    metricsSet: l => `✦ Métricas: ${l}`,
    metricsNone: 'nenhuma (o contexto segue no modo compacto)',
    langSet: n => `✦ Idioma: ${n}`,
    langAuto: n => `✦ Idioma automático (agora: ${n})`,
    langUsage: 'Use /faisca idioma pt, en, es ou auto.',
    reset: '✦ Preferências de volta ao padrão.',
  },
}

const en: Strings = {
  langName: 'English',
  verbs: {
    help: 'help', theme: 'theme', mascot: 'mascot', min: 'min', max: 'max', metrics: 'metrics',
    alerts: 'alerts', spinner: 'spinner', language: 'language', folder: 'folder', reload: 'reload',
    examples: 'examples', reset: 'reset',
  },
  metricNames: { ctx: 'ctx', turno: 'turn', '5h': '5h', '7d': '7d', custo: 'cost' },
  allWord: 'all',
  meter: { turn: 'turn', limitsPending: '5h/7d limits show up after the first reply', doneIn: 'in ' },
  buttons: { theme: 'theme', mascot: 'mascot', pet: 'interact' },
  moods: {
    idle: 'idle', sleep: 'napping', thinking: 'thinking', tool: 'working', writing: 'writing',
    happy: 'done!', error: 'oops', melting: 'melting', pet: 'happy ♡',
  },
  tools: {
    edit: 'editing', create: 'creating', notebook: 'editing notebook', read: 'reading', run: 'running command',
    grep: 'searching code', glob: 'finding files', fetch: 'reading page', search: 'searching the web',
    agent: 'delegating to an agent', todo: 'organizing tasks', skill: 'loading skill',
    toolSearch: 'finding tools', use: (n, s) => (s ? `using ${n} (${s})` : `using ${n}`),
  },
  activity: {
    failed: d => `failed: ${d}`, aborted: 'interrupted', refusal: 'refused', apiError: 'API error',
    arrived: n => `${n} is here`,
  },
  alerts: {
    names: { ctx: 'Context', '5h': '5-hour limit', '7d': 'Weekly limit' },
    crossed: (n, p, l) => `✦ ${n} at ${p}% (over ${l}%)`,
  },
  custom: {
    toast: n => `✦ faisca-hud: ${n} customization(s) with errors — /faisca folder`,
    cantRead: (d, w) => `could not read ${d}: ${w}`,
    folder: 'Customization folder',
    themes: 'themes',
    mascots: 'mascots',
    none: 'none',
    withErrors: 'With errors (skipped):',
    reloaded: '✦ Customizations reloaded.',
    created: '✦ Created:',
    examplesExist: 'The examples are already in the folder.',
    examplesHint: 'Files starting with "_" are ignored. Copy an example to a name without "_"\n(e.g. temas/my-theme.json), edit it and run /faisca reload.',
    defaultDescription: 'custom mascot',
    err: {
      object: w => `${w} must be an object`,
      text: w => `${w} must be a text`,
      hex: w => `${w} must be a "#rrggbb" color`,
      colorOrList: w => `${w} must be a color or a list of colors`,
      empty: w => `${w} is empty`,
      id: (w, s) => `${w} "${s}": use lowercase letters, digits and "-" (up to 32)`,
      glyph: w => `${w} must be a single character of width 1`,
      rows: (w, m) => `${w} must have 1 to ${m} lines`,
      tooLong: (w, n, m) => `${w} has ${n} characters; the maximum is ${m}`,
      notNarrow: (w, c) => `${w}: "${c}" is not 1 column wide in the terminal`,
      frames: w => `${w} must be a list of frames`,
      hold: w => `${w} must be an integer from 1 to 200`,
      idleRequired: 'clips.idle is required',
      unknownMood: (k, l) => `clips.${k}: unknown mood (use ${l})`,
      json: m => `invalid JSON (${m})`,
    },
  },
  cmd: {
    description: 'Faísca HUD: theme, mascot, language, compact mode, metrics and alerts',
    stumbled: 'Faísca tripped on that command. Try /faisca to see the options.',
    on: 'on',
    off: 'off',
    minimized: 'minimized',
    full: 'full',
    header: (t, m) => `✦ Faísca HUD — theme ${t}, ${m ? 'minimized' : 'full'}`,
    status: (m, mo, a, l, auto) => `  mascot ${m} (${mo}) · alerts ${a} · language ${l}${auto ? ' (automatic)' : ''}`,
    metricsLine: '  metrics:',
    help: [
      ['theme [name]', 'switch theme (no name: list themes)'],
      ['mascot [name]', 'switch mascot (no name: list mascots)'],
      ['mascot on|off', 'show or hide the mascot'],
      ['language [pt|en|es|auto]', 'band language (auto: Claude Code\'s)'],
      ['min | max', 'single line | full band'],
      ['metrics a,b,…', 'which metrics to show (ctx, turn, 5h, 7d, cost, all)'],
      ['alerts on|off', 'warnings past 80% and 90%'],
      ['spinner on|off', 'show or hide the native "Thinking…" line'],
      ['folder', 'where your themes and mascots live, and what was loaded'],
      ['reload', 'reread your themes and mascots without restarting'],
      ['examples', 'write example files to the folder for you to copy'],
      ['reset', 'back to defaults'],
    ],
    keys: 'On the band (ctrl+x tab or click to focus): t theme · b mascot · l language · m minimize · p interact',
    unknownVerb: v => `I don't know "${v}".`,
    noTheme: (a, l) => `Theme "${a}" doesn't exist. Themes: ${l}`,
    themeSet: n => `✦ Theme: ${n}`,
    minSet: '✦ Band minimized (the meter stays visible).',
    maxSet: '✦ Full band.',
    noMascot: (a, l) => `Mascot "${a}" doesn't exist. Mascots: ${l}`,
    mascotSet: (n, d) => `✦ Mascot: ${n} — ${d}`,
    mascotBack: n => `✦ ${n} is back.`,
    mascotGone: n => `${n} left the stage (the meter stays).`,
    alertsUsage: 'Use /faisca alerts on or /faisca alerts off.',
    alertsOn: '✦ Alerts on.',
    alertsOff: 'Alerts off.',
    spinnerUsage: 'Use /faisca spinner on (show the native line) or off (hide it).',
    spinnerOn: 'Native "Thinking…" line is back.',
    spinnerOff: '✦ Native line hidden: the status lives on the band.',
    metricsUsage: 'Say which: /faisca metrics ctx,turn,5h,7d,cost (or all).',
    metricsUnknown: (b, o) => `Unknown metric: ${b}. Options: ${o}.`,
    metricsSet: l => `✦ Metrics: ${l}`,
    metricsNone: 'none (context stays in compact mode)',
    langSet: n => `✦ Language: ${n}`,
    langAuto: n => `✦ Automatic language (now: ${n})`,
    langUsage: 'Use /faisca language pt, en, es or auto.',
    reset: '✦ Preferences back to defaults.',
  },
}

const es: Strings = {
  langName: 'Español',
  verbs: {
    help: 'ayuda', theme: 'tema', mascot: 'mascota', min: 'min', max: 'max', metrics: 'metricas',
    alerts: 'alertas', spinner: 'spinner', language: 'idioma', folder: 'carpeta', reload: 'recargar',
    examples: 'ejemplos', reset: 'reset',
  },
  metricNames: { ctx: 'ctx', turno: 'turno', '5h': '5h', '7d': '7d', custo: 'costo' },
  allWord: 'todo',
  meter: { turn: 'turno', limitsPending: 'los límites 5h/7d aparecen tras la 1.ª respuesta', doneIn: 'en ' },
  buttons: { theme: 'tema', mascot: 'mascota', pet: 'interactuar' },
  moods: {
    idle: 'ocioso', sleep: 'dormitando', thinking: 'pensando', tool: 'trabajando', writing: 'escribiendo',
    happy: '¡listo!', error: 'ups', melting: 'derritiéndose', pet: 'feliz ♡',
  },
  tools: {
    edit: 'editando', create: 'creando', notebook: 'editando notebook', read: 'leyendo', run: 'ejecutando comando',
    grep: 'buscando en el código', glob: 'buscando archivos', fetch: 'leyendo página', search: 'buscando en la web',
    agent: 'delegando a un agente', todo: 'organizando tareas', skill: 'cargando skill',
    toolSearch: 'buscando herramientas', use: (n, s) => (s ? `usando ${n} (${s})` : `usando ${n}`),
  },
  activity: {
    failed: d => `falló: ${d}`, aborted: 'interrumpido', refusal: 'se negó', apiError: 'error de API',
    arrived: n => `${n} llegó`,
  },
  alerts: {
    names: { ctx: 'Contexto', '5h': 'Límite de 5 h', '7d': 'Límite semanal' },
    crossed: (n, p, l) => `✦ ${n} en ${p}% (superó ${l}%)`,
  },
  custom: {
    toast: n => `✦ faisca-hud: ${n} personalización(es) con errores — /faisca carpeta`,
    cantRead: (d, w) => `no pude leer ${d}: ${w}`,
    folder: 'Carpeta de personalización',
    themes: 'temas',
    mascots: 'mascotas',
    none: 'ninguno',
    withErrors: 'Con errores (ignorados):',
    reloaded: '✦ Personalizaciones recargadas.',
    created: '✦ Creé:',
    examplesExist: 'Los ejemplos ya están en la carpeta.',
    examplesHint: 'Los archivos que empiezan con "_" se ignoran. Copia un ejemplo a un nombre sin "_"\n(p. ej. temas/mi-tema.json), edítalo y ejecuta /faisca recargar.',
    defaultDescription: 'mascota personalizada',
    err: {
      object: w => `${w} debe ser un objeto`,
      text: w => `${w} debe ser un texto`,
      hex: w => `${w} debe ser un color "#rrggbb"`,
      colorOrList: w => `${w} debe ser un color o una lista de colores`,
      empty: w => `${w} está vacío`,
      id: (w, s) => `${w} "${s}": usa minúsculas, números y "-" (hasta 32)`,
      glyph: w => `${w} debe ser un único carácter de ancho 1`,
      rows: (w, m) => `${w} debe tener de 1 a ${m} líneas`,
      tooLong: (w, n, m) => `${w} tiene ${n} caracteres; el máximo es ${m}`,
      notNarrow: (w, c) => `${w}: "${c}" no ocupa 1 columna en la terminal`,
      frames: w => `${w} debe ser una lista de cuadros`,
      hold: w => `${w} debe ser un entero de 1 a 200`,
      idleRequired: 'clips.idle es obligatorio',
      unknownMood: (k, l) => `clips.${k}: estado desconocido (usa ${l})`,
      json: m => `JSON inválido (${m})`,
    },
  },
  cmd: {
    description: 'Faísca HUD: tema, mascota, idioma, modo compacto, métricas y alertas',
    stumbled: 'Faísca tropezó con ese comando. Prueba /faisca para ver las opciones.',
    on: 'activado',
    off: 'desactivado',
    minimized: 'minimizada',
    full: 'completa',
    header: (t, m) => `✦ Faísca HUD — tema ${t}, ${m ? 'minimizada' : 'completa'}`,
    status: (m, mo, a, l, auto) => `  mascota ${m} (${mo}) · alertas ${a} · idioma ${l}${auto ? ' (automático)' : ''}`,
    metricsLine: '  métricas:',
    help: [
      ['tema [nombre]', 'cambia el tema (sin nombre: lista los temas)'],
      ['mascota [nombre]', 'cambia la mascota (sin nombre: lista las mascotas)'],
      ['mascota on|off', 'muestra u oculta la mascota'],
      ['idioma [pt|en|es|auto]', 'idioma de la barra (auto: el de Claude Code)'],
      ['min | max', 'una sola línea | barra completa'],
      ['metricas a,b,…', 'qué métricas mostrar (ctx, turno, 5h, 7d, costo, todo)'],
      ['alertas on|off', 'avisos al pasar del 80% y del 90%'],
      ['spinner on|off', 'muestra u oculta la línea nativa "Pensando…"'],
      ['carpeta', 'dónde están tus temas y mascotas, y qué se cargó'],
      ['recargar', 'vuelve a leer tus temas y mascotas sin reiniciar'],
      ['ejemplos', 'crea archivos de ejemplo en la carpeta para que los copies'],
      ['reset', 'vuelve todo a los valores por defecto'],
    ],
    keys: 'En la barra (ctrl+x tab o clic para enfocar): t tema · b mascota · l idioma · m minimizar · p interactuar',
    unknownVerb: v => `No conozco "${v}".`,
    noTheme: (a, l) => `El tema "${a}" no existe. Temas: ${l}`,
    themeSet: n => `✦ Tema: ${n}`,
    minSet: '✦ Barra minimizada (el medidor sigue visible).',
    maxSet: '✦ Barra completa.',
    noMascot: (a, l) => `La mascota "${a}" no existe. Mascotas: ${l}`,
    mascotSet: (n, d) => `✦ Mascota: ${n} — ${d}`,
    mascotBack: n => `✦ ${n} volvió.`,
    mascotGone: n => `${n} salió de escena (el medidor sigue).`,
    alertsUsage: 'Usa /faisca alertas on o /faisca alertas off.',
    alertsOn: '✦ Alertas activadas.',
    alertsOff: 'Alertas desactivadas.',
    spinnerUsage: 'Usa /faisca spinner on (muestra la línea nativa) u off (la oculta).',
    spinnerOn: 'La línea nativa "Pensando…" volvió.',
    spinnerOff: '✦ Línea nativa oculta: el estado queda en la barra.',
    metricsUsage: 'Di cuáles: /faisca metricas ctx,turno,5h,7d,costo (o todo).',
    metricsUnknown: (b, o) => `Métrica desconocida: ${b}. Opciones: ${o}.`,
    metricsSet: l => `✦ Métricas: ${l}`,
    metricsNone: 'ninguna (el contexto sigue en modo compacto)',
    langSet: n => `✦ Idioma: ${n}`,
    langAuto: n => `✦ Idioma automático (ahora: ${n})`,
    langUsage: 'Usa /faisca idioma pt, en, es o auto.',
    reset: '✦ Preferencias de vuelta a los valores por defecto.',
  },
}

const STRINGS: Record<Lang, Strings> = { pt, en, es }

export function t(lang: Lang): Strings {
  return STRINGS[lang]
}
