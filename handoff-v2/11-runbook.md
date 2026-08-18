# 11 — Runbook

Build order, what each step unblocks, and how to know it worked. Roughly four to five
weeks of evenings; the first two days move the needle more than the rest combined.

---

## Step 0 — Unblock · half a day

All of `01-unblock.md`. Nothing else in this pack can be tested end to end until Christo
can sign in and the schedulers exist.

**Done when:** Christo signs in at the Front Door, sees his name and four blue live dots;
the admin screen lists him as `owner`; `GET /digest` returns a body.

---

## Step 1 — Hindsight starts carrying rows · half a day

Items **43** then **42**. Independent of everything else and the only item losing value
every day it waits — the MariaDB purge is deleting history now.

**Done when:** today's partition has thousands of rows and `MIN(ts)` predates the purge
window.

---

## Step 2 — The platform floor · one week

Items **3** (drift sweep), **12** (audit trail), **7** (claims ledger), **13** (step-up).

Build these before a fourth module lands in `steyn-fabric`, not after. Every later item
writes to the audit trail, and step-up guards every button items 1 and 6 add.

**Done when:** breaking a config invariant deliberately produces one attention item on
the Front Door with a working fix command, and every write from the admin screen appears
in *What changed today*.

---

## Step 3 — Know what it costs and whether it works · one week

Items **18** (one dataset) → **15** (real health) → **16** (cost) → **14** (cold starts)
→ **17** (headroom).

In that order: 18 gives the other three somewhere to write.

**Done when:** the Front Door's *this month* is a figure rather than a dash, and stopping
a backend while leaving its site up turns the dot amber within ten minutes.

---

## Step 4 — What Vault inherits · half a week

Items **19** (attention rules) and **20** (registry nav) — both gates, both cheap, both
things Vault would otherwise reimplement badly. Then **22** (flags) and **23** (digest
preview) while you are in the same code.

**Done when:** a snoozed item stays gone for a week and comes back; a new portal added to
the registry appears in HA Portal's switcher without a deploy.

---

## Step 5 — Vault · two weeks

`06-vault.md`. Ship **25** (expiry) and **26** (WhatsApp intake) in v0 — they are the
whole adoption story and a Vault without them is a folder with extra steps. Then 29, 27,
30, 28.

**Done when:** a photo forwarded on WhatsApp appears in the queue within a minute, is
confirmed on one screen, and something expiring in 30 days shows up in the morning digest.

---

## Step 6 — Homestead · one and a half weeks

`07-homestead.md`. `POST /jobs` **first** — Hindsight's drift rules have been posting into
nothing. Then 31 (run-hours), 32, 33, 34, 35, 36.

**Done when:** a Hindsight drift job appears in Homestead's list, and the pump's next
service is predicted from run-hours rather than a date.

---

## Step 7 — Waypoint · one and a half weeks

`08-waypoint.md`. The WhatsApp nudge with a costed trip and next weekend loaded is v0, not
a follow-up. Then 37, 38, 39, 40, 41.

**Done when:** Friday's nudge arrives with a real rand figure and one tap books, files the
confirmation in Vault and issues the house-sitter pass.

---

## Step 8 — The remaining DevOps surface · one week

Items **2** (readiness), **1** (rollback), **4** (environment cards), **6** (runbook
buttons), **5** (previews), **10** (App Check), **11** (sessions), **8** (guest passes),
**9** (role preview), **21** (search), **24** (model registry).

Ordered by how often you will use them, not by how interesting they are.

---

## Gates — the ten marked **before Vault ships**

2 · 3 · 7 · 10 · 12 · 15 · 16 · 19 · 20 · 25 · 31 · 37 · 42 · 43

The first nine are Fabric's floor. The last five are each portal's one feature that, if
it slips, makes the portal not worth opening.

---

## Verifying anything

```bash
# health of the whole estate
curl -s https://fabric-api-685867683378.africa-south1.run.app/health

# the drift sweep, on demand (needs an OIDC token)
gcloud scheduler jobs run drift-sweep --location=africa-south1 --project=steyn-fabric

# does Hindsight have today's rows
bq query --use_legacy_sql=false \
  'SELECT COUNT(*) FROM `steyn-fabric.home.state_raw` WHERE DATE(ts) = CURRENT_DATE()'

# what did CI last do
gh run list --repo steyncd/fabric --limit 5
```

---

## When something in this pack is wrong

It will be — this was written from the repos on 2026-08-11, not from running the system.
Follow v1's habit: implement what the spec says, and when reality disagrees, write the
disagreement down under **Deviations from the spec** in that repo's README, with the
reason. Fabric's v1 README does this for the USD budget, the two added routes, passkeys
and read-only error aggregation, and those four notes are the most useful part of it.

Do not silently deviate, and do not implement something you believe is wrong because the
spec says so. Ask Christo — he refers to items by number.

---

## Health is at `/health`, never `/healthz`

Google's frontend answers `/healthz` on a `*.run.app` URL with **its own 404** and never
forwards the request to the container. So `curl <service>/healthz` returns 404 no matter
how healthy the service is, and reads exactly like a failed deploy.

Every Cloud Run service in the estate serves `/health`. Verified live 15 August 2026:

| Service | `/health` | `/healthz` |
|---|---|---|
| `fabric-api` | 200 | 404 |
| `waypoint-api` | 200 | 404 |
| `homestead-api` | 200 | 404 |

`homestead/server/src/index.ts` already carries the comment — *"That cost a debugging
session once already in this programme"* — and it cost another one on 15 August, in a
smoke test written from memory rather than from the code. Hence this table.

**Two probes, not one.** A 200 on `/health` says the service is up; a **404 on a
deliberately bogus path** is what proves a 401 elsewhere came from the real handler rather
than a catch-all. One without the other is a test that always passes.

---

## Module allow-lists — two deployed variables that are wrong

Verified against live Cloud Run on 16 August 2026. Every service runs as
`<name>@steyn-fabric.iam.gserviceaccount.com` — confirmed, not assumed:

| Service | Runs as |
|---|---|
| `fabric-api` | `fabric-api@steyn-fabric…` |
| `homestead-api` | `homestead-api@steyn-fabric…` |
| `waypoint-api` | `waypoint-api@steyn-fabric…` |

`MODULE_SERVICE_ACCOUNTS` is how each service decides which *other* service may call
its module doors. Two are incomplete, and each one silently disables a feature that is
otherwise built and deployed:

| Service | Deployed value | Missing | Feature it blocks |
|---|---|---|---|
| `fabric-api` | `hindsight=…, vault-api=…` | `homestead-api`, `waypoint-api` | F16 — Waypoint cannot issue the house-sitter pass. Returns `Unknown service account`. |
| `homestead-api` | `hindsight=…` | `fabric-api` | F2 — replying "done" on WhatsApp cannot confirm a chore. Fails shut with a 403. |

Both fail *closed*, so nothing is insecure — the features simply do not work, and they
report honestly rather than silently. Neither is a code change; both are one command:

```bash
gcloud run services update fabric-api --region africa-south1 --project steyn-fabric \
  --update-env-vars "^##^MODULE_SERVICE_ACCOUNTS=vault-api@steyn-fabric.iam.gserviceaccount.com=vault,homestead-api@steyn-fabric.iam.gserviceaccount.com=homestead,waypoint-api@steyn-fabric.iam.gserviceaccount.com=waypoint,hindsight@steyn-fabric.iam.gserviceaccount.com=hindsight"
```

```bash
gcloud run services update homestead-api --region africa-south1 --project steyn-fabric \
  --update-env-vars "^##^MODULE_SERVICE_ACCOUNTS=hindsight@steyn-fabric.iam.gserviceaccount.com=hindsight,fabric-api@steyn-fabric.iam.gserviceaccount.com=fabric"
```

The `^##^` prefix sets `##` as the delimiter, because the value itself contains commas.
Plain `--update-env-vars "K=v"` is right for a value with no commas and **wrong here** —
gcloud would split the list into separate variables.

**Why this drifted:** `.env.example` named service accounts in `steyn-waypoint`,
`steyn-homestead` and two sibling projects that `handoff/PROJECT-IDS.md` records as empty
and unlinked since the consolidation. Waypoint's real token would have come back
`Unknown service account` — an auth bug in appearance, a stale variable in fact. The
example file is now corrected; the deployed variables are not. Drift rule D8 checks each
entry resolves inside `steyn-fabric`, so a sweep should now catch this class.

---

## `iam.serviceAccounts.signBlob` — the one grant that unblocks custom tokens

Observed live on 16 August 2026, on Screening Room's sign-in:

```
exchange/403 Permission 'iam.serviceAccounts.signBlob' denied on resource
(or it may not exist).
```

**Cause.** `fabric-api` mints Firebase custom tokens with `createCustomToken()`. On Cloud
Run there is no service-account private key, so the Admin SDK falls back to calling IAM's
`signBlob` API on the identity the code runs as. That requires the caller to hold
`iam.serviceAccounts.signBlob` **on its own service account**.

Verified state: `fabric-api@steyn-fabric…` grants `roles/iam.serviceAccountTokenCreator`
to `user:steyncd@gmail.com` and `roles/iam.serviceAccountUser` to the deployer — but
**nothing grants the SA that role on itself**. `roles/firebaseauth.admin`, which it does
hold, does not include `signBlob`.

**The fix — one command:**

```bash
gcloud iam service-accounts add-iam-policy-binding fabric-api@steyn-fabric.iam.gserviceaccount.com \
  --member="serviceAccount:fabric-api@steyn-fabric.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --project=steyn-fabric
```

Yes, the member and the resource are the same account. That is correct and not a typo —
the SA needs permission to sign *as itself*.

### What this is currently breaking

| Feature | Symptom today |
|---|---|
| `/exchange` — one household sign-in for Screening Room, HA Portal, HQ Finance | Sign-in fails with the 403 above. This is the whole legacy-portal unification. |
| **The passkey path** (`POST /passkeys/signin/verify`) | Would fail identically the moment `VITE_PASSKEY_ENABLED` is switched on — it mints a custom token by the same call. **Fix this before enabling passkeys**, or the first test looks like a passkey bug. |

### A correction to an earlier claim

`/exchange` was previously recorded as "live and verified". It was verified as *deployed
and responding* — a `GET /exchange/ready` and a 401 on an anonymous call. Neither exercises
`createCustomToken()`, so neither could have caught this. A route that answers is not a
route that works, and the negative probe has to reach the code path that does the work.
