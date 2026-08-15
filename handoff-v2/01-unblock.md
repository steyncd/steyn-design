# 01 — Unblock what is already built

**Do this before anything else in the pack.** Four services are deployed and none of
them can serve a real user. This is roughly half a day, most of it waiting.

---

## 1. Enable the Google sign-in provider — in `steyn-fabric`

Console only. The admin API rejects `defaultSupportedIdpConfigs.create` for `google.com`
with `INVALID_CONFIG : client_id cannot be empty`, because Google sign-in needs an
OAuth 2.0 client and only the console auto-provisions one.

> Console → `steyn-fabric` → Authentication → Sign-in method → Google → Enable

**In `steyn-fabric`, not `steyn-frontdoor`.** Auth lives in Fabric. Enabling it on the
Front Door project looks right — that is the app you are testing — and does nothing,
because the client's `authDomain` points at `steyn-fabric.firebaseapp.com`. It fails
silently with an unhelpful popup error.

Identity Platform auth was already initialised on 2026-08-10 and authorised domains are
set to `localhost`, `steyn-fabric.firebaseapp.com`, `steyn-fabric.web.app`,
`steyn-frontdoor.firebaseapp.com`, `steyn-frontdoor.web.app`. Verify they are still
there; add any new origin **in `steyn-fabric`**.

## 2. Open `fabric-api` to `allUsers`

```bash
gcloud run services add-iam-policy-binding fabric-api \
  --region=africa-south1 --project=steyn-fabric \
  --member=allUsers --role=roles/run.invoker
```

This is the intended design, not a loosening. The Front Door calls `fabric-api` **from
the browser** with a *Firebase* ID token; Cloud Run IAM only accepts *Google IAM* tokens,
so leaving it closed rejects every legitimate user while protecting nothing. Every route
is authenticated in-app by `server/src/auth.ts` (`requireUser`, `requireModule`,
`requireScheduler`, `requireDigestKey`); only `GET /healthz` answers without credentials.

Also fix `package.json` — `deploy:api` still carries `--no-allow-unauthenticated`, so
the next deploy undoes the binding. Change it to `--allow-unauthenticated` in the same
commit.

Once open, **item 10 (App Check) becomes the real perimeter.** Schedule it soon.

## 3. Sign in once, then seed

```bash
gcloud auth application-default login
npm run seed
```

Claims attach to a uid and a uid does not exist before first sign-in, so Christo must
sign in at `https://steyn-frontdoor.web.app` before the seed can place his claims. The
script is idempotent and prints exactly who it skipped and why.

**Before seeding users, deal with `config/seed.yaml`.** Two of four addresses are
`CHANGEME-` placeholders marked `skip: true` — the lounge TV and the house-sitter. They
were left as placeholders deliberately: guessing an address and granting it `partner`
hands household data to a stranger. Ask Christo for the TV account; leave the
house-sitter as a placeholder until item 8 gives it a proper mechanism.

## 4. Create the two schedulers

```bash
gcloud scheduler jobs create http health-sweep \
  --schedule="*/5 * * * *" --time-zone="Africa/Johannesburg" \
  --uri="https://fabric-api-685867683378.africa-south1.run.app/health/sweep" \
  --http-method=POST --oidc-service-account-email="<scheduler-sa>" \
  --location=africa-south1 --project=steyn-fabric

gcloud scheduler jobs create http digest-compose \
  --schedule="20 6 * * *" --time-zone="Africa/Johannesburg" \
  --uri="https://fabric-api-685867683378.africa-south1.run.app/digest/compose" \
  --http-method=POST --oidc-service-account-email="<scheduler-sa>" \
  --location=africa-south1 --project=steyn-fabric
```

06:20 is deliberate — ten minutes before HA reads the digest at 06:30.

## 5. Register Hindsight's service account

`MODULE_SERVICE_ACCOUNTS` is unset, which parses to an empty map, which means no module
can post attention. Hindsight is live and its drift sweep runs at 05:30, so it is the
first real entry:

```
hindsight@steyn-fabric.iam.gserviceaccount.com=hindsight
```

Set it both on the Cloud Run service and as the `MODULE_SERVICE_ACCOUNTS` GitHub
variable, and add each module's SA as it ships.

## 6. Front Door leftovers

- **No WIF pool exists in `steyn-frontdoor`** — deploys are manual. Provision one
  mirroring Fabric's (`assertion.repository=='steyncd/frontdoor'`) and add the workflow.
- **PWA icons still carry HA Portal's house glyph.** `favicon.svg` is the new door mark;
  the five PNGs at 192/512 and the maskable variants were never rasterised because no
  rasteriser was installed. Regenerate them from `favicon.svg`.

---

## Acceptance

Christo signs in at `https://steyn-frontdoor.web.app`, sees his name, sees at least four
blue `✓ live` dots, and the Fabric admin screen lists him as `owner`. The health sweep
has written a health doc for every portal with a non-null `healthUrl` within five
minutes. `GET /digest` with the `x-api-key` returns a body rather than a 500.

Until all six of these are done, **nothing else in this pack can be tested end to end.**
