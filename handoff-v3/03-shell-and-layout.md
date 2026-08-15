# 03 — Shell and layout

What every portal gets for free, and the three page patterns that cover almost every
screen in the estate.

---

## The rail

Nine slots, **same order in every portal**, so switching costs nothing:

`Front Door · HA Dashboard · HQ Finance · Vault · Screening Room · Homestead · Waypoint · Hindsight · Fabric`

- Glyphs come from `Icon.svelte`. **Never inline an SVG** — this rule was broken twice
  while producing this pack and both times it flattened multi-element glyphs into
  featureless boxes. `vault` loses its dial, `door` loses its handle, `film` loses six
  sprockets, and three portals become indistinguishable.
- The active portal carries a **copper left bar and a copper glyph** — a marker and a
  colour, never colour alone.
- Portals the signed-in user cannot open are **not rendered**. The rail is claim-filtered
  server-side by `GET /portals`, so a `display` user's rail is genuinely shorter.
- 40px targets, 64px rail. Under the container's narrow threshold the rail becomes a
  bottom bar of four: Home · House · Portals · More.

The estate mark sits at the top of the rail and is `frontdoor/public/favicon.svg`
unmodified at every size.

---

## The header

Owned by `Shell`. A portal may not render its own.

`portal name · surface badge · search · estate health · avatar`

- **Search** is the federated `GET /search`, `/` or `⌘K` to focus. Modules that time out
  are **named** in the result — *"Not included: Homestead did not answer in time"* — never
  silently dropped, because an absent result reads as *nothing found*.
- **Estate health** is the four-state summary, e.g. `✓ 8/9`. Clicking goes to Front Door
  → Status.
- **Surface badge** reads `Operator` or `Home`. It is the honest label for why a screen
  is dense, and it takes two seconds to explain to anyone who asks.

---

## Pattern 1 · The list page

Vault's library, Homestead's jobs, Waypoint's trips, Fabric's tables.

```
title + one sentence of state          [secondary] [primary]
tabs (in-page, portal-owned)
──────────────────────────────────────────────────────────
column headers — --fs-micro, uppercase, --mut
rows at --row-h
```

- The sentence under the title states the whole list in words: *"142 documents. Four
  waiting in intake. Nothing expires in the next fourteen days."* It is the part a
  household reader actually reads.
- **One tight column per table, and only one.** In Vault it is expiry, because expiry is
  the column that does the work. Everything else breathes.
- Sort is a `popover`, not a select. Filters are chips, not a drawer.
- Wrapped in `Panel`: loading, error, empty and content in one place, error checked
  before empty.

---

## Pattern 2 · The object page

Any portal that owns *things* uses this: a Vault document, a Homestead asset, a Waypoint
trip. Drawn in full for Homestead's borehole pump.

```
breadcrumb
┌──────────────────────────────────┬──────────────┐
│ HERO — photograph ground         │ FACTS        │
│  status chip + glyph + word      │  k/v spine   │
│  object name (serif, large)      │  right-set   │
│  one line of provenance          │              │
│                     ONE NUMBER → │ LINKED       │
├──────────────────────────────────┤  cross-portal│
│ [primary] [secondary] [tertiary] │  references  │
│ HISTORY — a story, not a log     │              │
└──────────────────────────────────┴──────────────┘
```

- **One number in the hero.** The borehole shows run-hours, because that is the number
  the whole page is about. Lifetime cost goes in the facts spine.
- **History reads as sentences**, newest first, with the actor and the cost. Machine
  entries ("run-hours crossed 250 — service raised automatically") sit in the same stream
  as human ones and are marked by an amber dot, not a separate tab.
- **Linked** is where the estate pays off: the pump links to its Vault invoice, its
  Hindsight duty-cycle chart and its HA entity. Cross-portal links go through the other
  module's API with this module's service identity — never straight into its collections.
- **Photography goes at the top** and is the one place imagery appears. Until real photos
  exist the hero is a neutral ground with a labelled slot, not a stock image.

---

## Pattern 3 · The glance page

Front Door home, the kitchen tablet, HA Dashboard's overview.

```
greeting + date + the daily line
figures strip — 6 across, 3 on a phone
WANTS YOU — the attention rail, max 3
sections, in the order this reader cares about
```

- **The order changes by role.** Yours leads with attention and estate health; Mandri's
  leads with the week, the boys, what is expiring and what is booked. Same page, same
  data, different default ordering — not a simplified version.
- Nothing on a glance page that cannot be acted on. A figure with no consequence belongs
  on an operator surface.

---

## Phone

The estate has one genuinely phone-shaped screen today. From v3, phone is a first-class
layout for Front Door, Vault, Homestead and Waypoint.

- **One card above the fold**, and it is the thing that wants you. Everything else is
  reference and sits below it.
- Bottom bar of four, thumb height, 48px targets.
- Tables become cards below the container's narrow threshold — never a sideways scroll,
  which is what two screens do today.
- The trip sheet, pack list, in-case folder and shopping list **work offline** and say so.

---

## Empty and error states

`Panel`'s `empty` snippet is a required prop and that is deliberate — new work cannot
ship a bare "Nothing here."

| Bad | Good |
|---|---|
| No documents. | No documents yet. Drop one in the Drive folder, or forward it on WhatsApp. |
| Error loading jobs. | Could not reach Homestead. This is not "no jobs" — try again. |
| 0 | — |

An empty state names the next action. A failure never renders as emptiness. A figure that
is not wired renders an em dash.
