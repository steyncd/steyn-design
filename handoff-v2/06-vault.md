# 06 — Vault (items 25–30)

Repo `steyncd/vault` is empty — README only. The base spec is `../handoff/03-vault.md`
and still stands; this file adds the six features that decide whether the portal gets
used, plus what changed about where it runs.

**Runs inside `steyn-fabric`.** Hosting site `steyn-vault.web.app`, Cloud Run service
`vault-api` in `africa-south1`, own service account `vault@steyn-fabric.iam.gserviceaccount.com`
registered in `MODULE_SERVICE_ACCOUNTS` as `vault`. Firestore is the shared `(default)`
database — **prefix every collection `vault_`** and write rules that deny cross-module
reads, because the project boundary no longer does it for you. Documents live in a
dedicated bucket with uniform bucket-level access and no public objects, ever.

Registry entry exists already with `status: planned` and `healthUrl: null`. Set the
health URL to `https://vault-api-…run.app/health` — **`/health`, not `/healthz`** — on
first deploy, and register the `probe` from item 15 in the same change.

---

## 25 · Expiry engine over every document — 1 day · **gate**

The feature that pays for the portal. Everything else is storage.

Every document may carry `expiresAt` and `expiryKind`: licence disc, vehicle licence,
passport, ID, policy renewal, warranty end, service plan end, TV licence, contract
notice period, medical aid year, domain renewal.

- Nudges at **30, 7 and 1 day** via Fabric's attention feed (item 19), `severity` rising
  each step, `dueAt` set so overdue sorts first.
- A dismissal snoozes 7 days rather than deleting — see item 19.
- Renewing a document links old → new so the history stays intact and the nudge stops.
- One screen: *what expires in the next 90 days*, sorted, printable.

Capture `expiresAt` at intake with a suggestion from the document type, and let it be
blank — a document with an unknown expiry is normal and must not block filing.

---

## 26 · WhatsApp intake — 2 days · ≈ R5/month

Forward a PDF or a photo to a number and it lands in the queue with sender, timestamp
and a guess at the type. **No app, no login, no upload screen.** This is the adoption
mechanic, not a convenience: the moment a document exists is the moment it is in someone's
hand at a counter, and any flow that requires opening a laptop later loses.

- Reuse the inbound WhatsApp path already mapped for the household.
- Shared-secret webhook → Cloud Run → bucket → `vault_queue` doc, exactly the pattern
  `ha-digest-api-key` establishes. Verify the signature; reject unknown senders.
- Reply with one line: what it thinks it received and a link to confirm. That reply is
  the confirmation step — do not build a second one.
- Non-household senders are dropped silently and counted, never bounced.

---

## 27 · Warranty link to Homestead assets — half day

A till slip or invoice for a pump, geyser, gate motor or appliance creates or updates the
warranty date on the matching Homestead asset, and the asset page links back to the slip.
One capture, two portals.

Cross-module writes go through Homestead's API with Vault's service identity, never
straight into Homestead's collections. Match on asset name + supplier + date, and when it
is ambiguous, ask on the confirmation screen rather than guessing — a wrong link is worse
than no link because it silences a real warranty.

---

## 28 · Tax-year bundle — 1 day

One tap produces the **2026/27 SARS pack**: a zip plus a schedule listing every document,
what it is claimed for, and its amount, with a page of *what is missing versus last year*.

A once-a-year deadline is the moment a document store either earns its place or gets
bypassed for a folder on the desktop. Build the schedule as a printable page too — the
zip is for the accountant, the page is for Christo.

---

## 29 · Duplicate and near-duplicate detection — half day

Hash exact repeats on upload. Flag near-matches on supplier + amount + date within a
tolerance — the usual cause being the same invoice photographed twice and forwarded from
two phones. Two people forwarding into one queue makes duplicates the default rather than
the exception.

Present as *this looks like the one you filed on 3 March* with both thumbnails and a
**keep both** option. Never auto-delete.

---

## 30 · The in-case folder — half day

Policies, medical aid, wills and ID copies in one place Mandri can reach on her own, with
every access written to the audit trail so openness costs nothing in accountability.

Mandri is seeded as `partner` with Vault access. The reason the household needs this
portal at all is the day someone else has to find something — so this folder is reachable
in two taps from the Vault home, not buried behind search.

Access logging here is per-document-open, not per-page-view, and shows in item 12's trail
as `vault.incase.open`.

---

## Confidence marks — carried forward from the prototype

The v0 prototype's per-field amber marks are **deterministic cross-checks, not model
uncertainty**: the amount does not match the sum of line items, the date is in the future,
the supplier is new, the total differs from a linked expectation. Say which check failed
in words next to the mark. Never render a percentage — a confidence score invites
arguing with a number nobody can interpret.

The confirmation screen exists so Christo corrects a capture **standing there**, not later.
Keep it to one screen, large targets, and a *file it anyway* escape.
