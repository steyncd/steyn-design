# 04 — Fabric · Performance and cost (items 14–18)

The free tier is generous. The failure mode is not noticing you left it, and the second
failure mode is a health dot that says *live* about a portal that does not work.

---

## 14 · Cold-start budget instead of keep-warm — 1 day · ≈ R10/month

`Estate.svelte` offers **Keep warm** and **Scale to zero** with an honest footnote that
keep-warm is the one setting that costs money — and no numbers to decide with.

**Add the numbers.** Per service, over 7 days: request count, p50 and p95 latency, and
cold-start count (Cloud Monitoring `run.googleapis.com/container/startup_latencies`
with the `startup_type` label). Sparkline plus figures, in the same table row.

**Then remove the need.** A Scheduler job at 06:15 pings `/health` on each service ahead
of the 06:20 digest compose and the 06:30 HA read. That is the only moment of the day
with a guaranteed audience, and it costs cents rather than a permanently billed
instance. Keep the manual keep-warm toggle — capped at `min=1` server-side, as now — but
make the pre-warm the recommended path in the UI copy.

---

## 15 · Health that means something — 2 days · **gate**

`POST /health/sweep` currently probes `healthUrl` with a 3-second timeout every five
minutes. That distinguishes *not responding* from *not checked* — which is genuinely
useful and why the Front Door's dot has three states — but it cannot distinguish
*answering* from *working*.

**Synthetic transactions.** Each portal registers a `probe` in the registry:

```yaml
probe:
  kind: http            # http | search | list
  path: /api/search?q=__probe__
  expect: { status: 200, jsonPath: "results", maxMs: 2500 }
```

Vault returns a search result, Homestead loads the job list, Waypoint prices a fixed
route. A probe runs as a module-scoped service identity, never as a person.

**Record the series.** Every sweep writes `{portalId, at, ok, ms, detail}` to BigQuery
`steyn-fabric.home.portal_health` (see item 18), partitioned by `DATE(at)`. Keep 30 days
hot in Firestore for the dot, everything else in BigQuery for the graph.

**Front Door.** The dot stays three-state and stays glyph + label + colour. Add a fourth
honest state: `✓ live · slow` in amber when the last three probes exceeded `maxMs`. A
portal that works but takes eight seconds is not the same as one that is fine.

**Acceptance:** stop Vault's search backend while leaving the site up; the dot must go
amber within ten minutes and an attention item must be filed.

---

## 16 · Cost per portal, daily — 1 day · ≈ R5/month · **gate**

The Front Door renders *history kept* and *this month* as dashes on purpose, because
billing is not readable from a browser. Fix the second one properly.

1. Enable **Cloud Billing export to BigQuery** into `steyn-fabric.billing`.
2. Because four modules share one project, per-portal attribution needs **labels**: set
   `portal=<id>` on every Cloud Run service, Scheduler job, bucket and BigQuery dataset.
   Add a drift assertion (D13) that fails when a resource in a programme project carries
   no `portal` label.
3. One view, `billing.daily_by_portal`, and `GET /cost?days=30` on `fabric-api` (owner
   only — the Front Door figure is aggregate, not per portal).
4. Estate panel: month to date, projected month end, budget line at 5 USD, and the three
   most expensive line items. Amber when projection exceeds budget.

**The budget is 5 USD, not R100** — the billing account is denominated in USD and
`--budget-amount=100ZAR` is rejected outright. 5 USD ≈ R91, so it alerts slightly early,
which is the safe direction. Do not "fix" this.

---

## 17 · Headroom, not raw numbers — half day

One panel of the limits that actually bind, each as percentage of headroom plus the date
it runs out at the current rate:

| Limit | Why it is on this list |
|---|---|
| Linked projects: 5 of 5 | Already binding — it is why Hindsight folded into `steyn-fabric` |
| Firestore free-tier reads/writes per day | Four modules on one project share one quota |
| BigQuery active storage | Hindsight grows monotonically |
| BigQuery query bytes | `require_partition_filter` guards it; measure anyway |
| Secret Manager versions | Rotation creates them faster than you expect |
| Gemini + TMDB key usage (Screening Room) | Live, unmetered, and outside the digest |

A limit you hit before you noticed it approaching is the expensive kind.

---

## 18 · One dataset for the whole estate — 1 day · ≈ R5/month

Hindsight's `steyn-fabric.home` dataset is already partitioned by `DATE(ts)`, clustered
on `entity_id, domain`, and carries `require_partition_filter = TRUE` so an unbounded
`SELECT *` fails rather than quietly scanning everything and billing for it. That is
exactly the treatment the platform's own series need.

Add, same dataset, same guards:

| Table | Written by | Partition | Clustered on |
|---|---|---|---|
| `portal_health` | health sweep (item 15) | `DATE(at)` | `portal_id` |
| `service_perf` | Monitoring export (item 14) | `DATE(at)` | `service_id` |
| `audit_archive` | nightly job from Firestore `audit` | `DATE(at)` | `kind` |
| `drift_results` | drift sweep (item 3) | `DATE(at)` | `rule_id` |

Plus daily rollup views so panels read small tables. One place to query, one storage
bill, and history that survives a service being rebuilt.

**Two traps already paid for, in `hindsight/server/src/writer.ts`:** the default stream
goes in `streamId`, not `streamType`; and Storage Write encodes `TIMESTAMP` as int64
micros since epoch — pass an ISO string and protobuf throws `interior hyphen`, which
points nowhere near the real cause. Reuse that writer rather than writing a second one.
