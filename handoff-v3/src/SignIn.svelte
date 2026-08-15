<script lang="ts">
  /**
   * The sign-in screen, once, for every portal.
   *
   * ## What changed in v3, and why
   *
   * The brief was one line: *be faster to get through*. Christo signs in many
   * times a day across eight portals, and every one of those was a Google popup
   * with an account chooser. So the resting state is now a single passkey
   * button — Face ID, no chooser, no popup, no redirect.
   *
   * Google does not go away. It is the fallback and the first-time path, and
   * passkey enrolment is offered *after* a successful sign-in, never before. A
   * prompt to create a credential in front of someone who has not got in yet is
   * the fastest way to make a login screen slower.
   *
   * Second change: the screen now says what each portal is for. This is the
   * only public page in the estate, and after sign-in nobody reads a directory.
   * It is the answer to "what is this?" for anyone in the family looking over a
   * shoulder — and for a household platform still being adopted, that question
   * is the whole game.
   *
   * ## Still presentational
   *
   * This component owns no Firebase call and no WebAuthn call. Each portal
   * passes `onsignin` / `passkey.onpasskey`, because the *robustness* of signing
   * in — popup, redirect fallback, credential discovery, error classification —
   * belongs next to the auth code. `Shell` follows the same rule. Moving `v3`
   * changes six repositories at once and a bad tag must not be able to break
   * sign-in everywhere simultaneously.
   *
   * `src/lib/auth.ts` is not a design surface. Do not move logic in here.
   *
   * ## Colour
   *
   * Blue is good, amber wants attention, and there is no green in this estate —
   * red/green is exactly the axis its owner cannot separate. Every state carries
   * a glyph and a word as well as a hue. The gate pins the warm ramp via
   * `data-gate` because it renders before any user is known, so there is no
   * theme to honour; it is the one hard-coded ramp in the estate.
   */
  import Icon from "./Icon.svelte";

  type GlanceItem = {
    key: string;
    label: string;
    value: number | null;
    unit: string;
    text: string | null;
  };

  type PortalBlurb = {
    id: string;
    name: string;
    /** One line on what it is FOR. Not what it contains. */
    blurb: string;
    /** "owner" | "partner" | null — shown as a quiet mark, never hidden. */
    restrictedTo?: string | null;
  };

  let {
    product,
    mark = "door",
    tagline,
    /** Under the wordmark. "Pretoria East". */
    location = null,
    /** Google. Called when the fallback button is pressed. */
    onsignin,
    /**
     * Passkey. Omit entirely to render Google-first — which is correct on a
     * device with no registered credential, and is what a first visit sees.
     */
    passkey = null,
    /** Called by the "Sign out" escape when an account has no household claims. */
    onsignout = null,
    busy = false,
    /** Human sentence. Never a raw Firebase code — the portal classifies first. */
    error = null,
    /**
     * The raw code, shown small and monospaced beneath the sentence.
     *
     * Added because sign-in is being actively debugged and has failed
     * intermittently for the owner. A screenshot carrying the code is worth
     * considerably more than one without, and it costs a line of 11.5px type.
     * Remove this prop once the fault is closed.
     */
    errorCode = null,
    /**
     * Signed in, but this Google account carries no household claims. A
     * different situation from an error and it needs a different way out: the
     * only useful action is to sign out and try another account.
     *
     * A guest whose `expiresAt` has passed lands here too, so the wording must
     * not imply a mistake.
     */
    noAccess = false,
    /**
     * What one sign-in reaches, and what each one is for. Feed from the registry
     * filtered to `status: "live"` — a hard-coded list is stale the first time a
     * portal ships. Empty array hides the band.
     */
    portals = [],
    /** Superseded by `portals`. Kept so no portal breaks on upgrade. */
    siblings = [],
    /**
     * A line of scripture, under the wordmark.
     *
     * Its own prop rather than folded into `tagline` because it does a different
     * job: the tagline says what the app is, this says whose house it is.
     */
    verse = null,
    verseRef = null,
    /**
     * A few honest facts about the house, shown before sign-in.
     *
     * Every value comes from `GET /public/glance`, whose allowlist answered one
     * question per entity: *would this tell a stranger whether the house is
     * empty?* Solar, battery, grid state, the water tank and the outside
     * temperature do not. Indoor climate, doors, motion and the alarm are
     * excluded there, not here — this component renders whatever it is handed,
     * so the judgement lives at the source where it can be reviewed in one place.
     *
     * DO NOT ADD FIELDS HERE. Add them to the allowlist, or not at all.
     *
     * Empty array hides the panel rather than showing a row of dashes: six
     * dashes reads as a broken screen, which is a different claim from "the
     * house is not reachable right now".
     */
    glance = [],
  }: {
    product: string;
    mark?: string;
    tagline: string;
    location?: string | null;
    onsignin: () => void;
    passkey?: { name: string; onpasskey: () => void } | null;
    onsignout?: (() => void) | null;
    busy?: boolean;
    error?: string | null;
    errorCode?: string | null;
    noAccess?: boolean;
    portals?: PortalBlurb[];
    siblings?: string[];
    verse?: string | null;
    verseRef?: string | null;
    glance?: GlanceItem[];
  } = $props();

  // `portals` supersedes `siblings`; render whichever the consumer supplied so an
  // un-upgraded portal keeps working at the new tag.
  const legacy = $derived(
    portals.length === 0 && siblings.length > 0
      ? siblings.map((s) => ({ id: s, name: s, blurb: "", restrictedTo: null }))
      : portals,
  );
</script>

<div class="gate" data-gate>
  <!-- Three slow-drifting copper glows. Decorative, aria-hidden, and off entirely
       under prefers-reduced-motion — a login screen that pulses is a problem for
       anyone with vestibular sensitivity, and this is the one screen nobody can
       skip. -->
  <div class="glow glow--a" aria-hidden="true"></div>
  <div class="glow glow--b" aria-hidden="true"></div>
  <div class="glow glow--c" aria-hidden="true"></div>

  <div class="inner">
    <div class="split">
      <!-- ── who this is ──────────────────────────────────────────────────── -->
      <section class="brand">
        <div class="lockup">
          <div class="mark" aria-hidden="true"><Icon name={mark} size={30} /></div>
          <div class="wordmark">
            <span class="wordmark__n">{product}</span>
            {#if location}<span class="wordmark__l">{location}</span>{/if}
          </div>
        </div>

        <h1 class="name">The front door</h1>
        <p class="tag">{tagline}</p>

        {#if verse}
          <!-- An inscription in a margin, which is what it is: a copper rule down
               the side rather than a box, quieter than the tagline above it. -->
          <blockquote class="verse">
            <p>&ldquo;{verse}&rdquo;</p>
            {#if verseRef}<cite>{verseRef}</cite>{/if}
          </blockquote>
        {/if}
      </section>

      <!-- ── what to do ───────────────────────────────────────────────────── -->
      <main class="card">
        {#if noAccess}
          <div class="msg msg--warn" role="alert">
            <span class="msg__badge" aria-hidden="true"><Icon name="alert" size={12} /></span>
            <span>
              <strong>This is not a household account.</strong>
              Sign out and try the one that is.
            </span>
          </div>
          {#if onsignout}
            <button class="btn" onclick={onsignout}>Sign out and try another</button>
          {/if}
        {:else}
          <div class="lead">Welcome back</div>

          {#if passkey}
            <!-- The fast path. Autofocused and the first tab stop, because the
                 entire brief for this screen was "be faster to get through". -->
            <!-- svelte-ignore a11y_autofocus -->
            <button class="btn btn--go" onclick={passkey.onpasskey} disabled={busy} autofocus>
              <span class="btn__ico" aria-hidden="true"><Icon name="passkey" size={19} /></span>
              <span class="btn__lines">
                <span>{busy ? "Waiting for Face ID…" : `Continue as ${passkey.name}`}</span>
                <span class="btn__sub">Passkey · no password, no chooser</span>
              </span>
            </button>

            <div class="or"><span>or</span></div>

            <button class="btn" onclick={onsignin} disabled={busy}>
              <svg class="g" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91a8.78 8.78 0 0 0 2.69-6.62Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86a5.42 5.42 0 0 1-5.09-3.75H.96v2.34A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.91 10.67a5.41 5.41 0 0 1 0-3.34V4.99H.96a9 9 0 0 0 0 8.02l2.95-2.34Z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A8.99 8.99 0 0 0 .96 4.99l2.95 2.34A5.42 5.42 0 0 1 9 3.58Z" />
              </svg>
              <span>Use a different Google account</span>
            </button>
          {:else}
            <!-- First visit, or a device with no credential. Google is primary and
                 the passkey offer comes after success, not here. -->
            <button class="btn btn--plain" onclick={onsignin} disabled={busy}>
              <svg class="g" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91a8.78 8.78 0 0 0 2.69-6.62Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86a5.42 5.42 0 0 1-5.09-3.75H.96v2.34A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.91 10.67a5.41 5.41 0 0 1 0-3.34V4.99H.96a9 9 0 0 0 0 8.02l2.95-2.34Z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A8.99 8.99 0 0 0 .96 4.99l2.95 2.34A5.42 5.42 0 0 1 9 3.58Z" />
              </svg>
              <span>{busy ? "Signing in…" : "Continue with Google"}</span>
            </button>
            <p class="hint">After this we will offer to save a passkey, so next time is one tap.</p>
          {/if}

          {#if error}
            <div class="msg msg--warn" role="alert" aria-live="polite">
              <span class="msg__badge" aria-hidden="true"><Icon name="alert" size={12} /></span>
              <span>
                {error}
                {#if errorCode}<span class="msg__code">{errorCode}</span>{/if}
              </span>
            </div>
          {/if}
        {/if}

        {#if glance.length > 0}
          <!-- The house, before you are in. Not a dashboard: no chart, no live
               tick, no drill-down. A missing sensor shows an em dash rather than
               a zero, because "0 W of solar" is a claim about the house and "—"
               is a claim about the data. -->
          <div class="glance">
            <div class="glance__head">The house, right now</div>
            <div class="glance__grid">
              {#each glance as g (g.key)}
                <div class="glance__i">
                  <div class="glance__v">
                    {#if g.text !== null}
                      {g.text}
                    {:else if g.value !== null}
                      <!-- Rand prefixes; everything else suffixes. Nobody writes "56R". -->
                      {#if g.unit === "R"}<span class="glance__u">R</span>{g.value}
                      {:else}{g.value}<span class="glance__u">{g.unit}</span>{/if}
                    {:else}
                      &mdash;
                    {/if}
                  </div>
                  <div class="glance__l">{g.label}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </main>
    </div>

    {#if legacy.length > 0}
      <!-- What one sign-in reaches, and what each one is FOR.
           Restricted portals are shown and marked, never hidden: hiding them
           makes the estate look smaller than it is and turns a later "no access"
           into a surprise. -->
      <section class="reach">
        <div class="reach__head"><span>One sign-in reaches</span><i></i></div>
        <ul class="reach__grid">
          {#each legacy as p (p.id)}
            <li class="p">
              <span class="p__rule" aria-hidden="true"></span>
              <div class="p__body">
                <div class="p__top">
                  <span class="p__n">{p.name}</span>
                  {#if p.restrictedTo}<span class="p__who">{p.restrictedTo}</span>{/if}
                </div>
                {#if p.blurb}<p class="p__b">{p.blurb}</p>{/if}
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>

<style>
  .gate {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: var(--sp-5);
    background: var(--bg);
    overflow: hidden;
    container-type: inline-size;
    container-name: gate;
  }
  .inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 1040px;
    display: flex;
    flex-direction: column;
    gap: var(--sp-6);
  }

  .glow {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--acc) 24%, transparent) 0%, transparent 68%);
    filter: blur(38px);
    pointer-events: none;
    z-index: 0;
  }
  .glow--a { width: 46vmax; height: 46vmax; top: -14vmax; left: -12vmax; animation: drift-a 26s ease-in-out infinite alternate; }
  .glow--b { width: 38vmax; height: 38vmax; right: -12vmax; bottom: -14vmax; animation: drift-b 32s ease-in-out infinite alternate; }
  .glow--c { width: 26vmax; height: 26vmax; top: 42%; left: 58%; opacity: .6; animation: drift-c 22s ease-in-out infinite alternate; }
  @keyframes drift-a { to { transform: translate3d(7vmax, 5vmax, 0) scale(1.12); } }
  @keyframes drift-b { to { transform: translate3d(-6vmax, -4vmax, 0) scale(1.08); } }
  @keyframes drift-c { to { transform: translate3d(-5vmax, 4vmax, 0) scale(.9); } }

  .split {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 400px);
    align-items: center;
    gap: clamp(1.5rem, 5vw, 4rem);
    animation: rise var(--dur) var(--ease);
  }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } }

  .lockup { display: flex; align-items: center; gap: var(--sp-3); }
  .mark {
    width: 54px; height: 54px;
    display: grid; place-items: center;
    border-radius: 12px;
    background: var(--grad);
    /* Page background, not currentColor — an accent glyph on an accent fill is
       invisible. */
    color: var(--acc-ink);
    box-shadow: 0 12px 34px color-mix(in srgb, var(--acc) 30%, transparent);
  }
  .wordmark { display: flex; flex-direction: column; gap: 1px; }
  .wordmark__n {
    font-family: var(--font-serif);
    font-size: var(--fs-small);
    font-weight: 600;
    letter-spacing: .24em;
    text-transform: uppercase;
    color: var(--tx2);
  }
  .wordmark__l {
    font-size: var(--fs-micro);
    font-weight: 700;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--mut);
  }

  .name {
    margin: var(--sp-5) 0 0;
    font-family: var(--font-serif);
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    font-weight: 600;
    letter-spacing: -.025em;
    line-height: 1.02;
    color: var(--tx);
  }
  .tag {
    margin: var(--sp-4) 0 0;
    max-width: 40ch;
    font-size: var(--fs-lead);
    line-height: 1.6;
    color: var(--tx2);
  }
  .verse { margin: var(--sp-5) 0 0; padding: 0 0 0 var(--sp-3); border-left: 2px solid var(--acc); max-width: 44ch; }
  .verse p { margin: 0; font-family: var(--font-serif); font-size: var(--fs-lead); font-style: italic; line-height: 1.5; color: var(--tx2); }
  .verse cite {
    display: block; margin-top: 6px;
    font-style: normal; font-size: var(--fs-micro); font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase; color: var(--acc);
  }

  .card {
    padding: var(--sp-5);
    border-radius: 4px;
    background: color-mix(in srgb, var(--s1) 90%, transparent);
    /* The one place a blur is right: a panel floating over the page. */
    backdrop-filter: blur(14px);
    box-shadow: inset 0 0 0 1px var(--line), 0 30px 80px rgb(0 0 0 / .5);
  }
  .lead {
    font-size: var(--fs-micro); font-weight: 800;
    letter-spacing: .14em; text-transform: uppercase; color: var(--tx2);
  }

  .btn {
    display: flex; align-items: center; gap: 12px;
    width: 100%;
    min-height: 48px;
    padding: 13px 16px;
    border: 0; border-radius: 3px;
    font: inherit; font-size: var(--fs-body); font-weight: 700;
    text-align: left;
    color: var(--tx);
    background: var(--fill);
    box-shadow: inset 0 0 0 1px var(--line);
    cursor: pointer;
    transition: background var(--dur) var(--ease), box-shadow var(--dur) var(--ease), transform var(--dur) var(--ease);
  }
  .btn:hover:not(:disabled) { background: var(--fill-strong); transform: translateY(-1px); }
  .btn:disabled { opacity: .6; cursor: default; transform: none; }

  .btn--go {
    margin-top: var(--sp-4);
    font-size: var(--fs-lead); font-weight: 800;
    color: var(--acc-ink);
    background: var(--grad);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--acc) 26%, transparent);
  }
  .btn--go:hover:not(:disabled) { filter: brightness(1.07); background: var(--grad); }
  .btn--plain { margin-top: var(--sp-4); justify-content: center; }

  .btn__ico {
    display: grid; place-items: center;
    width: 34px; height: 34px; flex: 0 0 34px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--acc-ink) 16%, transparent);
  }
  .btn__lines { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .btn__sub { font-size: var(--fs-micro); font-weight: 600; opacity: .74; }

  .or { display: flex; align-items: center; gap: 11px; margin: var(--sp-3) 0; }
  .or::before, .or::after { content: ""; flex: 1; height: 1px; background: var(--line); }
  .or span { font-size: var(--fs-micro); font-weight: 800; letter-spacing: .13em; text-transform: uppercase; color: var(--mut); }

  .g {
    width: 18px; height: 18px; flex-shrink: 0;
    /* A white plate keeps Google's mark legible on any button face. */
    background: #fff; border-radius: 50%; padding: 1px; box-sizing: content-box;
  }
  .hint { margin: var(--sp-3) 0 0; font-size: var(--fs-small); line-height: 1.5; color: var(--mut); }

  .msg {
    display: flex; align-items: flex-start; gap: 9px;
    margin-top: var(--sp-3);
    padding: 11px 13px;
    /* Amber, with a glyph beside it. Never colour alone. */
    border-left: 3px solid var(--warn);
    background: color-mix(in srgb, var(--warn) 9%, transparent);
    font-size: var(--fs-small); line-height: 1.45; color: var(--tx2);
    text-align: left;
  }
  .msg__badge {
    display: grid; place-items: center;
    width: 20px; height: 20px; flex-shrink: 0;
    border-radius: 50%;
    background: var(--warn); color: var(--bg);
  }
  .msg__code {
    display: block; margin-top: 4px;
    font-family: var(--font-mono); font-size: var(--fs-micro); color: var(--mut);
  }

  .glance { margin-top: var(--sp-5); padding-top: var(--sp-4); border-top: 1px solid var(--line); }
  .glance__head {
    font-size: var(--fs-micro); font-weight: 800;
    letter-spacing: .14em; text-transform: uppercase; color: var(--tx2);
  }
  .glance__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--sp-4) var(--sp-3);
    margin-top: var(--sp-3);
  }
  .glance__i { min-width: 0; }
  .glance__v {
    font-family: var(--font-serif);
    font-size: 1.5rem; font-weight: 600; line-height: 1;
    letter-spacing: -.02em; color: var(--tx);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .glance__u { font-family: var(--font-body); font-size: var(--fs-micro); font-weight: 700; color: var(--mut); }
  .glance__l { margin-top: 4px; font-size: var(--fs-micro); font-weight: 700; color: var(--mut); }

  .reach { display: flex; flex-direction: column; gap: var(--sp-4); }
  .reach__head { display: flex; align-items: baseline; gap: var(--sp-3); }
  .reach__head span {
    font-size: var(--fs-micro); font-weight: 800;
    letter-spacing: .14em; text-transform: uppercase; color: var(--acc);
  }
  .reach__head i { flex: 1; height: 1px; background: var(--line); }
  .reach__grid {
    list-style: none; margin: 0; padding: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--sp-5) var(--sp-6);
  }
  .p { display: flex; gap: var(--sp-3); min-width: 0; }
  .p__rule { flex: 0 0 2px; background: var(--line); border-radius: 1px; }
  .p__body { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .p__top { display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; }
  .p__n { font-family: var(--font-serif); font-size: var(--fs-lead); font-weight: 600; color: var(--tx); }
  .p__who {
    font-size: var(--fs-micro); font-weight: 800;
    letter-spacing: .1em; text-transform: uppercase; color: var(--mut);
    padding: 2px 6px; box-shadow: inset 0 0 0 1px var(--line);
  }
  .p__b { margin: 0; font-size: var(--fs-small); line-height: 1.5; color: var(--mut); text-wrap: pretty; }

  /* Container queries rather than one viewport breakpoint: this component is
     also rendered inside a preview frame in Fabric, where the viewport is the
     wrong thing to measure. */
  @container gate (max-width: 900px) {
    .reach__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @container gate (max-width: 720px) {
    /* Identity above, card below, so the sign-in button stays in thumb reach
       rather than being pushed down the page by the verse. The reach band runs
       below the fold deliberately — someone who knows what this is never
       scrolls, someone who does not finds out without a tour. */
    .split { grid-template-columns: minmax(0, 1fr); gap: var(--sp-5); }
    .inner { max-width: 440px; }
    .tag, .verse { max-width: none; }
    .reach__grid { grid-template-columns: minmax(0, 1fr); gap: var(--sp-4); }
  }

  @media (prefers-reduced-motion: reduce) {
    .glow, .split { animation: none; }
    .btn:hover:not(:disabled) { transform: none; }
  }
</style>
