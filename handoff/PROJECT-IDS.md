# Project IDs — as actually created

Created 2026-08-10. Billing account `01842D-4A6A94-FD24FE` ("My Billing Account", **currency USD**).
No GCP organisation exists — these are personal projects under `steyncd@gmail.com`.

| Module | GCP project id | Project number | Repo | Local path | Hosting URL | Billing |
|---|---|---|---|---|---|---|
| Design system | *(none — git dependency)* | — | `steyncd/steyn-design` | `/Users/christo/Code/steyn-design` | — | n/a |
| Fabric | `steyn-fabric` | 685867683378 | `steyncd/fabric` | `/Users/christo/Code/Fabric` | 🟢 `https://steyn-fabric.web.app` | ✅ linked |
| Front Door | `steyn-frontdoor` | 464657214705 | `steyncd/frontdoor` | `/Users/christo/Code/FrontDoor` | 🟢 `https://steyn-frontdoor.web.app` | ✅ linked |
| Vault | `steyn-vault` | 395509637902 | `steyncd/vault` | `/Users/christo/Code/Vault` | *(pending billing)* | ❌ **blocked** |
| Homestead | `steyn-homestead` | 189617768334 | `steyncd/homestead` | `/Users/christo/Code/Homestead` | *(pending billing)* | ❌ **blocked** |
| Waypoint | `steyn-waypoint` | 412729412521 | `steyncd/waypoint` | `/Users/christo/Code/Waypoint` | *(pending billing)* | ❌ **blocked** |
| Hindsight | `steyn-hindsight` | 219808906442 | `steyncd/hindsight` | `/Users/christo/Code/Hindsight` | *(none by design)* | ❌ **blocked** |

All six ids took the preferred `steyn-<name>` form. No `-za` or `-1` fallback was needed.

---

## ⚠️ Blocker: billing account project quota is full

The billing account allows **5 linked projects** and all 5 slots are occupied:

| Project | Why it holds a slot |
|---|---|
| `helloliam-ha-dashboard` | HA Portal — live |
| `steyn-family-finance` | HQ Finance — live |
| `codebots-429af` | Codebots — live |
| `steyn-fabric` | new — took a free slot |
| `steyn-frontdoor` | new — took the last free slot |

`gcloud beta billing projects link` fails for the remaining four with:

```
FAILED_PRECONDITION: Cloud billing quota exceeded
subject: billingAccounts/01842D-4A6A94-FD24FE
```

Without billing, a project cannot enable Firestore, Cloud Run, BigQuery, Cloud Storage,
Scheduler or Pub/Sub — so Vault, Homestead, Waypoint and Hindsight cannot be provisioned.

**Resolution — Christo must do this, it cannot be automated:**
request a billing quota increase at
<https://support.google.com/code/contact/billing_quota_increase>.
Ask for at least 10 linked projects. Turnaround is usually 1–3 business days.

No live portal was unlinked to free a slot. That decision is Christo's.

**This is time-sensitive for Hindsight**: the HA recorder purges at `purge_keep_days: 30`,
so every day without the ingest pipe is a day of history permanently lost. Hindsight was
confirmed in scope and confirmed "build first" precisely for this reason.

---

## Budget alerts

The spec asks for a R100 alert per project. The billing account is denominated in **USD**,
so `--budget-amount=100ZAR` is rejected with `INVALID_ARGUMENT`. Budgets were created at
**5 USD** (≈ R91 at ~R18.2/USD) with thresholds at 50% / 90% / 100%. Alerting slightly below
R100 is the safe direction for a cost-capped programme.

| Budget | Amount | Project |
|---|---|---|
| `steyn-fabric (R100)` | 5 USD | 685867683378 |
| `steyn-frontdoor (R100)` | 5 USD | 464657214705 |

Budgets for the other four are pending their billing link.

---

## What is provisioned

### `steyn-fabric`
- Firestore Native, `africa-south1`, `(default)` database ✅
- Firebase enabled ✅
- Budget ✅
- 20 APIs enabled: `firebase`, `identitytoolkit`, `firestore`, `firebasehosting`,
  `firebaseappcheck`, `firebaseremoteconfig`, `run`, `cloudfunctions`, `cloudscheduler`,
  `secretmanager`, `logging`, `monitoring`, `bigquery`, `recaptchaenterprise`, `pubsub`,
  `cloudbuild`, `artifactregistry`, `iamcredentials`, `sts`, `eventarc`

### `steyn-frontdoor`
- Firebase enabled ✅
- Budget ✅
- 9 APIs enabled: `firebase`, `firebasehosting`, `firebaseappcheck`, `run`,
  `recaptchaenterprise`, `cloudbuild`, `artifactregistry`, `iamcredentials`, `sts`
- No Firestore and no buckets — deliberate, per `02-frontdoor.md` §3

Also deployed in `steyn-fabric`:
- Cloud Run `fabric-api` → `https://fabric-api-685867683378.africa-south1.run.app`
  (⚠ not publicly invokable yet — see the Fabric README)
- Runtime SA `fabric-api@steyn-fabric.iam.gserviceaccount.com` (datastore.user,
  bigquery.jobUser, bigquery.dataViewer, logging.logWriter, secretAccessor on one secret)
- Secret `ha-digest-api-key`
- Firestore rules
- WIF pool `github` + provider bound to `assertion.repository=='steyncd/fabric'`,
  deployer SA `gha-deployer@steyn-fabric.iam.gserviceaccount.com`

### `steyn-vault`, `steyn-homestead`, `steyn-waypoint`, `steyn-hindsight`
Projects exist and are ACTIVE. Nothing else can be done until billing is linked.

---

## Not yet done anywhere

- **Firebase Auth is not initialised in `steyn-fabric`** (`CONFIGURATION_NOT_FOUND`).
  Nobody can sign in to any portal until Google sign-in is enabled in the console.
- No Cloud Scheduler jobs exist (`health-sweep`, `digest-compose`).
- No seed data has been written — the seeder needs a signed-in uid to attach claims to.
- No log sinks, no `fabric-errors` Pub/Sub topic, no BigQuery `fabric` dataset.
- No App Check enforcement anywhere.
- `steyn-frontdoor` has no WIF pool, so its deploys are manual.

---

## Notes for whoever picks this up

- `gcloud` lives at `/Users/christo/google-cloud-sdk/bin`. It was installed but never
  added to PATH — the installer's final step had not been run, so `gcloud` came back
  "command not found" in a normal terminal. Fixed 2026-08-10 by sourcing the SDK's own
  `path.zsh.inc` and `completion.zsh.inc` from `~/.zshrc` (backup at `~/.zshrc.bak-20260810`).
  Sourcing the SDK's helpers beats a hard-coded PATH export because they stay correct
  when the SDK updates. `gcloud`, `gsutil` and `bq` all resolve in a fresh shell.
- The shell is **zsh**, which does not word-split unquoted variables. `gcloud services enable
  $LIST` silently passes one giant bogus service name and fails with
  `SERVICE_CONFIG_NOT_FOUND_OR_PERMISSION_DENIED`. Use `${=LIST}` or a literal list.
- `gcloud beta billing` needs the `beta` component (installed 2026-08-10).
- Budget commands need `billingbudgets.googleapis.com` enabled on the CLI's **quota project**,
  not the target project. `gcloud config set billing/quota_project steyn-fabric` was set.
- Cloud Resource Manager rate-limits writes per minute; creating six projects back to back
  trips a 429. Space them out and verify with `describe`, not `list` (list lags by ~60 s).
- A stray `steyn-hindsight-za` was created when a transient 429 made a successful create look
  like a failure. It was empty and has been deleted (soft-delete, 30-day recovery window).
