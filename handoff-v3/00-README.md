# Handover v3 — design language, login, portal layout, features

**Prepared 15 August 2026.** Everything decided in the design review, in one pack.

This supersedes nothing. Three packs now exist and they do different jobs:

| Pack | What it is | Still authoritative? |
|---|---|---|
| `handoff/` (v1) | The original build spec the deployed code came from | Yes, for anything not mentioned since |
| `handoff-v2/` | Platform items 1–45 — drift sweeps, cost, access, health | Yes, unchanged |
| `handoff-v3/` **(this)** | Design language, login, portal layout, 26 household features | Yes, and it is the visual authority |

Where v3 and an earlier pack disagree **on how something looks**, v3 wins. Where they
disagree on infrastructure, v2 wins. They were written not to overlap.

---

## Read in this order

| File | What it covers |
|---|---|
| `01-design-language.md` | The language: two surfaces, type, colour, density, motion. **Start here.** |
| `02-login.md` | `SignIn` rebuilt — passkey-first, five states, portal explainer |
| `03-shell-and-layout.md` | Rail, header, the object page, phone, container queries |
| `04-portal-screens.md` | Fabric, Vault, Homestead drawn; the rest specified |
| `05-features.md` | 26 household features, and the five that decide adoption |
| `06-build-order.md` | What to build in what order, with gates |
| `07-acceptance.md` | The checklist a change has to pass before it ships |
| `src/` | **Ready-to-commit files for `steyn-design`.** See below. |
| `visual-reference/` | The three design documents as standalone HTML. Open them. |

---

## What is in `src/` and what to do with it

I have read access to your repositories, not write access — so nothing has been pushed.
These are drop-in files:

| File | Goes to | Action |
|---|---|---|
| `src/tokens.additions.css` | `steyn-design/src/tokens.css` | **Append.** Adds font, surface and density tokens. Changes no existing value. |
| `src/SignIn.svelte` | `steyn-design/src/SignIn.svelte` | **Replace.** Keeps the existing prop API, adds four props. |
| `src/Icon.additions.md` | `steyn-design/src/Icon.svelte` | Add three entries to the path map. |
| `src/Shell.surface.md` | `steyn-design/src/Shell.svelte` | Add the `surface` prop and registry-driven nav. |

Then cut **`v3`** and move dependants onto it. Do not move `v2` — six portals consume it
and the type change reflows layouts. A new major tag is the honest signal here.

```bash
cd steyn-design
git switch -c v3-design-language
# apply the four changes above
npm run check
git commit -am "v3: two surfaces, passkey sign-in, portal explainer"
git tag v3 && git push --tags
```

---

## The three constraints, restated because they governed every decision here

**Never green.** Christo is red–green colour blind. Every critical distinction rides
blue↔amber plus luminance. `--error` resolves to amber. The only green in the estate is
Google's `G`, which carries no meaning anyone has to read. Nothing in this pack adds one.

**Never colour alone.** Glyph *and* word *and* colour. Three signals, so a state survives
any colour vision and any monochrome screenshot.

**Honest placeholders.** An unwired figure is an em dash, never a zero. A failure never
renders as emptiness — `Panel` checks `error` before `isEmpty` and that ordering is not
an implementation detail, it is the reason the component exists.

Two more that came out of this review and are now equally binding:

**Nothing below 11.5px.** `--fs-micro` is the floor and it exists because the estate sat
at 10–11px, which is roughly 70% of standard body size. This was violated twice while
producing this very pack; both were caught by computing rather than looking.

**Compute a colour before shipping it.** Every foreground/background pair clears 4.5:1 —
the body-text threshold, not the easier 3:1 UI one. If you introduce a tone that is not
already a token, compute it or do not use it.

---

## What was decided

- **Two surfaces, one system.** `surface: "operator" | "home"` on the portal registry
  entry. Operator is dense and monospaced; home is open and set in the serif. Same
  components, same tokens, one density scale with two settings — not two codebases.
- **The gate is warm, the house is precise.** The login screen is the one screen the
  whole family sees, so it explains itself. Once through, you are in a working surface.
- **Passkey first.** The stated goal for the login screen was *be faster to get through*.
  Google sign-in stays as the fallback and as first-time enrolment.
- **The login screen says what each portal is for.** Eight lines, before anyone signs in.
- **The mark is `frontdoor/public/favicon.svg`** — the copper door on `#DDA976 → #B4794A`.
  It is used at every size, in every portal, and it is not redrawn.

---

## What has not been designed yet

Named so nobody assumes it exists:

- **HA Dashboard.** 90 components, its own visual language, the most-used UI in the
  estate and the only one never reviewed. It is the largest remaining piece of work by a
  wide margin and it needs its own pass.
- **Waypoint's trip page and Hindsight's result shapes** — specified in `04`, not drawn.
- **The kitchen tablet / family screen** — specified as `F1` and `F6`, not drawn.
- **HQ Finance.** Flutter. None of this component work applies; only the language does.
