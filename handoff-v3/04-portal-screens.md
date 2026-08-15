# 04 — Portal screens

Three are drawn in `visual-reference/portal-language.html`. The rest are specified here
against the same patterns.

---

## Fabric · operator · the wall of tables

Twelve dense screens built for correctness, with no hierarchy between *something is
wrong* and *here is a list*. The handover named this the best target in the estate and it
is right — density is defensible here, illegibility is not.

**The fix is not a lighter table. It is a band above it.**

```
People & portals              4 people · 9 portals · 36 grants   [See it as…] [Invite]
──────────────────────────────────────────────────────────────────────────────────────
! 3 things need you                                    last drift sweep 04:30
  ┌ D11 · DRIFT ────────┐ ┌ ACCESS ─────────────┐ ┌ D2 · DRIFT ─────────┐
  │ cert expires 14 days│ │ Mandri: Finance in  │ │ waypoint not an     │
  │ [Renew]  auto-renews│ │ Fabric, not legacy  │ │ authorised domain   │
  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
──────────────────────────────────────────────────────────────────────────────────────
PERSON      HA   FINANCE  VAULT  WATCH  HOME  WAY  HIND  FABRIC
Christo     ✓    ✓        ✓      ✓      ✓     ✓    ✓     ✓
Mandri      ✓    !        ✓      ✓      ✓     ✓    ·     ·
Lounge TV   ✓    ·        ·      ✓      ·     ·    ·     ·
House-sitter ✓   ·        ·      ·      ·     ·    ·     ·
            guest · expires Sun 18:00
──────────────────────────────────────────────────────────────────────────────────────
✓ granted   ! mismatch — Fabric and the portal disagree   · no access, by design
```

Rules this establishes for **all twelve** Fabric screens:

1. **Everything wrong is hoisted into one band at the top**, with the fix as a button and
   the remedy stated in words beside it. A drift alert with no remedy becomes noise inside
   a week.
2. **The grid stays dense.** It is reference. It is allowed to be a ten-column table.
3. **A problem is marked twice** — in the cell *and* in the band — so you never scan ten
   columns to find the one that matters.
4. **A legend, always.** Three glyphs, three words, at the foot of every grid.
5. `·` is *no access, by design* and is visually quiet. `!` is *Fabric and the portal
   disagree*, which is a bug, not a permission.

Apply the same shape to: Estate, Health, Cost, Drift, Audit, Sessions, Readiness,
Releases, Flags, Models, Runbook.

---

## Vault · home · the library

Same rail, same header, same status glyphs, and it does not feel like Fabric.

- 52px rows, serif document names, a secondary line for provenance.
- Five tabs: **Library · Intake `4` · Expiring · In-case · Tax year.** The intake count is
  amber when non-zero and is the only number in the tab strip.
- The one tight column is **Expires**, with an amber glyph and word on anything inside 30
  days, and an em dash for documents that do not expire.
- The title sentence states the whole library in words.
- **In-case** is two taps from the home screen, never buried in search. It is the reason
  the portal exists — the day someone else has to find something — and every open is
  written to the audit trail so openness costs nothing in accountability.
- Document detail uses the **object page**: the document itself as the hero, facts spine
  (kind, expiry, amount, supplier, linked asset), history of every access.

### Confidence marks are deterministic, not model uncertainty

Per-field amber marks mean a **cross-check failed**: the amount does not match the sum of
line items, the date is in the future, the supplier is new, the total differs from a
linked expectation. Say which check failed, in words, beside the mark.

**Never render a percentage.** A confidence score invites arguing with a number nobody can
interpret. The confirmation screen exists so a capture is corrected *standing there* — one
screen, large targets, and a *file it anyway* escape.

---

## Homestead · home · the object page

Drawn in full. The pattern the whole estate borrows.

Ship `POST /jobs` **before any screen** — Hindsight's `pump_while_full` and
`duty_cycle_creep` rules have been posting into nothing. The moment it exists, drift
detection starts landing somewhere.

The nine real assets and two overdue jobs are the day-one seed. Ship with them present,
not with an empty state.

---

## Waypoint · home · not yet drawn

Uses the object page, with a trip as the object.

- **Hero:** destination, dates, and the one number — total cost.
- **Facts spine:** distance from Pretoria, drive time, fuel at the price used *stored with
  the trip*, tolls, accommodation, cost per night.
- **Linked:** the Vault confirmation, the house-sitter pass, the Homestead jobs the trip
  raised, the HQ Finance planned expense.
- **The print sheet stays.** One page: route, booking reference, addresses, phone numbers,
  costed total. Readable in a car with no signal. It is the artefact that makes the portal
  trusted on the day.
- **The core product is the WhatsApp nudge**, not the browser screen — pre-prepared with
  the cost and next free weekend already loaded. Build it in v0.

---

## Hindsight · operator · not yet drawn

Named questions over house history, all currently rendering as the same chart-and-table.
A named question that always returns the same answer shape is a search box in a costume.

**Answer shapes, chosen per question:**

| Question | Shape |
|---|---|
| Is the pump getting worse? | Trend line + a verdict sentence at the top |
| What did we use last month? | Two numbers and a difference |
| When does the tank usually run low? | A clock face / hour-of-day distribution |
| Which room is coldest? | A ranked list, no chart |
| Did the geyser change after the timer? | Before/after pair, same axis |

The verdict sentence comes first in every case. The chart supports it.

---

## HA Dashboard · home · the big one

90 components, the most-used UI in the estate, its own visual language predating
everything, and never reviewed. **It needs its own design pass and is not specified here.**

What is already decided and applies to it:

- It is a **home** surface.
- It runs on the lounge TV in kiosk mode as the `display` role — **read at three metres**,
  which is a harder constraint than anything else in the estate and should drive its
  layout rather than being retrofitted.
- The room heat ramp is already correct and colour-blind safe (blue → amber, monotonic
  luminance). Do not touch it.
- Migrating it to `steyn-design` is the highest-effort, highest-value item remaining.
  Do it after the five adoption features, not before — a better-looking dashboard that
  nobody else opens changes nothing.

---

## Screening Room · tokens only

One static 3,261-line HTML file, no build step, so it cannot import the component library.
Tokens were aligned **by value** — the variable names were left alone and only their
values remapped, so roughly a hundred `var()` usages moved without being touched.

**Do not rename a token.** There is no build step to catch it.

Any change here is hand-written CSS. Worth doing: the *decide for me* feature (`F20`),
which is a self-contained addition and does not need the component library.

---

## HQ Finance · Flutter

None of the Svelte work applies. The language does: two surfaces, the status vocabulary,
no green, em dash never zero.

The one change worth making (`F21`) is the month stated as a sentence above the tables.
It is the only portal Mandri has opened, which makes it the highest-value four seconds in
the estate.
