# ✦ faisca-hud

Mod de interface para o [Claude Code](https://claude.com/claude-code): uma
faixa logo acima do prompt com o **medidor de tokens sempre visível** e um
**mascote ASCII animado** que reage ao que o Claude está fazendo — pensando,
lendo, editando, terminando ou errando. 6 temas, 4 mascotes, tudo trocável.

```
  ┌─┴─┐     ctx ▰▰▰▰▰▰▱▱▱▱ 58%  116k/200k  ·  turno ↑12.1k ↓2.3k ⟲98k
  │■ ■│     5h ▰▰▱▱▱▱▱▱ 21% 2h14   7d ▰▱▱▱▱▱▱▱ 9% 4d   $1.82
  └┬─┬┘     ✦ editando meter.ts… 47s  Edit ×2  Bash ×3   t: tema  b: mascote  m: min  p: calibrar
   Bit
```

> Projeto independente da comunidade, sem vínculo com a Anthropic.

## Instalação

Requer **Claude Code 2.1.300 ou mais novo** (a API de mods é *early access* e
pode mudar entre versões).

No prompt de uma sessão do Claude Code no terminal:

```
/plugin install faisca-hud --marketplace BannedCclo/faisca-hud
```

Responda `y` para adicionar o marketplace e escolha o escopo (usuário é o
padrão). A faixa aparece na hora.

Pelo shell:

```
claude plugin install faisca-hud --marketplace BannedCclo/faisca-hud
```

No app desktop (onde `/plugin` não roda): clique no **+** ao lado da caixa de
prompt → **Plugins** → **Add marketplace** com `BannedCclo/faisca-hud` → **Add
plugin**.

Para começar: digite `/faisca` para ver as opções.

## O que mostra

| Métrica | De onde vem |
|---|---|
| `ctx` — janela de contexto (% e tokens/limite) | `$.session.usage()` / `session.measure` |
| `turno` — ↑ entrada (+ escrita de cache), ↓ saída, ⟲ leitura de cache | cada `turn.step` ao vivo; `turn.complete` fecha o total |
| `5h` / `7d` — limites da assinatura + tempo até resetar | `rateLimits` da última resposta |
| `custo` — US$ da sessão | `cost.usd` |

A barra esquenta de cor a partir de 70% e 90%. Toasts avisam ao cruzar 80% e
90% (contexto, 5h, 7d), uma vez por cruzamento — rearmam quando o valor cai
(ex. depois de `/compact`).

## Mascotes

Troque com `b` na faixa ou `/faisca mascote <nome>` (sem nome, lista todos).

| id | Mascote | Visual | Interação (`p`) |
|---|---|---|---|
| `bit` (padrão) | **Bit** — robô de manutenção | `┌─┴─┐ │■ ■│ └┬─┬┘`, LEDs, antena, braços mecânicos | calibrar |
| `rex` | **Rex** — T-rex de pixel | `▄▀█▄ / ▄███▀▀`, corre enquanto o Claude trabalha | rugir |
| `kage` | **Kage** — ninja de capuz | `▄█████▄~ / █ ▬ ▬ █`, olhos em fenda, golpes de lâmina | saudar |
| `faisca` | **Faísca** — espírito de terminal | `.✦. / ( ◕‿◕ )`, cintila e solta faíscas | carinho |

Cada mascote tem rótulos próprios por humor (o Bit "compila" e "superaquece",
o Rex "caça" e fica "hibernando"). Enquanto uma ferramenta roda, a faixa diz
o que está acontecendo: `editando meter.ts…`, `rodando comando…`,
`buscando no código…`.

**Criar um mascote:** copie `hooks/mascot/mascots/bit.ts`, desenhe os 9 clipes
(3 linhas × 11 colunas, glifos de largura 1), defina `sparks`/`face` (quais
caracteres pintar como efeito/rosto) e registre em `hooks/mascot/index.ts`. O
teste de quadros acusa qualquer linha com largura errada.

## Humores

| Humor | Quando |
|---|---|
| à toa | sem turno; respira, cintila e pisca |
| cochilando | ociosa há mais de 2 min |
| pensando | turno começou; faísca orbitando |
| mexendo | ferramenta de leitura/execução (Read, Bash, Grep…) |
| escrevendo | Edit / Write / NotebookEdit — martelando |
| pronto! | turno terminou bem — pulinho |
| ops | ferramenta falhou, recusa ou erro de API |
| derretendo | contexto ≥ 85% |
| feliz ♡ | você fez carinho (`p`) |

No terminal o mascote é um `Raster` animado a ~7 quadros/s via `$.ui.blit`
(sem redesenhar a faixa); nas outras superfícies, um quadro estático.

## Controles

- Na faixa (foque com `ctrl+x tab` ou clique): `t` cicla o tema, `b` troca o
  mascote, `m` minimiza/maximiza, `p` interage com o mascote.
- `/faisca` — mostra estado e ajuda.
- `/faisca tema [nome]` · `/faisca mascote [nome|on|off]` · `/faisca min|max` ·
  `/faisca metricas ctx,turno,5h,7d,custo|todas` · `/faisca alertas on|off` ·
  `/faisca spinner on|off` · `/faisca reset`

Com o mod ativo, a linha nativa `✻ Pensando… (12s · ↓ tokens · esc to
interrupt)` do Claude Code some no terminal: o estado e o tempo do turno ficam
na faixa (`processando… 12s`, e ao terminar `concluído ✓ em 34s`). `Esc`
continua interrompendo normalmente. `/faisca spinner on` traz a linha de volta.

Preferências ficam em `$.store` (persistem entre sessões). Minimizada — ou em
terminal com menos de 70 colunas — a faixa vira uma linha só, mas o medidor de
contexto nunca some.

## Temas

Troque com `t` na faixa ou `/faisca tema <id>` (sem id, lista todos).

| id | Tema | Barra | Clima |
|---|---|---|---|
| `synthwave` (padrão) | Synthwave neon | `▰▱` | magenta → roxo → ciano, faíscas amarelo-sol |
| `terracota` | Terracota quente | `●○` | argila, areia e ferrugem |
| `crt` | CRT Fósforo | `█░` | verde de monitor antigo, varredura que percorre o mascote |
| `nord` | Nord | `━─` | azul-gelo da paleta Nord, aurora para alertas |
| `dracula` | Drácula | `▮▯` | roxo, rosa e verde neon da paleta Dracula |
| `gruvbox` | Gruvbox | `■□` | amarelo, laranja e aqua terrosos do Gruvbox |

## Criar um tema

1. Copie `hooks/themes/terracota.ts` para `hooks/themes/<id>.ts` e ajuste
   `palette`, `barGradient`, `glyphs` e `mascotColor` (cor por célula do
   mascote: `part` é `body`, `face` ou `spark`; `tick` serve para cintilar).
2. Em `hooks/themes/index.ts`, importe e chame `registerTheme(<seu tema>)`.
3. `claude plugin test <pasta>` — o teste de registro lista os ids esperados;
   atualize-o.

Glifos precisam ter largura 1 (o `Raster` recusa caracteres largos).

## Estrutura

```
hooks/register.tsx      eventos → estado, faixa (ui.render AbovePrompt), /faisca, animador
hooks/meter.ts          linhas do medidor (trechos coloridos, puro)
hooks/usage.ts          normalização e formatação de uso
hooks/alerts.ts         limiares 80/90 com rearme
hooks/state.ts          preferências padrão e merge
hooks/themes/           registro de temas + synthwave, terracota, crt, nord, dracula, gruvbox
hooks/mascot/           registro de mascotes (bit, rex, kage, faisca), humores, codificador do Raster
types/index.d.ts        contrato de $.state
tests/                  claude plugin test
```

## Desenvolvimento

```
claude plugin validate <pasta>
claude plugin test <pasta>
tsc -p <pasta>            # depois que o engine carregou o mod uma vez
claude --plugin-dir <pasta>
```
