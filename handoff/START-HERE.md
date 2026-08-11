# Start here

Programme state as at **2026-08-11**, verified against GCP rather than written
from memory. If you are picking this up on a new machine, read this file first.

---

## The one thing that changes everything

**The modules do not each get their own GCP project.** The billing account is
capped at five linked projects and all five are in use. Rather than wait on a
quota increase, the programme was regrouped. See
[`CONSOLIDATION.md`](CONSOLIDATION.md).

| Project | Holds |
|---|---|
| `steyn-frontdoor` | Front Door **only** — stays thin, it is the public origin |
| `steyn-fabric` | Fabric, Hindsight, **and** Vault / Homestead / Waypoint when built |

Separation inside `steyn-fabric` is by named Firestore database, Hosting site,
Cloud Run service and — critically — **service account**, since Fabric maps SA
email → attention `source`.

---

## What is live right now

| Module | State | URL |
|---|---|---|
| `steyn-design` | ✅ tagged `v1` | git dependency, no cloud project |
| **Fabric** | ✅ live | <https://steyn-fabric.web.app> |
| **Front Door** | ✅ live | <https://steyn-frontdoor.web.app> |
| **Hindsight** | ✅ live, ingesting | no UI by design |
| Vault | ❌ not started | — |
| Homestead | ❌ not started | — |
| Waypoint | ❌ not started | — |

### Deployed in `steyn-fabric`

- **Cloud Run** — `fabric-api`, `hindsight-ingest` (both `africa-south1`, min 0 / max 2)
- **Cloud Scheduler** — in **`europe-west1`**, because Scheduler is *not offered*
  in `africa-south1`. Jobs hold no data at rest, only fire HTTP calls.
  - `health-sweep` `*/5 * * * *`
  - `digest-compose` `20 6 * * *`
  - `drift-sweep` `30 5 * * *`
- **BigQuery** — `home` (`state_raw`, `drift_emissions`) and `fabric` (error sink,
  already receiving from all five live projects)
- **Secrets** — `ha-digest-api-key`, `hindsight-ingest-key`
- **Firestore** — `(default)`, `africa-south1`
- **Service accounts** — `fabric-api`, `hindsight`, `scheduler`, `gha-deployer`
- **App Check** — reCAPTCHA Enterprise key registered on both web apps,
  **enforcement deliberately OFF** until the clients send tokens
- **CI** — Workload Identity Federation for `steyncd/fabric`. No JSON keys exist
  anywhere and none should be created.

**Hindsight is ingesting for real:** ~11,000 rows across 280 entities in the last
three hours, ~273 rows/min, from a pyscript module on the live HA install.

---

## Pick up next — in this order

### 1. Homestead — recommended
Smallest of the three, pure CRUD, **no AI in v0**. Hindsight's drift rules
already try to POST jobs to it (`HOMESTEAD_API_URL` is unset, so findings are
recorded but go nowhere). Building it gives them somewhere to land.

### 2. Waypoint
Self-contained. Build the **calendar nudge in v0** — the spec is explicit that a
planner you must remember to visit is dead by October. Restrict the Maps keys
before first use; that is the only real cost risk in the programme.

### 3. Vault
Largest and highest daily value. Note the accepted trade-off in
`CONSOLIDATION.md`: its Gmail/Drive/Calendar OAuth scopes now share a project
with household identity.

---

## Traps already paid for — do not rediscover these

| Trap | Detail |
|---|---|
| **`/healthz` is unreachable** on `*.run.app` | Google's frontend answers it with its own 404 and never forwards. Serve health at **`/health`** and register that. |
| **Cloud Scheduler not in `africa-south1`** | Use `europe-west1`. |
| **Cold starts fake an outage** | A 3 s health probe against `min-instances=0` reports healthy services as down — and the probe is what *warms* them. The sweep retries once at 12 s. |
| **`gcloud secrets create` from a pipe** | `openssl rand \| gcloud secrets create --data-file=-` stores a **trailing newline**. Both services now trim. |
| **pyscript has no generator expressions** | `listcomp`/`dictcomp`/`setcomp` yes; `any(x for x in y)` raises at *call* time. |
| **pyscript app config** | `pyscript.app_config` (flat dict), **not** `pyscript.config["apps"][name]` — the wrong one raises at import and silently registers no triggers. |
| **Firebase Auth lives in `steyn-fabric`** | Enabling sign-in or authorised domains on `steyn-frontdoor` does nothing. |
| **`fabric-api` must be `allUsers` invokable** | Browsers present *Firebase* tokens; Cloud Run IAM only reads *Google IAM* tokens. Auth is enforced in-app on every route. |
| **`firebaseauth.admin` is required** | `verifyIdToken(..., checkRevoked)` fetches the user record. Without it every token reads as "invalid". |
| **Entity ids in the spec are wrong** | Real: `switch.borehole_pump` (not `binary_sensor.`), `sensor.jojo_tank_level_validated` (not `sensor.jojo_tank_level`). Verify against HA's entity registry, not the handover. |
| **`zsh` does not word-split unquoted vars** | `gcloud services enable $LIST` passes one bogus service name. |
| **`gcloud` is not on PATH by default** | Fixed via `~/.zshrc` sourcing the SDK's own `path.zsh.inc`. |

---

## Conventions that are not optional

- `@steyncd/steyn-design` is pinned at tag **`v1`**, never `main`.
- `lib/auth.ts`, `lib/api.ts`, `lib/stores.svelte.ts` are **verbatim copies**
  across modules. Copy them; do not adapt them.
- `npm run check` (`svelte-check` + `tsc -p server`) is the gate. Both halves clean.
- Colour never rides green-vs-red. Blue = good, amber = attention, always with
  glyph + label + colour.
- Register each module in Fabric's `portals` as it ships. A module that is not on
  the Front Door is not done.

---

## Outstanding — see [`TODO-CHRISTO.md`](TODO-CHRISTO.md)

The short version: the **MariaDB dump** is the only time-sensitive item, because
everything older than the 30-day purge window is gone for good and the window
keeps moving.
