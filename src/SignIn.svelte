<script lang="ts">
  /**
   * The sign-in screen, once, for every portal.
   *
   * Six portals had six hand-rolled gates that had drifted: different mark sizes,
   * different copy, different error wording, and only some offering a way out when the
   * account had no household claims. Nobody should be able to tell which portal they
   * are looking at by how its login screen is wrong.
   *
   * Presentational on purpose — it owns no Firebase call. Each portal passes
   * `onsignin`, because the *robustness* of signing in (popup, redirect fallback, error
   * classification) belongs next to the auth code. `Shell` follows the same rule.
   *
   * ## The layout
   *
   * Two panels on a wide screen, stacked on a narrow one. The earlier version put
   * everything in one 392px card — seven house figures crammed into 5.2rem columns,
   * three competing lines of prose, and a tall thin column with empty space either side
   * on any desktop. Splitting *who this is* from *what to do* gives each the room it
   * needs and uses the width rather than ignoring it.
   *
   * Colour: blue is good, amber wants attention, and there is no green anywhere in this
   * estate — red/green is exactly the axis its owner cannot separate. Every state
   * carries a glyph and a word as well as a hue.
   */
  import Icon from "./Icon.svelte";

  let {
    product,
    mark = "door",
    tagline,
    /** Called when the button is pressed. Should resolve when sign-in settles. */
    onsignin,
    /** Called by the "Sign out" escape when an account has no access. */
    onsignout = null,
    busy = false,
    /** Human sentence. Never a raw Firebase code — the portal classifies first. */
    error = null,
    /**
     * Signed in, but this Google account carries no household claims. A different
     * situation from an error and it needs a different way out: the only useful action
     * is to sign out and try another account.
     */
    noAccess = false,
    /**
     * The other portals. Rendered as the tail of "One sign-in reaches …", because that
     * list IS the proof of the claim — stating both separately was one line of prose
     * too many.
     */
    siblings = [],
    /**
     * A line of scripture, under the wordmark.
     *
     * Its own prop rather than folded into `tagline` because it does a different job:
     * the tagline says what the app is, this says whose house it is.
     */
    verse = null,
    verseRef = null,
    /**
     * A few honest facts about the house, shown before sign-in.
     *
     * Every value comes from `GET /public/glance`, whose allowlist answered one question
     * per entity: *would this tell a stranger whether the house is empty?* Solar,
     * battery, grid state, the water tank and the outside temperature do not. Indoor
     * climate, doors, motion and the alarm are excluded there, not here — this component
     * renders whatever it is handed, so the judgement lives at the source where it can
     * be reviewed in one place.
     *
     * Empty array hides the panel rather than showing a row of dashes.
     */
    glance = [],
  }: {
    product: string;
    mark?: string;
    tagline: string;
    onsignin: () => void;
    onsignout?: (() => void) | null;
    busy?: boolean;
    error?: string | null;
    noAccess?: boolean;
    siblings?: string[];
    verse?: string | null;
    verseRef?: string | null;
    glance?: Array<{ key: string; label: string; value: number | null; unit: string; text: string | null }>;
  } = $props();
</script>

<div class="gate">
  <!-- Three slow-drifting copper glows. Decorative, aria-hidden, and off entirely under
       prefers-reduced-motion — a login screen that pulses is a problem for anyone with
       vestibular sensitivity, and this is the one screen nobody can skip. -->
  <div class="glow glow--a" aria-hidden="true"></div>
  <div class="glow glow--b" aria-hidden="true"></div>
  <div class="glow glow--c" aria-hidden="true"></div>

  <div class="split">
    <!-- ── who this is ──────────────────────────────────────────────────────── -->
    <section class="brand">
      <div class="mark" aria-hidden="true"><Icon name={mark} size={30} /></div>
      <h1 class="name">{product}</h1>
      <p class="tag">{tagline}</p>

      {#if verse}
        <!-- An inscription in a margin, which is what it is: a copper rule down the
             side rather than a box, quieter than the tagline above it. -->
        <blockquote class="verse">
          <p>&ldquo;{verse}&rdquo;</p>
          {#if verseRef}<cite>{verseRef}</cite>{/if}
        </blockquote>
      {/if}
    </section>

    <!-- ── what to do ───────────────────────────────────────────────────────── -->
    <main class="card">
      {#if noAccess}
        <div class="msg msg--warn">
          <span class="msg__badge" aria-hidden="true"><Icon name="alert" size={12} /></span>
          <span>
            <strong>No access.</strong>
            This Google account is not part of the household. Sign out and try the one that is.
          </span>
        </div>
        {#if onsignout}
          <button class="btn" onclick={onsignout}>Sign out</button>
        {/if}
      {:else}
        <button class="btn btn--go" onclick={onsignin} disabled={busy}>
          <!-- Google's own mark, inline. Their guidelines ask for the four-colour G on a
               sign-in button, and it is the one place in this estate where a green
               appears — their brand, not a status signal, so it carries no meaning
               anybody has to read. -->
          <svg class="g" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91a8.78 8.78 0 0 0 2.69-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86a5.42 5.42 0 0 1-5.09-3.75H.96v2.34A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.91 10.67a5.41 5.41 0 0 1 0-3.34V4.99H.96a9 9 0 0 0 0 8.02l2.95-2.34Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A8.99 8.99 0 0 0 .96 4.99l2.95 2.34A5.42 5.42 0 0 1 9 3.58Z" />
          </svg>
          <span>{busy ? "Signing in…" : "Continue with Google"}</span>
        </button>

        {#if error}
          <div class="msg msg--warn" role="alert">
            <span class="msg__badge" aria-hidden="true"><Icon name="alert" size={12} /></span>
            <span>{error}</span>
          </div>
        {/if}
      {/if}

      {#if glance.length > 0}
        <!-- The house, before you are in. Not a dashboard: no chart, no live tick, no
             drill-down. A missing sensor shows an em dash rather than a zero, because
             "0 W of solar" is a claim about the house and "—" is a claim about the
             data. -->
        <div class="glance">
          <div class="glance__head">Right now</div>
          <div class="glance__grid">
            {#each glance as g (g.key)}
              <div class="glance__i">
                <div class="glance__v num">
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

  {#if siblings.length > 0}
    <footer class="foot">
      <span class="foot__lead">One sign-in reaches</span>
      {#each siblings as s (s)}<span class="sib">{s}</span>{/each}
    </footer>
  {/if}
</div>

<style>
  .gate {
    position: relative;
    min-height: 100vh;
    display: grid;
    /* Content centred with the footer beneath it, rather than pinned to the viewport:
       a fixed footer over the stacked mobile layout covers the sign-in button. */
    grid-template-rows: 1fr auto;
    align-content: center;
    justify-items: center;
    gap: var(--sp-5, 24px);
    padding: var(--sp-5, 24px);
    background: var(--aurora);
    overflow: hidden;
  }

  .glow {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--acc) 26%, transparent) 0%, transparent 68%);
    filter: blur(38px);
    pointer-events: none;
    z-index: 0;
  }
  .glow--a {
    width: 46vmax;
    height: 46vmax;
    top: -14vmax;
    left: -12vmax;
    animation: drift-a 26s ease-in-out infinite alternate;
  }
  .glow--b {
    width: 38vmax;
    height: 38vmax;
    right: -12vmax;
    bottom: -14vmax;
    animation: drift-b 32s ease-in-out infinite alternate;
  }
  .glow--c {
    width: 26vmax;
    height: 26vmax;
    top: 42%;
    left: 58%;
    opacity: 0.6;
    animation: drift-c 22s ease-in-out infinite alternate;
  }
  @keyframes drift-a {
    to {
      transform: translate3d(7vmax, 5vmax, 0) scale(1.12);
    }
  }
  @keyframes drift-b {
    to {
      transform: translate3d(-6vmax, -4vmax, 0) scale(1.08);
    }
  }
  @keyframes drift-c {
    to {
      transform: translate3d(-5vmax, 4vmax, 0) scale(0.9);
    }
  }

  .split {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 400px);
    align-items: center;
    gap: clamp(1.5rem, 5vw, 4rem);
    width: 100%;
    max-width: 980px;
    animation: rise var(--dur, 180ms) var(--ease, ease-out);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }

  .mark {
    width: 62px;
    height: 62px;
    border-radius: 18px;
    background: var(--grad);
    display: grid;
    place-items: center;
    /* Page background, not currentColor — an accent glyph on an accent fill is
       invisible. */
    color: var(--bg);
    box-shadow: 0 10px 30px color-mix(in srgb, var(--acc) 34%, transparent);
  }
  .name {
    margin: var(--sp-4, 16px) 0 0;
    font-size: clamp(1.75rem, 4.4vw, 2.6rem);
    font-weight: 800;
    letter-spacing: -1.2px;
    line-height: 1.05;
    color: var(--tx);
  }
  .tag {
    margin: var(--sp-2, 8px) 0 0;
    max-width: 34ch;
    font-size: var(--fs-lead, 1rem);
    line-height: 1.5;
    color: var(--tx2);
  }
  .verse {
    margin: var(--sp-4, 16px) 0 0;
    padding: 0 0 0 var(--sp-3, 12px);
    border-left: 2px solid var(--acc);
    max-width: 40ch;
  }
  .verse p {
    margin: 0;
    font-size: var(--fs-small, 0.78rem);
    font-style: italic;
    line-height: 1.55;
    color: var(--tx2);
  }
  .verse cite {
    display: block;
    margin-top: 3px;
    font-style: normal;
    font-size: var(--fs-micro, 0.72rem);
    font-weight: 700;
    letter-spacing: 0.3px;
    color: var(--acc);
  }

  .card {
    padding: var(--sp-5, 24px);
    border-radius: 20px;
    background: color-mix(in srgb, var(--s1) 88%, transparent);
    /* The one place --glass-blur is right: a panel floating over the page. */
    backdrop-filter: blur(14px);
    box-shadow:
      inset 0 0 0 1px var(--line),
      0 26px 70px rgb(0 0 0 / 0.4);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 13px 18px;
    border-radius: var(--r-pill);
    font-size: var(--fs-body, 0.875rem);
    font-weight: 700;
    color: var(--tx);
    background: var(--fill);
    box-shadow: inset 0 0 0 1px var(--line);
    transition:
      background var(--dur) var(--ease),
      box-shadow var(--dur) var(--ease),
      transform var(--dur) var(--ease);
  }
  .btn--go {
    background: var(--tx);
    color: var(--bg);
    box-shadow: 0 6px 18px rgb(0 0 0 / 0.28);
  }
  .btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  .btn--go:hover:not(:disabled) {
    box-shadow: 0 10px 26px rgb(0 0 0 / 0.34);
  }
  .btn:disabled {
    opacity: 0.6;
    cursor: default;
    transform: none;
  }
  .g {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    /* The button face is the text colour, so a white plate keeps Google's mark legible
       in either theme. */
    background: #fff;
    border-radius: 50%;
    padding: 1px;
    box-sizing: content-box;
  }

  .msg {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: var(--sp-3, 12px);
    padding: 11px 13px;
    border-radius: 12px;
    text-align: left;
    font-size: var(--fs-small, 0.78rem);
    line-height: 1.45;
    color: var(--tx2);
    background: var(--fill);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  /* Amber, with a glyph beside it. Never colour alone. */
  .msg--warn {
    border-left: 3px solid var(--warn);
  }
  .msg__badge {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--warn);
    color: var(--bg);
  }

  .glance {
    margin-top: var(--sp-5, 24px);
    padding-top: var(--sp-4, 16px);
    border-top: 1px solid var(--line);
  }
  .glance__head {
    font-size: var(--fs-micro, 0.72rem);
    font-weight: 800;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--mut);
  }
  .glance__grid {
    display: grid;
    /* Two columns, not seven. The card is 400px; three would give each figure 110px and
       clip "Off-grid this month". */
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-3, 12px) var(--sp-4, 16px);
    margin-top: var(--sp-3, 12px);
  }
  .glance__i {
    min-width: 0;
  }
  .glance__v {
    font-size: var(--fs-h3, 1.15rem);
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--tx);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .glance__u {
    font-size: var(--fs-micro, 0.72rem);
    font-weight: 700;
    color: var(--mut);
  }
  .glance__l {
    margin-top: 1px;
    font-size: var(--fs-micro, 0.72rem);
    font-weight: 700;
    color: var(--mut);
  }

  .foot {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px;
    max-width: 980px;
  }
  .foot__lead {
    margin-right: 2px;
    font-size: var(--fs-micro, 0.72rem);
    font-weight: 700;
    color: var(--mut);
  }
  .sib {
    padding: 4px 10px;
    border-radius: var(--r-pill);
    font-size: var(--fs-micro, 0.72rem);
    font-weight: 700;
    color: var(--mut);
    box-shadow: inset 0 0 0 1px var(--line);
  }

  /* One breakpoint, matching Shell's. Identity above, card below, so the sign-in button
     stays in thumb reach rather than being pushed down the page by the verse. */
  @media (max-width: 860px) {
    .split {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--sp-5, 24px);
      max-width: 420px;
    }
    .name {
      font-size: 1.9rem;
    }
    .tag,
    .verse {
      max-width: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .glow,
    .split {
      animation: none;
    }
    .btn:hover:not(:disabled) {
      transform: none;
    }
  }
</style>
