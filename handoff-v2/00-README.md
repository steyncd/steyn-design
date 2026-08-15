# Handoff v2 — Platform expansion

This pack extends the v1 pack in `../handoff/`. **v1 is not superseded** — it is the
spec the deployed code was built from, and it stays the reference for anything this
pack does not mention. Read `../handoff/00-OVERVIEW.md` first if you have not.

Written 2026-08-11 against the repos as they actually stood that morning.

> **A third pack now exists.** `handoff-v3/` (15 August 2026) carries the design language,
> the rebuilt login screen, portal layout and 26 household features. It does not overlap
> this pack — v2 is infrastructure, v3 is what the household sees. Where the two disagree
> on **how something looks**, v3 wins; on infrastructure, this pack wins.
>
> Four items here are prerequisites for v3 features, and v3 says so at the point of use:
> **19** (attention rules) · **20** (registry-driven nav) · **15** (real health probes) ·
> **24** (model registry, to cap AI spend). Build them when the feature that needs them
> comes up, not speculatively.

---

## What changed since v1 was written

| | v1 assumed | Reality on 2026-08-11 |
|---|---|---|
| Projects | one GCP project per module | **five-project billing cap reached.** Vault, Homestead, Waypoint and Hindsight all run inside `steyn-fabric` |
| Hindsight | its own project, ingest only | live in `steyn-fabric`, verified end to end, **receiving nothing** |
| Fabric | admin screen | admin screen **plus** `Estate.svelte` — Cloud Run scaling, portal on/off, 7-day errors, deploy history, GCP notices |
| Auth | Google sign-in | **provider still not enabled**; nobody has ever signed in |
| Design system | to be built | `steyn-design` v1 tagged and consumed |

**The consequence that drives this whole pack:** per-project isolation is no longer a
safety boundary. A bad Vault deploy now sits in the same project as Hindsight's history
and Fabric's identity data. Fabric therefore has to become the thing that knows what is
deployed, what may run, what it costs and what broke — because the Cloud Console can no
longer answer those questions per portal.

---

## Files

| File | Contents |
|---|---|
| `01-unblock.md` | The half day that makes four deployed services actually work. **Do this first.** |
| `02-fabric-devops.md` | Items 1–6 — release ledger, deploy readiness, drift sweep, environment cards, previews, executable runbook |
| `03-fabric-access.md` | Items 7–13 — claims ledger, guest passes, role preview, App Check, sessions, audit trail, step-up |
| `04-fabric-performance.md` | Items 14–18 — cold-start budget, real health, cost per portal, headroom, one dataset |
| `05-fabric-platform.md` | Items 19–24 — attention rules, registry nav, federated search, flags, digest preview, model registry |
| `06-vault.md` | Items 25–30 — the portal spec, expanded |
| `07-homestead.md` | Items 31–36 |
| `08-waypoint.md` | Items 37–41 |
| `09-hindsight.md` | Items 42–45 |
| `10-data-and-api.md` | Every new Firestore collection, BigQuery table and API route in one place |
| `11-runbook.md` | Build order, gates, and how to verify each step |

Item numbers match `../Platform Expansion.dc.html`, the visual dossier. Christo refers
to items by number in conversation — keep the numbering stable.

---

## Conventions — these are not negotiable

**Stack.** Node 22, Fastify on Cloud Run, Svelte 5 with runes, TypeScript everywhere.
`npm run check` (svelte-check + `tsc -p server --noEmit`) is the gate CI runs; both
halves clean or it does not ship.

**Region.** `africa-south1` for everything. No exceptions, including Scheduler.

**Auth.** Workload Identity Federation only. **No service-account JSON key exists in
any of these projects and none may be created** — item 3 adds a sweep that fails if one
appears.

**Health URLs.** Cloud Run health checks use `/health`, **never** `/healthz`. Google's
frontend intercepts `/healthz` on a `*.run.app` URL and answers with its own 404 without
forwarding to the container, so a sweep against it reports every service as down. This
was verified on 2026-08-10 and it will cost you an hour if you forget.

**Attention `source` is derived, never trusted.** `POST /attention` reads the calling
service account's verified ID token and maps it to a module id. Do not add a body field
that can override it.

**Design system.** `@steyncd/steyn-design` is consumed **at a tag, never at `main`**.
If you change `Shell`, `Icon` or the tokens, cut a new tag and bump every dependant in
the same change. Tokens are verbatim copies from `ha_portal/src/app.css` — edit HA
Portal, re-copy, re-tag. Never hand-edit the copies.

**Colour.** Christo is red–green colour blind. Blue `--ok #7ec8f2` = good/live, amber
`--warn #f0a44a` = attention, and `--error` deliberately resolves to amber. Colour is
never the only signal: always glyph + label + colour. Do not introduce a green.

**Panels fail independently.** `Estate.svelte` sets the pattern: each panel loads and
errors on its own, because one disabled API must not blank an admin page. Every new
panel follows it.

**Honest placeholders.** A figure that is not wired yet renders as `—`, never as a
plausible invented number. The Front Door already does this for *history kept* and
*this month*; those two dashes get filled by item 16 and item 43, not by fiction.

**Cost.** Every item in this pack is free-tier or single-digit rand except the billing
export (~R5) and any Cloud Run min-instances. Item 14 exists specifically so you never
need min-instances. If an implementation choice would add a recurring cost above about
R20/month, stop and ask.

---

## Definition of done, per item

1. `npm run check` clean.
2. Deployed via CI on push to `main` — not from a laptop.
3. Registered in Fabric if it is a new surface (portal registry entry, or a flag).
4. Failure path designed: what does the screen show when this API is disabled, throttled
   or not yet wired? A half-answered page beats an error page.
5. Its README's status table updated with the date, and any deviation from this spec
   written down under *Deviations* — v1's READMEs do this well; keep the habit.
6. If it writes anything durable, it appears in the audit trail (item 12).
