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

Quer outro? Crie o seu — veja [Personalizar](#personalizar-temas-e-mascotes).

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
- `/faisca pasta` · `/faisca exemplos` · `/faisca recarregar` — seus temas e
  mascotes (veja abaixo).

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

## Personalizar: temas e mascotes

Você não precisa mexer no código nem fazer fork: o mod lê temas e mascotes
seus de uma pasta, em arquivos `.json`.

```
~/.claude/faisca-hud/
├── temas/       meu-tema.json, outro.json …
└── mascotes/    meu-mascote.json …
```

No Windows, `~` é `C:\Users\<você>`. Se você usa `CLAUDE_CONFIG_DIR`, a pasta é
`$CLAUDE_CONFIG_DIR/faisca-hud`. `/faisca pasta` mostra o caminho exato e o que
foi carregado.

**Passo a passo:**

1. `/faisca exemplos` — cria `temas/_exemplo-tema.json` e
   `mascotes/_exemplo-mascote.json` na pasta. Arquivos que começam com `_` são
   ignorados: são só modelos.
2. Copie o exemplo para um nome sem `_` (ex. `mascotes/robo.json`) e edite.
3. `/faisca recarregar` — lê de novo sem reiniciar a sessão. Se algo estiver
   errado, um aviso aparece e `/faisca pasta` diz o arquivo, o campo e o
   motivo; os outros arquivos continuam valendo.
4. Escolha com `/faisca tema <id>` / `/faisca mascote <id>` (ou `t` / `b` na
   faixa).

Um `id` igual ao de um tema ou mascote embutido **substitui** o embutido — dá
para ajustar o `nord` do seu jeito, por exemplo.

### Formato de um tema

```json
{
  "id": "meu-tema",
  "name": "Meu tema",
  "palette": {
    "fg": "#e6e6e6",
    "dim": "#6b6b6b",
    "accent": "#ff8c42",
    "accent2": "#4fc3f7",
    "ok": "#81c784",
    "warn": "#ffd54f",
    "danger": "#e57373"
  },
  "barGradient": ["#4fc3f7", "#ff8c42"],
  "glyphs": { "full": "█", "empty": "░", "sep": "·", "spark": "✦" },
  "mascot": {
    "body": ["#ffb074", "#ff8c42", "#d9672a"],
    "face": "#ffffff",
    "spark": ["#4fc3f7", "#ffd54f"],
    "error": "#e57373",
    "errorSpark": "#6b6b6b"
  }
}
```

| Campo | Obrigatório | O que é |
|---|---|---|
| `id` | sim | letras minúsculas, números e `-` (até 32) |
| `name` | sim | o nome que aparece em `/faisca tema` |
| `palette.fg` / `dim` | sim | texto normal / texto apagado e parte vazia das barras |
| `palette.accent` / `accent2` | `accent` sim | destaques (nome do mascote, tokens, custo); `accent2` usa `accent` se faltar |
| `palette.ok` / `warn` / `danger` | sim | cor do % abaixo de 70%, de 70% e de 90% |
| `barGradient` | não | cores do começo ao fim de uma barra cheia (interpoladas) |
| `glyphs` | não | `full`/`empty` da barra, `sep` e `spark`; um caractere cada |
| `mascot.body` | não | uma cor, ou uma por linha do mascote (de cima para baixo) |
| `mascot.face` | não | olhos/boca (os caracteres que o mascote marca como `face`) |
| `mascot.spark` | não | uma cor ou uma lista que cintila nas faíscas |
| `mascot.error` / `errorSpark` | não | corpo e faíscas quando algo falha |

Cores sempre em `#rrggbb`.

### Formato de um mascote

O mascote ocupa **3 linhas × 11 colunas**. Cada humor é uma lista de quadros;
`hold` é quantos ticks (~150 ms) o quadro fica na tela.

```json
{
  "id": "meu-mascote",
  "name": "Quadrado",
  "description": "um bloquinho que pisca",
  "petLabel": "cutucar",
  "sparks": "*·!?z",
  "face": "o-^x",
  "labels": { "thinking": "matutando", "happy": "feito!" },
  "colors": { "nord": { "body": "#88c0d0" } },
  "clips": {
    "idle": [
      { "frame": ["   ┌───┐", "   │o o│", "   └───┘"], "hold": 12 },
      { "frame": ["   ┌───┐", "   │- -│", "   └───┘"], "hold": 1 }
    ],
    "thinking": [
      { "frame": ["   ┌───┐ ?", "   │o o│", "   └───┘"], "hold": 3 },
      { "frame": ["   ┌───┐  ", "   │o o│ ?", "   └───┘"], "hold": 3 }
    ],
    "happy": [{ "frame": ["   ┌───┐ !", "   │^ ^│", "   └───┘"], "hold": 3 }],
    "error": [{ "frame": ["   ┌───┐", "   │x x│", "   └───┘"], "hold": 3 }]
  },
  "mini": { "idle": "[o o]", "happy": "[^ ^]", "error": "[x x]" }
}
```

| Campo | Obrigatório | O que é |
|---|---|---|
| `id` / `name` | sim | como o do tema; `name` aparece embaixo do mascote |
| `clips.idle` | sim | a animação de repouso; **todo humor que faltar usa ela** |
| `clips.<humor>` | não | `sleep`, `thinking`, `tool`, `writing`, `happy`, `error`, `melting`, `pet` (tabela de humores acima) |
| `frame` | — | 1 a 3 linhas de até 11 caracteres; linhas curtas são completadas com espaço |
| `hold` | não | 1 a 200 ticks (padrão 2) |
| `sparks` | não | caracteres pintados como faísca/efeito (padrão `✦✧·*`) |
| `face` | não | caracteres pintados como rosto; todo o resto é corpo |
| `labels` | não | o texto de cada humor ao lado da faísca (`"pet": "oi!"`) |
| `petLabel` | não | o nome do botão `p` (padrão `interagir`) |
| `mini` | não | versão de uma linha por humor, para o modo compacto (padrão: `mini.idle` ou o nome) |
| `colors` | não | cores fixas do mascote **num tema específico**, por parte: `{ "<id do tema>": { "body": "#…", "face": "#…", "spark": "#…" } }` |

**Regras dos caracteres:** só caracteres que ocupam **uma coluna** no terminal
— letras, números, pontuação, desenho de caixa (`┌─┐│└┘`), blocos
(`█▀▄▌▐▛▜▝▘▗▖`), `✦ ✓ ·`. Emojis e caracteres largos (CJK, fullwidth) são
recusados com a linha e o caractere exatos no erro.

**Dicas:** comece só com `idle` e vá adicionando humores; dois quadros com
`hold` alto + um quadro de `hold: 1` já dão uma piscada convincente; para o
mascote "andar", desloque o desenho uma coluna entre quadros.

### Levar entre computadores

A pasta `~/.claude/faisca-hud/` é sua: versione-a junto com o resto da sua
configuração do Claude Code (dotfiles) ou copie para a outra máquina. O mod
instalado é o mesmo em todo lugar; só a pasta muda.

## Contribuir com um tema ou mascote embutido

Para propor um tema/mascote que venha com o mod: copie um de
`hooks/themes/*.ts` ou `hooks/mascot/mascots/*.ts`, registre em
`hooks/themes/index.ts` / `hooks/mascot/index.ts`, rode `claude plugin test .`
(o teste de quadros acusa qualquer linha com largura errada) e abra um PR.

## Estrutura

```
hooks/register.tsx      eventos → estado, faixa (ui.render AbovePrompt), /faisca, animador
hooks/meter.ts          linhas do medidor (trechos coloridos, puro)
hooks/usage.ts          normalização e formatação de uso
hooks/alerts.ts         limiares 80/90 com rearme
hooks/state.ts          preferências padrão e merge
hooks/custom.ts         temas e mascotes do usuário (JSON): validação e exemplos
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
