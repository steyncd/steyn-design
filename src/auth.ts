/**
 * Household sign-in, once, for every portal.
 *
 * ## Why this moved here
 *
 * This file existed as six verbatim copies — one per portal — on the reasoning that a
 * copy is safer than a shared dependency for the thing every app depends on. That was
 * defensible at two portals. At six it stopped being true, and the cost was paid in
 * full on 2026-08-14:
 *
 *  · Homestead and Waypoint shipped with `VITE_AUTH_SAME_ORIGIN` unset and their own
 *    hosts missing from the host list, so both used the cross-site `authDomain` and
 *    failed in Safari. Nobody noticed because they were "copies of a file that works".
 *  · Adding two hosts to that list meant editing five files. The first pass missed
 *    two of them, and a `git checkout` during an unrelated fix silently reverted them
 *    again.
 *
 * One file cannot drift from itself. The per-portal `src/lib/auth.ts` is now a
 * re-export, so no component import changed.
 *
 * ## Two Firebase apps, per 00-OVERVIEW.md §6
 *
 *     named app "fabric"  → steyn-fabric's config. AUTH ONLY.
 *     default app         → this module's own config. Firestore/Storage only.
 *
 * In Fabric itself the two configs are the same project, which makes this look like
 * ceremony. It is not: one sign-in reaches every portal precisely because every client
 * asks the *same* project who you are.
 *
 * ## The two authDomain strategies, and why both are needed
 *
 * `signInWithPopup` hands the credential back through `sessionStorage` on the
 * `authDomain` origin. Safari partitions storage **by site**, so when `authDomain` is
 * a different site from the app, the handler cannot read the state it just wrote and
 * Firebase fails with "Unable to process request due to missing initial state".
 *
 * Pointing `authDomain` at the app's own host removes that failure entirely — but only
 * works where the app's host serves *steyn-fabric's* auth handler. So:
 *
 *  1. **Own origin** (`VITE_AUTH_SAME_ORIGIN=true`) for the portals hosted inside
 *     `steyn-fabric`. Their own hostname serves the right handler.
 *  2. **A dedicated `auth.*` host** (`VITE_AUTH_HOSTS_READY=domain,domain`) for Front
 *     Door, whose sites live in `steyn-frontdoor` and would serve the WRONG project's
 *     handler. `auth.helloliam.co.za` is served by a site inside `steyn-fabric`, and
 *     because it shares the registrable domain it is the same *site* — so storage is
 *     not partitioned.
 *
 * **Both are gated behind an env flag, and that is deliberate.** Firebase derives
 * `redirect_uri` from `authDomain`, so pointing at a host the Google OAuth client has
 * never heard of fails with `Error 400: redirect_uri_mismatch` — in every browser,
 * not just the partitioned ones. Enabling a host before registering it turns a
 * Safari-only bug into a total outage. That mistake has been made once already.
 */
import { initializeApp, getApp, getApps, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  reauthenticateWithPopup,
  signOut as fbSignOut,
  onIdTokenChanged,
  type User,
} from "firebase/auth";

// ── authDomain resolution ──────────────────────────────────────────────────

/**
 * Hosts inside `steyn-fabric` that serve its auth handler on their own origin.
 *
 * One list, shared. This is the thing that drifted when there were six copies: two
 * portals went live with their own hosts missing and silently fell back cross-site.
 */
const FABRIC_OWN_ORIGIN_HOSTS = [
  "steyn-fabric.web.app",
  "steyn-fabric.firebaseapp.com",
  "steyn-vault.web.app",
  "steyn-hindsight.web.app",
  "steyn-homestead.web.app",
  "steyn-waypoint.web.app",
  "fabric.helloliam.co.za",
  "vault.helloliam.co.za",
  "hindsight.helloliam.co.za",
  "homestead.helloliam.co.za",
  "waypoint.helloliam.co.za",
  "fabric.helloeben.co.za",
  "vault.helloeben.co.za",
  "hindsight.helloeben.co.za",
  "homestead.helloeben.co.za",
  "waypoint.helloeben.co.za",
];

const SAME_ORIGIN_ON = import.meta.env.VITE_AUTH_SAME_ORIGIN === "true";
const OWN_ORIGIN = new Set(SAME_ORIGIN_ON ? FABRIC_OWN_ORIGIN_HOSTS : []);

/**
 * Registrable domains whose `auth.*` host is confirmed serving — Front Door's route.
 *
 * Per-domain rather than a single boolean because Firebase issues certificates
 * independently and they do not land together: `helloliam.co.za` was live while
 * `helloeben.co.za` still returned an SSL name mismatch. An all-or-nothing flag would
 * have meant either leaving a working domain broken, or pointing a domain at a host
 * with no certificate — which fails in every browser.
 *
 * Add a domain only once this returns 200:
 *   curl -o /dev/null -w '%{http_code}' https://auth.<domain>/__/auth/handler
 */
const READY_SITES = (import.meta.env.VITE_AUTH_HOSTS_READY ?? "")
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

function resolveAuthDomain(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const host = window.location.hostname;

  // Own origin wins: it is same-origin rather than merely same-site, and needs no
  // extra host to keep alive.
  if (OWN_ORIGIN.has(host)) return host;

  for (const site of READY_SITES) {
    if (host === site || host.endsWith(`.${site}`)) return `auth.${site}`;
  }
  return fallback;
}

const rawFabricConfig: FirebaseOptions = JSON.parse(import.meta.env.VITE_FABRIC_FIREBASE_CONFIG);
const fabricConfig: FirebaseOptions = {
  ...rawFabricConfig,
  authDomain: resolveAuthDomain(rawFabricConfig.authDomain ?? "steyn-fabric.firebaseapp.com"),
};
const ownConfig: FirebaseOptions = JSON.parse(
  import.meta.env.VITE_FIREBASE_CONFIG ?? import.meta.env.VITE_FABRIC_FIREBASE_CONFIG,
);

const fabricApp = getApps().some((a) => a.name === "fabric")
  ? getApp("fabric")
  : initializeApp(fabricConfig, "fabric");

export const ownApp = getApps().some((a) => a.name === "[DEFAULT]") ? getApp() : initializeApp(ownConfig);
export const fabricAuth = getAuth(fabricApp);

// ── roles ──────────────────────────────────────────────────────────────────

export type Role = "owner" | "partner" | "display" | "guest";
export type Claims = { role: Role; household: string; modules: string[]; expiresAt: number | null };

const RANK: Record<Role, number> = { guest: 0, display: 1, partner: 2, owner: 3 };
export function atLeast(actual: Role | null, min: Role): boolean {
  return actual !== null && RANK[actual] >= RANK[min];
}

// ── signing in ─────────────────────────────────────────────────────────────

/** Popup failures that mean "this environment", not "this account". */
const ENVIRONMENTAL = [
  "auth/popup-blocked",
  "auth/popup-closed-by-user-agent",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
  "auth/internal-error",
];

/** The person changed their mind. Never retried, never reported as a fault. */
const DELIBERATE = ["auth/popup-closed-by-user", "auth/cancelled-popup-request"];

export function isCancelled(err: unknown): boolean {
  return DELIBERATE.includes(String((err as { code?: string }).code ?? ""));
}

/**
 * Sign in, and keep trying the ways that can still work.
 *
 * The popup is preferred because it keeps the person on the page. It is also the
 * fragile one: it depends on a sessionStorage handshake on the authDomain origin, on
 * the browser allowing a popup, and on the opener surviving COOP. Any of those can
 * fail for reasons that have nothing to do with the account, so an *environmental*
 * failure falls through to `signInWithRedirect`, which needs none of it.
 *
 * A failure that is the person's *decision* — closing the popup — is never retried.
 * Reopening a window somebody just dismissed is how software feels possessed.
 */
export async function signIn(forceChooser = false): Promise<void> {
  const provider = new GoogleAuthProvider();
  /**
   * The chooser is NOT forced, and that is what makes "one sign-in reaches every
   * portal" true rather than merely printed on the screen.
   *
   * Firebase Auth persistence is per-origin: signing into fabric.helloliam.co.za cannot
   * populate vault.helloliam.co.za's IndexedDB, because browsers do not share storage
   * across origins. What CAN carry across is the Google session itself — so if Google
   * already knows who you are and the app does not insist on asking again, the second
   * portal signs you in with no interaction at all. One click at the first door, none
   * at the rest.
   *
   * `prompt: "select_account"` defeated exactly that: it forced the chooser on every
   * portal every time, which is why each one felt like a separate login.
   *
   * The original reason for forcing it was real — a two-person household on shared
   * desktops, where silently resuming as whoever signed in last is how Mandri ends up
   * looking at Christo's view. That is preserved by `switchAccount()` below and by the
   * account being named in every portal's header, rather than by making the common case
   * worse for everybody.
   */
  if (forceChooser) provider.setCustomParameters({ prompt: "select_account" });

  try {
    await signInWithPopup(fabricAuth, provider);
    return;
  } catch (err) {
    const code = String((err as { code?: string }).code ?? "");
    const message = String((err as { message?: string }).message ?? "");
    if (DELIBERATE.includes(code)) throw err;

    /**
     * The storage-partitioning failure, matched on its message rather than its code.
     *
     * Firebase reports it as `auth/internal-error` with "missing initial state" in the
     * text, which is indistinguishable by code from a dozen unrelated faults. Matching
     * a message is unpleasant, and it is the only way to recognise the one failure a
     * redirect is guaranteed to fix.
     */
    const partitioned = /missing initial state|sessionStorage|storage-partitioned/i.test(message);

    if (ENVIRONMENTAL.includes(code) || partitioned) {
      await signInWithRedirect(fabricAuth, provider);
      return;
    }
    throw err;
  }
}

/**
 * Collect a redirect result, if this load is the tail of one. Call once at startup.
 *
 * Without it the credential in the URL is never collected and the gate reappears —
 * the "I click it and nothing happens" loop. A failure is swallowed deliberately:
 * arriving with no pending redirect is the normal case, not an error.
 */
export async function completeRedirect(): Promise<{ signedIn: boolean; error: unknown | null }> {
  try {
    return { signedIn: (await getRedirectResult(fabricAuth)) !== null, error: null };
  } catch (err) {
    /**
     * Returned, not swallowed.
     *
     * This used to `return false` on any failure, so a redirect that came back with a
     * real error — an unregistered redirect_uri, a credential the handler could not
     * read — was indistinguishable from the normal case of arriving with no redirect
     * pending. The gate simply reappeared, and the person clicked again, and around it
     * went with nothing anywhere saying why. Swallowing that cost a debugging session.
     */
    console.error("[auth] redirect sign-in failed", err);
    return { signedIn: false, error: err };
  }
}

/**
 * Turn a Firebase error into a sentence, and never show a raw code alone.
 *
 * `auth/unauthorized-domain` gets named specifically: it means the host is not on
 * Firebase's authorised list, which is a five-second fix for somebody who knows that
 * and an unsolvable mystery presented as "try again".
 */
export function explainAuthError(err: unknown): string | null {
  if (isCancelled(err)) return null; // a decision, not a fault
  // The object, unabridged, next to the sentence shown on screen.
  console.error("[auth] sign-in failed", err);
  const code = String((err as { code?: string }).code ?? "");
  switch (code) {
    case "auth/unauthorized-domain":
      return `This address is not on Fabric's authorised domain list, so Google refused the sign-in. Add ${typeof location === "undefined" ? "this host" : location.hostname} under Authentication → Settings in steyn-fabric.`;
    case "auth/network-request-failed":
      return "The network dropped during sign-in. Check the connection and try again.";
    case "auth/too-many-requests":
      return "Google is rate-limiting sign-ins from here. Wait a minute and try again.";
    case "auth/user-disabled":
      return "This Google account has been disabled for the household.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window, so we tried redirecting instead. If nothing happened, allow popups for this site.";
    default: {
      /**
       * Always say something specific.
       *
       * This branch used to render "Sign-in did not complete. Try again." whenever the
       * error carried no `code` — which is exactly the case where the code is useless
       * and the message is everything. A non-Firebase exception (a TypeError, a failed
       * fetch) has a name and a message and no code, so the one screen that could have
       * explained the failure showed the least informative sentence available. That is
       * the same sin this function was written to fix, committed one branch further
       * down.
       */
      const name = String((err as { name?: string }).name ?? "");
      const message = String((err as { message?: string }).message ?? "").trim();
      const detail = code || [name, message].filter(Boolean).join(": ") || "no detail available";
      return `Sign-in did not complete — ${detail.slice(0, 200)}`;
    }
  }
}

/**
 * Deliberately pick a different Google account.
 *
 * The escape hatch that lets `signIn` stop forcing the chooser: the shared-desktop case
 * is real, it is just rare, and it deserves a button rather than a tax on every sign-in
 * on every portal.
 */
export async function switchAccount(): Promise<void> {
  await fbSignOut(fabricAuth);
  await signIn(true);
}

export async function signOut(): Promise<void> {
  await fbSignOut(fabricAuth);
}

/**
 * Prove it is still you — handoff-v2 item 13.
 *
 * The server refuses portal on/off, scaling, traffic, rollback, claims edits and every
 * runbook button on a token whose `auth_time` is more than five minutes old, because
 * an unlocked laptop was previously one click from switching the household's portals
 * off.
 *
 * `reauthenticateWithPopup` rather than a second `signInWithPopup`: it is scoped to the
 * account already signed in, so there is no chooser and no way to continue as somebody
 * else halfway through a destructive action. The forced refresh afterwards is what
 * makes the new `auth_time` visible to the next request.
 */
export async function reauthenticate(): Promise<void> {
  const user = fabricAuth.currentUser;
  if (!user) throw new Error("Not signed in");
  const provider = new GoogleAuthProvider();
  await reauthenticateWithPopup(user, provider);
  await user.getIdToken(true);
}

/**
 * Reads claims off the ID token rather than a Firestore doc, so the client and the
 * server agree on exactly one source of truth. `forceRefresh` is what makes an admin
 * role change land without a sign-out.
 */
export async function getClaims(user: User, forceRefresh = false): Promise<Claims | null> {
  const token = await user.getIdTokenResult(forceRefresh);
  const role = token.claims.role as Role | undefined;
  if (!role) return null;

  const expiresAt = typeof token.claims.expiresAt === "number" ? token.claims.expiresAt : null;
  // A guest whose window has closed is signed in but entitled to nothing. Treat it as
  // no claims at all rather than showing a half-empty portal list.
  if (expiresAt !== null && Date.now() > expiresAt) return null;

  return {
    role,
    household: String(token.claims.household ?? ""),
    modules: Array.isArray(token.claims.modules) ? (token.claims.modules as string[]) : [],
    expiresAt,
  };
}

export async function getIdToken(): Promise<string | null> {
  const u = fabricAuth.currentUser;
  return u ? u.getIdToken() : null;
}

export function onAuth(cb: (user: User | null) => void): () => void {
  // onIdTokenChanged rather than onAuthStateChanged: it also fires on token refresh,
  // which is when a claims change becomes visible to the client.
  return onIdTokenChanged(fabricAuth, cb);
}
