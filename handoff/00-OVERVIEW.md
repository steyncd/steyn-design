# Steyn Portals — programme overview (v2)

For Claude Code. This supersedes the first draft: six modules became **five projects**, and
every module now carries adoption requirements as build requirements.

Context: Christo Steyn, Pretoria (Faerie Glen, 302 Wyoming Street). Two portal users —
Christo (owner) and Mandri (partner). Existing: Home Assistant (HAOS 192.168.0.7, config on
/Volumes/config, MariaDB recorder, 30-day purge, WhatsApp control channel, 06:30 morning
digest), HA Portal (Svelte 5 + Vite + Firebase Hosting, 43 views), HQ Finance
(`steyn-family-finance`), Screening Room, Codebots.

---

## 1. The five projects

| # | Project | GCP project id | Repo | Local folder | What it is |
|---|---------|----------------|------|--------------|------------|
| 1 | **Fabric** | `steyn-fabric` | `steyncd/fabric` | `Fabric` | Identity, claims, health sweep, attention feed. Almost no UI — a platform plane |
| 2 | **Front Door** | `steyn-frontdoor` | `steyncd/frontdoor` | `FrontDoor` | The landing page at the custom domain. Login-gated, links every portal |
| 3 | **Vault** | `steyn-vault` | `steyncd/vault` | `Vault` | Intake + document store + family archive. Counter merged in |
| 4 | **Homestead** | `steyn-homestead` | `steyncd/homestead` | `Homestead` | The property as an asset register that raises jobs |
| 5 | **Waypoint** | `steyn-waypoint` | `steyncd/waypoint` | `Waypoint` | Weekend and holiday planner, grounded in real places |

Plus one shared library: **`steyncd/steyn-design`** (no cloud project — a git dependency).

Deferred, pending Christo's confirmation: `steyn-hindsight` as an **ingest-only** project
(see `06-hindsight-ingest.md`). It has no user interface and is a day of work; the reason to
do it early is that the HA recorder deletes history at 30 days.

Dropped: Larder. Till slips remain a Vault document type.

### Why Fabric and Front Door are separate projects
Front Door carries the custom domain and is the only project with a public origin Christo
hands out. Fabric holds identity and household data plumbing and should never be reachable
from that origin except through its API. Splitting them means the domain, its certificate
and its DNS live in a project that can be redeployed or replaced without touching auth.

### Project id availability
Ids are globally unique. Check each (`gcloud projects describe <id>` → NOT_FOUND means
free). Fallback order: `steyn-<name>` → `steyn-<name>-za` → `steyn-<name>-1`. Repo and
folder names never take the suffix. Record every id in `handoff/PROJECT-IDS.md` as you go.

---

## 2. The rule that outranks the specs

**A module ships with all three of these or it is not finished.** This is the change from
the first draft, and it exists because the failure mode for this programme is six working
things nobody opens.

1. **A digest line.** The HA automation `feature_morning_digest.yaml` already fires at 06:30
   to WhatsApp and push. Each module contributes at most one line a day, only when it has
   something to say, always with a deep link. Modules POST to Fabric
   (`POST /attention`); a single HA REST sensor reads Fabric's digest endpoint and the
   existing automation renders it.
2. **A WhatsApp command.** The router (`script.wa_process_message`, `feature_wa_inbound.yaml`)
   already answers `status`, `energy`, `fuel`. Each module adds its own — `doc <what>`,
   `warranty <thing>`, `jobs`, `trip` — plus, for Vault, "a photo with no caption means
   file this". Commands are deterministic `choose` branches, AI only as fallback.
3. **A Front Door tile**, registered in Fabric's `portals` collection, with a working
   `/healthz`.

A fourth, for Front Door only: it must be installable as a PWA and set as the browser
homepage on both desktops.

---

## 3. Base functionality — "slightly useful on day one"

Scaffolding is not a deliverable. Each spec has a **Day one** section defining the smallest
thing that is genuinely useful the moment it deploys, and each of those depends on **seeded
real data**, not fixtures:

- **Fabric** — four real users/roles, ten portals registered, health sweep live.
- **Front Door** — signs Christo and Mandri in and links all ten portals with live dots.
- **Vault** — 20 seeded documents that matter, so the first search succeeds; WhatsApp photo
  intake works end to end.
- **Homestead** — the nine real assets pre-loaded with their real dates, and the two overdue
  jobs already showing.
- **Waypoint** — the SA public-holiday calendar loaded and one costed weekend generated.

---

## 4. Stack

- **Frontend:** Svelte 5 + TypeScript + Vite, SPA, no SSR. Same as HA Portal.
- **Hosting:** Firebase Hosting per project, SPA rewrite.
- **Backend:** Cloud Run (Node 22, TypeScript, Fastify) for APIs; Cloud Functions 2nd gen
  only for event triggers (Storage finalize, Pub/Sub, Scheduler, Firestore).
- **Data:** Firestore Native per project. Cloud Storage per project.
- **Auth:** Firebase Auth, single tenant in `steyn-fabric`.
- **Region:** `africa-south1` for Cloud Run, Functions, Firestore, GCS. Verify model
  availability there; if a model or Maps tool is not served from it, call from
  `europe-west1` or the global endpoint and keep data at rest in `africa-south1`.
- **Node 22 LTS, npm.**

### AI models
Model ids churn. Keep them in config (`MODEL_FAST`, `MODEL_REASON`, `MODEL_EMBED`),
**verify against `ai.google.dev/gemini-api/docs/models` at build time**, and record what you
used and when in each README.

| Config key | Role | Start from |
|---|---|---|
| `MODEL_FAST` | Classification, extraction, short narration | Current Gemini 3.x **Flash** |
| `MODEL_REASON` | Planning, multi-step, grounded generation | Current Gemini 3.x **Pro** |
| `MODEL_EMBED` | One vector space for text, image, audio, video, PDF | `gemini-embedding-2` |

Prefer the **Interactions API** (GA June 2026) for new code; `generateContent` still works.
Use **Firebase AI Logic** from the client only for chat-shaped features; anything with tools,
structured output or a cost ceiling runs server-side on Cloud Run.

Every server-side call: token cap, timeout, and a row in the module's `ai_calls` collection
recording `{model, inputTokens, outputTokens, latencyMs, at, feature}`.

---

## 5. Design system — `steyncd/steyn-design`

Build this first; everything imports it at a tag, not `main`.

Copy `ha_portal/src/app.css` verbatim into `tokens.css` — the `:root` block and all nine
`[data-theme]` blocks. It carries: the neutral ramp (`--bg #22252a`, `--s1`, `--s2`,
`--line`, `--mut`, `--tx`, `--tx2`), the fixed copper accent (`--acc #d69a63`,
`--acc2 #c08650`, `--acc-ink #151312`, `--grad`), status (`--ok #7ec8f2` blue,
`--warn #f0a44a` amber), domain colours, radii (`--r-surface 16px`, `--r-control 10px`,
`--r-pill 999px`), `--dur 180ms`, `--ease`, and the aurora background.

Add:
- `surfaces.css` — `.card` / `.card--hero` (glass), `.cell` (hairline), `.lb`, `.kicker`,
  `.divider`, `.big` + `.big .unit`, `.num`, `.sub`, `.status`, `.attn`, `.btn-primary`.
- `Shell.svelte` — sidebar + sticky header + content slot; the layout every module uses.
- `Icon.svelte` — Lucide, 18px, 1.7px stroke, currentColor.
- `fmt.ts` — `zar()`, `dateZA()`, `kwh()`, `durationH()`, all `en-ZA`,
  `Africa/Johannesburg`, tabular numerals.

**Hard constraint:** Christo is red–green colour blind. Meaning never rides green-vs-red.
Blue = good/live, amber = attention, and colour is never the only signal — always glyph +
label + colour. Weight 800 is for values, 700 for labels; uppercase only on `.kicker`.

The prototype `Fabric Portal.dc.html` in the design project is the visual reference for
layout, density and copy tone. Read it before writing any screen.

---

## 6. Identity in one paragraph

`steyn-fabric` owns Firebase Auth. Clients initialise **two** Firebase apps: a named app
`"fabric"` with Fabric's config for auth, and the default app with their own project's
config for Firestore/Storage. Servers verify ID tokens with `firebase-admin` initialised for
`projectId: "steyn-fabric"`, then check `household === "steyn"` and read `role`. Firestore
rules in every project read `request.auth.token.role`; default deny. App Check
(reCAPTCHA Enterprise) enforced on every Hosting site, Cloud Run service and Function.

Claim shape: `{ role: "owner"|"partner"|"display"|"guest", household: "steyn",
modules: string[], exp }`.

---

## 7. Repo structure — identical in every module

```
<Name>/
  src/
    lib/
      auth.ts              // two Firebase apps; getIdToken(); role helpers
      api.ts               // fetch wrapper that attaches the token
      stores.svelte.ts     // Svelte 5 runes state
      fmt.ts               // re-export from steyn-design
    routes/                // one .svelte per screen
    App.svelte
    main.ts
  server/                  // Cloud Run service
    src/
      index.ts             // Fastify bootstrap
      auth.ts              // verifyIdToken middleware (Fabric project id)
      routes/*.ts
      ai.ts                // model calls + ai_calls logging
    Dockerfile
    package.json
  functions/               // 2nd-gen triggers, only if the module has them
  config/                  // seed data: seed-assets.yaml, entities.yaml, holidays.yaml
  firestore.rules
  firebase.json  .firebaserc  vite.config.ts  tsconfig.json
  .env.example  README.md  CLAUDE.md
  .github/workflows/deploy.yml
```

`CLAUDE.md` in each repo = that module's handoff file, copied verbatim.
`npm run check` = `svelte-check --tsconfig ./tsconfig.json && tsc -p server --noEmit`.
`npm run deploy` = check → build → `firebase deploy --only hosting,firestore:rules` →
`gcloud run deploy`.

CI: GitHub Actions on push to `main`, **Workload Identity Federation only** — no
service-account JSON keys. If WIF cannot be made to work, stop and report; do not fall back
to a downloaded key.

---

## 8. Build order

1. `steyn-design` (half a day)
2. **Fabric** — auth, claims, portals, health, attention
3. **Front Door** — the domain, the landing page, PWA
4. **Vault** — the largest, and the one with the most daily value
5. **Homestead** — small, and Vault feeds it
6. **Waypoint** — self-contained
7. *(if confirmed)* **Hindsight ingest** — a day, no UI, and the sooner the better

Register each module in Fabric's `portals` collection as it ships. A module that is not on
the Front Door is not done.

---

## 9. Cost

Ceiling R250/month for everything. Budget alert per project at R100. Cloud Run
`--min-instances=0 --max-instances=2 --concurrency=40`. GCS lifecycle rules per spec. AI
calls capped and logged. Expected steady state: Vault ~R80 (storage-led), Waypoint ~R15
(Maps), Fabric/Front Door/Homestead ~R0, Hindsight ~R38 if built.
