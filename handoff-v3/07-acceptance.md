# 07 — Acceptance

The checklist a change passes before it ships. Most of it is computable; run it rather
than looking at it.

---

## The five hard rules

| | Rule | How to check |
|---|---|---|
| 1 | **No green carrying state, ranking or status** | Grep the diff for green hex and for `--success` used as a colour. Permitted: Google's `G`, and the domain tints (`--security`), which are never the only signal — see DEVIATIONS D4 for why retoning that one in isolation makes things worse. |
| 2 | **Never colour alone** | Every status carries a glyph *and* a word. Screenshot in greyscale — if a state becomes ambiguous, it fails. |
| 3 | **Em dash, never zero** | Any figure that can be unwired renders `—`. A cached figure presented as live is the same lie. |
| 4 | **Nothing below 11.5px** | Compute the type histogram. `--fs-micro` is the floor. |
| 5 | **Every pair clears 4.5:1** | Compute it. Not the 3:1 UI threshold — the body-text one. |

Rules 4 and 5 were each broken twice while producing this pack, both times by inventing a
tone instead of using a token, and both times invisible to the eye and obvious to a
computation. **If you introduce a colour that is not already a token, compute it or do not
use it.**

```js
// paste into the console on any portal
const L = c => { const [r,g,b] = c.match(/\d+/g).map(n => { n/=255; return n<=.03928 ? n/12.92 : ((n+.055)/1.055)**2.4; }); return .2126*r+.7152*g+.0722*b; };
const ratio = (a,b) => { const [x,y] = [L(a),L(b)].sort((m,n)=>n-m); return ((x+.05)/(y+.05)).toFixed(2); };
[...document.querySelectorAll('*')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType===3 && n.textContent.trim()))
  .map(e => { const s = getComputedStyle(e); return { px: parseFloat(s.fontSize), color: s.color, text: e.textContent.trim().slice(0,32) }; })
  .filter(r => r.px < 11.5);   // must be empty
```

---

## Per change

1. **`npm run check` clean** — svelte-check *and* `tsc -p server --noEmit`.
2. **Deployed via CI on push to `main`**, not from a laptop.
3. **Failure path designed.** What does this show when its API is disabled, throttled or
   not yet wired? A half-answered page beats an error page. If it can be empty, the
   `empty` snippet says what to do next.
4. **Both surfaces checked.** A component is rendered under `data-surface="operator"` and
   `data-surface="home"` before it ships. A table that only works at 34px rows is not
   finished.
5. **Two themes checked** — `stone` and `daylight`. `daylight` is the only theme that
   darkens the status colours, so it is the one that catches a hard-coded hex.
6. **Phone checked** at a real narrow container, not a resized desktop window.
7. **Reduced motion honoured.** Every animation off under `prefers-reduced-motion`.
8. **Keyboard reachable**, with a visible focus ring. Never remove the global one.
9. **No inlined SVG.** All glyphs from `Icon.svelte`. If the glyph does not exist, add it
   to the map — do not draw it locally. This was broken twice in this pack and it
   flattened multi-element glyphs into featureless boxes.
10. **README updated** with the date, and any departure from this spec written down under
    **Deviations from the spec**, with the reason.

---

## Per surface

**Operator** — figures are `--font-mono` and tabular. Anything wrong is hoisted into a
band above the table with its remedy as a button. Every grid has a legend. Density is
allowed; illegibility is not.

**Home** — the title states the whole screen in one sentence. Every number carries a
consequence or is removed. At most one tight column. Copper appears only on things you can
act on.

---

## Definition of done for the five adoption features

Different from a code checklist, because their success is behavioural:

| | Done when |
|---|---|
| **F1** Kitchen tablet | It has been on the counter a week and someone other than Christo used it unasked |
| **F2** WhatsApp | A reply of "done" cleared a real chore, and a forwarded photo landed in Vault |
| **F6** Chores | Liam or Eben checked a balance without being prompted |
| **F24** Nudge | A nudge created from a portal arrived on a phone and was acted on |
| **F13** Trip types | A real weekend was planned in Waypoint rather than in a WhatsApp thread |

If a feature ships and its row above never becomes true, that is information — say so in
the README rather than moving on. The estate's problem has never been capability.

---

## When this spec is wrong

It will be — it was written from the repositories and the design review, not from running
the system. Follow the existing habit: implement what the spec says, and when reality
disagrees, write the disagreement under **Deviations from the spec** in that repo's README
with the reason. Fabric's v1 README does this for the USD budget, two added routes,
passkeys and read-only error aggregation, and those four notes are the most useful part of
it.

Do not silently deviate, and do not implement something you believe is wrong because the
spec says so. Ask Christo — he refers to items by number.
