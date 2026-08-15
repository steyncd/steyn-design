# 03 — Fabric · Access (items 7–13)

Four roles — `owner`, `partner`, `display`, `guest` — with per-module claims, one shared
TV in the lounge and a house-sitter who should stop working on Sunday night.

---

## 7 · Claims audit ledger — half day · **gate**

`POST /claims` revokes refresh tokens so a change lands at once. That is correct, and it
also means the change leaves no trace.

Write `audit/{id}` on every claims mutation: `at`, `actorUid`, `actorEmail`,
`subjectUid`, `subjectEmail`, `before {role, modules, expiresAt}`, `after {…}`,
`reason?`. Append-only — rules deny update and delete for every role including owner.

Show the last ten entries beneath the people table in `Admin.svelte`, with a link to the
full trail (item 12).

---

## 8 · Guest passes with a purpose and a countdown — 1 day

`seed.yaml` already carries a disabled house-sitter created for exactly this, with no
safe way to enable it.

**Presets**, defined in config, not code:

| Preset | Role | Modules | Expiry |
|---|---|---|---|
| House-sitter, this weekend | `guest` | `[ha]` | Sunday 18:00 Africa/Johannesburg |
| House-sitter, custom dates | `guest` | `[ha]` | picked |
| Visiting family | `guest` | `[ha, screening]` | +7 days |

One tap sets role, modules and `expiresAt`; the admin screen shows a live countdown and
the pass self-revokes. Waypoint issues one automatically for the dates of a booked trip
(item 40).

**Expiry is enforced twice** — in `server/src/auth.ts` and again in `firestore.rules` —
because custom claims do not expire on their own: a guest's token would keep reading for
up to an hour past their window and their refresh token would keep minting new ones
indefinitely. Do not remove either check when adding presets.

Add a scheduled job at 00:05 that hard-revokes tokens for anyone whose `expiresAt` has
passed, so the window closes even if they never make another request.

---

## 9 · See it as they see it — half day

`GET /portals?asRole=display&asModules=ha,screening` for owners only: renders the portal
list and attention rail exactly as that role would receive them. **Read-only, and it
never mints a token** — this is a rendering preview, not impersonation.

Fastest possible check that `display` never sees a document and `guest` never sees the
household. Label it clearly in the UI as a preview so a screenshot of it is never
mistaken for the real thing.

---

## 10 · App Check as the actual perimeter — 1 day · **gate**

`fabric-api` is public by design (see `01-unblock.md` §2), so App Check — not Cloud Run
IAM — is the boundary. This closes the gap logged in the v1 integration notes.

1. Register reCAPTCHA Enterprise for web in `steyn-fabric`; add App Check to every
   client (Front Door, Fabric admin, and each module as it ships).
2. Verify the token in `server/src/auth.ts` alongside the existing three doors — a
   fourth check, not a replacement.
3. **Run in monitor mode first.** Add an Estate panel counting verified vs unverified
   requests per origin over 7 days. Enforce only when unverified is zero for a week.

Exempt `GET /healthz` and the Scheduler OIDC routes (no browser, no App Check token).
The HA digest key route keeps its shared secret — HA is not a browser either.

---

## 11 · Sessions, devices and one revoke-all — 1 day

Firebase cannot list sessions, so record them yourself: on every `/me`, upsert
`users/{uid}/sessions/{deviceHash}` with `lastSeen`, coarse UA, and approximate location
from the Cloud Run request headers. Nothing more — this is a household, not a SIEM.

- List per person in the admin screen.
- **Revoke all** — one button, `revokeRefreshTokens` across every uid, step-up required.
- The lounge TV kiosk lives here too: a `display` sign-in you can see and kill from one
  screen. A shared device with no revoke path is the weakest point in the model.

---

## 12 · What changed today — 1 day · **gate**

One reverse-chronological list across the whole estate, backed by one `audit` collection
with a discriminated `kind`:

`claims` · `portal.enabled` · `portal.upsert` · `service.scaling` · `service.traffic` ·
`release.rollback` · `flag` · `drift` · `runbook` · `guest.issue` · `guest.revoke` ·
`session.revoke`

Fields: `at`, `kind`, `actor {uid, email}`, `target`, `summary` (one human sentence),
`detail` (object). Filter by kind and by day. Retain 400 days.

This is the screen you actually open when something feels off, and Fabric already
receives every one of these events — none are written anywhere durable today.

---

## 13 · Step-up before destructive actions — half day

Portal on/off, scaling, traffic, rollback, claims edits, revoke-all and every runbook
button require a Firebase re-auth within the last five minutes
(`auth_time` claim checked server-side, not client-side).

`Estate.svelte`'s toggles currently act immediately on a session that can be an hour old
— an unlocked laptop is one click from switching the household's portals off. Failure
mode is a modal saying *confirm it is you*, then the action proceeds; never a silent 403.
