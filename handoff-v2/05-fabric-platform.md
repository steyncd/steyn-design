# 05 — Fabric · Platform features (items 19–24)

Build once in Fabric and every module that ships afterwards gets it free. **Items 19 and
20 are gates specifically because Vault is next** — build them first and Vault inherits
them instead of reimplementing both.

---

## 19 · Attention rules engine in Fabric — 2 days · **gate**

`attention.ts` already upserts by `(source, dedupeKey)` and derives `source` from the
calling service account's verified ID token. The dedupe half is done; the rules half is
missing, and without it every module invents its own.

**Per item, on write:**

| Field | Behaviour |
|---|---|
| `severity` | `info` \| `attention` \| `urgent` — drives ordering and escalation |
| `snoozeUntil` | Set from the UI ("not this week"); hidden until then, not deleted |
| `dueAt` | Optional; overdue items sort first and escalate |
| `escalation` | `digestCount` incremented each time it appears; at 3 → WhatsApp |
| `quietHours` | Nothing is pushed 21:00–06:30 except `urgent` |
| `perSourceCap` | Max 3 open items per module; the fourth replaces the lowest severity |

**Dismissal is per-person** (already true — keep it) but a dismissal of an item with a
`dueAt` sets `snoozeUntil = +7 days` instead of deleting, because a licence disc does not
stop expiring because you swiped it away.

**Escalation to WhatsApp** reuses the inbound path already mapped for the household. One
message, never a thread; it links to the Front Door deep link, which is where the action
happens.

Client API: `GET /attention` (partner+, filtered, sorted), `POST /attention` (module SA),
`POST /attention/:id/snooze`, `DELETE /attention/:id`.

---

## 20 · Registry-driven navigation — half day · **gate**

`steyn-design`'s `Shell` takes a literal nav array, and it is consumed at a pinned tag —
so today a nav change means editing every module and bumping every dependant.

**Change:** `Shell` accepts an optional `registryUrl` and fetches
`GET /portals` (already filtered by the caller's claims) to build the cross-portal
switcher, while the module's own in-app nav stays a literal array. A new portal then
appears in every portal's sidebar with no deploy and no tag bump.

Cache in memory for the session; fall back to the literal array on any failure, so a
Fabric outage degrades the switcher rather than the app. Cut `steyn-design` v2 for this
and bump dependants in the same change.

---

## 21 · One search across every portal — 1 day

The Front Door already has the box, wired to Vault alone, and it degrades honestly to
*Vault is not deployed yet* when `VITE_VAULT_SEARCH_URL` is empty.

`GET /search?q=` on `fabric-api` fans out to each registered module's `searchUrl` with
the caller's claims applied, in parallel, 2-second budget each, and merges. Modules that
time out are reported in the response (`partial: ["homestead"]`) and shown as *not
included* — never silently dropped, because an absent result reads as *nothing found*.

Result shape is uniform: `{portalId, title, subtitle, url, kind, at}`. Group by portal,
rank by recency within group.

---

## 22 · Feature flags per module route — half day

`PATCH /admin/portals/:id/enabled` is the only kill switch and it hides the whole tile.
Per-feature flags are how Vault's OCR or Waypoint's costing ship without an
all-or-nothing switch.

`flags/{portalId}/{flagId}`: `{enabled, description, rolloutRoles[], updatedAt, updatedBy}`.
Modules read them at boot and subscribe. Owner-only toggles in the admin screen, every
flip in the audit trail.

Rule: a flag has an owner and an expiry date in its description. A flag with no removal
date is technical debt with a UI.

---

## 23 · Digest preview and per-module mute — half day

`digest.ts` composes one line per module, max one each, at 06:20 for HA's 06:30 read.
Today you see the result by waiting for morning.

- `GET /digest/preview` — compose without persisting, render in the admin screen.
- **Send test** — deliver today's digest to Christo now, marked as a test.
- **Mute a module** for 1/7/30 days, no code change, shown as muted in the preview so a
  missing line is never mysterious.
- Show the line count and character length; a digest longer than about 500 characters
  stops being read aloud usefully.

---

## 24 · Model and AI-spend registry — 1 day

`00-OVERVIEW.md` §4 asks each README to record the model ids it uses and when. Fabric's
honest answer is currently *none*. Make it data instead of prose.

`models/{moduleId}/{useId}`: `{modelId, purpose, provider, avgTokensPerCall, callsToday,
estimatedCostZAR, capPerDay?}`. Modules report per call (fire-and-forget, never blocking
the user's request); Fabric aggregates and can refuse a module over its cap.

**First entry is Screening Room**, whose Gemini discernment analysis and TMDB lookups are
live and unmetered today, with `GEMINI_API_KEY` and `TMDB_KEY` held in the shared
`helloliam-ha-dashboard` project. Second is Vault's OCR when it ships.

Panel: spend today, this month, per module, with the cap and an amber mark at 80%.
