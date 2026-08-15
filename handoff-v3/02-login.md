# 02 — The login screen

`steyn-design/src/SignIn.svelte`. One component, six portals, five states. The rebuilt
file is in `src/SignIn.svelte` — this explains why it is shaped that way.

**The brief was one line: be faster to get through.** Everything below follows from it.

---

## The change that matters: passkey first

The resting state is now a single primary button reading **Continue as Christo**, backed
by a platform passkey. Face ID, no account chooser, no popup, no redirect.

Google sign-in does not disappear — it becomes the fallback and the first-time path:

| Situation | What the screen offers |
|---|---|
| Passkey registered on this device | **Continue as \<name\>** (primary) · *Use a different Google account* (secondary) |
| No passkey yet | **Continue with Google** (primary), then an offer to save a passkey |
| Passkey fails or is dismissed | Falls back to Google silently, with a plain sentence |

Enrolment happens **after** a successful Google sign-in, never before, and is skippable.
A prompt to create a credential in front of someone who has not yet got in is the fastest
way to make a login screen slower.

> ### `auth.ts` is still not a design surface
>
> Sign-in has been intermittently failing and the module was consolidated from six copies
> into one. `SignIn` remains **presentational** — it owns no Firebase call. The portal
> passes `onsignin` / `onpasskey`, because the robustness of signing in belongs next to
> the auth code. Do not move WebAuthn into this component.

---

## The layout

Two panels on a wide screen, stacked on a narrow one, with a third band below.

```
┌──────────────────────────┬──────────────────┐
│ mark + wordmark          │ ACTION CARD      │
│ Steyn Home / Pretoria E. │  passkey button  │
│                          │  ── or ──        │
│ "The front door"         │  Google          │
│ one paragraph            │                  │
│                          │  The house, now  │
│ ▍verse                   │  6 live figures  │
├──────────────────────────┴──────────────────┤
│ ONE SIGN-IN REACHES — eight portals, one    │
│ line each on what they are for              │
└─────────────────────────────────────────────┘
```

- **Left is identity.** Who this is, whose house it is. The verse sits in the margin as
  an inscription — a copper rule, not a box, quieter than the tagline above it.
- **Right is the action.** Nothing in this card that is not the way in or the proof the
  house is alive.
- **Below is the explanation.** New in v3, and the reason is in the next section.

Stacked below the container's narrow threshold, identity first, then the card — so the
button stays in thumb reach rather than being pushed down the page by the verse. The
explainer runs below the fold on a phone, deliberately.

---

## The portal explainer

Eight portals, name plus one line on what it is for, visible **before** anyone signs in.

| Portal | Line | Marked |
|---|---|---|
| HA Dashboard | Energy, water, security and every room in the house | — |
| HQ Finance | Accounts, budgets, and what the month actually cost | partner |
| Vault | Documents, expiry dates, and the in-case folder | partner |
| Screening Room | What to watch tonight, and the listening room | — |
| Homestead | Everything the property owns and the jobs it needs | partner |
| Waypoint | Trips planned and costed before you commit to one | partner |
| Hindsight | The house's long memory — what changed, and when | owner |
| Fabric | Who can open what, and what it all costs to run | owner |

Three decisions inside that table:

1. **Restricted portals still appear**, marked *owner* or *partner*. Hiding them makes
   the estate look smaller than it is and turns a later "no access" into a surprise.
2. **Codebots is absent.** It has external users and is not part of the household.
3. **The list is fed from the registry**, filtered to `status: "live"`, not hard-coded —
   otherwise it is stale the first time a portal ships.

Why on the login screen at all: it is the only page in the estate that is public, and
after sign-in nobody reads a directory. It is also the answer to *what is this?* for
anyone in the family looking over a shoulder.

---

## The five states

Every one of them is in `src/SignIn.svelte`.

**1 · Resting.** As above.

**2 · Working.** Button disabled, label becomes *Waiting for Face ID…*, and the glance
figures become skeletons that **sweep rather than pulse** — a pulse draws the eye to the
placeholder instead of the content.

**3 · Error.** A human sentence, never a raw Firebase code. The portal classifies before
it passes the string. Amber left rule, amber badge with a glyph, and a *Try again*
button. The copy distinguishes whose fault it is: *"The house is fine — this is us."*
For diagnostics the raw code is shown small and monospaced beneath, because sign-in is
currently being debugged and a screenshot with the code in it is worth more than one
without.

**4 · Signed in, no access.** Not an error and it needs a different way out: the account
is named, and the only action is **Sign out and try another**. This is the state that a
guest account whose `expiresAt` has passed lands in, so the wording must not imply a
mistake.

**5 · Offline / house unreachable.** New. `GET /public/glance` failing hides the figure
panel entirely rather than rendering six em dashes — six dashes reads as a broken screen.
The sign-in button is unaffected, because Fabric being unreachable and Google being
unreachable are different failures and only one of them stops you signing in.

---

## The pre-login house figures — do not add fields

Six values from `GET /public/glance`: solar now, battery, water tank, outside temperature,
grid state, off-grid days.

**Which entities appear is a security decision, not a design one.** Every candidate had
to answer: *would this tell a stranger whether the house is empty?* Indoor temperature,
door state, motion and alarm status are excluded **by name** at the source. Restyle this
panel freely. Do not add to it, and do not move the judgement out of the allowlist into
the component.

A missing sensor renders an em dash. `0 W of solar` is a claim about the house; `—` is a
claim about the data.

---

## Props

Existing props are unchanged, so no portal breaks. Four are new.

```ts
{
  product: string;
  mark?: string;              // default "door"
  tagline: string;
  onsignin: () => void;
  onsignout?: (() => void) | null;
  busy?: boolean;
  error?: string | null;
  errorCode?: string | null;  // NEW — raw code, shown small, for the open auth bug
  noAccess?: boolean;
  siblings?: string[];        // kept for compatibility; superseded by `portals`
  verse?: string | null;
  verseRef?: string | null;
  glance?: GlanceItem[];
  portals?: PortalBlurb[];    // NEW — the explainer
  passkey?: {                 // NEW — omit entirely to render Google-first
    name: string;             // "Christo"
    onpasskey: () => void;
  } | null;
  location?: string | null;   // NEW — "Pretoria East", under the wordmark
}
```

---

## Accessibility

- The passkey button is the single `autofocus` target and the first tab stop.
- `aria-live="polite"` on the message region so state 3 and 4 are announced.
- The copper glows stay `aria-hidden` and off under `prefers-reduced-motion` — this is
  the one screen nobody can skip, so a pulsing background is not acceptable.
- Every control clears the 24×24 target minimum; the primary button is 48px tall.
- The verse is a `<blockquote>` with a `<cite>`, not styled text.
