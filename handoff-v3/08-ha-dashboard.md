# 08 — HA Dashboard · the design pass

`06-build-order.md` step 6. The pack is explicit that this portal gets a pass **before**
any code:

> 90 components, most-used, never reviewed, three-metre reading on the TV. It needs its
> own pass before any code — do not migrate it component-by-component into the new tokens
> and hope a design emerges.

So nothing in `HA_Portal` was changed to produce this. It was read, measured and computed.
Every number below was calculated — the scripts are described where they matter, and the
two that carry the argument (the visual-angle derivation and the deuteranopia simulation)
are written out in full so they can be re-run rather than believed.

**The finding in one paragraph.** The dashboard is not badly designed. It is designed for
a desk and deployed to a lounge. Its median font size is 12.5px; at three metres on the
lounge TV that subtends an x-height of **4.7 arcminutes**, against a fluent-reading floor
of 12 and a comfortable-glance target of 16. One fifth of its type is below the estate's
own 11.5px floor and therefore below the **acuity limit** at that distance — not small,
not hard, *unresolvable*. Every glyph it draws is below the acuity limit too. And the
colour system has a collision the previous review did not find: `--energy` and `--warn`
are ΔE00 **2.44** apart under deuteranopia, which is the just-noticeable difference. The
green `--security` token that DEVIATIONS D4 worried about is only the fourth-worst problem
in the palette.

---

## 1 · The inventory

**Exactly 90 `.svelte` files**, 18,251 lines, plus 56 TypeScript modules in `src/lib/`.
The "90 components" in the build order is literal, not a round number:

| | Count | Where |
|---|---|---|
| Application shell | 1 | `App.svelte` (660 lines) |
| Views | 42 | `src/views/` |
| Shared components | 47 | `src/lib/components/` |

Views are lazy-loaded — `App.svelte` holds a `Record<string, () => Promise<...>>` of 41
dynamic imports, plus `TV.svelte` and `CommandPalette.svelte` imported on demand
elsewhere in the same file; one Vite chunk each. That is already the right architecture for a
low-power TV and the migration must not lose it.

### 1.1 The views, by what they do

**Front doors — 3.** `Now.svelte` (621), `Home.svelte` (392), `Overview.svelte` (418).
Three different answers to "what is happening", and the code is honest about it:
`nav.ts` says *"Home and Dashboard are two front doors on purpose"* and `App.svelte`
marks `now` as `phoneOnly` so the rail never offers both. Of the three, **`Now.svelte` is
the best-designed screen in the estate** and is discussed in §2.

**The six hubs — the rail.** `EnergyHub`, `WaterHub`, `RoomsHub`, `MeHub`, `ControlHub`,
plus `Security.svelte` and `Household.svelte` acting as hubs. Each folds 2–6 spokes; the
count beside a rail item is derived from `NavItem.collapsed`, never typed in.

**Spokes — 27.** Routed and deep-linkable, deliberately out of the rail: `Energy`,
`Solar`, `PowerTrends`, `Batteries`, `Appliances`, `Water`, `Irrigation`, `Rooms`
(the floor plan), `Lights`, `Cameras`, `Traffic`, `Timeline`, `Devices`, `Automations`,
`System`, `ServerControl`, `Assist`, `Me`, `FocusWork`, `Vitality`, `Usage`, `Insights`,
`Markets`, `Kids`, `Meals`, `Faith`, `FairPlay`, `Trello`, `Reminders`, `Diagnostics`.

**Standalone — 2.** `Settings.svelte` (771 lines, the largest file in the repo) and
`TV.svelte` (232), the wall display, reached by `?tv=1` or `#tv`.

### 1.2 The 47 components, by role

| Role | Count | Files |
|---|---|---|
| Value & state primitives | 6 | `Value`, `StatusChip`, `Toggle`, `Skeleton`, `Empty`, `Failed` |
| Iconography | 1 | `Icon` |
| Layout scaffolds | 3 | `HubBoard`, `Sheet`, `SettingRow` |
| Glance modules | 10 | `NeedsAttention`, `RightNow`, `HomeStatusStrip`, `Briefing`, `Nudges`, `Favourites`, `PresenceStrip`, `GridStatusCard`, `CrossLinks`, `RoomScenes` |
| Charts | 8 | `AreaChart`, `BarChart`, `Spark`, `Sankey`, `Overlay`, `SmallMultiples`, `TrendCard`, `PowerFlow` |
| Chart adjunct | 1 | `ExplainChart` |
| Diagnostics | 2 | `BatterySignal`, `TvAudit` |
| Household | 1 | `ChoreApproval` |
| Global chrome | 3 | `LinkBar`, `Toast`, `CommandPalette` |
| Time | 2 | `TimeStepper`, `TimeMachine` |
| Device control | 1 | `LightSheet` |
| Settings sections | 9 | `SettingsAlarm`, `SettingsAutomations`, `SettingsButtons`, `SettingsCalendars`, `SettingsCheatsheet`, `SettingsCloud`, `SettingsPasses`, `SettingsSystem`, `SettingsTwins` |

### 1.3 The ones that carry the weight

Migrate these and most of the portal moves with them. Everything else is a consumer.

| Component | Why it is load-bearing |
|---|---|
| **`Icon.svelte`** | 75 lines, ~60 glyph paths, one `{@html}`. Every glyph in the estate should come from here and today almost none do. It is also the single file most affected by the three-metre constraint. |
| **`Value.svelte`** | The freshness contract made visible. Renders `—` for a null reading, desaturates and adds age words for a stale one. It is the mechanism behind *em dash, never zero* and 31 other files bypass it. |
| **`StatusChip.svelte`** | The four-state vocabulary. Glyph plus label, never a bare dot. Already correct in kind; wrong in size. |
| **`Panel`-equivalents — `Empty` / `Failed` / `Skeleton`** | Three files where `steyn-design`'s `Panel` has one. The consolidation is a straight win. |
| **`HubBoard.svelte`** | The template behind six rail destinations. One edit changes six screens. |
| **`Sheet.svelte`** | Focus trap, Escape, swipe-to-dismiss. The estate's only real modal, and it should become `steyn-design`'s. |
| **`App.svelte`** | Rail, header, chips, clock, guest bar, view loader. Per `01-design-language.md`, *"a portal that renders its own header is a bug"* — this file is 660 lines of exactly that, and unpicking it is the largest single job in the migration. |
| **`PowerFlow.svelte`** | The hero of both `Overview` and `TV`. Also the worst offender on two hard rules at once (§2.4). |
| **`app.css`** | 486 lines. The token block at the top is the ancestor of `steyn-design/src/tokens.css`, and it has **drifted** — see §5.3. |
| **`lib/freshness.ts` + `lib/attention.ts`** | Not components, but the two files the design depends on. `freshness.ts` defines `Reading<T>` with `state: "live" \| "stale" \| "none"`, and `toNumReading` degrades a non-numeric to `none` rather than 0. `attention.ts` is the single ruleset behind every "wants you" list. Both are better than anything in the rest of the estate and neither should be touched. |

---

## 2 · The current visual language, honestly

It predates the pack, and it was never reviewed. Here is what that actually produced.

### 2.1 What it does well, and should be kept

**It already solved colour-blindness properly, and did it by computation.** `app.css` is
the origin of the v2 token set — blue means live, amber means attention, the mint/rose
pair is retired by name as *"the textbook red-green confusable pair"*, and the room heat
ramp was rebuilt off green. `steyn-design/src/tokens.css` opens with
*"copied VERBATIM from ha_portal/src/app.css"*. **The estate's colour language came from
this portal.** That is worth saying out loud before criticising it.

**Its information architecture is the most considered in the estate.** `nav.ts` collapsed
eighteen rail items to nine without deleting a single route, and every hub carries a
`collapsedNote` explaining *in prose* what it folded and why. `App.svelte` separates
`visible()` (may this route be opened — an access question) from `inNav()` (should it
appear in the sidebar — a curation question), with a comment recording the bug that
conflating them caused. Nothing else in the estate reasons about itself at this level.

**`Now.svelte` is a finished screen.** Fixed order — leaving check → house sentence →
you usually → right now → wants you — with the argument for the order in the file. A
declared colour budget: *"A calm house is near-monochrome. Domain colour appears only on
exception."* Domain tint applied **only when a control is on**, `--mut` when idle. Every
attention row answerable with *I know* or *Later*, because *"a list that cannot be
answered is a list you stop reading"*. This is the pattern `03-shell-and-layout.md` calls
the glance page, arrived at independently and in some respects further along.

**`TvAudit.svelte` is the estate's conscience.** It shipped with invented figures, and now
gates on `hasData` and renders `<Empty>` explaining what it needs instead. *A wrong number
is worse than no number*, implemented.

**Freshness is a type, not a convention.** `Reading<T>` carries `state` and `blame`;
`worst()` and `derive()` propagate the worst input state through a computation. `Value`
renders the result. This is a better idea than anything in `steyn-design` and it should
migrate *upward* into the shared library, not be flattened into it.

**Performance is designed, not assumed.** Lazy view chunks, `stable()`/`sig()` memoisation
so a 300 ms entity tick does not re-render a five-row list, `content-visibility: auto` with
an explicit `contain-intrinsic-size` on the masonry cards, `navigator.storage.persist()`.
All of it commented with the reason.

### 2.2 What it does badly

**It is typographically a desk application.** 993 `font-size` declarations, **952 of them
in px and none in rem**. The v3 type scale added to `steyn-design` on 14 August never came
back the other way. The histogram:

| Size | Declarations | | Size | Declarations |
|---|---|---|---|---|
| 9px | 5 | | 13.5px | 31 |
| 9.5px | 13 | | 14px | 39 |
| 10px | 33 | | 15px | 39 |
| 10.5px | 35 | | 16px | 23 |
| **11px** | **106** | | 17–20px | 57 |
| 11.5px | 116 | | 22–30px | 60 |
| 12px | **127** ← mode | | 32–64px | 11 |
| 12.5px | 122 ← median | | | |
| 13px | 124 | | | |

**192 declarations — 20.2% — sit below the 11.5px floor.** Acceptance rule 4 fails against
`main` by a fifth of the type in the most-used portal in the estate.

**There is no spacing scale.** `--sp-1`…`--sp-6` exist in `steyn-design` and are used
nowhere here. Padding is written as 13px, 14px, 15px, 18px, 20px in adjacent files.

**Three surface idioms coexist.** `app.css` declares `.card` (a white-alpha gradient with
an inset highlight), `.cell` (a hairline tile), and `.card--hero` — the "Aurora-Glass"
system the README still describes. Meanwhile `Now.svelte`, the newest screen, uses `--s1`
and `--s2` directly and touches none of them. Two design systems are live in one repo.

**Emoji are the glyph system.** Nine files import `Icon.svelte`; ten files contain inline
`<svg>`; the rest use emoji characters. `Now.svelte` has the counter-argument written into
it — *"an emoji carries its own fixed colour, so a grid of idle controls lit up like a
toy"* — and then `Home.svelte`, `Overview.svelte` and `TV.svelte` do exactly that. The
rail carries both: `NavItem` has an `icon` (emoji) *and* an `ic` (Icon name), and the
mobile bottom bar renders the emoji while the desktop rail renders the line glyph. **The
same navigation item has two different pictures depending on which device you are on.**

**Copper has drifted.** 187 `var(--acc)` usages. `01-design-language.md` narrows copper to
*"primary buttons, the active rail marker, a live focus ring, and section kickers"*. Here
it is also the battery ring, the sparkline stroke, the rotating-strip dots, the "used 3×"
caption, the `.kicker` class by definition, the guest bar, the `Announce` toggle and the
avatar gradient.

**Hardcoded ink survives the theme switch.** `#0b1017` (24 uses), `#05070c` (9),
`#eef4fc` (5), `#eef2f9` (4), `#07131c`, `#06121b`, `#dbe6f0`, `#93a3b5`. These are
button ink and text on tinted fills. On `daylight` — the one theme that inverts the ramp —
they become near-black text on near-black fills. `daylight` is not currently in
`prefs.svelte.ts`'s `THEMES` list, so this is latent rather than broken, and it will break
the moment the estate's tenth theme arrives.

**Two chart palettes are still green-first.** `Energy.svelte`'s `SINK_PALETTE` opens
`["#a78bfa", "#34d399", …]` and `Insights.svelte` labels TV Room `#34d399`. `#34d399` is
the exact green the heat-ramp comment says was removed for being unreadable. `Trello.svelte`
maps `green: "#22c55e"` and paints done items `#86efac` on a `#22c55e` wash — that one is
mirroring Trello's own labels, which is defensible, but it is green carrying *done*, which
is state.

### 2.3 Where "never colour alone" is broken

Five places carry a state in hue only, with no glyph and no word:

| File | Markup | What is lost |
|---|---|---|
| `PowerFlow.svelte` | `.lnk.flow` vs `.lnk.rev` differ only by `animation-direction: reverse` and `--c` | **import vs export** — the single most consequential distinction on the energy screens |
| `HubBoard.svelte` | `<span class="r-bar" style="background:{r.tint}">` | a 2px domain tint with no label |
| `NeedsAttention.svelte` | `<span class="sev" style="background:{SEV_COLOR[a.sev]}">` | severity |
| `RoomScenes.svelte` | `{#if on}<span class="dot" title="{on} on">{/if}` | lights on — `title` only, invisible on a TV |
| `GridStatusCard.svelte` | `style="color:{soc <= 30 ? 'var(--warning)' : 'var(--success)'}"` | the number is shown, the *judgement* is hue-only |
| `Toggle.svelte` | the whole control is `.tg.on { background: var(--grad) }` | on/off — has `aria-checked`, no visible text |

`App.svelte`'s alarm chip is a near-miss: `alarm.color` drives a dot **and** a label, so it
passes, but the colours are `var(--success)` / `var(--error)` / `var(--warning)` — three
aliases that all resolve into the blue/amber pair, so armed and disarmed differ by hue with
no glyph between them.

### 2.4 Where "em dash, never zero" is broken

**105 `?? 0` fallbacks across 31 files.** Most are arithmetic and harmless. Three reach the
screen:

- `PowerFlow.svelte` — `?? 0` on all five sensors, so an unwired battery renders **`0%`**
  in the estate's most prominent card. It also declares its labels as SVG attributes
  (`font-size="9.5"` ×4), which is how they escaped the CSS audit.
- `ChoreApproval.svelte` — `states[k.slug]?.balance ?? 0` renders an unloaded Firestore
  balance as **`R0,00`**. A child sees zero pocket money because a read was slow.
- `LightSheet.svelte` — a missing `brightness` attribute becomes `on ? 100 : 0`.
- `BarChart.svelte` — `fmt` correctly returns `—`, but the *geometry* uses `b.value ?? 0`,
  so a null bar draws at zero height and is indistinguishable from a true zero.

`Value.svelte` already does this correctly. The fix is to route these through it.

---

## 3 · The three-metre constraint

This is the section that should drive the layout. Everything else follows from it.

### 3.1 The unit, and why px is the wrong one

CSS defines the **reference pixel** as the visual angle of 1/96 inch viewed from arm's
length (28 inches). That makes it an *angular* unit by definition:

```
1 CSS reference px = (1/96 in) / 28 in = 3.7202e-4 rad = 1.279 arcminutes
```

Which lets the estate's whole type scale be restated as angle. This is the table that
matters, because angle is the thing a reader actually receives:

| Token | px | em-box | cap (0.70em) | **x-height (0.52em)** |
|---|---|---|---|---|
| `--fs-micro` | 11.5 | 14.71′ | 10.30′ | **7.65′** |
| `--fs-small` | 12.5 | 15.99′ | 11.19′ | **8.31′** |
| `--fs-body` | 14 | 17.90′ | 12.53′ | **9.31′** |
| `--fs-lead` | 16 | 20.46′ | 14.32′ | **10.64′** |
| `--fs-h2` | 24 | 30.69′ | 21.49′ | **15.96′** |
| `--fs-h1` | 28 | 35.81′ | 25.07′ | **18.62′** |
| `--figure-size` (home) | 30 | 38.37′ | 26.86′ | **19.95′** |

### 3.2 The thresholds

Three, from the reading psychophysics, all stated as **x-height in arcminutes** because
that is the measure the literature uses:

| | x-height | Means |
|---|---|---|
| **Acuity limit** | ~4′ | 20/20 vision can resolve the letterform. It cannot read it. |
| **Fluent-reading plateau** | ~12′ | Reading speed stops improving above this. The hard floor. |
| **Comfortable glance** | ~16′ | The plateau plus margin for off-axis viewing, a lit room, a moving reader, and a reader over forty. The design target. |

Converting to em-box (x-height ÷ 0.52 for `system-ui` and Space Grotesk; ÷ 0.46 for
Newsreader, which is why the serif needs ~13% more), and then to physical height at
D = 3000 mm via `h = D × θ`:

```
acuity   x-h  4′ → em-box  7.7′ → h = 3000 × 7.7/3437.75  =  6.7 mm
fluent   x-h 12′ → em-box 23.1′ → h = 3000 × 23.1/3437.75 = 20.1 mm
glance   x-h 16′ → em-box 30.8′ → h = 3000 × 30.8/3437.75 = 26.9 mm
serif glance                                               = 30.4 mm
```

**Body text on the lounge TV must be 27 mm tall.** That is the constraint, and it is not a
preference.

### 3.3 mm per CSS pixel — the one number that must be pinned

A 16:9 panel of diagonal *d* inches is `d × 16/√337 = d × 22.137` mm wide. So:

| Diagonal | Width | Height | @1280 | @1920 | @2560 | @3840 |
|---|---|---|---|---|---|---|
| 43″ | 951.9 mm | 535.4 mm | 0.744 | 0.496 | 0.372 | 0.248 |
| 50″ | 1106.8 | 622.6 | 0.865 | 0.576 | 0.432 | 0.288 |
| **55″** | **1217.5** | **684.9** | 0.951 | **0.634** | 0.476 | 0.317 |
| 65″ | 1438.9 | 809.4 | 1.124 | 0.749 | 0.562 | 0.375 |
| 75″ | 1660.3 | 933.9 | 1.297 | 0.865 | 0.649 | 0.432 |

And the multiplier needed to restore a desk pixel's angle at 3 m:

| Diagonal | @1280 | @1920 | @2560 | @3840 |
|---|---|---|---|---|
| 43″ | 1.50× | **2.25×** | 3.00× | 4.50× |
| 55″ | 1.17× | **1.76×** | 2.35× | 3.52× |
| 65″ | 0.99× | **1.49×** | 1.99× | 2.98× |
| 75″ | 0.86× | **1.29×** | 1.72× | 2.58× |

> **The panel size and CSS viewport width are unknown and the layout cannot be designed
> without them.** They are the two most important numbers in this document and neither is
> recorded anywhere in the repository. A TV browser cannot report physical size, so this
> has to be configuration: add `displayDiagonalInches` and pin the viewport (`<meta name="viewport" content="width=1920">` or the kiosk's own zoom) in `haConfig.ts`, and derive the scale from them. **Do this first.** Everything below assumes 55″ at 1920 CSS px and is trivially re-derivable if that is wrong.

### 3.4 The answer

Required CSS px = required mm ÷ (mm per CSS px). At **55″ / 1920 / 3 m**:

| | mm | **CSS px** |
|---|---|---|
| Absolute floor — fluent reading, 12′ x-height | 20.1 | **32 px** |
| **Body — the glance target, 16′ x-height** | 26.9 | **43 px** |
| Serif body (Newsreader) | 30.4 | **48 px** |
| Secondary / captions (14′) | 23.5 | 38 px |
| Hero figure (should be ~2× body) | 54 | 85 px |

Across the six panel sizes, the body figure ranges 28 px (85″) to 55 px (43″) at 1920.
**Nothing on this screen is smaller than 32 CSS px.** `--fs-micro` at 11.5px is not a floor
here, it is a rounding error.

### 3.5 The line budget — the constraint that actually drives the layout

At 1.4 line-height and a 4% title-safe margin for TV overscan:

| Diagonal | Safe height | Line pitch | **Lines on screen** | **Characters across the whole screen** |
|---|---|---|---|---|
| 43″ | 492.6 mm | 37.6 mm | **13** | 65 |
| 50″ | 572.8 | 37.6 | **15** | 75 |
| **55″** | **630.1** | **37.6** | **16** | **83** |
| 65″ | 744.6 | 37.6 | **19** | 98 |
| 75″ | 859.2 | 37.6 | **22** | 113 |

**Sixteen lines.** That is the entire budget for a 55-inch lounge TV at three metres, and a
comfortable layout wants about half of it. Eighty-three characters across the *whole
screen* — narrower than one paragraph of this document.

This is why the constraint must drive the layout rather than be retrofitted. `Overview.svelte`
is a three-to-five column masonry of eighteen cards. At three metres it holds **one card**.
No amount of token substitution fixes that; the screen has to be re-conceived as a
**glance page** (`03-shell-and-layout.md` pattern 3) with a hard budget:

```
greeting + the daily line                      2 lines
ONE figure, or three across                    4 lines
WANTS YOU — max 3, or the calm sentence        6 lines
one section, chosen by time of day             4 lines
                                              ────────
                                                16
```

### 3.6 Glyphs, rules and targets

A stroke must subtend **≥ 1.5 arcmin** to be reliably seen (the acuity stroke limit is 1′).
At 3 m that is **1.31 mm**.

`Icon.svelte` draws on a 24×24 viewBox at `stroke-width="1.7"`, so the stroke is
`size × 1.7/24` = 7.083% of the rendered box. For the stroke to reach 1.31 mm the box must
be `1.31 / 0.07083` = **18.5 mm**. But the *finest feature* is finer than the stroke — the
`wifi` glyph ends in `circle r="0.7"` (diameter 1.4/24 = 5.833% of the box) and `door` in
`r="1"`. For a 1.4-unit dot to reach 1.31 mm the box must be **22.4 mm** = **36 CSS px** at
55″/1920.

What the dashboard uses today, measured:

| `size=` | Box | Stroke | Finest feature | |
|---|---|---|---|---|
| 14 | 8.88 mm | 0.63 mm = 0.72′ | 0.59′ | below acuity |
| 15 | 9.51 | 0.67 = 0.77′ | 0.64′ | below acuity |
| 16 | 10.15 | 0.72 = 0.82′ | 0.68′ | below acuity |
| 18 | 11.41 | 0.81 = 0.93′ | 0.76′ | below acuity |
| 20 | 12.68 | 0.90 = 1.03′ | 0.85′ | below acuity |

**Every glyph in the dashboard is below the acuity limit at three metres.** The rail's
18px icons are 0.93 arcmin of stroke against a 1-arcmin limit — they are not small, they
are absent. This is the same failure mode `03-shell-and-layout.md` describes for inlined
SVG (*"`vault` loses its dial, `door` loses its handle"*), arriving by a different route:
not flattened by a bad copy, but dissolved by distance.

Everything else at 55″/1920:

| | Today | At 3 m | Required |
|---|---|---|---|
| `--focus-w` | 2 px | 1.27 mm = 1.45′ | **3 px** minimum, 4 px recommended |
| `--line` hairline | 1 px | 0.63 mm = 0.73′ | **invisible** — 2 px, or use a tone step instead |
| Status dots (`.ad` 7px, `.spd` 8px, `.dot` 5px) | 5–8 px | 3.2–5.1 mm | they are decoration at this distance; the glyph and word must carry it |
| `--target-min` (WCAG 2.5.8) | 24 px | — | **not applicable** — the `display` role is read-only; there is no pointer. What matters is the *focus* target if a remote is ever used, and that is a ring, not a hit area. |

### 3.7 What today's dashboard actually measures at three metres

55″, 1920 CSS px, 3000 mm. This is the table to show anyone who asks why the pass was
needed:

| What | px | mm | x-height | Verdict |
|---|---|---|---|---|
| `App.svelte .grp` (rail group label) | 9.5 | 6.0 | 3.6′ | **below acuity — cannot be resolved** |
| `Home.svelte .tstate` | 9.5 | 6.0 | 3.6′ | **below acuity** |
| `Overview .fch` (forecast hour) | 10 | 6.3 | 3.8′ | **below acuity** |
| `app.css .micro / .status / .drill` | 10.5 | 6.7 | 4.0′ | **below acuity** |
| `app.css .divider / .kicker` | 11 | 7.0 | 4.2′ | below the fluent floor |
| `app.css .lb / .sub` | 11.5 | 7.3 | 4.3′ | below the fluent floor |
| commonest size in the repo | 12 | 7.6 | 4.5′ | below the fluent floor |
| **median size in the repo** | **12.5** | **7.9** | **4.7′** | **below the fluent floor** |
| `App.svelte .nn` (rail item label) | 13.5 | 8.6 | 5.1′ | below the fluent floor |
| `Now.svelte .sentence` (the house sentence) | 20 | 12.7 | 7.6′ | below the fluent floor |
| `Overview`/`Home` `h1` (the greeting) | 27 | 17.1 | 10.2′ | below the fluent floor |
| `--figure-size` home (the hero number) | 30 | 19.0 | 11.3′ | below the fluent floor |
| `.wall .big` (30 × 1.28) | 38.4 | 24.4 | 14.5′ | legible, not comfortable |
| **`TV.svelte .tv2`** (tile value) | 80 | 50.7 | 30.2′ | **clears the glance target** |
| **`TV.svelte .clock`** | 132 | 83.7 | 49.9′ | **clears the glance target** |

**`TV.svelte` is the only thing in the estate that is correct at three metres**, and it got
there by being the only file that sizes type with `clamp()` and `vw`. Everything else is
below the fluent-reading floor, and one fifth of it is below the acuity limit.

The existing "wall density" mechanism is not a mechanism. `prefs.apply()` toggles a `.wall`
class on `<html>`; `app.css` and `App.svelte` between them do exactly three things with it:
`.big` gets `font-size: 1.28em`, `.drill` is hidden, and the content `max-width` is removed.
**Every label stays at 11px.** A 28% bump on hero numbers only, with no effect on the 192
sub-floor declarations.

### 3.8 The design rules this produces

1. **The display role gets its own type scale, not a multiplier.** Add a
   `data-density="wall"` axis to `tokens.css` alongside `data-surface`, and set the whole
   `--fs-*` ramp from it. The floor becomes `--fs-micro: 32px` (2rem at a 16px root), not
   11.5px. A multiplier on one class is what `.wall` already is and it does not work.
2. **Size from the panel, not from a breakpoint.** Derive a root font-size from
   `displayDiagonalInches` and the pinned viewport, and let every `rem` follow. This is the
   only approach that survives someone buying a different TV.
3. **Sixteen lines is the budget.** Any TV screen that needs to say more than sixteen lines
   is saying too much. Rotate rather than shrink — `TV.svelte`'s 12-second rotating strip is
   already the right idea.
4. **One number per screen region.** `03-shell-and-layout.md`'s object-page rule
   (*"one number in the hero"*) becomes a hard limit here, because there is room for one.
5. **Glyphs at 36 CSS px minimum, and re-draw the fine ones.** `wifi`'s `r=0.7` terminal
   dot and `nav-settings`' gear teeth do not survive even at 36 px on an 85″ panel. Add a
   `display` variant to `Icon.svelte` with a heavier stroke (`stroke-width` 2.4 at the same
   viewBox) and simplified paths for the six glyphs with sub-1.5-unit features.
6. **No hairlines.** Replace `1px solid var(--line)` with a surface tone step (`--s1` on
   `--bg`) or a 2px rule. A 0.73-arcmin line is not a quiet divider, it is nothing.
7. **Status carries on glyph and word alone.** At 3 m a 5px dot is 3.2 mm of colour with
   no shape. `01-design-language.md` already says a bare coloured dot is unacceptable
   anywhere; on this surface it is not even visible.
8. **Kill the `?tv=1` fork.** There are currently two TV mechanisms — `TV.svelte` (a
   separate 232-line view with its own hardcoded `#06060d` ground and violet gradients) and
   `.wall` density. They disagree. `TV.svelte` has the right typography and the wrong
   tokens; `.wall` has the right tokens and no typography. The pass merges them: the
   `display` role gets `data-density="wall"` on the real views, and `TV.svelte`'s
   `clamp()`-based sizing becomes the type scale.

---

## 4 · Migration plan

Seven stages. Each one leaves the dashboard working and shippable. No stage depends on a
later one.

### Stage 0 · Measure the TV — half a day

Nothing else can be specified until this exists. Record in `haConfig.ts`:

```ts
export const DISPLAY = {
  diagonalInches: 55,     // MEASURED, not guessed
  viewingDistanceMm: 3000,
  viewportCssPx: 1920,    // PINNED via <meta viewport> or kiosk zoom
};
```

Then verify by putting a 27 mm-tall test string on the screen and reading it from the sofa.
Every number in §3 is re-derivable from these three.

**Leaves working:** everything. This is additive.

### Stage 1 · Back-port the token scale — 2 days

`steyn-design/src/tokens.css` says *"Do not edit here: edit HA Portal, then re-copy, so the
two never drift apart."* They have drifted: the v3 type scale, spacing scale, `--target-min`
and the focus tokens were added to `steyn-design` on 14–15 August and never came back.

Append the missing block to `app.css` verbatim. Change no existing value. Then mechanically
replace the 952 px `font-size` declarations with the nearest token — this is a codemod, not
a judgement, with one exception: anything currently below 11.5px goes **up** to
`--fs-micro`, never down.

**Gate:** the acceptance-doc console snippet returns an empty array.
**Leaves working:** all 90 components. Layouts reflow slightly; nothing breaks.

### Stage 2 · Consolidate the primitives — 3 days

Six components collapse into `steyn-design` equivalents:

| HA Portal | Becomes | Note |
|---|---|---|
| `Empty` + `Failed` + `Skeleton` | `Panel` | error checked before empty, `empty` snippet required |
| `StatusChip` | `steyn-design` status | four states, glyph + word, no bare dot |
| `Value` | **migrates upward** | `Reading<T>` and `freshness.ts` go *into* `steyn-design`; this portal is ahead |
| `Sheet` | **migrates upward** | the estate has no modal and this one is good |
| `Toggle` | gains a visible on/off word | currently colour-alone |
| `Icon` | merge glyph maps | ~60 paths here, the shared one is smaller |

Then the `?? 0` sweep: route `PowerFlow`, `ChoreApproval`, `LightSheet` and `BarChart`'s
geometry through `Value`/`Reading`.

**Gate:** greyscale screenshot of each of the six states in a dev harness.
**Leaves working:** everything, one component at a time.

### Stage 3 · Unpick the shell — 4 days

`App.svelte` renders its own header, rail, chips and clock. `01-design-language.md`:
*"A portal that renders its own header is a bug."*

Adopt `steyn-design`'s `Shell` with `surface="home"`. `App.svelte` keeps the view loader,
the guest logic and the `visible()`/`inNav()` distinction — those are portal concerns and
they are correct. It gives up the rail, the header, the search chip and the theme control.

The nine rail items map to `Shell`'s registry-driven nav. The per-page primary action
(`hAct`) becomes a `Shell` slot rather than a chip in a header the portal owns.

**Risk:** this is the largest single job and the one most likely to regress. Do it behind a
flag on `prefs`, with the old shell reachable, for one week.
**Leaves working:** everything — the views are unchanged, only their frame moves.

### Stage 4 · The display type scale — 3 days

Add the `data-density="wall"` axis to `tokens.css`, derive the root size from Stage 0's
constants, and add the `display` variant to `Icon.svelte`.

Then delete `TV.svelte` and route `?tv=1` to `Now.svelte` under
`data-surface="home" data-density="wall"`. `TV.svelte`'s rotating strip becomes a
`Rotator` component; its `clamp()` scale becomes the tokens; its hardcoded `#06060d` and
violet gradients go, and the neutral ramp applies.

**Gate:** every measurement in §3.7 recomputed and above the 12′ floor. Read the screen
from the sofa.
**Leaves working:** the desktop and phone layouts are untouched — this is a third density,
not a change to the first two.

### Stage 5 · Re-cut the glance page — 4 days

`Now.svelte` becomes the display role's screen and is re-laid to the sixteen-line budget.
`Overview.svelte`'s eighteen-card masonry stays as the *desktop* dashboard and is explicitly
not a TV screen.

This is the only stage that is design rather than migration, and it is the one the pack is
protecting when it says *do not migrate component-by-component and hope a design emerges*.

**Leaves working:** everything. `Now` already exists and already works.

### Stage 6 · The palette — 2 days

§6 below. One token block, a `sed` across the seven domain tints, and a rule about where a
tint may appear. Do it after Stage 4 so it can be judged on the TV, which is where the
separation matters most.

### Stage 7 · The long tail — 3 days

The 27 spokes, `Settings.svelte`'s nine sections, the two green chart palettes, the
hardcoded ink hexes. Mechanical, tedious, and safe to do in any order once Stages 1–3 have
landed.

---

## 5 · What must not change

### 5.1 The room heat ramp — the claim, verified

`04-portal-screens.md` states:

> The room heat ramp is already correct and colour-blind safe (blue → amber, monotonic
> luminance). Do not touch it.

**Two of the three parts are correct. The luminance claim is false.** Computed with a
Viénot–Brettel–Mollon (1999) deuteranopia simulation and CIEDE2000:

| Band | Hex | relL | Deutan sim | Deutan L\* | vs `#3e444c` |
|---|---|---|---|---|---|
| `--heat-1` (<14°) | `#2e6fbf` | 0.157 | `#6161bf` | 45.43 | 1.94:1 |
| `--heat-2` (14–17°) | `#6fb2e8` | 0.410 | `#a2a2e9` | 69.04 | 4.31:1 |
| `--heat-3` (17–21.5°) | `#9db3c4` | 0.434 | `#adadc4` | 71.39 | 4.53:1 |
| `--heat-4` (21.5–25°) | `#e8b33c` | 0.497 | `#c4c436` | 76.97 | 5.12:1 |
| `--heat-5` (>25°) | `#d2662b` | 0.234 | `#91911e` | 58.38 | 2.66:1 |

**CONFIRMED — blue → amber, no green.** The hue axis is right, it is the axis deuteranopia
preserves, and it is a genuine improvement on the shipped
`#3b82f6 → #38bdf8 → #34d399 → #fbbf24 → #fb7185`.

**CONFIRMED — colour-blind safe, at the level of "no band is invisible".** Every band
simulates to something distinct enough to be seen.

**CORRECTED — luminance is not monotonic.** The relative-luminance sequence is

```
0.157  →  0.410  →  0.434  →  0.497  →  0.234
                                        ↑ falls back below band 2
```

It rises for four bands and then drops. In the deuteranopic view the same thing happens:
`45.43 → 69.04 → 71.39 → 76.97 → 58.38`. **A hot room (>25°) and a cool one (14–17°) are
closer in lightness than two adjacent bands are.** The comment in `app.css` claims it
*"drops monotonically in luminance, so the ordering survives with no colour vision at all"*.
It does not, and the ordering does not.

**CORRECTED — there is a real collision, and it is bands 2 and 3.** Adjacent separations
after deuteranopia simulation:

| | ΔE00 | Deutan ΔL\* |
|---|---|---|
| 1 → 2 | 22.11 | +23.61 |
| **2 → 3** | **12.20** | **+2.35** |
| 3 → 4 | 41.76 | +5.58 |
| 4 → 5 | 15.07 | −18.59 |

Band 2 (`#6fb2e8`, cool) and band 3 (`#9db3c4`, comfortable) simulate to `#a2a2e9` and
`#adadc4` — two pale lavender-greys 2.35 L\* apart. **A 16 °C room and a 20 °C room are the
same swatch.** That is the same failure the ramp was built to fix, moved one band along.

### 5.2 The correction — one value, not five

`--heat-3`: `#9db3c4` → **`#c3cbd2`**. Nothing else changes.

| | Current | Corrected |
|---|---|---|
| Band 2 → 3 ΔE00 | 12.20 | **19.55** |
| Band 2 → 3 deutan ΔL\* | 2.35 | **12.16** |
| Worst of all ten pairs | 2↔3 at 12.20 | **4↔5 at 15.07** |
| `--heat-3` contrast on fog `--s2` | 4.53:1 | **5.99:1** |

Bands 3 → 4 falls from ΔE00 41.76 to 33.69, which is far above any threshold that matters.

**On the non-monotonicity: leave it, and fix the sentence instead.** A five-band ramp that
is monotonic in luminance *and* runs blue → amber must put the hot end at the brightest
point. Computed, the best such ramp is
`#24558f → #4f86c4 → #95a8b8 → #cfa93f → #f4d67a` (monotonic, worst pair ΔE00 10.93) —
but its band 5 sits **ΔE00 8.63 from `--warn`** and **8.17 from `--energy`**. A hot room
would read as a warning. **The shipped ramp gave up monotonic luminance to keep the hot end
out of the status vocabulary, and that was the right trade.** The defect is that nobody
wrote it down. Correct the comment in `app.css` and this pack; keep the colours.

### 5.3 Two other things found while verifying

- **The legend disagrees with the code.** `Rooms.svelte:167` labels the bands
  `<14° / 14–17° / 17–21° / 22–25° / >25°`, and `app.css` repeats it. `format.ts:138` and
  `Rooms.svelte:127` both break at **21.5**. A room at 21.7 °C draws `--heat-4` while the
  legend says that band starts at 22. Fix the legend.
- **The band selection is duplicated.** `format.ts:tempColor()` and
  `Rooms.svelte:heatVar()` implement the same five thresholds independently. One of them
  will be edited alone. Delete `heatVar` and import `tempColor`.

### 5.4 Everything else on the do-not-touch list

- **`freshness.ts` and the `Reading<T>` contract.** Migrate it upward; do not reimplement it.
- **`attention.ts`.** One ruleset, one severity model. Nothing else in the estate has this.
- **`nav.ts`'s nine-item rail and the `collapsedNote` prose.** The IA is settled and it is
  good. The pack's own nine-slot rail order applies at the *estate* level; this portal's
  internal nine is a different list and both are right.
- **`visible()` vs `inNav()` in `App.svelte`.** Keep the distinction and keep the comment.
- **Lazy view chunks, `stable()`/`sig()` memoisation, `content-visibility`.** All of it is
  load-bearing on a TV stick.
- **`Now.svelte`'s ordering argument and its colour budget.** It is the design this pass
  extends, not one it replaces.
- **`TvAudit.svelte`'s empty state.** The estate's best example of the rule.

---

## 6 · The `--security` green

### 6.1 What D4 found, and what it missed

`DEVIATIONS.md` D4 reversed a retone by computation: every cyan candidate collided worse
with `--battery` under deuteranopia, the best-separated tones were pale yellows that
collide semantically with `--warn`, and the real finding was that *"seven categorical hues
is more than this palette can carry"*. That conclusion is correct and this pass confirms it.

D4's method compared the **seven domain tints against each other**. Extending the same
computation to include the status vocabulary — `--ok`, `--warn`, `--acc` — finds worse
collisions than the one it was investigating.

Deuteranopic separation, ΔE00 after Viénot simulation (JND ≈ 2.3):

| Token | Nearest neighbour | ΔE00 |
|---|---|---|
| **`--energy` `#e8b33c`** | **`--warn` `#f0a44a`** | **2.44** ← at the just-noticeable difference |
| `--water` `#9fd6f5` | `--ok` `#7ec8f2` | 5.49 |
| `--acc` `#d69a63` | `--warn` `#f0a44a` | 7.27 |
| **`--security` `#3fb79a`** | **`--health` `#efa0be`** | **8.33** ← D4's finding |
| `--battery` `#b08ad6` | `--ok` `#7ec8f2` | 9.11 |
| `--climate` `#d2662b` | `--acc` `#d69a63` | 10.64 |
| `--load` `#3a7cc4` | `--battery` `#b08ad6` | 13.81 |

**`--energy` and `--warn` are the same colour to a deuteranope.** On the energy screens
the solar tint and the attention colour are indistinguishable, which means the one thing
amber exists to say cannot be said there. `--security`'s green is the *fourth*-worst
problem in this palette.

Four of the seven also fail acceptance rule 5 outright as text on the lightest dark
surface (fog `--s2` `#3e444c`): `--climate` 2.66:1, `--security` 3.96:1, `--load` 2.28:1,
`--battery` 3.49:1.

### 6.2 Why no single-token edit can work — the feasibility proof

This is the part that settles it. Rule 5 asks every pair to clear 4.5:1. On fog `--s2`
(`relL` 0.057), that forces

```
relL ≥ (0.057 + 0.05) × 4.5 − 0.05 = 0.431
```

and the ceiling is white at 1.000. So **the entire usable luminance window for a domain
tint on a dark theme is 0.431 → 1.000**, and the largest WCAG luminance ratio available
inside it is `1.05 / 0.481 = 2.18:1`.

Deuteranopia collapses hue to a single blue↔yellow axis. `--ok` sits at one end of that
axis inside that window (`relL` 0.522, deutan L\* 76.0) and `--warn` at the other
(`relL` 0.456, deutan L\* 75.0). **Seven categories do not fit into two directions and one
narrow luminance window.** An exhaustive search over 13,537 blue candidates for a
two-member family both clearing 4.5:1 *and* 1.7:1 apart in luminance returns **zero
results** — the constraint set is infeasible, not merely tight.

A farthest-point search over the whole gamut confirms the ceiling. Seeding with the three
non-negotiable colours and repeatedly adding the candidate furthest from everything already
chosen, at the 4.5:1 floor:

| Slot added | ΔE00 to nearest | |
|---|---|---|
| +1 | 26.45 | confident |
| +2 | 18.05 | confident |
| +3 | 17.30 | confident |
| +4 | 15.62 | confident |
| +5 | 14.12 | usable |
| +6 | 14.07 | usable |
| **+7** | **9.99** | **marginal** |
| +8 | 9.91 | marginal |

**Six domain slots is the ceiling, and the seventh falls off a cliff.** D4's guess of
"about four" was conservative but directionally exact.

### 6.3 The decision the pass has to make

A domain tint cannot be both **(a)** body text and **(b)** part of a luminance-paired
family. The arithmetic above proves it. So:

> **Domain tints stop being type.** They become a rule, a bar, an icon stroke or a chart
> stroke — governed by WCAG 1.4.11 non-text contrast at 3:1. **All text keeps `--tx`,
> `--tx2` or `--mut` and still clears 4.5:1.** Rule 5 is not relaxed; the tints stop being
> the thing it governs.

This is also the right call for a three-metre display independently of the maths: a tint on
a 12px label is invisible at 3 m anyway, and a 4px rule down the side of a card is not.

### 6.4 The proposed set — four slots, two hues, two luminance steps

Four positions. `--ok` owns light blue, `--warn` owns amber, `--acc` owns copper, and the
domains take what is left: **blue away from `--ok` in luminance, and neutral**.

**Dark themes** (floor 3:1, non-text — worst surface fog `--s2` `#3e444c`, best basalt
`--bg` `#17191d`):

| Slot | Hex | vs `#3e444c` | vs `#17191d` | relL | Deutan | Deutan L\* | Owns |
|---|---|---|---|---|---|---|---|
| `--flow-hi` | `#bfe6fb` | 7.46:1 | 13.35:1 | 0.746 | `#dcdcfc` | 88.65 | water · irrigation · tank · pool |
| `--flow-lo` | `#7b8ade` | 3.06:1 | 5.47:1 | 0.277 | `#8686de` | 59.34 | energy · solar · load · battery · appliances |
| `--fabric-hi` | `#d3d8de` | 6.86:1 | 12.28:1 | 0.682 | `#d7d7de` | 86.17 | **security** · cameras · traffic |
| `--fabric-lo` | `#949ca8` | 3.55:1 | 6.35:1 | 0.329 | `#9a9aa8` | 64.01 | health · me · household · rooms · climate |

**Daylight** (floor 4.5:1 held — the window is generous on white, so these *may* be text):

| Slot | Hex | vs `#ffffff` | vs `#f7f8f9` | vs `#eef0f2` | relL | Deutan | Deutan L\* |
|---|---|---|---|---|---|---|---|
| `--flow-hi` | `#0e4a6b` | 9.50:1 | 8.93:1 | 8.32:1 | 0.061 | `#3f3f6b` | 28.57 |
| `--flow-lo` | `#514a9e` | 7.44:1 | 7.00:1 | 6.51:1 | 0.091 | `#4c4c9e` | 36.32 |
| `--fabric-hi` | `#333a42` | 11.51:1 | 10.82:1 | 10.07:1 | 0.041 | `#383842` | 23.88 |
| `--fabric-lo` | `#5c646e` | 5.99:1 | 5.64:1 | 5.25:1 | 0.125 | `#62626e` | 41.93 |

**Full deuteranopic separation matrix, dark themes.** ΔE00 below the diagonal, normalised
sRGB distance (0–1, the scale D4 reports on) above:

| | flow-hi | flow-lo | fabric-hi | fabric-lo | ok | warn | acc |
|---|---|---|---|---|---|---|---|
| **flow-hi** | · | 0.284 | 0.070 | 0.284 | 0.123 | 0.428 | 0.383 |
| **flow-lo** | 25.00 | · | 0.259 | 0.138 | 0.161 | 0.392 | 0.313 |
| **fabric-hi** | 9.54 | 28.86 | · | 0.230 | 0.116 | 0.358 | 0.314 |
| **fabric-lo** | 18.73 | 18.26 | 16.54 | · | 0.192 | 0.254 | 0.175 |
| **ok** | 11.41 | 14.28 | 17.90 | 16.23 | · | 0.397 | 0.334 |
| **warn** | 44.58 | 62.53 | 31.91 | 36.70 | 53.77 | · | 0.082 |
| **acc** | 41.03 | 55.79 | 29.34 | 31.76 | 48.44 | 7.27 | · |

| | Current set | Proposed set |
|---|---|---|
| Worst domain ↔ domain | **8.33** (`--security` ↔ `--health`) | **9.54** (`flow-hi` ↔ `fabric-hi`) |
| Worst domain ↔ status | **2.44** (`--energy` ↔ `--warn`) | **11.41** (`flow-hi` ↔ `--ok`) |
| Tints failing 4.5:1 as text | 4 of 7 | 0 — they are not text |
| Green tokens | 1 | **0** |

Daylight is the tighter theme: worst domain ↔ domain 9.72, worst domain ↔ status 7.21
(`flow-lo` ↔ `--ok`). Both are still better than the dark theme's *current* worst of 2.44.

The one pair below 10 in either matrix that this pass does **not** fix is
**`--acc` ↔ `--warn`** — ΔE00 7.27 dark, 3.16 daylight. Copper and amber are near-identical
to a deuteranope. That is pre-existing, it is estate-wide, and it is out of scope here, but
it should be logged: *"you can act on this"* and *"this needs attention"* are the same
colour to the person the palette was built for. The mitigation already in place is that
copper is always a **fill** with `--acc-ink` on it and amber is always a **rule or a
glyph** — a shape difference, not a hue one. Keep it that way and do not let copper become
an outline.

### 6.5 The "plus luminance" half

The second axis is what makes four hue positions carry seven domains, and it must survive
a greyscale screenshot on its own:

| Pair | WCAG luminance ratio | Deutan ΔL\* |
|---|---|---|
| `flow-hi` vs `flow-lo` (dark) | **2.44:1** | 29.32 |
| `fabric-hi` vs `fabric-lo` (dark) | **1.93:1** | 22.16 |
| `fabric-hi` vs `fabric-lo` (daylight) | 1.92:1 | — |
| `flow-hi` vs `flow-lo` (daylight) | 1.28:1 | — |

The daylight flow pair separates by hue (teal-blue vs indigo, ΔE00 9.72) rather than
luminance — the light window is too narrow to do both. Stated rather than hidden.

### 6.6 The rules that come with it

1. **A domain tint is never text.** Rule, bar, icon stroke, chart stroke. Text is
   `--tx` / `--tx2` / `--mut`.
2. **A domain tint is never the only signal.** Unchanged from the estate rule, and now
   load-bearing: with four slots covering seven domains, the glyph and the word *are* the
   distinction.
3. **Two members of the same family are never adjacent in one legend.** `flow-hi` and
   `flow-lo` may appear on the same screen; they may not sit in the same key without a
   glyph between them.
4. **The heat ramp owns the floor plan alone.** Computed, `flow-lo` sits ΔE00 8.68 from
   `--heat-2` and `fabric-lo` 6.80 from `--heat-3`. On `Rooms.svelte` the ramp is the
   legend and nothing else on that screen carries a domain tint.
5. **`--security` is retired as a name.** It becomes `--fabric-hi`. Three usages
   (`Security.svelte:259`, `Overview.svelte:284`, `Now.svelte:184–185`) plus three
   `nav.ts` entries. Keep `--security: var(--fabric-hi)` as an alias for one release so
   `Screening Room`'s hand-written `var()` calls do not break — per `04-portal-screens.md`,
   *"Do not rename a token. There is no build step to catch it."*
6. **`Overview.svelte:284`'s bare `.spd` dot goes.** It is `background:var(--security)`
   with no glyph, which fails *never colour alone* today and is invisible at 3 m tomorrow.

---

## 7 · Effort

The build order allows **3 weeks**. This is 21.5 days of focused work, which is 3 weeks
only if nothing else competes. It will.

| Stage | Days | Confidence | What makes it slip |
|---|---|---|---|
| 0 · Measure the TV | **0.5** | high | needs a tape measure and someone on the sofa; trivially done, easily forgotten |
| 1 · Back-port the token scale | **2** | high | a codemod over 952 declarations. The risk is the ~40 `em`-relative sizes (`Value.svelte` uses `0.56em`, `app.css` `.big .unit` uses `0.5em`) which the codemod will not catch and which compound |
| 2 · Consolidate primitives | **3** | medium | six components, but `Value`/`freshness.ts` migrating *upward* into `steyn-design` means a `v3.1` tag and six dependants to re-check |
| 3 · Unpick the shell | **4** | **low** | the biggest risk in the plan. 660 lines, and the guest/Sabbath/`visible()` logic is subtle enough that the comments exist to explain past bugs. Budget a week and be pleased if it is four days |
| 4 · Display type scale | **3** | medium | the scale itself is a day. Re-drawing six `Icon.svelte` glyphs for the display variant is two, and it is fiddly rather than hard |
| 5 · Re-cut the glance page | **4** | medium | the only genuinely creative stage. Two days of layout, two of sitting on the sofa deciding it is wrong |
| 6 · The palette | **2** | high | one token block and a `sed`. The second day is checking all seven screens in both themes and greyscale |
| 7 · The long tail | **3** | medium | 27 spokes and nine settings sections. Mechanical, but there are a lot of them and `Settings.svelte` is 771 lines |
| | **21.5** | | |

**Add 3 days of contingency and call it 5 weeks**, not 3. The two places the estimate is
most likely to be wrong are Stage 3, where the shell logic is denser than it looks, and
Stage 5, which is a design problem with no definition of done other than reading it from
the sofa.

**If the time is not there, the highest-value subset is Stages 0, 1, 4 and 6 — 7.5 days.**
That gets the type off the floor, gives the display its own scale, and removes the green
and the `--energy`/`--warn` collision. The dashboard would still render its own header,
which is a rule violation, but it would be *legible from the sofa*, which is the thing the
build order actually cares about.

---

## 8 · Deviations this pass records

Per `07-acceptance.md`, written down rather than drifted into.

**D9 · The heat ramp's luminance claim is false.** `04-portal-screens.md` and the comment
in `app.css` both state the ramp *"drops monotonically in luminance"*. Computed, the
sequence is `0.157 → 0.410 → 0.434 → 0.497 → 0.234` — it rises for four bands and falls at
the fifth. The pack's instruction *"do not touch it"* is followed for four of the five
values; `--heat-3` is proposed to change from `#9db3c4` to `#c3cbd2` because bands 2 and 3
are ΔE00 12.20 apart with 2.35 L\* of separation under deuteranopia, which is the exact
failure the ramp was built to remove. **This contradicts a stated instruction and needs
Christo's decision, not a silent edit.**

**D10 · Rule 5 is scoped, not relaxed.** Domain tints move to the WCAG 1.4.11 non-text floor
of 3:1 because §6.2 proves that 4.5:1 plus a luminance-paired family is infeasible on this
neutral ramp. All text still clears 4.5:1. If this is not acceptable, the alternative is
four domain slots with no luminance pairing, which carries at most four domains — and the
portal has seven.

**D11 · `--security` is renamed, with an alias.** `--security: var(--fabric-hi)` is kept for
one release because Screening Room has ~100 hand-written `var()` calls and no build step.

**D12 · The TV's physical size and CSS viewport are unknown.** Every number in §3 assumes
55″ at 1920 CSS px at 3000 mm. All of it is re-derivable, but it is an assumption and it is
recorded as one.
