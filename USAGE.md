# Using the design system

Tokens and components existed before this document; what did not exist was any
statement of *when* to use which. The result was predictable — the same visual gap
written as `9px`, `10px` and `12px` in three components, and a type scale invented
fresh in each portal. This is the contract.

---

## Type

Always a token, never a literal. Every size is `rem`, so the browser's own
font-size setting applies — `px` overrides it silently, which is the single most
common accessibility setting on the web.

| Token | Size | Use for |
|---|---|---|
| `--fs-micro` | 11.5px | Uppercase labels, table headers, chips. **The floor.** |
| `--fs-small` | 12.5px | Secondary text, captions, help text |
| `--fs-body` | 14px | Default. Body copy, form fields, table cells |
| `--fs-lead` | 16px | Lead paragraphs, card titles |
| `--fs-h3` … `--fs-h1` | 18–28px | Headings |
| `--fs-display` | fluid | Hero greeting only |

**Nothing goes below `--fs-micro`.** An audit found the estate's three commonest
sizes were 10px, 10.5px and 11px — roughly 70% of standard body size. Hard reading
past forty, hopeless on the lounge display at three metres.

These screens are deliberately dense: a ten-column health table is the point. That
is why body is 14px and not the 16px general guidance suggests. It is a considered
floor, not an oversight — but do not push it back down.

## Spacing

`--sp-1` (4px) through `--sp-6` (32px), an 8pt grid with a half-step. If a gap
wants 9px, it wants `--sp-2`.

## Colour

Three rules, and the first two are not stylistic.

**1. Never green.** Christo is red–green colour blind. Every critical distinction
rides blue↔amber plus luminance. `--error` deliberately resolves to amber. The only
green in the estate is Google's own G on the sign-in button, which carries no
meaning anyone has to read.

**2. Never colour alone.** Every state carries a glyph *and* a word *and* a colour.
Three signals, so it survives any colour vision and any monochrome screenshot.

**3. Meaning is fixed; hex is not.** `--ok` is *good*, `--warn` is *attention*. The
`daylight` theme darkens both, because the dark-theme blue sits at 1.6:1 on white —
not a different meaning, just unreadable. Holding the hex would keep the letter of
the rule and lose the point.

Contrast is verified, not assumed: every foreground/background pair in every theme
clears **4.5:1**, the AA body-text threshold rather than the 3:1 UI one. If you add
a colour, compute it before shipping it.

## Components

| Component | Use it for |
|---|---|
| `Shell` | Any portal with more than one screen. Rail, sticky header, portal switcher, theme toggle, keyboard shortcuts. |
| `SignIn` | Every sign-in gate. Presentational — you pass `onsignin`. |
| `Panel` | Any panel that loads. Handles loading / error / empty / content. |
| `Skeleton` | Loading placeholder, if you are not using `Panel`. |
| `Nudge` | Anything that should be able to become a reminder — a figure, a row, a job. |
| `Icon` | All glyphs. Never inline an SVG. |

### `Panel` is not optional dressing

It exists because two portals rendered an empty list for a *failed* request. That
is the worst outcome available: "Fabric is unreachable" and "you own no portals"
look identical, and only one of them should alarm anybody.

`Panel` checks `error` **before** `isEmpty`, so a failure can never render as
empty, and the `empty` snippet is a **required** prop — you cannot ship a bare
"Nothing here." An empty state has to say what to do next.

```svelte
<Panel loading={p.loading} error={p.error} isEmpty={p.data?.rows.length === 0}
       onretry={load} rows={6}>
  {#snippet empty()}
    No documents yet. Drop one into the Drive folder, or use File a document.
  {/snippet}
  <table>…</table>
</Panel>
```

### `Nudge` — F24, anything can become a nudge

Wrap a figure, a row or a job. Long-press on touch, right-click on a pointer, or
the Menu key on a keyboard, and the thing offers to become a reminder: **Remind
me · Remind us · Snooze until… · Send to WhatsApp**.

It calls **no API**. It hands you a payload and you post it, the same way `SignIn`
is presentational and `Shell` owns no routing — this package ships to six portals
at one git tag, and a component with a network call in it is a component that can
break every table in the estate from a bad tag.

```svelte
<script lang="ts">
  import { Nudge, type NudgePayload } from "@steyncd/steyn-design";

  async function post(n: NudgePayload) {
    await api("/attention", {
      method: "POST",
      body: {
        dedupeKey: n.subject.key,          // Fabric upserts on (source, dedupeKey)
        title: n.subject.title,
        url: n.subject.url,
        severity: n.severity,              // item 19: info | attention | urgent
        snoozeUntil: n.when?.at ?? null,   // absolute ISO, already resolved
        audience: n.audience,              // "me" | "household"
        channel: n.channel,                // "attention" | "whatsapp"
      },
    });
    toast(n.when ? `Reminder set for ${n.when.label.toLowerCase()}` : "Reminder set");
  }
</script>

{#each jobs as job (job.id)}
  <Nudge
    subject={{
      key: `homestead:job:${job.id}`,
      title: job.name,
      detail: job.due ? `Due ${dateZA(job.due)}` : null,
      url: `https://homestead.helloliam.co.za/#/jobs/${job.id}`,
      portalId: "homestead",
    }}
    onnudge={post}
  >
    <JobRow {job} />
  </Nudge>
{/each}
```

Four things worth knowing before you wire it:

**The timestamps are absolute.** `when.at` is an ISO instant, never `"tomorrow"`.
The person picked a moment; send the moment. If the wire carried the word, the
server would re-derive "tomorrow morning" against its own clock, hours later and
possibly across midnight. `when.label` is there so your toast can quote the words
they actually read.

**Options that have already passed are not offered.** At 21:00 there is no "this
evening"; on a Sunday there is no "this weekend". A snooze that resolves to the
past is an item born already due, which the attention engine surfaces instantly —
the exact opposite of what was asked for. So the menu is shorter late at night,
and that is correct rather than broken.

**Say nothing until the write lands.** `Nudge` shows no confirmation, because only
you know whether the POST succeeded. "Reminder set" on a dead connection is the
one message that stops the feature being trusted.

**Wrap the row, not the cell.** Every `Nudge` adds one keyboard trigger, so one
per row is a tab stop per row and one per cell is six. In a real `<table>` pass
`as="td"` on the leading cell — not `as="tr"`, because the parser hoists a
`<button>` straight back out of a `<tr>`.

The menu is a `popover` in the top layer with CSS anchor positioning, so it is
above every `overflow: hidden` card without a z-index and it is not clipped when
it opens on row 40 of a scrolling table. Browsers without anchor positioning get
about twenty lines of fallback maths; there is no positioning library.

## Accessibility, already handled centrally

Do not re-implement these per component:

- **Focus** — one global `:focus-visible` ring, 2px at 3:1 (WCAG 2.2 SC 2.4.13).
  Never remove it. `:focus-visible` already means a mouse click leaves no ring,
  which is the reason people used to delete focus styles.
- **Focus not obscured** (SC 2.4.11) — `scroll-margin-top` clears Shell's sticky
  header. Tabbing down a long page used to scroll focus underneath it.
- **Target size** (SC 2.5.8) — 24×24 minimum on buttons and checkboxes, at zero
  specificity so a component can opt for the spacing exemption instead.
- **Reduced motion** — every animation in this package is off under
  `prefers-reduced-motion`. If you add one, do the same.

## Motion

`--dur` (180ms) and `--ease`. Motion clarifies where a thing came from; it is not
decoration. A skeleton *sweeps* rather than pulses because pulsing draws the eye to
the placeholder instead of the content.

## Adding to this package

It is consumed as a git tag: `github:steyncd/steyn-design#v2`. Push to `main`,
then move the tag — every portal picks it up on its next `npm install`.

Moving `v2` changes six repos at once. Keep anything with real failure risk in the
consumer instead: the reason `SignIn` is presentational and `Shell` owns no routing
is that a bad tag must not be able to break sign-in everywhere simultaneously.
