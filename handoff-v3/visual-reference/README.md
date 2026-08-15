# Visual reference

Three standalone HTML files. No build step, no server, no network — open them in a
browser. They are the visual authority for everything in this pack; where a written
description and a screen disagree, look at the screen and then fix the description.

| File | What it shows |
|---|---|
| `design-directions.html` | The two languages explored (Veld / Instrument) and **2a**, the chosen pairing: Veld gate, Instrument house. Sign-in in all five states, desktop and phone, plus the portal explainer. |
| `portal-language.html` | The shell anatomy, the shared vocabulary, and three real screens — Fabric People & portals (operator), Vault library (home), Homestead asset (the object page). |
| `feature-ideas.html` | The 26 household features with effort, cost and the reasoning, and the five that decide adoption. |

## How to read them

`design-directions.html` and `feature-ideas.html` are wide documents — scroll sideways as
well as down. `2a` at the top of the directions file is the approved design; the two
options below it are kept so the reasoning is visible, not because they are live options.

## What they are not

They are **design documents, not code**. The markup inside them is laid out for a canvas,
not for a Svelte component — do not lift it. Take the values: sizes, weights, spacing,
colours, row heights, copy. The real implementations are `src/SignIn.svelte` and the
patterns in `03-shell-and-layout.md`.

Two things in these files are deliberately not literal:

- **The portal screens are drawn at a fixed 1300px** so three could sit side by side for
  comparison. Real screens are fluid and driven by container queries.
- **Photography is a labelled slot**, not a placeholder image. Christo's own photographs
  of the house and the bush go there; a stock image would be worse than the slot.
