import { expect, mock, test } from 'claude-code/testing'

const band = (bodyColumns: number) =>
  ({
    plugin: 'faisca-hud',
    component: 'AbovePrompt',
    props: {
      hasSurvey: false,
      isWorking: false,
      maxRows: 12,
      bodyColumns,
      scroll: { offset: 0, bodyRows: 12 },
      view: {},
    },
  }) as const

test('a faixa desenha medidor, mascote e botões em toda superfície', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ surface, ...band(110) })
    expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /turn/ })).toBeDefined()
    expect(await ui.find({ key: 'tema' })).toBeDefined()
    expect(await ui.find({ key: 'carinho' })).toBeDefined()
    if (surface === 'terminal') expect(await ui.find({ type: 'Raster', key: 'faisca' })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /^Bit$/ }))?.text).toBe('Bit')
    await ui.unmount()
  }
})

test('a linha nativa "Pensando…" some no terminal', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const ui = await $.ui.mount({
    plugin: 'faisca-hud',
    surface: 'terminal',
    component: 'Spinner',
    props: { word: 'Pensando', message: null, suffix: '…', mode: 'thinking' },
  })
  expect(await ui.drawn()).toMatchObject({ type: 'Box', props: { display: 'none' } })
  expect(await ui.find({ type: 'Text', text: /Pensando/ })).toBeUndefined()
  await ui.unmount()
})

test('minimizar mantém o medidor e troca o botão para max', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const ui = await $.ui.mount({ surface: 'terminal', ...band(110) })
  await ui.press({ key: 'min' })
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
  expect(await ui.find({ type: 'Raster' })).toBeUndefined()
  expect((await ui.find({ key: 'min' }))?.text).toContain('max')
  await ui.press({ key: 'min' })
  expect(await ui.find({ type: 'Raster', key: 'faisca' })).toBeDefined()
  await ui.unmount()
})

test('terminal estreito cai para uma linha', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const ui = await $.ui.mount({ surface: 'terminal', ...band(50) })
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
  expect(await ui.find({ type: 'Raster' })).toBeUndefined()
  await ui.unmount()
})

test('trocar o tema e interagir redesenham sem recusa', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const ui = await $.ui.mount({ surface: 'terminal', ...band(110) })
  await ui.press({ key: 'tema' })
  // O padrão é o robô Bit e, sem settings, o inglês: o botão é "calibrate".
  expect((await ui.find({ key: 'carinho' }))?.text).toContain('calibrate')
  await ui.press({ key: 'carinho' })
  expect(await ui.find({ type: 'Text', text: /recalibrated/ })).toBeDefined()
  await ui.drawn()
  await ui.unmount()
})

test('o botão mascote percorre todos e cada um desenha sem recusa', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const ui = await $.ui.mount({ surface: 'terminal', ...band(110) })
  const labels: string[] = []
  for (let i = 0; i < 4; i++) {
    await ui.press({ key: 'mascote' })
    await ui.drawn()
    expect(await ui.find({ type: 'Raster', key: 'faisca' })).toBeDefined()
    labels.push((await ui.find({ key: 'carinho' }))?.text ?? '')
  }
  expect(labels.map(l => l.replace(/^p:\s*/, ''))).toEqual(
    expect.arrayContaining([expect.stringContaining('roar'), expect.stringContaining('salute'), expect.stringContaining('pet'), expect.stringContaining('calibrate')]),
  )
  await ui.unmount()
})

test('o botão de idioma alterna EN → ES → PT e traduz a faixa na hora', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const ui = await $.ui.mount({ surface: 'terminal', ...band(110) })
  const label = async (key: string) => (await ui.find({ key }))?.text ?? ''
  expect(await label('idioma')).toContain('EN')
  expect(await label('mascote')).toContain('mascot')

  await ui.press({ key: 'idioma' })
  expect(await label('idioma')).toContain('ES')
  expect(await label('mascote')).toContain('mascota')
  expect(await label('carinho')).toContain('calibrar')
  expect(await ui.find({ type: 'Text', text: /ahorro de energía/ })).toBeDefined()

  await ui.press({ key: 'idioma' })
  expect(await label('idioma')).toContain('PT')
  expect(await label('mascote')).toContain('mascote')
  expect(await ui.find({ type: 'Text', text: /modo economia/ })).toBeDefined()

  await ui.press({ key: 'idioma' })
  expect(await label('idioma')).toContain('EN')
  expect(await ui.find({ type: 'Text', text: /power saving/ })).toBeDefined()
  await ui.unmount()
})

test('modo compacto também tem o botão de idioma', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const ui = await $.ui.mount({ surface: 'terminal', ...band(50) })
  expect(await ui.find({ key: 'idioma' })).toBeDefined()
  await ui.press({ key: 'idioma' })
  expect((await ui.find({ key: 'tema' }))?.text).toContain('tema')
  await ui.unmount()
})
