/**
 * Refuse to build a bundle whose authentication is silently broken.
 *
 * ## The failure this exists to stop
 *
 * Every Vite `VITE_` variable is substituted at BUILD time. A missing one is not an
 * error — it becomes `undefined`, the code takes its fallback branch, and the build
 * succeeds. The artifact looks perfect. It deploys. And then sign-in fails.
 *
 * That has now happened three times:
 *
 *  1. No `.env` at all, so `JSON.parse(undefined)` threw at module load. Four portals
 *     shipped a blank white page — no network request, nothing in the console.
 *  2. The same-origin auth flags unset, so `authDomain` fell back to a different
 *     *site*. Safari partitions storage by site, so the popup handshake could not read
 *     the state it had just written. Sign-in broke on the Front Door and intermittently
 *     everywhere else.
 *  3. Homestead and Waypoint went live with **no `.env` file whatsoever** and both bugs
 *     at once. This guard is what caught them.
 *
 * All three were invisible because `.env` is gitignored: pulling the repo does not
 * bring the values, so any machine not set up by hand builds a broken bundle and
 * nothing anywhere says so.
 *
 * ## Why a build failure rather than a warning
 *
 * A warning scrolls past. The whole problem is that the broken artifact is
 * indistinguishable from a good one, so the only fix that holds is refusing to produce
 * it. `prebuild` runs automatically before `npm run build`, which means it also guards
 * `npm run deploy`.
 *
 * ## One copy, in the design system
 *
 * This lived as a per-repo copy and was duplicated six times — the same mistake the
 * six `auth.ts` copies made, and it bit in the same way: a fix to the strategy check
 * would have had to be applied six times. Each portal's `prebuild` now runs this file
 * out of `node_modules`, so there is one of it.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const RED = "[31m";
const DIM = "[2m";
const OFF = "[0m";

/** Minimal .env parse. Vite loads these itself at build time; we need them earlier. */
function readEnv() {
  const out = {};
  // .env.local wins, matching Vite's own precedence, so a local override is not
  // reported as a missing value.
  for (const name of [".env", ".env.local"]) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      if (line.trimStart().startsWith("#")) continue;
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  // A real environment variable beats the file, which is how CI supplies them.
  return { ...out, ...process.env };
}

const env = readEnv();
const problems = [];

// ---- 1. The Firebase config must be present and parseable --------------------
const raw = env.VITE_FABRIC_FIREBASE_CONFIG;
if (!raw) {
  problems.push([
    "VITE_FABRIC_FIREBASE_CONFIG is missing.",
    "Without it JSON.parse throws at module load and the page renders blank with nothing in the console.",
  ]);
} else {
  try {
    const cfg = JSON.parse(raw);
    for (const key of ["apiKey", "authDomain", "projectId"]) {
      if (!cfg[key]) {
        problems.push([
          `VITE_FABRIC_FIREBASE_CONFIG has no "${key}".`,
          "Copy the web config from Firebase verbatim, on one line.",
        ]);
      }
    }
    if (cfg.projectId && cfg.projectId !== "steyn-fabric") {
      problems.push([
        `VITE_FABRIC_FIREBASE_CONFIG points at "${cfg.projectId}", not steyn-fabric.`,
        "Identity lives in steyn-fabric and only there — that is what makes one sign-in reach every portal.",
      ]);
    }
  } catch {
    problems.push([
      "VITE_FABRIC_FIREBASE_CONFIG is not valid JSON.",
      "It must be the web config on a single line, unquoted.",
    ]);
  }
}

// ---- 2. One of the two same-origin auth strategies must be configured ---------
/**
 * Decided from what is SET, not from source text.
 *
 * The previous version read `src/lib/auth.ts` and looked for a variable NAME to work
 * out which strategy a portal used. That broke the moment auth.ts became a re-export
 * whose doc comment mentions both options: every portal matched Front Door's branch and
 * demanded a variable it does not use. Reading the environment is simpler and immune to
 * how the source happens to be written.
 */
const sameOrigin = env.VITE_AUTH_SAME_ORIGIN === "true";
const readyHosts = (env.VITE_AUTH_HOSTS_READY ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!sameOrigin && readyHosts.length === 0) {
  problems.push([
    "Neither VITE_AUTH_SAME_ORIGIN nor VITE_AUTH_HOSTS_READY is set, so authDomain falls back to steyn-fabric.firebaseapp.com.",
    [
      "That is a different site from the app, so Safari partitions the sessionStorage handshake and sign-in fails.",
      "  Set ONE of them:",
      "    VITE_AUTH_SAME_ORIGIN=true                 — portals hosted inside steyn-fabric",
      "    VITE_AUTH_HOSTS_READY=helloliam.co.za,...  — Front Door, via its auth.* hosts",
      "  Every host involved must already be a registered redirect URI on the Google OAuth",
      "  client, or you get Error 400 redirect_uri_mismatch in every browser rather than",
      "  only in the storage-partitioned ones.",
    ].join("\n"),
  ]);
}

if (problems.length > 0) {
  console.error(`\n${RED}Build refused — this bundle's sign-in would be broken.${OFF}\n`);
  for (const [what, why] of problems) {
    console.error(`  ${RED}✗${OFF} ${what}`);
    console.error(`    ${DIM}${why}${OFF}\n`);
  }
  console.error(`  ${DIM}These live in .env, which is gitignored — pulling the repo does not bring them.${OFF}`);
  console.error(`  ${DIM}See .env.example for the full list.${OFF}\n`);
  process.exit(1);
}

console.log(
  `✓ env check: Firebase config present, auth via ${sameOrigin ? "the app's own origin" : `auth.* on ${readyHosts.join(", ")}`}`,
);
