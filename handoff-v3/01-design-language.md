# 01 — The design language

One system, two temperaments. This file is the whole language; everything else in the
pack applies it.

---

## The idea, in one paragraph

Nine portals, two kinds of reader. You read Fabric and Hindsight as an operator: you want
density, alignment and figures you can compare down a column. Everyone reads Vault,
Waypoint, Homestead and HA Dashboard as a household: they want a sentence, one number,
and a button. Building two design systems for that would be absurd; building one and
pretending the two readers are the same is why household platforms fail. So: one token
set, one component set, and a single declared switch.

```ts
// on the portal registry entry, Fabric → People & portals
surface: "operator" | "home"
```

`Shell` reads it and sets `data-surface` on its root. Everything below is CSS.

| | `operator` | `home` |
|---|---|---|
| Heading face | Space Grotesk | Newsreader (serif) |
| Figures | JetBrains Mono, tabular | Newsreader, large |
| Body | system stack, 14px | system stack, 14px |
| Table row height | 34px | 52px |
| Content padding | 22px | 30px |
| Section gap | 20px | 32px |
| Portals | Fabric, Hindsight | Vault, Waypoint, Homestead, HA Dashboard, Front Door |

**Body copy does not change between surfaces.** Only headings, figures and density. A
paragraph reads the same everywhere, which is what stops the two surfaces becoming two
products.

---

## Themes and surfaces are different axes — do not merge them

This is the one thing most likely to be got wrong.

- **Theme** sets the neutral ramp (`--bg --s1 --s2 --line --mut --tx --tx2`). Nine dark
  themes plus `daylight`. It is the **user's** choice and it applies estate-wide.
- **Surface** sets type and density. It is the **portal's** property and the user cannot
  change it.

A warm theme with an operator surface is legitimate and must look right. Do not hard-code
the warm ramp into home surfaces — the design explorations showed home surfaces on a warm
ramp because `clay` was the theme in the mock, not because home means warm.

**One exception, and it is deliberate:** the sign-in screen renders before any user is
known, so there is no theme to honour. It pins `clay` and its own warm ground. That is
the only place a ramp is hard-coded anywhere in the estate.

---

## Type

Every size is a token, every token is `rem`, and the floor is real.

| Token | Size | Use |
|---|---|---|
| `--fs-micro` | 11.5px | Uppercase labels, table headers, chips. **The floor. Nothing below it.** |
| `--fs-small` | 12.5px | Secondary text, captions |
| `--fs-body` | 14px | Body copy, form fields, table cells |
| `--fs-lead` | 16px | Lead paragraphs, card titles |
| `--fs-h3` … `--fs-h1` | 18.4 / 24 / 28px | Headings |
| `--fs-display` | fluid | Hero greeting only |

New faces, loaded once in `steyn-design`:

```css
--font-ui:    "Space Grotesk", system-ui, -apple-system, sans-serif;
--font-serif: "Newsreader", Georgia, "Times New Roman", serif;
--font-mono:  "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
--font-body:  system-ui, -apple-system, "Segoe UI", sans-serif;
```

Self-host all three with `font-display: swap` and preload the two weights actually used
(Newsreader 600, Space Grotesk 700). A login screen that reflows when a webfont lands is
worse than one that never had a serif.

### Numbers are a type decision, not a data decision

On operator surfaces every figure is `--font-mono` with `font-variant-numeric: tabular-nums`,
so a column aligns without a single alignment rule. On home surfaces figures are
`--font-serif` at large sizes, because there are three of them on the screen and they are
meant to be read, not compared.

Units are always demoted: smaller, `--mut`, and never wrapped onto their own line. Rand
prefixes (`R2 140`), everything else suffixes (`3.42kW`). Nobody writes `56R`.

---

## Colour

Unchanged from `tokens.css`, and unchanged deliberately. Accent copper `--acc`, status
blue `--ok`, status amber `--warn`, no green anywhere.

What this review adds is **where copper is allowed**. Previously it drifted onto headings,
rules, labels and icons. From v3:

> Copper means *you can act on this*. Primary buttons, the active rail marker, a live
> focus ring, and section kickers. Nothing else. A copper heading on a screen with a
> copper button makes the button quieter, which is the opposite of the point.

### Status, the whole vocabulary

Four states, three signals each, on every surface.

| Glyph | Word | Colour | Means |
|---|---|---|---|
| `✓` | live | `--ok` blue | Answered, and its probe passed |
| `◷` | live · slow | `--warn` amber | Answered, over its `maxMs` three times running |
| `!` | not responding | `--warn` amber | Did not answer |
| `⏸` | not checked | `--mut` grey | No health document yet — **not** the same as down |

The four are distinct in **shape**, so a monochrome screenshot still carries the meaning.
A bare coloured dot is not an acceptable status indicator anywhere in this estate.

---

## Density and spacing

`--sp-1` (4px) … `--sp-6` (32px), 8pt with a half-step. Unchanged.

Added: `--row-h`, `--pad-x` and `--gap-section`, all set by `data-surface`, so a table
does not need to know which surface it is on. A component reads the token.

---

## Motion

`--dur` 180ms, `--ease`. Unchanged, and still off entirely under
`prefers-reduced-motion`.

Added, with the user's explicit approval of the technique:

- **View Transitions** across portal navigation. The rail and header are marked
  `view-transition-name`, so switching from Vault to Fabric moves the copper marker and
  keeps the chrome still. This is the single change that makes nine portals feel like one
  application.
- **Speculation Rules** to prefetch the portal a hover is heading towards. Free, and it
  removes the cold-start stutter that keep-warm was going to be paid for.
- **Scroll-driven animations** for the one thing that earns it: a long table's sticky
  header gaining its shadow. Not for entrances.

Nothing animates on the login screen except the existing copper glows, which remain
`aria-hidden` and disabled under reduced motion.

---

## Layout technique

- **Container queries, not the 860px breakpoint.** `Shell` becomes a container; every
  panel responds to the space it is actually given. The current single breakpoint is why
  a two-column panel behaves identically in a 400px sidebar and a 1400px page.
- **`popover` + CSS anchor positioning** for menus, the portal switcher and the snooze
  picker. No positioning library, no z-index stack, and it survives being inside a
  scrolling table.
- **`:has()`** for row states rather than a class toggled in JS.
- Grid and flex with `gap` everywhere. Never margins between siblings.

---

## What a portal may and may not own

| `Shell` owns | The portal owns |
|---|---|
| Rail, order, glyphs, active marker | Everything inside the content region |
| Header: search, estate health, avatar, theme | Its own in-page tabs and toolbars |
| Portal switcher and keyboard shortcuts | Its data, routing and empty-state copy |
| `data-surface` and the density tokens | Nothing about density |

A portal that renders its own header is a bug. That rule is what keeps eight portals
feeling like one.
