# ✦ faisca-hud

A UI mod for [Claude Code](https://claude.com/claude-code): a band right above
the prompt with an **always-visible token meter** and an **animated ASCII
mascot** that reacts to what Claude is doing — thinking, reading, editing,
finishing or failing. 6 themes, 4 mascots, 3 languages, all switchable — and
you can add your own themes and mascots without touching the code.

```
    .✦.     ctx ▰▰▰▰▰▰▱▱▱▱ 58%  116k/200k  ·  turn ↑12.1k ↓2.3k ⟲98k
  ( ◕‿◕ )   5h ▰▰▱▱▱▱▱▱ 21% 2h14   7d ▰▱▱▱▱▱▱▱ 9% 4d   $1.82
  /  ~  \   ✦ editing meter.ts… 47s  Edit ×2  Bash ×3   t: theme  b: mascot  l: EN  m: min  p: pet
   Faísca
```

> Independent community project, not affiliated with Anthropic.

## Install

Requires **Claude Code 2.1.300 or newer** (the mod API is *early access* and
may change between versions).

At the prompt of a Claude Code terminal session:

```
/plugin install faisca-hud --marketplace BannedCclo/faisca-hud
```

Answer `y` to add the marketplace and pick a scope (user is the default). The
band shows up right away.

From a shell:

```
claude plugin install faisca-hud --marketplace BannedCclo/faisca-hud
```

In the desktop app (where `/plugin` doesn't run): click **+** next to the
prompt box → **Plugins** → **Add marketplace** with `BannedCclo/faisca-hud` →
**Add plugin**.

To update: `claude plugin update faisca-hud`. To get started, type `/faisca`.

## Languages

The band and `/faisca` speak **Português**, **English** and **Español**. By
default (`auto`) the mod follows the `language` setting of Claude Code (falling
back to `LANG`, then English). Switch with `l` on the band (cycles PT → EN →
ES) or `/faisca language pt|en|es|auto`. Subcommands work in any of the three
languages (`/faisca theme`, `/faisca tema`, …).

## What it shows

| Metric | Source |
|---|---|
| `ctx` — context window (% and tokens/limit) | `$.session.usage()` / `session.measure` |
| `turn` — ↑ input (+ cache writes), ↓ output, ⟲ cache reads | every `turn.step` live; `turn.complete` sets the final total |
| `5h` / `7d` — subscription limits + time until reset | `rateLimits` of the latest response |
| `5h` also shows the tokens spent in the current 5h window (input + cache write + output) | summed per request, restarts when `resetsAt` changes |
| `cost` — session cost in US$ | `cost.usd` |

Bars change color at 70% and 90%. Toasts warn when you cross 80% and 90%
(context, 5h, 7d), once per crossing — they re-arm when the value drops (e.g.
after `/compact`).

Next to the mascot, the band says what is happening in plain words —
`editing meter.ts…`, `running command…`, `searching code…` — plus the time the
turn has been running (`47s`), and how long it took when it ends
(`done ✓ in 1m12s`). While the mod is active, Claude Code's native
`✻ Thinking… (12s · ↓ tokens · esc to interrupt)` line is hidden in the
terminal, since the band already says it; `Esc` still interrupts as usual.
`/faisca spinner on` brings the native line back.

## Mascots

Switch with `b` on the band or `/faisca mascot <id>` (no id: list them all).

| id | Mascot | Look | Button `p` |
|---|---|---|---|
| `faisca` (default) | **Faísca** — terminal spirit | `.✦. / ( ◕‿◕ )`, twinkles, throws sparks and melts when context fills up | pet |
| `bit` | **Bit** — maintenance robot | `┌─┴─┐ │■ ■│ └┬─┬┘`, LEDs, antenna, mechanical arms | calibrate |
| `rex` | **Rex** — pixel T-rex | `▄▀█▄ / ▄███▀▀`, runs while Claude works | roar |
| `kage` | **Kage** — hooded ninja | `▄█████▄~ / █ ▬ ▬ █`, slit eyes, blade strikes | salute |

Each mascot has its own words per mood (Bit is "compiling" and "overheating",
Rex is "hunting" and "hibernating"). Want another one? Make your own — see
[Customize](#customize-themes-and-mascots).

## Moods

| Mood (`id`) | When |
|---|---|
| idle (`idle`) | no turn running; breathes, twinkles and blinks |
| napping (`sleep`) | idle for more than 2 minutes |
| thinking (`thinking`) | a turn started |
| working (`tool`) | a read/run tool (Read, Bash, Grep…) |
| writing (`writing`) | Edit / Write / NotebookEdit |
| done (`happy`) | the turn ended well — a little jump |
| oops (`error`) | a tool failed, a refusal or an API error |
| melting (`melting`) | context ≥ 85% |
| happy ♡ (`pet`) | you pressed `p` |

In the terminal the mascot is a `Raster` animated at ~7 fps through
`$.ui.blit` (no band redraw); on other surfaces, a static frame.

## Controls

- On the band (focus it with `ctrl+x tab` or a click): `t` cycles the theme,
  `b` the mascot, `l` the language, `m` minimizes/maximizes, `p` interacts with
  the mascot.
- `/faisca` — status and help.
- `/faisca theme [id]` · `/faisca mascot [id|on|off]` ·
  `/faisca language [pt|en|es|auto]` · `/faisca min|max` ·
  `/faisca metrics ctx,turn,5h,7d,cost|all` · `/faisca alerts on|off` ·
  `/faisca spinner on|off` · `/faisca reset`
- `/faisca folder` · `/faisca examples` · `/faisca reload` — your own themes
  and mascots (see below).

Preferences are stored with `$.store` (they persist across sessions). When
minimized — or in a terminal narrower than 70 columns — the band collapses to
a single line, but the context meter never goes away.

## Themes

Switch with `t` on the band or `/faisca theme <id>` (no id: list them all).

| id | Theme | Bar | Mood |
|---|---|---|---|
| `synthwave` (default) | Synthwave neon | `▰▱` | magenta → purple → cyan, sun-yellow sparks |
| `terracota` | Warm terracotta | `●○` | clay, sand and rust |
| `crt` | CRT Phosphor | `█░` | old-monitor green, a scanline sweeping the mascot |
| `nord` | Nord | `━─` | ice blue from the Nord palette, aurora for alerts |
| `dracula` | Dracula | `▮▯` | purple, pink and neon green from the Dracula palette |
| `gruvbox` | Gruvbox | `■□` | earthy yellow, orange and aqua from Gruvbox |

## Customize: themes and mascots

No code changes or forks needed: the mod reads your themes and mascots from a
folder, as `.json` files.

```
~/.claude/faisca-hud/
├── temas/       my-theme.json, another.json …
└── mascotes/    my-mascot.json …
```

(The subfolder names are `temas` and `mascotes` in every language.) On
Windows, `~` is `C:\Users\<you>`. If you use `CLAUDE_CONFIG_DIR`, the folder is
`$CLAUDE_CONFIG_DIR/faisca-hud`. `/faisca folder` shows the exact path and what
was loaded.

**Step by step:**

1. `/faisca examples` — writes `temas/_exemplo-tema.json` and
   `mascotes/_exemplo-mascote.json` into the folder. Files starting with `_` are
   ignored: they are just templates.
2. Copy an example to a name without `_` (e.g. `mascotes/robot.json`) and edit
   it.
3. `/faisca reload` — reads everything again without restarting the session.
   If something is wrong, a toast shows up and `/faisca folder` tells you the
   file, the field and the reason (in your language); every other file keeps
   working.
4. Pick it with `/faisca theme <id>` / `/faisca mascot <id>` (or `t` / `b` on
   the band).

An `id` equal to a built-in theme or mascot **replaces** the built-in one — you
can tweak `nord` your way, for example.

### Texts in several languages

Every text a person reads — a theme's `name`, a mascot's `description`,
`petLabel` and each `labels` entry — can be a plain string (used in every
language) or one string per language:

```json
"petLabel": { "en": "poke", "pt": "cutucar", "es": "pinchar" }
```

A missing language falls back to English, then Portuguese, then whichever is
present. Mascot `name`s are proper names and stay a single string.

### Theme format

```json
{
  "id": "my-theme",
  "name": { "en": "My theme", "pt": "Meu tema", "es": "Mi tema" },
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

| Field | Required | What it is |
|---|---|---|
| `id` | yes | lowercase letters, digits and `-` (up to 32) |
| `name` | yes | shown by `/faisca theme`; text or per-language texts |
| `palette.fg` / `dim` | yes | regular text / dimmed text and the empty part of bars |
| `palette.accent` / `accent2` | `accent` yes | highlights (mascot name, tokens, cost); `accent2` falls back to `accent` |
| `palette.ok` / `warn` / `danger` | yes | color of the % below 70%, from 70% and from 90% |
| `barGradient` | no | colors from the start to the end of a full bar (interpolated) |
| `glyphs` | no | `full`/`empty` for bars, `sep` and `spark`; one character each |
| `mascot.body` | no | one color, or one per mascot line (top to bottom) |
| `mascot.face` | no | eyes/mouth (the characters the mascot marks as `face`) |
| `mascot.spark` | no | one color or a list that twinkles on sparks |
| `mascot.error` / `errorSpark` | no | body and sparks when something fails |

Colors are always `#rrggbb`.

### Mascot format

A mascot takes **3 lines × 11 columns**. Each mood is a list of frames; `hold`
is how many ticks (~150 ms) the frame stays on screen.

```json
{
  "id": "my-mascot",
  "name": "Cube",
  "description": { "en": "a little block that blinks", "pt": "um bloquinho que pisca" },
  "petLabel": { "en": "poke", "pt": "cutucar", "es": "pinchar" },
  "sparks": "*·!?z",
  "face": "o-^x",
  "labels": {
    "thinking": { "en": "pondering", "pt": "matutando", "es": "cavilando" },
    "happy": "done!"
  },
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

| Field | Required | What it is |
|---|---|---|
| `id` / `name` | yes | like a theme's; `name` is shown under the mascot |
| `clips.idle` | yes | the resting animation; **every missing mood uses it** |
| `clips.<mood>` | no | `sleep`, `thinking`, `tool`, `writing`, `happy`, `error`, `melting`, `pet` (see [Moods](#moods)) |
| `frame` | — | 1 to 3 lines of up to 11 characters; short lines are padded with spaces |
| `hold` | no | 1 to 200 ticks (default 2) |
| `sparks` | no | characters painted as sparks/effects (default `✦✧·*`) |
| `face` | no | characters painted as the face; everything else is the body |
| `labels` | no | the text next to the spark for each mood |
| `petLabel` | no | the `p` button's name (default: "interact" in the current language) |
| `description` | no | shown by `/faisca mascot` |
| `mini` | no | one-line version per mood, for compact mode (default: `mini.idle` or the name) |
| `colors` | no | fixed mascot colors **for a specific theme**, per part: `{ "<theme id>": { "body": "#…", "face": "#…", "spark": "#…" } }` |

**Character rules:** only characters that take **one column** in the terminal
— letters, digits, punctuation, box drawing (`┌─┐│└┘`), blocks
(`█▀▄▌▐▛▜▝▘▗▖`), `✦ ✓ ·`. Emoji and wide characters (CJK, fullwidth) are
rejected, and the error names the exact line and character.

**Tips:** start with `idle` only and add moods one by one; two frames with a
long `hold` plus one with `hold: 1` already make a convincing blink; to make
the mascot "walk", shift the drawing one column between frames.

### Taking it to other computers

`~/.claude/faisca-hud/` is yours: version it along with the rest of your
Claude Code configuration (dotfiles) or copy it to the other machine. The
installed mod is the same everywhere; only the folder changes.

## Contributing a built-in theme or mascot

To propose a theme or mascot that ships with the mod: copy one from
`hooks/themes/*.ts` or `hooks/mascot/mascots/*.ts`, register it in
`hooks/themes/index.ts` / `hooks/mascot/index.ts`, give its texts the three
languages (`{ pt, en, es }`), run `claude plugin test .` (the frame test flags
any line with the wrong width) and open a PR. New interface strings go in
`hooks/i18n.ts`; a test checks that every language has every string.

## Layout

```
hooks/register.tsx      events → state, the band (ui.render AbovePrompt), /faisca, animator
hooks/i18n.ts           languages: every interface string in pt, en and es
hooks/meter.ts          meter lines (colored segments, pure)
hooks/usage.ts          usage normalization and formatting
hooks/alerts.ts         80/90 thresholds with re-arming
hooks/state.ts          default preferences and merging
hooks/custom.ts         user themes and mascots (JSON): validation and examples
hooks/themes/           theme registry + synthwave, terracota, crt, nord, dracula, gruvbox
hooks/mascot/           mascot registry (faisca, bit, rex, kage), moods, Raster encoder
types/index.d.ts        $.state contract
tests/                  claude plugin test
```

## Development

```
claude plugin validate <folder>
claude plugin test <folder>
tsc -p <folder>            # after the engine has loaded the mod once
claude --plugin-dir <folder>
```

The code comments are in Portuguese (the author's language); contributions in
any of the three languages are welcome.
