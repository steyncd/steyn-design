# 06 — Build order

Design work and adoption work are different problems and compete for the same evenings.
This is the order that gets both, without either stalling.

---

## Step 0 · Unblock — half a day

Still true, still first: `handoff-v2/01-unblock.md`. Nobody can sign in. Nothing in this
pack is testable until Google's provider is enabled in `steyn-fabric`, `fabric-api` is
open to `allUsers`, the seed has run and both schedulers exist.

**And the open auth bug.** Sign-in has failed intermittently for the owner across Front
Door and Fabric; configuration, auth domain and redirect URIs are all verified correct, so
the fault is elsewhere and still open. **Do not build the passkey path on top of a broken
Google path** — passkey enrolment happens after a successful Google sign-in, so a flaky
foundation makes an unreproducible bug. Fix it, then `02-login.md`.

---

## Step 1 · `steyn-design` v3 — 3 days

Everything in `src/`:

1. Append `tokens.additions.css` — fonts, surfaces, density. Changes no existing value.
2. Self-host the three faces, preload Newsreader 600 and Space Grotesk 700.
3. Add the three glyphs to `Icon.svelte` — `passkey`, `chore`, `trip`.
4. Add `surface` to `Shell`, plus registry-driven nav (v2 item 20).
5. Replace `SignIn.svelte`.
6. `npm run check` clean, tag **`v3`**, bump the six dependants.

**Tag v3, do not move v2.** The type and density changes reflow layouts; six repos
consume the tag and a silent reflow across all of them is exactly the failure a new major
exists to prevent.

**Gate:** every portal still builds and renders at the new tag before anything else
starts.

---

## Step 2 · The gate and the front door — 4 days

`02-login.md` and Front Door's three pages in the new language. Passkey path last, after
the auth bug closes.

**Done when:** Christo signs in with Face ID in under two seconds, the explainer lists
eight portals fed from the registry, and all five states are reachable in a dev harness.

---

## Step 3 · The five adoption features — 3 weeks

`05-features.md`. **F1 → F2 → F6 → F24 → F13.**

Do this *before* the remaining portal design work. A better-looking Fabric changes nothing
about whether the household uses the estate; the kitchen tablet does. This is the step
most likely to be skipped because the design work is more enjoyable — do not skip it.

**Done when:** the tablet has been on the kitchen counter for a week and someone other
than Christo has used it without being asked.

---

## Step 4 · Fabric and Vault — 1.5 weeks

`04-portal-screens.md`. Fabric's twelve screens take the band-above-the-table pattern;
Vault takes the list page and the object page.

Fabric first — it is the densest thing in the estate and every operator screen after it
inherits the pattern.

---

## Step 5 · Homestead and Waypoint — 2 weeks

`POST /jobs` before any Homestead screen. Waypoint's WhatsApp nudge before its browser
screens. Both are v0 and both are thin — this is where the object page proves it
generalises.

---

## Step 6 · HA Dashboard — 3 weeks, own design pass

90 components, most-used, never reviewed, three-metre reading on the TV. It needs its own
pass before any code — do not migrate it component-by-component into the new tokens and
hope a design emerges.

---

## Step 7 · The rest

`F3 F5 F7 F8 F10 F11 F14 F15 F16 F17 F18 F19 F20 F21 F22 F23 F25 F26`, and Hindsight's
answer shapes. Ordered by how often you will use them.

---

## Running alongside

The platform items in `handoff-v2/` do not wait for any of this. Its own gates —
**3** drift sweep, **12** audit trail, **15** real health, **16** cost, **19** attention
rules, **20** registry nav — are cheap and several are prerequisites here:

- **F24** needs **19**'s snooze and severity model.
- The rail needs **20**'s registry-driven nav.
- The header's estate health needs **15**'s real probes.
- **F22** needs **24**'s model registry to cap spend.

Build those four when the feature that needs them comes up, not speculatively.
