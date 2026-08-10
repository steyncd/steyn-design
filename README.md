# steyn-design

The shared design system for the Steyn portals. No cloud project — this is a git
dependency, consumed **at a tag, never at `main`**.

Built 2026-08-10 as step 3 of `handoff/07-runbook.md`.

---

## Install

```bash
npm i github:steyncd/steyn-design#v1
```

Pin the tag. If `main` moves, a module that tracked it would re-theme itself on the
next `npm ci` with no code change and no PR — which is exactly the failure this
constraint exists to prevent.

## Use

```ts
// main.ts — once per app, before anything renders
import "@steyncd/steyn-design/index.css";
```

```svelte
<script lang="ts">
  import { Shell, Icon, zar, dateZA } from "@steyncd/steyn-design";

  const nav = [
    { id: "queue", label: "Queue", icon: "inbox", badge: 3 },
    { id: "search", label: "Search", icon: "search" },
  ];
  let active = $state("queue");
</script>

<Shell product="Vault" {nav} {active} onnavigate={(id) => (active = id)}
       frontDoorUrl="https://steyn-frontdoor.web.app">
  {#snippet header()}
    <span class="lb">Signed in as Christo</span>
  {/snippet}

  <div class="card" style="padding:16px">
    <div class="kicker">This month</div>
    <div class="big">{zar(4182)}<span class="unit">due</span></div>
    <div class="sub">{dateZA("2026-08-28")}</div>
  </div>
</Shell>
```

---

## What is in here

| File | What it carries |
|---|---|
| `src/tokens.css` | The `:root` block and all nine `[data-theme]` blocks, **copied verbatim** from `ha_portal/src/app.css` |
| `src/surfaces.css` | Base resets, keyframes, and the surface primitives — also verbatim |
| `src/index.css` | Imports both. This is the one file a module needs. |
| `src/Shell.svelte` | Sidebar + sticky header + content slot |
| `src/Icon.svelte` | Lucide-shaped line icons, 18px default, 1.7px stroke, `currentColor` |
| `src/fmt.ts` | `zar()`, `dateZA()`, `kwh()`, `durationH()` — all `en-ZA` / `Africa/Johannesburg` |

### Surface primitives

`.card` / `.card--hero` (glass) · `.cell` (hairline) · `.lb` · `.kicker` ·
`.divider` · `.big` + `.big .unit` · `.num` · `.sub` · `.status` (`--ok` / `--idle`
/ `--off` / `--warn`) · `.attn` + `.attn--warn` · `.btn-primary`

### Themes

Nine, all neutral, set on `<html data-theme="...">`:
`stone` (default) · `basalt` · `fog` · `slate` · `harbour` · `ink` · `clay` ·
`graphite` · `plum`.

A theme sets **only** the neutral ramp. Accent, status and domain colours are fixed
in every theme because they encode meaning, not taste — a theme switch must never
change what a colour means.

---

## The colour rule — read this before writing a screen

**Christo is red–green colour blind.** Meaning never rides green-vs-red.

- Blue (`--ok #7ec8f2`) = good / live
- Amber (`--warn #f0a44a`) = attention
- Colour is **never the only signal** — always glyph + label + colour

`--error` deliberately resolves to amber, not red. The v1 mint/rose pair is retired
because it is the textbook confusable pair. The room heat ramp runs blue → amber and
drops monotonically in luminance, so its ordering survives with no colour vision at all.

Typography: weight **800 for values**, **700 for labels**. Uppercase only on `.kicker`.

---

## Keeping in sync with HA Portal

`tokens.css` and `surfaces.css` are verbatim copies, not adaptations. When the tokens
change, edit `ha_portal/src/app.css`, re-copy, and cut a new tag:

```bash
sed -n '1,168p'   ../HA_Portal/src/app.css > /tmp/t.css   # :root + 9 themes
sed -n '170,487p' ../HA_Portal/src/app.css > /tmp/s.css   # resets + surfaces
```

Then re-attach the header comment on each file, `npm run check`, tag, and bump the
dependants. Do not hand-edit the copies — divergence here is invisible until two
portals sitting side by side on the Front Door render the same status differently.

---

## Not yet done

- **`Fabric Portal.dc.html`, the visual prototype, was not in the handover zip and is
  not on this machine.** `00-OVERVIEW.md` §5 calls it "the visual reference for layout,
  density and copy tone. Read it before writing any screen." `Shell` was therefore built
  from the token file and the written specs alone. Its density and spacing should be
  checked against the prototype before the first module ships a screen.
- Icons are a hand-rolled subset in the HA Portal idiom, not the full Lucide set. Add
  glyphs to the map in `Icon.svelte` as modules need them.
