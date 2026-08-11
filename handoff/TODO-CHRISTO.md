# What Christo needs to do

Last updated 2026-08-10, after Fabric and Front Door went live.

Ordered by what unblocks the most. Everything not on this list is either done or
is mine to do.

---

## 1. ~~Request a billing quota increase~~ ❌ NO LONGER NEEDED

Superseded 2026-08-10. You chose to stay inside the five existing billing slots,
so the modules were regrouped instead. See `CONSOLIDATION.md`.

**Hindsight is already live** as a result — it went into `steyn-fabric` and needed
no new project at all. The recorder-purge clock has stopped.

The one thing you gave up: Vault's documents and its Gmail/Drive OAuth scopes now
share a project with household identity. If a billing slot ever frees up, moving
Vault out is the first thing to spend it on.

---

## 2. ~~Run `gcloud auth application-default login`~~ ✅ DONE 2026-08-10

ADC is in place, quota project set to `steyn-fabric`, and `npm run seed` now runs
clean: 10 portals, Christo as owner.

---

## 3. Get Mandri signed in — then one command

`mandrizeeman@gmail.com` is now in `Fabric/config/seed.yaml` with role `partner`.
She is **not** seeded yet, because claims can only attach to a uid that already
exists, and she has never signed in.

**Do this:**

1. Mandri opens <https://steyn-frontdoor.web.app> and clicks *Continue with
   Google* as `mandrizeeman@gmail.com`. She will see
   *"This Google account has no access"* — that is correct and expected.
2. Then run:

   ```bash
   cd ~/Code/Fabric && npm run seed
   ```

3. She reloads the page. The client forces a token refresh when a signed-in user
   has no claims, so she should not need to sign out.

Still placeholders, send them when you have them:

- **Lounge TV** → role `display` (whatever account the kiosk browser uses)
- **House-sitter** → role `guest`, created disabled

---

## 4. Install the Front Door and set it as your homepage

This is the whole point of the module: one address that fixes "I forgot that
existed".

- **iPhone** — open <https://steyn-frontdoor.web.app> in Safari → Share → Add to
  Home Screen. It opens without browser chrome.
- **Both desktops** — set `https://steyn-frontdoor.web.app` as the browser
  homepage, and install it from the address-bar install icon in Chrome/Edge.

---

## 5. Home Assistant changes — tell me if you want me to do these

`/Volumes/config` is mounted, so I *can* make these edits, but they touch your
live house config and I would rather you said go first.

**a. The morning digest.** Add a REST sensor to `feature_morning_digest.yaml`
reading Fabric's digest endpoint, and append its lines to the existing 06:30
message:

- URL: `https://fabric-api-685867683378.africa-south1.run.app/digest`
- Header: `x-api-key:` — the value is in Secret Manager as `ha-digest-api-key`
  in `steyn-fabric`. Put it in `secrets.yaml`, never in the YAML directly.

⚠ **HA's `rest:` platform is all-or-nothing** — one bad sensor kills every REST
sensor in the config, and `check_config` does not catch it. Diagnose via
`system_log/list`, not by staring at the YAML.

**b. Hindsight's ingest automation — this is the one that matters now.** The pipe
is live and empty; nothing reaches BigQuery until HA posts to it. The shape needs
your call first (a state-change buffer vs a small pyscript/AppDaemon module) —
see `Hindsight/README.md`, *The HA side*. Tell me which and I will write it.

**c. WhatsApp commands.** `feature_wa_inbound.yaml` needs deterministic `choose`
branches for `doc <what>`, `docs`, `warranty <thing>`, `jobs` and `trip`, plus
routing an inbound image with no caption to Vault's intake. **Not buildable yet**
— they depend on Vault and Homestead, which are not built.

Keep `mode: parallel, max: 10` on `wa_process_message` and
`continue_on_error: true` on the AI path. Both were hard-won.

---

## 6. NextDNS allowlist

Add these to profile *HelloLiamDNS*, or calls will fail in a way that looks
exactly like broken code:

```
fabric-api-685867683378.africa-south1.run.app
hindsight-ingest-685867683378.africa-south1.run.app
steyn-frontdoor.web.app
steyn-fabric.web.app
```

---

## 7. Optional — the custom domain

Front Door runs on `*.web.app` and the spec explicitly allows this. If you want
`steyn.house` (or similar), register it and tell me. Attaching it needs **no code
change** — only DNS and config. The `*.web.app` URL stays live permanently as the
fallback when DNS breaks.

---

## Not yours — things I still owe you

- **Vault, Homestead, Waypoint — not built.** All three now have a home in
  `steyn-fabric` and nothing blocks them but the work itself.
- The Hindsight MariaDB backfill — needs a dump from you (`Hindsight/README.md`)
- App Check enforcement (reCAPTCHA Enterprise) on both live projects
- Log sinks → Pub/Sub `fabric-errors` → BigQuery, so `GET /errors/summary` works
- WIF CI for `steyn-frontdoor` (Fabric has it; Front Door deploys are manual)
- Regenerating the PWA PNG icons from the new door `favicon.svg` — they still
  carry HA Portal's house glyph, because no rasteriser is installed here
- Checking both screens against `Fabric Portal.dc.html`, which was **not in the
  handover zip** and is not on this machine. If you have it, send it — §5 calls it
  the visual reference for layout, density and copy tone.
