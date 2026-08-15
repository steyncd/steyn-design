# Deviations from the v3 spec

Per `07-acceptance.md` — *"when reality disagrees, write the disagreement here with the
reason. Do not silently deviate."*

D1–D5 were recorded 15 August 2026 on receipt of the pack, **before** anything was
applied. D6 came out of applying it. The pack is now applied — see the summary at the
foot of this file for exactly what landed and what did not.

---

## D1 · The container query in `tokens.additions.css` is a dead rule

```css
.sd-container { container-type: inline-size; container-name: panel; }

@container panel (max-width: 560px) {
  :root { --row-h: auto; }        /* ← never matches */
}
```

A container query styles the **descendants** of its query container. `:root` is `<html>`,
which is an ancestor of every container on the page and can never be a descendant of one.
An element cannot be matched by its own container query either, so moving the selector to
`.sd-container` does not fix it.

**Consequence.** The behaviour `03-shell-and-layout.md` describes — *"tables become cards
below the container's narrow threshold — never a sideways scroll, which is what two
screens do today"* — has no mechanism behind it. The threshold is declared and nothing
reads it. This is the one rule in the file that carries the phone layout.

**Fix.** Set the density tokens on a descendant that the container actually contains:

```css
@container panel (max-width: 560px) {
  .sd-panel { --row-h: auto; --pad-x: var(--sp-4); }
}
```

`.sd-container` then wraps, and `.sd-panel` is the first child inside it. Every component
already reads `--row-h` from its nearest ancestor, so nothing else changes.

---

## D2 · Cross-portal View Transitions cannot fire — the portals are nine origins

```css
@view-transition { navigation: auto; }
```

Cross-document view transitions are **same-origin only**. The estate is nine different
origins:

```
fabric.helloliam.co.za   vault.helloliam.co.za   hindsight.helloliam.co.za
homestead.helloliam.co.za   waypoint.helloliam.co.za   watchlist.helloliam.co.za
www.helloliam.co.za   finance.helloliam.co.za   www.helloeben.co.za
```

A navigation from Vault to Fabric crosses an origin boundary, so the transition is not
attempted. `01-design-language.md` calls this *"the single change that makes nine portals
feel like one application"* — as specified, it will do nothing at all.

It is also moot **within** a portal: Front Door's three pages are a hash router, so they
never navigate the document. Same-document transitions need
`document.startViewTransition()` around the route change, which is a different mechanism
from the `@view-transition` at-rule.

**What is actually available.**

| Want | Mechanism |
|---|---|
| Transitions between Front Door's three pages | `document.startViewTransition()` in the router. Works today. |
| Chrome held still across portals | Not possible while portals are separate origins. |

The `view-transition-name` declarations on `.sd-rail` / `.sd-header` are harmless and
become useful the moment same-document routing uses them, so keep them.

**The honest options**, none of them free: accept that portal switching is a page load;
or put every portal on one origin behind a path-based reverse proxy, which is a platform
change well outside a design pack. **Recommend accepting it** and spending the effort on
`F1`/`F2` instead — nobody in the household will notice the chrome cross-fading, and
several of them will notice a kitchen tablet.

---

## D3 · Speculation Rules work, but not from Front Door

Prefetch is correct for the eight `*.helloliam.co.za` portals: different origins but the
**same site**, so credentials are sent and the prefetch is a real signed-in response.

Front Door is `www.helloeben.co.za` — a **different site**. Prefetching a portal from
Front Door is cross-site, which strips credentials, so what gets cached is the signed-out
HTML. Front Door is precisely where a hover-to-portal prefetch would live, so this is
worth knowing before it is built.

No fix needed in the pack; just do not wire the prefetch on Front Door and expect a warm
signed-in page.

---

## D4 · There is a live green token, and it is in the most-used portal

`--security` resolves to `#3fb79a` (dark) and `#1c6b58` (light). Both are green.

It is used in three HA Dashboard views — `Security.svelte`, `Overview.svelte`,
`Now.svelte`.

**Pre-existing; the pack did not introduce it.** And it is a *domain tint*, not a status,
so it is not the failure mode rule 1 exists to prevent. But `07-acceptance.md` rule 1 says
*"no green anywhere"* and greps for it, so the rule as written already fails against
`main`. Two ways to resolve, and it should be a decision rather than a drift:

- Narrow the rule to *no green carrying state or ranking*, and note the domain tints as a
  documented exception; or
- Retone `--security` off the green axis — it sits beside `--water` `#9fd6f5` and
  `--load` `#3a7cc4`, and under deuteranopia `#3fb79a` desaturates toward exactly those.
  The second reading is the stronger argument for retoning it.

This lands in HA Dashboard's own design pass (`06-build-order.md` step 6) either way.

---

## D5 · `handoff-v2/` is not in any repository

The v3 pack depends on it in eight places — `01-unblock.md` for step 0, and platform items
**3** (drift sweep), **12** (audit trail), **15** (real health probes), **16** (cost),
**19** (attention rules and the snooze model), **20** (registry-driven nav), **24** (model
registry). `F24` and the rail both have it as a hard prerequisite.

**RESOLVED the same day.** Christo supplied the pack and it is now tracked at
`steyn-design/handoff-v2/`. Item 20 (registry-driven nav) turned out to be already
implemented in `Shell`, and implemented *better* than the spec — as a loader callback
rather than a `registryUrl` Shell fetches itself. See the summary at the foot of this
file.

---

## Nothing else disagreed

Checked and correct:

- Every token `tokens.additions.css` references exists in `tokens.css` — `--acc2`,
  `--acc-ink`, `--sp-5` (24px), `--sp-6` (32px), `--dur`, `--ease`.
- `--fs-micro` is `0.72rem` = 11.52px, matching the stated 11.5px floor.
- The additions change no existing value, so Screening Room's ~100 hand-written `var()`
  usages are genuinely untouched.
- `#34d399` appears in `tokens.css` but inside a comment documenting the **replaced** heat
  ramp, not as a live value.
- `#34A853` in `SignIn.svelte` is Google's `G`, which the spec permits by name.

---

## D6 · Font preloading not done, deliberately

`06-build-order.md` step 1 asks for Newsreader 600 and Space Grotesk 700 to be
preloaded. The three faces are self-hosted in `src/fonts/` with `font-display: swap`,
but **no preload tags were added.**

Vite rewrites the `url()`s in `fonts.css` to content-hashed asset paths at build time.
A hand-written `<link rel="preload">` in a portal's `index.html` would therefore name a
file that stops existing at the next build — which fails silently and *costs* a round
trip instead of saving one. Worse, it fails in the direction that looks fine locally.

Doing it properly needs a small Vite plugin that emits the tags with the real hashes.
Worth building if first paint is measurably hurt; not worth guessing at before anyone
has measured. `font-display: swap` means text paints immediately in the fallback
either way.

---

## What was applied, and what was not

**Applied to `steyn-design` on 15 August 2026:**

| Item | State |
|---|---|
| `tokens.additions.css` appended | done, with D1 fixed inline and D2 annotated |
| Three faces self-hosted + `fonts.css` | done — 7 weights, `font-display: swap` |
| `Icon.svelte` — `passkey`, `chore`, `trip` | done |
| `Shell` — `surface` prop, `data-surface`, `sd-container` | done |
| `Shell` — surface badge in the header | done |
| `Shell` — `sd-rail` / `sd-header` view-transition names | done |
| `SignIn.svelte` replaced | done — every existing prop preserved |
| `npm run check` | clean, 224 files, 0 errors |

**Not applied:**

- **Registry-driven nav** was already present and is *better than the spec*. The pack
  asks Shell to fetch `GET /portals` from a `registryUrl`. Shell instead takes a
  **loader function**, because that endpoint needs the caller's Firebase ID token and
  Shell has no business knowing how a module authenticates. Keeping it a callback is
  what lets Shell own no data — the property that stops a bad tag breaking six portals
  at once. Left as it is.
- **Speculation Rules** (`Shell.surface.md` §4) — not added. See D3: prefetch is
  correct for the eight `*.helloliam.co.za` portals but silently useless from Front
  Door, which is a different site. It needs the per-origin split thought through
  first, and it is a performance nicety rather than part of the language.
- **The six dependants were NOT bumped to `v3`.** The tag is cut and pushed; nothing
  consumes it yet. The type and density changes reflow every layout, and six portals
  had just been redeployed with the sign-in fix — moving them onto an unreviewed
  visual change in the same hour is how a good change gets blamed for a bad evening.
