<script lang="ts">
  /**
   * The sign-in screen, once, for every portal.
   *
   * Four portals had four hand-rolled gates that had drifted: different mark sizes,
   * different copy, different error wording, and only some of them offering a way out
   * when the account had no access. A household of four people should not be able to
   * tell which portal they are looking at by how the login screen is wrong.
   *
   * It is presentational on purpose — it owns no Firebase call. Each portal passes
   * `onsignin`, because the *robustness* of signing in (popup, redirect fallback,
   * error classification) belongs next to the auth code, not in the design system.
   * Shell follows the same rule for the same reason.
   *
   * Colour: blue is good, amber wants attention, and there is no green anywhere in
   * this estate — red/green is exactly the axis its owner cannot separate. Every
   * state here carries a glyph and a word as well as a hue.
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
     * situation from an error and it needs a different way out: the only useful
     * action is to sign out and try another account.
     */
    noAccess = false,
    /** Shown small under the button, so it reads as one estate rather than one app. */
    siblings = [],
    /**
     * A few honest facts about the house, shown before sign-in.
     *
     * Every value here comes from `GET /public/glance`, whose allowlist answered one
     * question per entity: *would this tell a stranger whether the house is empty?*
     * Solar, battery, grid state, the water tank and the outside temperature do not.
     * Indoor climate, doors, motion and the alarm are excluded there, not here — this
     * component renders whatever it is handed, so the judgement belongs at the source
     * where it can be reviewed in one place.
     *
     * Empty array hides the strip entirely rather than showing a row of dashes.
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
    glance?: Array<{ key: string; label: string; value: number | null; unit: string; text: string | null }>;
  } = $props();
</script>

<div class="gate">
  <!-- Three slow-drifting copper glows. Decorative, aria-hidden, and switched off
       entirely under prefers-reduced-motion — a login screen that pulses is a
       problem for anyone with vestibular sensitivity, and this is the one screen
       nobody can skip. -->
  <div class="glow glow--a" aria-hidden="true"></div>
  <div class="glow glow--b" aria-hidden="true"></div>
  <div class="glow glow--c" aria-hidden="true"></div>

  <main class="card">
    <div class="mark" aria-hidden="true"><Icon name={mark} size={26} /></div>

    <h1 class="name">{product}</h1>
    <p class="tag">{tagline}</p>

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
        <!-- Google's own mark, inline. Their guidelines ask for the four-colour G on
             a sign-in button, and it is the one place in this estate where a green
             appears — it is Google's brand, not a status signal, so it carries no
             meaning anybody has to read. -->
        <svg class="g" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91a8.78 8.78 0 0 0 2.69-6.62Z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86a5.42 5.42 0 0 1-5.09-3.75H.96v2.34A9 9 0 0 0 9 18Z"/>
          <path fill="#FBBC05" d="M3.91 10.67a5.41 5.41 0 0 1 0-3.34V4.99H.96a9 9 0 0 0 0 8.02l2.95-2.34Z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A8.99 8.99 0 0 0 .96 4.99l2.95 2.34A5.42 5.42 0 0 1 9 3.58Z"/>
        </svg>
        <span>{busy ? "Signing in…" : "Continue with Google"}</span>
      </button>

      {#if error}
        <div class="msg msg--warn" role="alert">
          <span class="msg__badge" aria-hidden="true"><Icon name="alert" size={12} /></span>
          <span>{error}</span>
        </div>
      {/if}

      <p class="once">One sign-in reaches every portal.</p>
    {/if}

    {#if glance.length > 0}
      <!-- The house, before you are in. Deliberately not a dashboard: five or six
           figures, no chart, no live tick. A missing sensor shows an em dash rather
           than a zero, because "0 W of solar" is a claim about the house and "—" is a
           claim about the data. -->
      <div class="glance">
        {#each glance as g (g.key)}
          <div class="glance__i">
            <div class="glance__v num">
              {#if g.text !== null}{g.text}
              {:else if g.value !== null}{g.value}<span class="glance__u">{g.unit}</span>
              {:else}—{/if}
            </div>
            <div class="glance__l">{g.label}</div>
          </div>
        {/each}
      </div>
    {/if}

    {#if siblings.length > 0}
      <div class="sibs">
        {#each siblings as s (s)}<span class="sib">{s}</span>{/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .gate {
    position: relative;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: var(--aurora);
    overflow: hidden;
  }

  .glow {
    position: absolute;
    border-radius: 50%;
    /* Copper, the estate's only accent. Large and very soft, so it reads as light
       in a room rather than as a shape on a page. */
    background: radial-gradient(circle, color-mix(in srgb, var(--acc) 26%, transparent) 0%, transparent 68%);
    filter: blur(38px);
    pointer-events: none;
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

  .card {
    position: relative;
    z-index: 1;
    width: min(392px, 100%);
    padding: 38px 32px 30px;
    text-align: center;
    border-radius: 20px;
    background: color-mix(in srgb, var(--s1) 86%, transparent);
    /* The one place --glass-blur is right: this is a modal over the whole page. */
    backdrop-filter: blur(14px);
    box-shadow:
      inset 0 0 0 1px var(--line),
      0 26px 70px rgb(0 0 0 / 0.4);
    animation: rise var(--dur, 180ms) var(--ease, ease-out);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }

  .mark {
    width: 58px;
    height: 58px;
    margin: 0 auto 18px;
    border-radius: 17px;
    background: var(--grad);
    display: grid;
    place-items: center;
    /* Page background, not currentColor — an accent glyph on the accent gradient
       would be invisible. */
    color: var(--bg);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--acc) 34%, transparent);
  }

  .name {
    margin: 0 0 7px;
    font-size: 1.6875rem;
    font-weight: 800;
    letter-spacing: -0.8px;
    color: var(--tx);
  }
  .tag {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--mut);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    margin-top: 24px;
    padding: 12px 18px;
    border-radius: var(--r-pill);
    font-size: 0.8438rem;
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
  .btn:focus-visible {
    outline: 2px solid var(--acc);
    outline-offset: 3px;
  }
  .g {
    width: 17px;
    height: 17px;
    flex-shrink: 0;
    /* The button face is the text colour, so the white plate keeps Google's mark
       legible against it at any theme. */
    background: #fff;
    border-radius: 50%;
    padding: 1px;
    box-sizing: content-box;
  }

  .msg {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: 16px;
    padding: 11px 13px;
    border-radius: 12px;
    text-align: left;
    font-size: 0.75rem;
    line-height: 1.45;
    color: var(--tx2);
    background: var(--fill);
    box-shadow: inset 0 0 0 1px var(--line);
  }
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

  .once {
    margin: 16px 0 0;
    font-size: 0.72rem;
    color: var(--mut);
  }

  .glance {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(5.2rem, 1fr));
    gap: var(--sp-2, 8px);
    margin-top: var(--sp-5, 24px);
    padding-top: var(--sp-4, 16px);
    border-top: 1px solid var(--line);
    text-align: left;
  }
  .glance__i {
    min-width: 0;
  }
  .glance__v {
    font-size: var(--fs-lead, 1rem);
    font-weight: 800;
    letter-spacing: -0.4px;
    color: var(--tx);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .glance__u {
    margin-left: 1px;
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

  .sibs {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    justify-content: center;
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
  }
  .sib {
    padding: 4px 9px;
    border-radius: var(--r-pill);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--mut);
    box-shadow: inset 0 0 0 1px var(--line);
  }

  @media (prefers-reduced-motion: reduce) {
    .glow {
      animation: none;
    }
    .card {
      animation: none;
    }
    .btn:hover:not(:disabled) {
      transform: none;
    }
  }
</style>
