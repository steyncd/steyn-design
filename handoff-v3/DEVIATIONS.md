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

### RESOLVED 15 August 2026 — rule narrowed, retone deferred, and here is why

I intended to retone it and computed the alternatives first, per rule 5. **The
computation reversed the decision**, so it is recorded here rather than lost.

Simulating deuteranopia over the seven domain tints, the current green's worst-case
separation from its peers is **0.200** (nearest: `--health`, both collapsing to near-grey).
Every cyan/teal candidate I tried scored *worse*, because the blue region is already
crowded by `--water`, `--load` and `--battery`:

| Candidate | Worst-case separation | Collides with |
|---|---|---|
| `#3fa8b7` | 0.115 | `--battery` |
| `#7bb8d9` | 0.107 | `--battery` |
| `#4fb3cf` | 0.049 | `--battery` |
| `#5aa8d6` | **0.008** — effectively identical | `--battery` |
| *current* `#3fb79a` | *0.200* | *`--health`* |

A full search of HSL space at ≥4.5:1 says the genuinely best-separated tones are pale
yellows (separation 0.37–0.42) — because deuteranopia preserves the blue–yellow axis.
But a yellow `--security` collides *semantically* with `--energy` and, far worse, with
amber `--warn`, which is half the status vocabulary. That is a worse bug than the one
being fixed.

**The real finding is that seven categorical hues is more than this palette can carry.**
A deuteranope can reliably separate about four. No single-token edit fixes that, and
retoning one hue in isolation only moves the collision somewhere less obvious.

So, two changes:

1. **Rule 1 is narrowed** to *no green carrying state, ranking or status* — which is what
   it was always protecting. `--error` resolving to amber, blue-means-good, and the heat
   ramp are all unaffected. Domain tints are a documented exception, and they are already
   covered by *never colour alone*: a domain tint is never the only signal, because every
   one of those views carries a glyph and a label too.
2. **The retone is deferred to HA Dashboard's design pass** (`06-build-order.md` step 6),
   where the whole seven-colour set can be reconsidered together — probably by cutting it
   to four hues plus luminance, which is the only thing that actually works.

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

## D7 · F24 cannot wrap a `<tr>`, and does not wire itself to the attention engine

`05-features.md` F24 says *"long-press or right-click any figure, row or job in any
portal"* and *"one component, wired to the attention engine"*. Two qualifications came
out of building it.

**A `<tr>` is not wrappable.** `Nudge` has to place a trigger button and a positioning
anchor inside the element it wraps, and the HTML parser hoists a `<button>` straight out
of a `<tr>` — the table's content model permits only `<td>`/`<th>` there. So `as="tr"`
would produce markup that silently rearranges itself. The component takes `as="td"`
instead and the row's leading cell carries the nudge, which is where a thumb lands
anyway. A row built from divs, which is what most of these screens actually use, wraps
directly.

**It emits rather than posts.** The component calls no API; it hands a structured payload
to `onnudge` and the portal posts to `POST /attention`. This is not a smaller version of
the feature — it is the same rule that makes `SignIn` presentational and `Shell` own no
routing, and it exists because this package is consumed at a git tag by six portals at
once. A network call inside a shared component is a bad tag away from breaking every
table in the estate simultaneously, and the F24 acceptance test (*"a nudge created from a
portal arrived on a phone and was acted on"*) is unaffected by which side of the boundary
the `fetch` sits on.

A consequence worth stating: `Nudge` therefore shows **no confirmation**. Only the portal
knows whether the write landed, and "Reminder set" rendered before anyone has spoken to
the server is the single message that would stop the feature being trusted.

**Two smaller findings**, both fixed rather than shipped:

- On a Sunday, *tomorrow morning* and *next week* both resolve to Monday 07:00. Duplicate
  rows are deduplicated and the earlier, more precise wording wins.
- An option that has already passed is dropped — at 21:00 there is no *this evening*.
  Snoozing to the past creates an item born already due, which the engine surfaces
  immediately: the exact opposite of what was asked for.

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
