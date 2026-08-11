# Project consolidation — staying inside five billing slots

Decided by Christo 2026-08-10, superseding the one-project-per-module layout in
`00-OVERVIEW.md` §1.

## Why

The billing account allows **5 linked projects** and all 5 are in use by live
work: `helloliam-ha-dashboard`, `steyn-family-finance`, `codebots-429af`,
`steyn-fabric`, `steyn-frontdoor`. Rather than wait 1–3 days on a support request
— during which HA's recorder keeps purging at 30 days — the programme is
regrouped to fit the existing slots. No quota increase is being requested.

## The grouping

| Project | Holds | Rationale |
|---|---|---|
| `steyn-frontdoor` | **Front Door only** | Unchanged. This is the one boundary `00-OVERVIEW.md` actually argues for in writing: Front Door carries the public origin Christo hands out, and must not hold household data. Keeping it thin preserves the property that the domain can be redeployed without touching anything else. |
| `steyn-fabric` | Fabric, **Hindsight**, Vault, Homestead, Waypoint | Everything with data. |

`steyn-vault`, `steyn-homestead`, `steyn-waypoint` and `steyn-hindsight` still
exist as empty, unlinked projects. They cost nothing, consume no billing slot,
and reserve the ids should the quota ever be raised. **Do not delete them** —
they are the migration target if the estate outgrows this arrangement.

## How the modules stay separated inside one project

Consolidation is at the *project* level only. Nothing is actually shared:

- **Firestore** — one named database per module (`(default)` for Fabric, then
  `vault`, `homestead`, `waypoint`). Verified available in `africa-south1`.
- **Hosting** — one site per module. Already proven in this estate:
  `helloliam-ha-dashboard` hosts both HA Portal and Screening Room.
- **Cloud Run** — one service per module, each with its **own service account**.
- **Storage** — separate buckets, with their own lifecycle rules.
- **BigQuery** — `home` (Hindsight) and `fabric` (errors) as separate datasets.

The separate service accounts matter more than they look. The module→Fabric
attention model maps SA email → `source`, so a module can only ever post
attention as itself. That property survives consolidation intact.

## What is lost, honestly

- **Per-project cost attribution.** One R100 budget now covers Fabric, Vault,
  Homestead, Waypoint and Hindsight together. Vault is the only one with real
  cost (~R80, storage-led), so a spike will be hard to attribute without labels.
- **Blast radius.** An IAM mistake in `steyn-fabric` now reaches five modules'
  data rather than one.
- **Vault's isolation, which I argued to keep.** Vault holds ID copies,
  passports, the title deed and medical records, and needs Gmail + Drive +
  Calendar OAuth scopes. **The OAuth consent screen is per-project**, so those
  scopes now live in the same project as household identity and every other
  module. Christo was told this and chose to proceed. If the estate ever gets
  another billing slot, moving Vault out is the first thing to spend it on.

## Status

| Module | State |
|---|---|
| Fabric | 🟢 live |
| Front Door | 🟢 live |
| Hindsight | 🟢 live in `steyn-fabric` — pipe running, HA not yet sending |
| Vault | not started |
| Homestead | not started |
| Waypoint | not started |
