# Runbook for Claude Code

In order. Stop and report if a step fails rather than working around it — several of these
are one-way doors.

---

## Step 0 — Four answers from Christo before anything

1. **Billing account id** for the new projects.
2. **Organisation or personal?** Is there a GCP org/folder, or are these personal projects?
3. **Local code root** — the folder already holding `HA_Portal`, `SteynFinance`,
   `screening_room`, `CodeBots`.
4. **Domain** — registered? If not, Front Door ships on `*.web.app` and the domain attaches
   later with no code change.

Also confirm: **is Hindsight ingest-only in scope?** (`06-hindsight-ingest.md`.)

---

## Step 1 — Project ids

For `steyn-fabric`, `steyn-frontdoor`, `steyn-vault`, `steyn-homestead`,
`steyn-waypoint` (+ `steyn-hindsight` if confirmed):

```bash
gcloud projects describe <id> 2>&1 | head -1     # NOT_FOUND = available
```

Fallback order `steyn-<name>` → `steyn-<name>-za` → `steyn-<name>-1`. Repo and folder names
never take the suffix. Write `handoff/PROJECT-IDS.md`: name | project id | repo | local path
| hosting URL. Everything downstream reads that file.

---

## Step 2 — Per project, the same seven things

```bash
gcloud projects create "$PID" --name="$NAME"
gcloud beta billing projects link "$PID" --billing-account="$BILLING"
gcloud services enable <API list from the module spec> --project="$PID"
gcloud firestore databases create --location=africa-south1 --type=firestore-native --project="$PID"
firebase projects:addfirebase "$PID"
gcloud storage buckets create gs://<bucket> --location=africa-south1 --uniform-bucket-level-access
gcloud billing budgets create --billing-account="$BILLING" --display-name="$PID" \
  --budget-amount=100ZAR --threshold-rule=percent=0.5 --threshold-rule=percent=0.9
```

Then: create the private GitHub repo, clone into the local code root, scaffold per §7 of the
overview, push, and set up Workload Identity Federation for Actions (pool + provider bound
to `repo:steyncd/<name>:ref:refs/heads/main`, deployer service account with
`roles/firebasehosting.admin`, `roles/run.admin`, `roles/iam.serviceAccountUser`, plus the
module's data roles). **No service-account JSON keys.** If WIF cannot be made to work, stop
and report.

---

## Step 3 — `steyn-design` first

Repo `steyncd/steyn-design`, no cloud project. `tokens.css` copied verbatim from
`ha_portal/src/app.css`; then `surfaces.css`, `Shell.svelte`, `Icon.svelte`, `fmt.ts`.
Tag `v1`. Every module depends on the tag, never `main`.

---

## Step 4 — Build order and gates

`steyn-design` → **Fabric** → **Front Door** → **Vault** → **Homestead** → **Waypoint**
→ *(Hindsight ingest, if confirmed)*.

Each module has three gates before it counts as done:
1. Deployed to its hosting URL and registered in Fabric's `portals` with a live `/healthz`.
2. Its seed data loaded — the real documents, the real assets, the real calendar.
3. Its digest line and WhatsApp command working end to end against the real HA config.

A module that passes 1 but not 3 is not finished. That rule is the whole point of this
revision.

---

## Step 5 — HA-side changes (small, but they are what make this used)

In `/Volumes/config`:
- `feature_morning_digest.yaml` — add a REST sensor reading Fabric's `GET /digest` and
  append those lines to the 06:30 message.
- `feature_wa_inbound.yaml` — add deterministic `choose` branches for `doc <what>`,
  `docs`, `warranty <thing>`, `jobs`, `trip`; and route an inbound image with no caption to
  Vault's intake endpoint.
- Keep `mode: parallel, max: 10` on `wa_process_message` and `continue_on_error: true` on
  the AI path — both were hard-won fixes.
- Allowlist any new domain in NextDNS (profile *HelloLiamDNS*) or the calls will fail in a
  way that looks like broken code.

---

## Step 6 — Wire the existing four

Register `helloliam-ha-dashboard`, `steyn-family-finance`, Screening Room and Codebots in
Fabric's `portals` collection with their real URLs. Adding a `/healthz` to each is a small
change worth making. Adopting Fabric auth in them is later work, not v0.

---

## Step 7 — Handback

Report: project ids actually used, hosting URLs, what is deployed and working, what is
stubbed, every deviation from these specs and why, the real monthly cost from billing data
after the first week, and the manual steps left for Christo — domain DNS, OAuth consent
screen, Gmail label + consent, Takeout export, MariaDB dump, HA automation edits, Maps key
restrictions.

---

## Things that will bite you

- **`/healthz` does not work on a `*.run.app` URL.** Google's frontend answers it with
  its own branded 404 and never forwards the request to the container — so a health
  sweep pointed at `/healthz` reports every module as down while every module is fine.
  Confirmed 2026-08-10 against `fabric-api`: `/healthz` returns `text/html` with no
  `x-cloud-trace-context`, while `/healthz/`, `/health` and every other path reach
  Fastify and carry the trace header. **Serve health on `/health` and register that
  in the `portals` registry.** Keep `/healthz` registered too — it works fine behind a
  custom domain and locally; only the `*.run.app` edge eats it. This applies to every
  module in the programme, not just Fabric.

- **The recorder purges at 30 days.** If Hindsight ingest is confirmed, do it first, not last.
- **Frigate's config on the SMB mount is stale** — the live add-on does not read it.
- **NextDNS blocks API domains.** Check its logs before debugging code.
- **HA's `rest:` platform is all-or-nothing** — one bad sensor kills every REST sensor, and
  `check_config` does not catch it. Diagnose via `system_log/list`.
- **Google Photos library scopes are gone** (31 March 2025). Vault's archive lane ingests
  from Takeout and the scanner; never design around a library crawl.
- **Model ids churn.** Verify at build time, keep them in config, write down what you used.
- **Colour:** never green-vs-red. Blue = good, amber = attention, always with glyph + label.
- **The alarm panel toggles.** On this IDS panel a raw service call is a keypad toggle —
  `alarm_disarm` sent to a disarmed area *arms* it. Only the `_safe` wrappers in
  `scripts.yaml` may touch it. Nothing in these five projects should call it at all.
