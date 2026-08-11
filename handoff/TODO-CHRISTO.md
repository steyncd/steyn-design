# What Christo needs to do

Rewritten 2026-08-11 against verified state. Everything not listed here is
either done or mine.

---

## 1. The MariaDB dump ⏰ *the only time-sensitive item*

This is the **only way to recover any history from before 2026-08-11**.
Everything older than the recorder's 30-day purge window is already gone, and
the window keeps moving — each day you wait, another day is lost permanently.

I cannot run it. The recorder's host is `core-mariadb`, a Docker-internal
hostname inside HAOS's supervisor network: port 3306 is closed on `192.168.0.7`
and no mysql client exists on the Mac. It has to run inside HAOS.

A previous attempt produced nothing I can see — most likely it landed in
`/root/` in a terminal session, and the SMB share only exposes `/config`.

**Re-run with an explicit path inside `/config`:**

```bash
mysqldump -h core-mariadb -u homeassistant -p homeassistant states states_meta | gzip > /config/states.sql.gz
```

`/config` is the share I can read. Gzip matters — that table is likely hundreds
of megabytes. You will need the **Terminal & SSH** add-on; `addon_configs` shows
only Frigate installed.

Once it is there, tell me and I will write the backfill loader.

---

## 2. Nothing else is blocking

Fabric, Front Door and Hindsight are live and self-running. No console steps are
outstanding.

---

## Optional, whenever it suits

**Custom domain for the Front Door.** It runs on `*.web.app` and the spec allows
that indefinitely. If you register one (`steyn.house` was suggested), attaching
it needs **no code change** — only DNS and config, and the `*.web.app` URL stays
live as the fallback when DNS breaks.

**Lounge TV and house-sitter accounts.** Still `CHANGEME` placeholders in
`Fabric/config/seed.yaml`. Send the Google addresses when you want them.

**Mandri.** Parked at your request. When she is ready: she signs in once at
<https://steyn-frontdoor.web.app> (she will correctly see "no access"), then
`cd ~/Code/Fabric && npm run seed`.

**App Check enforcement.** The reCAPTCHA Enterprise key is registered on both web
apps but enforcement is **off**. Turning it on before the clients send tokens
would lock you out. Say the word and I will wire the client SDK, watch tokens
flow for a day, then enable it — in that order.

---

## Done — no action needed

| | |
|---|---|
| Billing quota increase | ❌ no longer needed — modules regrouped instead |
| `gcloud auth application-default login` | ✅ done, quota project set |
| `gcloud` on PATH | ✅ fixed via `~/.zshrc` |
| Google sign-in in `steyn-fabric` | ✅ enabled |
| Christo as `owner` + 10 portals seeded | ✅ done |
| `fabric-api` reachable | ✅ `allUsers` invoker, auth enforced in-app |
| NextDNS allowlist | ✅ done |
| HA pyscript ingest | ✅ installed and ingesting |
| HA logging for the ingest module | ✅ added to the existing `logger:` block |
| Error-log sinks from all five projects | ✅ flowing into `steyn-fabric.fabric` |

---

## Things I still owe you

- **Vault, Homestead, Waypoint** — not started. See
  [`START-HERE.md`](START-HERE.md) for the recommended order.
- **The backfill loader** — blocked on item 1.
- **Passkeys.** Listed in the Fabric v0 spec, but **Firebase Auth has no passkey
  provider**. It would mean implementing WebAuthn end to end plus a credential
  store — a few days of security-sensitive work. My recommendation is not to,
  for a two-person household already on Google sign-in.
- **PWA icons** still carry HA Portal's house glyph; no rasteriser on this
  machine to render the new door `favicon.svg` to PNG.
- **`Fabric Portal.dc.html`** — the visual reference named in `00-OVERVIEW.md` §5
  was never in the handover zip. Both UIs were built from the tokens and written
  specs alone. If you have it, send it.
