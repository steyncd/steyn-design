# 10 — Data model and API surface

Everything this pack adds, in one place, so you can see the whole shape before writing
any of it.

---

## Firestore — `steyn-fabric (default)`

**Four modules now share one database.** Collection prefixes are the isolation boundary
and the rules must enforce them, because the project boundary no longer does.

### Fabric's own

| Collection | Written by | Read by | Notes |
|---|---|---|---|
| `users/{uid}` | Fabric | owner, self | existing |
| `users/{uid}/sessions/{deviceHash}` | `/me` | owner | item 11 · `lastSeen`, coarse UA |
| `portals/{id}` | owner, seed | signed-in, filtered | **extended** — see below |
| `attention/{id}` | module SAs | partner+ | **extended** — item 19 |
| `health/{portalId}` | health sweep | signed-in | **extended** — latency, probe result |
| `audit/{id}` | Fabric only | owner | items 7, 12 · **append-only**, 400-day retention |
| `flags/{portalId}/{flagId}` | owner | modules | item 22 |
| `models/{moduleId}/{useId}` | module SAs | owner | item 24 |
| `previews/{id}` | CI | owner | item 5 · TTL 7 days |
| `drift/{ruleId}` | drift sweep | owner | item 3 · last result per rule |
| `digest/{date}` | scheduler | HA key, owner | existing · **extended** with mutes |

### Registry doc — added fields (items 4, 15, 16, 21)

```ts
type Portal = {
  // existing
  id: string; name: string; blurb: string; url: string; projectId: string;
  healthUrl: string | null; minRole: Role; order: number;
  status: "live" | "planned"; enabled: boolean;
  // new
  runService?: string;          // Cloud Run service id
  hostingSite?: string;
  serviceAccount?: string;      // module SA email
  secrets?: string[];
  schedulerJobs?: string[];
  searchUrl?: string;           // item 21 fan-out
  probe?: {                     // item 15
    kind: "http" | "search" | "list";
    path: string;
    expect: { status: number; jsonPath?: string; maxMs: number };
  };
  labels?: { portal: string };  // item 16 cost attribution
};
```

### Attention doc — added fields (item 19)

`severity` · `dueAt` · `snoozeUntil` · `digestCount` · `escalatedAt`
Existing `(source, dedupeKey)` upsert and per-person dismissal are unchanged. `source`
stays **derived from the caller's verified SA**, never read from the body.

### Module collections

`vault_*` · `homestead_*` · `waypoint_*`. Rules: a module SA may write only its own
prefix; people read via their module claims; nothing is world-readable. Documents and
photos live in per-module buckets with uniform bucket-level access.

---

## BigQuery — `steyn-fabric.home` and `steyn-fabric.billing`

All partitioned by date, all with `require_partition_filter = TRUE`, all written through
Hindsight's existing `writer.ts`.

| Table | Item | Partition | Cluster |
|---|---|---|---|
| `home.state_raw` | existing | `DATE(ts)` | `entity_id, domain` |
| `home.drift_emissions` | existing | — | — |
| `home.daily_entity` | 44 | `DATE(day)` | `entity_id` |
| `home.context_daily` | 45 | `DATE(day)` | — |
| `home.portal_health` | 15 | `DATE(at)` | `portal_id` |
| `home.service_perf` | 14 | `DATE(at)` | `service_id` |
| `home.drift_results` | 3 | `DATE(at)` | `rule_id` |
| `home.audit_archive` | 12 | `DATE(at)` | `kind` |
| `billing.*` + `billing.daily_by_portal` | 16 | export-managed | — |

---

## `fabric-api` — routes

### Existing

`GET /me` · `GET /users` · `POST /claims` · `GET /portals` · `PUT /portals/:id` ·
`POST /health/sweep` · `POST /attention` · `GET /attention` · `DELETE /attention/:id` ·
`POST /digest/compose` · `GET /digest` · `GET /errors/summary` · `GET /healthz` ·
`GET /admin/estate` · `GET /admin/notices` · `GET /admin/releases` ·
`PATCH /admin/services/:id` · `PATCH /admin/portals/:id/enabled`

### New

| Route | Caller | Item |
|---|---|---|
| `POST /admin/releases/:site/rollback` | owner + step-up | 1 |
| `PATCH /admin/services/:id/traffic` | owner + step-up | 1 |
| `GET /admin/readiness` | owner | 2 |
| `POST /ops/drift-sweep` | Scheduler OIDC | 3 |
| `GET /ops/drift` | owner | 3 |
| `GET /admin/portals/:id/environment` | owner | 4 |
| `POST /admin/previews` · `GET /admin/previews` | CI SA / owner | 5 |
| `POST /ops/runbook/:action` | owner + step-up | 6 |
| `GET /audit` | owner | 7, 12 |
| `POST /guests` · `DELETE /guests/:uid` | owner + step-up | 8 |
| `POST /ops/expire-guests` | Scheduler OIDC, 00:05 | 8 |
| `GET /portals?asRole=&asModules=` | owner | 9 |
| `GET /admin/appcheck/summary` | owner | 10 |
| `GET /users/:uid/sessions` · `POST /sessions/revoke-all` | owner + step-up | 11 |
| `GET /perf?service=&days=` | owner | 14 |
| `POST /ops/prewarm` | Scheduler OIDC, 06:15 | 14 |
| `GET /cost?days=` | owner | 16 |
| `GET /quota` | owner | 17 |
| `POST /attention/:id/snooze` | partner+ | 19 |
| `GET /search?q=` | signed-in | 21 |
| `GET /flags` · `PATCH /flags/:portalId/:flagId` | modules / owner + step-up | 22 |
| `GET /digest/preview` · `POST /digest/test` · `PATCH /digest/mute` | owner | 23 |
| `POST /models/usage` · `GET /models` | module SA / owner | 24 |

**Auth doors stay four:** `requireUser`, `requireModule`, `requireScheduler`,
`requireDigestKey`. Step-up (item 13) is a decorator on `requireUser`, not a fifth door.
App Check (item 10) is a check applied to browser-originating routes, not a door either.

---

## Scheduler jobs, all `africa-south1` / Africa/Johannesburg

| Job | Time | Item |
|---|---|---|
| `daily-rollups` | 03:00 | 44 |
| `drift-sweep` (Fabric config) | 04:30 | 3 |
| `hindsight-drift` | 05:30 | existing |
| `prewarm` | 06:15 | 14 |
| `digest-compose` | 06:20 | existing |
| `health-sweep` | every 5 min | existing, extended by 15 |
| `expire-guests` | 00:05 | 8 |
| `audit-archive` | 02:00 | 12, 18 |

Times are deliberately staggered: rollups before drift, drift before the digest,
pre-warm before compose, compose ten minutes before HA reads at 06:30.
