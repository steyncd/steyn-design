# 08 — Waypoint (items 37–41)

Repo `steyncd/waypoint` is empty. Base spec `../handoff/05-waypoint.md` stands.

**Runs inside `steyn-fabric`.** Hosting `steyn-waypoint.web.app`, Cloud Run
`waypoint-api`, SA `waypoint@steyn-fabric.iam.gserviceaccount.com` registered as
`waypoint`. Collections prefixed `waypoint_`. Health on `/health`. Item 15 probe:
*price a fixed route*.

Base is Pretoria. Every distance, cost and drive time is from there unless told otherwise.

**The core product is not the browser screen.** It is the WhatsApp nudge that arrives
pre-prepared with the trip cost and next weekend already loaded. Build the nudge in v0 —
a planner nobody opens plans nothing.

---

## 37 · Costed before you commit — 1 day · **gate**

One number before anything is booked: fuel at this week's SA price, tolls, distance from
the Pretoria base, accommodation, and a contingency line.

- Fuel from the SA price feed already in use in the estate; store the price used with the
  trip so an old estimate stays explicable.
- Tolls per route — the N1 and N4 routes out of Pretoria are the ones that matter.
- Vehicle profile carries `l/100km`, so the figure is the household's, not a generic one.
- Show the cost **per night** as well as total. That is the number people actually
  compare.

---

## 38 · The weekends that actually exist — half day

SA public holidays and school terms become a strip of the free weekends left this year,
long weekends marked. You pick a weekend, then a place — not the other way round.

Planning fails on the calendar, not the destination. Mark weekends already committed
(from the household calendar if reachable, manually otherwise) so the strip shows what is
genuinely available.

---

## 39 · Weather and load-shedding guard — half day

Watch the chosen dates and say something **while cancellation is still free** — that is
the whole design constraint, so the check runs against the booking's free-cancellation
date, not the travel date.

Load-shedding stage matters for a self-catering booking in a way it does not for a hotel,
so it is a property of the accommodation type, not a global warning. Both feeds are
already in use elsewhere in the estate; this is a query, not a new dependency.

---

## 40 · Booking closes three loops — 1 day

Confirming a trip:

1. **Vault** — files the confirmation as a document with the trip dates as metadata.
2. **Fabric** — issues a house-sitter guest pass (item 8) for exactly those dates,
   auto-expiring on return. Owner confirms before it is issued; never silently grant.
3. **HQ Finance** — hands the cost over as a planned expense.

One action, three portals, no admin. Each hop uses Waypoint's service identity against
the other module's API, and each writes to the audit trail. If a hop fails, the trip is
still booked and the failure becomes an attention item — never roll the booking back.

---

## 41 · Been there, would go again — half day

A short ledger of trips taken: what it cost against what it was estimated, and whether it
was worth it. Good repeats surface first; the bad ones stop being suggested.

A planner with no memory suggests the same disappointing farm every spring. Two fields do
the work — a rating and one line of *what we would do differently* — so keep the form to
those two and a photo.

---

## The print sheet

Keep it from the prototype: one page per trip with the route, the booking reference,
addresses, phone numbers and the costed total, printable and readable in a car with no
signal. It is the artefact that makes the portal trusted on the day.
