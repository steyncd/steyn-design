# 07 — Homestead (items 31–36)

Repo `steyncd/homestead` is empty. Base spec `../handoff/04-homestead.md` stands; this
adds six features and the shared-project changes.

**Runs inside `steyn-fabric`.** Hosting `steyn-homestead.web.app`, Cloud Run
`homestead-api`, service account `homestead@steyn-fabric.iam.gserviceaccount.com`
registered as `homestead`. Firestore collections prefixed `homestead_`. Health URL on
`/health`. Register the item 15 probe as *job list loads*.

**Hindsight is already trying to talk to it.** `pump_while_full` and `duty_cycle_creep`
POST a Homestead job today and the POST is a no-op because Homestead does not exist.
Build `POST /jobs` (module SA auth, dedupe on `(source, dedupeKey)` like Fabric's
attention) **first**, before any screen — the moment it exists, four months of drift
detection starts landing somewhere.

The nine real assets and two overdue jobs from the prototype are the day-one seed. Ship
with them present, not with an empty state.

---

## 31 · Jobs on run-hours, not the calendar — 1 day · **gate**

Service the pump every N run-hours read from Hindsight, not every six months.

- Asset carries `meter: {source: "sensor.borehole_run_hours", unit: "h"}` and
  `schedule: {everyUnits: 250, warnAt: 0.9}`.
- A daily job queries Hindsight's rollups (item 44), compares against `lastServicedAt`
  reading, and raises the job at 90%.
- Calendar schedules stay supported — a gutter clean is seasonal, not usage-driven — so
  `schedule.kind` is `usage` | `calendar` | `both`.

This is the join that makes the property register and the house's own history one system
rather than two.

---

## 32 · Cost per asset, for life — 1 day

Every job, quote, part and callout attaches to an asset, so the borehole carries a running
total and a replace-or-repair conversation has numbers in it. Show acquisition cost,
lifetime spend, spend in the last 12 months, and cost per year owned.

Amber mark when 12-month spend exceeds a third of replacement value — the point at which
repairing is usually the more expensive choice.

---

## 33 · Contractors and quotes — half day

Who came, what they charged, what they said, and whether you would call them again —
attached to the asset and searchable two years later when the same thing fails. Fields:
name, trade, phone, date, quoted, paid, notes, `wouldCallAgain: yes | no | maybe`.

Callout history is the part of property maintenance that is always in a WhatsApp thread
and never anywhere findable. Accept a pasted quote as a Vault document and link it.

---

## 34 · Spares and consumables — half day

Filters, fuses, pool salt, gate motor batteries, borehole fuses. Each has a linked asset,
quantity on hand, and a reorder point.

The value is the join: when a job is raised and the part is not on the shelf, the digest
line says so in the same sentence. A job raised without the part in hand becomes a job
deferred, which is how a maintenance register quietly stops being used.

---

## 35 · Meter reads against the sensors — half day

Photograph the municipal meter, capture the number, compare with what the house's own
sensors think over the same period. The house already meters water and electricity in
Home Assistant; the municipality's number is the one nobody records.

- Monthly nudge on the day the meter is usually read.
- Store `{at, kind, reading, photoRef, sensorDelta}`.
- A widening gap is either a leak or a billing error, and both are worth catching in the
  month they start — raise attention at a 10% divergence sustained over two reads, not on
  a single reading.

---

## 36 · Insurance schedule export — half day

The register produces the list the policy should carry — item, serial, value, purchase
date, photo — as a printable page and a CSV. Flag anything insured for less than it would
cost to replace today.

An asset register with photos and serials is already 90% of a claim; the missing 10% is
the export. Prompt for serial and a photo at asset creation for exactly this reason, and
allow both to be blank rather than blocking.
