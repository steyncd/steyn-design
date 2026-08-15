# 09 — Hindsight (items 42–45)

Live, verified end to end, and **completely empty**. A POST of four states returned
`{"received":4,"written":2,"dropped":2,"malformed":0}` and both rows read back out of
BigQuery correctly. Home Assistant has never sent it a row.

**No screen, and there should never be one.** Base spec `../handoff/06-hindsight-ingest.md`.

Runs in `steyn-fabric` with its own service account
`hindsight@steyn-fabric.iam.gserviceaccount.com`, registered with Fabric and allowed to
post attention as `hindsight`. Keep that separation — the module→Fabric trust model maps
SA email to `source`, so Hindsight still cannot post as any other module.

---

## 43 · Pick the buffer shape and finish the feed — half day · **gate · do this first**

HA has no built-in "collect state changes for 60 seconds" primitive. Two shapes were put
to Christo:

1. A `state_changed` event trigger appending to an `input_text`-backed list — simple, but
   caps out fast.
2. **A small pyscript/AppDaemon module holding an in-memory list and POSTing directly
   every 60 s** — more robust, and it buffers across a failed POST, which is exactly what
   the ingest endpoint's 503-on-write-failure is designed for.

**Recommend option 2 and say so.** It is the only one that does not lose history the
first time the network drops. `/Volumes/config` is mounted, so it can be written — but
it edits the live house config, so get the nod before touching it.

Traps that are already documented and will bite again:

- **`timeout:` is not valid on a `- action:` service call.** It silently fails config
  validation.
- The ingest key lives in Secret Manager as `hindsight-ingest-key` in `steyn-fabric` and
  must go into HA's `secrets.yaml`, never inline in a package.
- `ts` accepts ISO 8601 or epoch millis; `attributes` is optional; unknown fields are
  ignored. Rows that fail to parse are counted, not fatal — **a batch is never rejected
  wholesale**, because HA buffers on non-2xx and a rejection would cost real history.

**Acceptance:** `SELECT COUNT(*) FROM home.state_raw WHERE DATE(ts) = CURRENT_DATE()`
returns thousands, and it keeps doing so after HA is restarted.

---

## 42 · The backfill — half day · **gate**

Load the MariaDB dump so `SELECT MIN(ts)` predates the current purge window. Every drift
rule depends on history that is being deleted every thirty days: `pump_while_full` needs
four months, `duty_cycle_creep` needs thirteen.

```bash
# on the HAOS box
mysqldump -u homeassistant homeassistant states states_meta > states.sql
```

Christo has to produce the dump. Write the loader to be **re-runnable and idempotent** —
dedupe on `(entity_id, ts)` — because a backfill that cannot be repeated safely will be
run once, badly. Load through the same `writer.ts` Storage Write path so the timestamp
and numeric parsing behave identically to live ingest.

The two hours already paid for, both documented at their call sites: the default stream
goes in **`streamId`, not `streamType`**; and Storage Write encodes `TIMESTAMP` as int64
micros since epoch, so an ISO string throws `interior hyphen`.

---

## 44 · Daily rollups the portals can afford — half day

Scheduled queries collapse `state_raw` into daily per-entity aggregates —
`home.daily_entity` with min, max, mean, sum-of-deltas, sample count, partitioned by
`DATE(day)`, clustered on `entity_id`.

`require_partition_filter` makes an unbounded scan fail rather than bill you, which is
correct, and means every dashboard needs a rollup to read. HA Portal's *this month vs
last* tiles and Homestead's run-hour schedules (item 31) both read this table, never
`state_raw`.

Run at 03:00, before the 04:30 drift sweep and the 05:30 Hindsight sweep.

---

## 45 · Join weather and holidays before comparing — half day

*Duty cycle up 20%* means nothing without ambient temperature and whether the house was
occupied. `duty_cycle_creep` already qualifies on ambient within 2 °C — give the
qualifier a source it can trust rather than a nearby sensor's word.

Store `home.context_daily`: date, min/max/mean ambient, rainfall, public holiday flag,
school term flag, household-away flag (from Waypoint's booked trips, item 40). Join it in
every comparison rule.

This is what stops the anomaly rules crying wolf during a heatwave or while the family is
away — the two periods where the raw numbers look most alarming and mean least.

---

## Drift rules — current state

Three, each emitting at most once per week, tracked in `home.drift_emissions`:
`pump_while_full`, `sensor_silence`, `duty_cycle_creep`. Each requires history it does
not have yet, so they will return nothing for a long time and **that is correct**. A rule
failing is logged and never silences the other two. Keep that property when adding rules.

Once Homestead exists (`07-homestead.md`), the Homestead job POST stops being a no-op —
verify it lands rather than assuming it does.
