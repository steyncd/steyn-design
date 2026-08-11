# Project IDs — as actually created

Created 2026-08-10, refreshed 2026-08-11 against verified GCP state.
Billing account `01842D-4A6A94-FD24FE` ("My Billing Account", **currency USD**).
No GCP organisation exists — these are personal projects under `steyncd@gmail.com`.

| Module | GCP project id | Project number | Repo | Local path | Runs in | State |
|---|---|---|---|---|---|---|
| Design system | *(none — git dependency)* | — | `steyncd/steyn-design` | `steyn-design` | n/a | ✅ tagged `v1` |
| Fabric | `steyn-fabric` | 685867683378 | `steyncd/fabric` | `Fabric` | `steyn-fabric` | ✅ live |
| Front Door | `steyn-frontdoor` | 464657214705 | `steyncd/frontdoor` | `FrontDoor` | `steyn-frontdoor` | ✅ live |
| Hindsight | `steyn-hindsight` *(unused)* | 219808906442 | `steyncd/hindsight` | `Hindsight` | **`steyn-fabric`** | ✅ live, ingesting |
| Vault | `steyn-vault` *(unused)* | 395509637902 | `steyncd/vault` | `Vault` | **`steyn-fabric`** | ❌ not started |
| Homestead | `steyn-homestead` *(unused)* | 189617768334 | `steyncd/homestead` | `Homestead` | **`steyn-fabric`** | ❌ not started |
| Waypoint | `steyn-waypoint` *(unused)* | 412729412521 | `steyncd/waypoint` | `Waypoint` | **`steyn-fabric`** | ❌ not started |

All six ids took the preferred `steyn-<name>` form; no `-za` or `-1` fallback was needed.

**Live URLs:** <https://steyn-fabric.web.app> · <https://steyn-frontdoor.web.app>

---

## Billing quota — resolved by consolidation, not by an increase

The billing account allows **5 linked projects** and all 5 are in use
(`helloliam-ha-dashboard`, `steyn-family-finance`, `codebots-429af`,
`steyn-fabric`, `steyn-frontdoor`). No quota increase was requested — the
programme was regrouped to fit. See [`CONSOLIDATION.md`](CONSOLIDATION.md).

`steyn-vault`, `steyn-homestead`, `steyn-waypoint` and `steyn-hindsight` exist as
**empty, unlinked** projects. They cost nothing, hold no billing slot, and
reserve the ids should a slot ever free up. **Do not delete them** — they are the
migration target if the estate outgrows this arrangement.

---

## What is actually deployed (verified 2026-08-11)

### `steyn-fabric`

| Resource | Detail |
|---|---|
| Cloud Run | `fabric-api`, `hindsight-ingest` — `africa-south1`, min 0 / max 2, `allUsers` invoker with auth enforced in-app |
| Cloud Scheduler | **`europe-west1`** — Scheduler is *not offered* in `africa-south1`. Jobs hold no data at rest. `health-sweep` `*/5 * * * *` · `digest-compose` `20 6 * * *` · `drift-sweep` `30 5 * * *` |
| Firestore | Native, `africa-south1`, `(default)` |
| BigQuery | `home` (`state_raw`, `drift_emissions`) · `fabric` (error sink, receiving from all 5 live projects) |
| Secrets | `ha-digest-api-key`, `hindsight-ingest-key` |
| Service accounts | `fabric-api`, `hindsight`, `scheduler`, `gha-deployer` |
| Hosting | `steyn-fabric` |
| App Check | reCAPTCHA Enterprise key on both web apps; **enforcement OFF** until clients send tokens |
| CI | Workload Identity Federation for `steyncd/fabric`. **No JSON keys exist and none should be created.** |
| APIs | 20 + `recommender`, `servicehealth`, `cloudasset`, `billingbudgets` |

`fabric-api` runtime SA holds `datastore.user`, `bigquery.jobUser`,
`bigquery.dataViewer`, `logging.logWriter`, `firebaseauth.admin`, `run.admin`,
`recommender.viewer`, `firebasehosting.viewer`, `servicehealth.viewer`, plus
`secretAccessor` on one secret.

### `steyn-frontdoor`

| Resource | Detail |
|---|---|
| Hosting | `steyn-frontdoor` |
| Firestore / buckets | **none** — deliberate, per `02-frontdoor.md` §3 |
| CI | none yet; deploys are manual (`npm run deploy`) |

**Hindsight is ingesting live** — ~11,000 rows across 280 entities in three
hours, ~273 rows/min, from a pyscript module on the live HA install.

---

## Budget alerts

The spec asks for R100 per project. The billing account is denominated in **USD**,
so `--budget-amount=100ZAR` is rejected with `INVALID_ARGUMENT`. Budgets were
created at **5 USD** (≈ R91) with thresholds at 50 / 90 / 100%. Alerting slightly
below R100 is the safe direction for a cost-capped programme.

| Budget | Amount | Project |
|---|---|---|
| `steyn-fabric (R100)` | 5 USD | 685867683378 |
| `steyn-frontdoor (R100)` | 5 USD | 464657214705 |

Consolidation means one budget now covers Fabric, Hindsight and — once built —
Vault, Homestead and Waypoint. Per-module cost attribution is the thing given up;
use labels if it ever matters.

---

## Environment notes for a new machine

- **`gcloud` lives at `~/google-cloud-sdk/bin`.** It was installed but the
  installer's PATH step never ran, so `gcloud` came back "command not found".
  Fixed by sourcing the SDK's own `path.zsh.inc` / `completion.zsh.inc` from
  `~/.zshrc` (backup at `~/.zshrc.bak-20260810`). **On a new machine you will
  need to do this again.**
- **The shell is `zsh`, which does not word-split unquoted variables.**
  `gcloud services enable $LIST` silently passes one giant bogus service name and
  fails with `SERVICE_CONFIG_NOT_FOUND_OR_PERMISSION_DENIED`. Use `${=LIST}` or a
  literal list.
- `gcloud beta billing` needs the `beta` component.
- Budget commands check `billingbudgets.googleapis.com` on the CLI's **quota
  project**, not the target. `gcloud config set billing/quota_project steyn-fabric`.
- **ADC is required** for `npm run seed`: `gcloud auth application-default login`.
- Cloud Resource Manager rate-limits writes per minute — creating projects back to
  back trips a 429. Verify with `describe`, not `list` (list lags ~60 s).
- macOS **Python 3.14 framework has no CA bundle**; its HTTPS calls fail with
  `CERTIFICATE_VERIFY_FAILED`. `curl` is unaffected. Run Python's
  `Install Certificates.command` if you need it.
- A stray `steyn-hindsight-za` was created when a transient 429 made a successful
  create look like a failure. It was empty and has been deleted.

---

For everything else — current state, what to build next, and the traps already
paid for — see [`START-HERE.md`](START-HERE.md).
