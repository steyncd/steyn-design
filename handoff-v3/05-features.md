# 05 — Features

Twenty-six household features. None of these repeat platform items 1–45 in `handoff-v2/`.

---

## The thesis

Mandri has not bounced off this — she has not seen it. That is the best possible starting
position, because household platforms nearly always fail the same way: the builder shows
the family *his* dashboard. The research is consistent that people prioritise ease of use
over capability, that a shared screen fails when it carries the builder's diagnostics, and
that the recurring failure is not misunderstanding but **forgetting the system exists at
the moment it would have helped**.

Two rules follow, and every feature below was filtered through them:

> **1. A feature earns its place if it reaches her without her opening anything.**
> Notification, kitchen tablet, or a card already on a screen she was going to look at.
> Build the rest too — but do not count them as adoption.
>
> **2. Never make her the audience for a number she cannot act on.** Battery percentages,
> uptime, cost-per-portal — operator surface. Her surface answers questions she already
> has.

---

## A · Adoption

| | Feature | Where | Effort |
|---|---|---|---|
| **F1** ★ | **The kitchen tablet has no sign-in and one screen.** Weather, who is where, tonight, the one thing that wants attention, the boys' chores. Never asks who you are — authenticated by being in the house, running as the existing `display` role. | Front Door | 3 days |
| **F2** ★ | **WhatsApp is a first-class client.** Replies *do* things: forward a bill → files in Vault; "done" → clears a chore; "snooze" → defers; "is the gate closed?" → answers. | Fabric | 4 days |
| **F3** | **One weekly note, Sunday evening, written like a person.** Six sentences: what the house did, what it cost, what is coming, what needs a decision. No charts. | Fabric | 2 days |
| **F4** | **Everything answers "so what should I do?"** Tank at 34% is not information; it is *do not run the irrigation tonight*. Sentence is the headline, number is support. | All | ongoing |
| **F5** ★ | **Her home screen is not your home screen.** Same portal, different default ordering by role. Not a simplified version — a differently ordered one. | Front Door | 2 days |

## B · The family screen

| | Feature | Where | Effort |
|---|---|---|---|
| **F6** ★ | **Chores that pay, with a ledger the boys can read.** A list each, a value per job, a running balance. Tap to claim, photograph to prove, a parent confirms from their phone. Balance visible on the tablet so it is never a dispute. | Homestead | 5 days |
| **F7** | **The week, on one screen, for four people.** Who is where, school runs, sport, who fetches whom. Read from the family calendar. Lifts in bold. | Front Door | 3 days |
| **F8** | **A shared list that is not a WhatsApp message.** Groceries and errands, tablet and both phones, voice entry, live check-off. Resist categories, budgets, history. | new | 2 days |
| **F9** | **Screen time as a fact, not an argument.** What is on, for how long, and the schedule that ends it — visible to the boys, so the rule is the system's. | HA | 2 days |

## C · Rhythm

| | Feature | Where | Effort |
|---|---|---|---|
| **F10** | **The daily line, chosen not random.** A year of verses curated once, so it never surfaces something tonally wrong on a hard day. A text file, not an integration. | Front Door | 1 day |
| **F11** | **Sunday looks different.** Quieter digest, non-urgent nudges hold until Monday, the tablet shows the week ahead rather than today's tasks. | All | 1 day |
| **F12** | **Giving and the year's commitments, tracked plainly.** Pledged, given, outstanding. No gamification, no progress ring. | Finance | 2 days |

## D · The bush

| | Feature | Where | Effort |
|---|---|---|---|
| **F13** ★ | **Waypoint knows what kind of trip it is.** Bush weekend, beach, family visit, day out — each with its own checklist, cost model and questions. A self-catering bush booking cares about load-shedding, water and whether the 4x4 is serviced. A hotel does not. | Waypoint | 3 days |
| **F14** | **The pack list that remembers last time.** Built from the last three trips of that type, with what you forgot last time marked. Works in the garage, offline. | Waypoint | 1 day |
| **F15** | **Distance from Pretoria, sorted honestly.** Places within two, three, four hours, on a map, filtered by what is free on the calendar. A shortlist, not a search box. | Waypoint | 2 days |
| **F16** | **The house minds itself while you are away.** Booking arms an away profile: irrigation adjusts, the house-sitter pass issues for those exact dates, anomaly thresholds tighten. | Waypoint + HA | 2 days |

## E · Per portal

| | Feature | Where | Effort |
|---|---|---|---|
| **F17** | **Vault answers questions, not just stores files.** "When does the car licence expire?" answered with the source document beside the answer. Never an answer without its receipt. | Vault | 2 days |
| **F18** | **Homestead knows the seasons.** Gutters before the rains, pool before summer, firebreaks, chimney before winter, borehole at the end of the dry. Highveld-specific. | Homestead | 1 day |
| **F19** | **Hindsight answers in the shape of the question.** See `04-portal-screens.md`. | Hindsight | 4 days |
| **F20** | **Screening Room decides, rather than lists.** "Forty minutes, everyone is tired, no subtitles" → three options and a shuffle. Age filtering built in. | Screening Room | 2 days |
| **F21** | **Finance shows the month as a sentence first.** "You are R1 800 ahead of a normal August, mostly because the pump did not break." Tables stay underneath. | Finance | 2 days |

## F · Across the estate

| | Feature | Where | Effort |
|---|---|---|---|
| **F22** | **Ask the estate anything, from the search box.** A model over the merged federated-search result: "what needs doing before we go away next weekend" assembled from Homestead jobs, Vault expiries and Waypoint's booking — every claim linked to its portal. Cap spend via the model registry (item 24). | Fabric | 5 days · ≈R60/mo |
| **F23** | **One timeline for the whole estate.** Everything that happened today across all nine. The household view hides machine entries. Item 12 builds the operator half; this is the household read. | Fabric | 2 days |
| **F24** ★ | **Anything can become a nudge, from anywhere.** Long-press or right-click any figure, row or job in any portal: remind me, remind us, snooze until, send to WhatsApp. One component, wired to the attention engine. | Fabric | 2 days |
| **F25** | **Offline is a first-class state.** Pack list, in-case folder, trip sheet and shopping list work with no signal. Everything else says plainly it is showing yesterday's data. | All | 3 days |
| **F26** | **The estate explains itself to a stranger.** One printable page, kept current automatically: what each portal is, who to call, where the documents are. | Front Door | 1 day |

---

## The five, in order

★ marks them above. Roughly three weeks of evenings, and nothing else until they are done.

1. **F1 · The kitchen tablet** — converts the estate from a website into an object in the
   room she is already standing in. The single highest-leverage item on this page.
2. **F2 · WhatsApp that does things** — meets her where she already is instead of asking
   her to go somewhere.
3. **F6 · Chores that pay** — the only feature with users who show up unprompted and
   daily. An eight-year-old checking a balance is more reliable engagement than either
   adult, and it quietly makes the kitchen screen authoritative.
4. **F24 · Anything becomes a nudge** — closes the gap between noticing and doing, in
   every portal at once.
5. **F13 · Waypoint knows the trip type** — the one thing nobody in the family has to be
   persuaded to want.

Note what is *not* in the five: nothing visual, and nothing in Fabric. The design work in
this pack makes the estate good; these five make it used. They are different problems.
