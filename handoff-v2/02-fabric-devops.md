# 02 — Fabric · DevOps (items 1–6)

Repo: `steyncd/fabric`. New surface lives in `src/routes/Estate.svelte` (extended) plus
a new `src/routes/Ops.svelte` where noted. Server routes under `server/src/routes/`.

All six follow `Estate.svelte`'s pattern: one `Panel<T>` per section, each loading and
failing independently.

---

## 1 · Release ledger with one-click rollback — 1 day

**Now:** the *Recent deploys* panel lists Hosting releases read-only — date, type, by,
file count.

**Add:**
- Git sha and commit subject per release, and a link to the GitHub Actions run. Have the
  workflow write both into the Hosting release message (`firebase deploy -m`), and set
  a `commit-sha` label on `gcloud run deploy`. That is the cheapest join between a
  deployed artefact and the code that produced it.
- **Roll back** per Hosting site: `POST /admin/releases/:site/rollback` clones the
  previous release. Owner only, step-up required (item 13), confirmation dialog naming
  both the current and target release.
- Cloud Run rollback via revision traffic: `PATCH /admin/services/:id/traffic` sends
  100% to the previous ready revision.

**Fails how:** if the Hosting API is unreachable the panel shows the error and the
rollback buttons disable — never render a button that would silently no-op.

**Acceptance:** deploy a trivial change, roll it back from the admin screen, confirm the
live site reverts and the audit trail (item 12) records who did it.

---

## 2 · Deploy readiness per repo — 1 day · **gate**

One row per repo in the programme: `fabric`, `frontdoor`, `vault`, `homestead`,
`waypoint`, `hindsight`, `steyn-design`.

| Column | Source |
|---|---|
| WIF pool + provider exist | IAM API on the repo's project |
| Required secrets set | GitHub Actions API — names only, never values |
| Required variables set | same |
| Workflow present | contents API, `.github/workflows/` |
| Last run: status, when, by | Actions API |

Store a fine-grained GitHub PAT (read-only: actions, contents, metadata) in Secret
Manager as `github-readonly-token`. Rotate annually; the drift sweep flags it at 11
months.

**Why this exists:** Fabric's own workflow had never run and `frontdoor` has no WIF pool
at all — both facts lived only in prose. A repo with no pool that nobody notices is a
repo that gets deployed from a laptop, which is how the estate drifts.

**Fails how:** rate-limited or missing token → the panel says *GitHub not reachable* and
the rest of the screen is unaffected.

---

## 3 · Nightly config-drift sweep — 2 days · **gate · highest value**

`POST /ops/drift-sweep`, Scheduler OIDC, 04:30 Africa/Johannesburg (an hour before
Hindsight's 05:30 so the two never contend). Each failed assertion becomes an attention
item with `source: "fabric"` and a stable `dedupeKey` so it does not repeat daily.

Assertions, in order of how much they have already cost:

| # | Assert | Detect with |
|---|---|---|
| D1 | `fabric-api` has `allUsers` / `roles/run.invoker` | Run IAM policy |
| D2 | Every portal origin is an authorised domain **in `steyn-fabric`** | Identity Toolkit config |
| D3 | No `healthUrl` in the registry ends in `/healthz` | registry read |
| D4 | Every `healthUrl` returned 2xx on the last sweep | health docs |
| D5 | A budget is attached to every linked project | Billing API |
| D6 | **No service-account JSON key exists** in any project | IAM `keys.list`, user-managed only |
| D7 | A log sink to `fabric.errors` exists per project | Logging API |
| D8 | Every module SA in `MODULE_SERVICE_ACCOUNTS` still exists and is enabled | IAM |
| D9 | Both Scheduler jobs exist, are enabled, and last ran 2xx | Scheduler API |
| D10 | Every secret referenced by a service exists and is not older than 12 months | Secret Manager |
| D11 | Custom domain certs expire more than 21 days out | Hosting API |
| D12 | Firestore rules deployed hash matches the repo's `firestore.rules` | Rules API |

Rules are data, not code branches: one array of `{id, title, severity, check}` so adding
D13 is one object. A rule that throws is logged and **never silences the others** —
Hindsight's drift rules already work this way; copy the shape.

Render as a panel: green-free status glyphs, `✓ passing` in blue, `! failing` in amber,
`⏸ not checked` grey, each failure expandable to the exact `gcloud` command that fixes
it. That last part matters — a drift alert with no remedy becomes noise within a week.

**Acceptance:** break D1 deliberately (remove the binding), run the sweep, get one
attention item on the Front Door and a working fix command in the panel.

---

## 4 · Environment card per portal — 1 day

One route, `GET /admin/portals/:id/environment`, and one drawer in the admin screen
answering *what is this thing*: project, region, Cloud Run service + current revision,
runtime SA, secrets consumed, scheduler jobs owned, Hosting site, custom domain + cert
expiry, budget, last deploy, health URL, min role, enabled state.

Most of it is derivable from the registry entry plus the APIs already in use for items
1–3. Extend the registry doc with `runService`, `hostingSite`, `serviceAccount`,
`secrets[]`, `schedulerJobs[]` so a new module fills its own card in by registering.

Kill the equivalent prose from the READMEs when this lands, or you now have two sources
of truth and one of them is stale.

---

## 5 · Preview channels in the registry — half day

Workflow step on pull requests: `firebase hosting:channel:deploy pr-${{ github.event.number }}`
with a 7-day expiry. The workflow posts the URL to `POST /admin/previews`; Fabric lists
live previews with repo, PR title, URL and expiry, owner-only.

With four modules sharing one project this is the only way to look at unmerged work
without touching a live site.

---

## 6 · Runbook that executes — 1 day

Turn the manual blocks in the READMEs into owner-only buttons behind a typed
confirmation and step-up (item 13):

- Create or repair the two Scheduler jobs
- Rotate `ha-digest-api-key` (and re-issue to HA)
- Register a module service account
- Re-run the seed
- Re-deploy Firestore rules

Each action writes to the audit trail with the arguments used. Anything genuinely
destructive — deleting a project, tearing down infrastructure — **stays a deliberate act
at the console** and must not get a button. `Estate.svelte` already draws that line for
portal on/off ("It does not tear down infrastructure"); hold it.
