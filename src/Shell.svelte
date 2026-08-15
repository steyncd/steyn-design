<script lang="ts">
  /**
   * Shell — sidebar + sticky header + content slot. The layout every module uses.
   *
   * Deliberately dumb: it owns no data and no routing. A module passes its nav
   * items and its active id, and handles navigation itself. That keeps Shell
   * usable by Fabric's single admin screen and by Vault's six-route app without
   * either bending to the other.
   *
   * The sidebar collapses to a top bar under 860px. There is exactly one
   * breakpoint on purpose — this is a desktop programme with one phone-shaped
   * screen (Vault's /capture), and that screen does not use Shell.
   */
  import Icon from "./Icon.svelte";
  import type { Snippet } from "svelte";

  export type NavItem = {
    id: string;
    label: string;
    icon: string;
    href?: string;
    /** Small count badge — open jobs, documents waiting. Falsy hides it. */
    badge?: number | null;
  };

  /** One entry in the cross-portal switcher. Shape matches Fabric's registry. */
  export type PortalLink = { id: string; name: string; url: string; icon?: string };

  let {
    product,
    mark = null,
    surface = "operator",
    nav = [],
    active = "",
    onnavigate,
    homeHref = "/",
    frontDoorUrl = null,
    portals = null,
    header,
    children,
  }: {
    /** Wordmark in the rail — "Vault", "Homestead". */
    product: string;
    /**
     * Icon name drawn inside the brand mark. Null leaves the plain copper
     * gradient, which is what every module shipped with — a bare gradient square
     * is anonymous, and four portals side by side on a phone all looked alike.
     */
    mark?: string | null;
    /**
     * Type and density. **A different axis from theme, and they must not merge.**
     *
     * Theme sets the neutral ramp, belongs to the *user*, and applies estate-wide.
     * Surface sets headings, figures and density, belongs to the *portal*, and the
     * user cannot change it. A warm theme on an operator surface is legitimate and
     * has to look right, so never hard-code a ramp against a surface.
     *
     *   operator — Fabric, Hindsight. Dense, Space Grotesk, mono tabular figures.
     *   home     — Front Door, Vault, Homestead, Waypoint, HA Dashboard. Open,
     *              Newsreader, large serif figures.
     *
     * Body copy is deliberately identical on both. Only headings, figures and
     * density move — that is what keeps two temperaments from becoming two
     * products.
     *
     * Defaults to `operator` because the failure is asymmetric: a home screen
     * rendered dense is ugly, an operator table rendered loose is unusable.
     *
     * Everything downstream is CSS reading `--row-h`, `--pad-x`, `--gap-section`,
     * `--font-heading` and `--font-figure`. A component with a hard-coded `34px`
     * row is a bug — it will be wrong on the other surface, and nobody will notice
     * until Vault ships.
     */
    surface?: "operator" | "home";
    nav?: NavItem[];
    active?: string;
    /** Called with the item id. Omit and Shell falls back to the item's href. */
    onnavigate?: (id: string) => void;
    homeHref?: string;
    /**
     * Back-to-front-door link. Null hides it entirely — Front Door itself
     * passes null, because a link back to yourself is furniture, not navigation.
     */
    frontDoorUrl?: string | null;
    /**
     * Cross-portal switcher (handoff-v2 item 20).
     *
     * A **loader function**, not a URL. The spec says Shell should fetch
     * `GET /portals` itself, but that endpoint requires the caller's Firebase ID
     * token and Shell has no business knowing how a module authenticates — it
     * owns no data and no routing, and that is what makes it usable by Fabric's
     * admin screen and Vault's six-route app without either bending. The module
     * passes its own authenticated fetch; Shell calls it once and caches for the
     * session.
     *
     * On any failure the switcher simply does not render. A Fabric outage
     * degrades cross-portal navigation rather than the app you are standing in.
     */
    portals?: (() => Promise<PortalLink[]>) | null;
    /** Right-hand side of the sticky header — search box, user chip, actions. */
    header?: Snippet;
    children?: Snippet;
  } = $props();

  let open = $state(false);

  let links = $state<PortalLink[]>([]);
  let switcherOpen = $state(false);

  /**
   * Light/dark, remembered.
   *
   * All nine original themes were dark and nothing read `prefers-color-scheme`, so
   * the estate was dark whether or not the room was. `daylight` is the light ramp;
   * the household's chosen dark theme comes from Fabric's registry and is whatever
   * is already on the element, so switching back restores *their* theme rather than
   * resetting everyone to `stone`.
   */
  const LIGHT = "daylight";
  let darkTheme = $state("stone");
  let isLight = $state(false);

  $effect(() => {
    const el = document.documentElement;
    const current = el.dataset.theme ?? "stone";
    if (current !== LIGHT) darkTheme = current;

    const saved = localStorage.getItem("steyn.appearance");
    // No stored choice means follow the operating system, which is what somebody
    // who has never opened this menu almost certainly wants.
    const wantLight = saved ? saved === "light" : matchMedia("(prefers-color-scheme: light)").matches;
    isLight = wantLight;
    el.dataset.theme = wantLight ? LIGHT : darkTheme;
  });

  function toggleAppearance(): void {
    isLight = !isLight;
    localStorage.setItem("steyn.appearance", isLight ? "light" : "dark");
    document.documentElement.dataset.theme = isLight ? LIGHT : darkTheme;
  }

  /**
   * Keyboard shortcuts. `/` focuses the search box, `?` lists them, Escape closes
   * the mobile rail.
   *
   * Guarded on the event target: `/` while typing in a field must be a slash. That
   * one check is the difference between a shortcut and a bug that makes every text
   * input eat a character.
   */
  let showKeys = $state(false);

  function onKeydown(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    const typing =
      t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t?.isContentEditable;

    if (e.key === "Escape") {
      showKeys = false;
      open = false;
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "/") {
      const box = document.querySelector<HTMLInputElement>('input[type="search"], [role="search"] input');
      if (box) {
        e.preventDefault();
        box.focus();
      }
      return;
    }
    if (e.key === "?") {
      e.preventDefault();
      showKeys = !showKeys;
    }
  }

  // Loaded once per mount, never retried on a timer: a sidebar that re-requests
  // the registry every few seconds is a sidebar that costs Firestore reads for
  // nothing. `void` because a failure here is not the app's problem.
  $effect(() => {
    if (!portals) return;
    void portals()
      .then((p) => (links = p.filter((x) => x.url)))
      .catch(() => (links = []));
  });

  /** Everything except the portal you are already in. */
  const others = $derived(links.filter((l) => l.name.toLowerCase() !== product.toLowerCase()));

  function go(item: NavItem, e: MouseEvent) {
    if (onnavigate) {
      e.preventDefault();
      onnavigate(item.id);
    }
    open = false;
  }
</script>

<svelte:window onkeydown={onKeydown} />

<!-- `data-surface` is the entire surface mechanism; everything else is CSS.
     `sd-container` makes this the container query root, so a panel responds to the
     space it is actually given rather than to the viewport — which is why a
     two-column layout could not tell a 400px sidebar from a 1400px page before. -->
<div class="shell sd-container" class:shell--open={open} data-surface={surface}>
  <aside class="rail">
    <a class="brand" href={homeHref} aria-label={product}>
      <span class="brand__mark" aria-hidden="true">
        {#if mark}<Icon name={mark} size={13} />{/if}
      </span>
      <span class="brand__name">{product}</span>
    </a>

    <nav class="nav sd-rail" aria-label="Sections">
      {#each nav as item (item.id)}
        <a
          class="nav__item"
          class:nav__item--on={item.id === active}
          href={item.href ?? `#${item.id}`}
          aria-current={item.id === active ? "page" : undefined}
          onclick={(e) => go(item, e)}
        >
          <Icon name={item.icon} size={18} />
          <span class="nav__label">{item.label}</span>
          {#if item.badge}<span class="nav__badge num">{item.badge}</span>{/if}
        </a>
      {/each}
    </nav>

    <!-- Cross-portal switcher. Collapsed by default so the module's own nav stays
         the thing you see first: this is for leaving, not for working. A new
         portal registered in Fabric appears here with no deploy and no tag bump,
         which is the whole point of item 20. -->
    {#if others.length > 0}
      <div class="switch">
        <button class="switch__head" onclick={() => (switcherOpen = !switcherOpen)} aria-expanded={switcherOpen}>
          <Icon name={switcherOpen ? "chevron-down" : "chevron-right"} size={13} />
          <span>Portals</span>
          <span class="switch__n num">{others.length}</span>
        </button>
        {#if switcherOpen}
          <div class="switch__list">
            {#each others as l (l.id)}
              <a class="switch__item" href={l.url}>
                <Icon name={l.icon ?? "door"} size={15} />
                <span>{l.name}</span>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if frontDoorUrl}
      <a class="rail__foot" href={frontDoorUrl}>
        <Icon name="chevron-right" size={14} />
        <span>Front Door</span>
      </a>
    {/if}
  </aside>

  <div class="main">
    <header class="head sd-header">
      <button
        class="head__burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onclick={() => (open = !open)}
      >
        <Icon name={open ? "x" : "chevron-down"} size={18} />
      </button>
      <!-- The honest answer to "why is this screen so dense". It costs one line and
           it takes two seconds to explain to anyone who asks, which is better than
           the alternative of people assuming the dense screens are unfinished. -->
      <span class="head__surface">{surface === "home" ? "Home" : "Operator"}</span>
      <div class="head__slot">
        {@render header?.()}
        <button
          class="head__btn"
          onclick={toggleAppearance}
          aria-label={isLight ? "Switch to the dark theme" : "Switch to the light theme"}
          title={isLight ? "Dark" : "Light"}
        >
          <Icon name={isLight ? "clock" : "bolt"} size={16} />
        </button>
      </div>
    </header>

    {#if showKeys}
      <!-- Opened with `?`, closed with Escape or the button. Deliberately a small
           list: three shortcuts somebody remembers beat twelve nobody does. -->
      <div class="keys" role="dialog" aria-label="Keyboard shortcuts">
        <div class="keys__row"><kbd>/</kbd><span>Focus search</span></div>
        <div class="keys__row"><kbd>?</kbd><span>This list</span></div>
        <div class="keys__row"><kbd>Esc</kbd><span>Close</span></div>
        <button class="keys__x" onclick={() => (showKeys = false)}>Close</button>
      </div>
    {/if}

    <!-- `sd-panel` is here, not left to each portal, and that is a fix rather than a
         tidy-up. The container query in tokens.css targets `.sd-panel` — it has to
         target a DESCENDANT of `.sd-container`, because a container cannot match its
         own query (see DEVIATIONS D1). Leaving portals to add the class by hand meant
         the phone layout silently did nothing until somebody remembered, in a repo
         where the same class had already been forgotten once. Putting it on the
         content region means every portal gets the narrow behaviour for free, and a
         portal that wants a second container still nests one inside. -->
    <main class="content sd-panel">
      {@render children?.()}
    </main>
  </div>
</div>

<style>
  /* The aurora is painted once, on the shell, not on <body> — a module may
     render Shell inside a print view or a modal where the page background must
     stay white. Waypoint's one-page print view depends on this. */
  .shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 216px 1fr;
    background: var(--aurora);
    color: var(--tx);
  }

  .rail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 18px 12px;
    border-right: 1px solid var(--line);
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 8px 16px;
    color: var(--tx);
    font-weight: 800;
    font-size: 0.9375rem;
    letter-spacing: -0.2px;
  }
  .brand__mark {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    background: var(--grad);
    flex-shrink: 0;
    display: grid;
    place-items: center;
    /* The glyph sits ON the copper gradient, so it takes the page background
       colour rather than currentColor — an accent-coloured glyph on an accent
       fill is invisible. */
    color: var(--bg);
  }

  .nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--r-control);
    color: var(--mut);
    font-size: 0.7812rem;
    font-weight: 700;
    transition:
      background var(--dur) var(--ease),
      color var(--dur) var(--ease);
  }
  .nav__item:hover {
    background: var(--card-hover);
    color: var(--tx);
  }
  /* Active state carries a copper left rule AND a colour shift AND weight —
     three signals, so it survives any colour vision. */
  .nav__item--on {
    background: var(--wash);
    color: var(--tx);
    box-shadow: inset 2px 0 0 var(--acc);
  }
  .nav__label {
    flex: 1;
  }
  .nav__badge {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: var(--r-pill);
    background: var(--fill-strong);
    color: var(--tx2);
    font-size: 0.72rem;
    font-weight: 800;
    display: grid;
    place-items: center;
  }

  .switch {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .switch__head {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    padding: 6px 10px;
    border-radius: var(--r-control);
    color: var(--mut);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .switch__head:hover {
    color: var(--tx);
  }
  .switch__n {
    margin-left: auto;
    font-size: 0.72rem;
    font-weight: 800;
  }
  .switch__list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding-top: 2px;
  }
  .switch__item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 10px;
    border-radius: var(--r-control);
    color: var(--mut);
    font-size: 0.75rem;
    font-weight: 700;
  }
  .switch__item:hover {
    background: var(--card-hover);
    color: var(--tx);
  }

  .rail__foot {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    color: var(--mut);
    font-size: 0.72rem;
    font-weight: 700;
  }
  .rail__foot:hover {
    color: var(--acc);
  }

  .main {
    min-width: 0; /* lets wide tables scroll instead of stretching the grid */
    display: flex;
    flex-direction: column;
  }

  .head {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 56px;
    padding: 10px 20px;
    border-bottom: 1px solid var(--line);
    /* Solid, not glass: --glass-blur is modals only per the token comment. */
    background: var(--bg);
  }
  /* Outlined rather than filled: copper means "you can act on this", and this is
     a label, not a control. Hidden on a narrow rail where the header has to give
     its room to search. */
  .head__surface {
    flex: none;
    padding: 2px 8px;
    border: 1px solid var(--line);
    border-radius: var(--r-pill);
    font-size: var(--fs-micro);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mut);
    white-space: nowrap;
  }
  @media (max-width: 860px) {
    .head__surface {
      display: none;
    }
  }

  .head__slot {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    min-width: 0;
  }
  .head__btn {
    display: grid;
    place-items: center;
    padding: 6px;
    border-radius: var(--r-control);
    color: var(--mut);
    flex-shrink: 0;
  }
  .head__btn:hover {
    color: var(--acc);
  }

  .keys {
    position: fixed;
    right: var(--sp-4, 16px);
    bottom: var(--sp-4, 16px);
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2, 8px);
    padding: var(--sp-4, 16px);
    border-radius: var(--r-surface);
    background: var(--s1);
    box-shadow:
      inset 0 0 0 1px var(--line),
      0 18px 40px rgb(0 0 0 / 0.35);
  }
  .keys__row {
    display: flex;
    align-items: center;
    gap: var(--sp-3, 12px);
    font-size: var(--fs-small);
    color: var(--tx2);
  }
  .keys kbd {
    min-width: 2rem;
    padding: 2px 6px;
    border-radius: 6px;
    background: var(--s2);
    box-shadow: inset 0 0 0 1px var(--line);
    font-family: inherit;
    font-size: var(--fs-micro);
    font-weight: 800;
    text-align: center;
    color: var(--tx);
  }
  .keys__x {
    margin-top: var(--sp-1, 4px);
    font-size: var(--fs-micro);
    font-weight: 700;
    color: var(--mut);
  }

  .head__burger {
    display: none;
    padding: 6px;
    border-radius: var(--r-control);
    color: var(--mut);
  }

  .content {
    padding: 20px;
    max-width: 1180px;
    width: 100%;
  }

  @media (max-width: 860px) {
    .shell {
      grid-template-columns: 1fr;
    }
    .rail {
      position: fixed;
      inset: 0 auto 0 0;
      width: 216px;
      z-index: 30;
      background: var(--s1);
      transform: translateX(-100%);
      transition: transform var(--dur) var(--ease);
    }
    .shell--open .rail {
      transform: none;
    }
    .head__burger {
      display: grid;
      place-items: center;
    }
    .content {
      padding: 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rail {
      transition: none;
    }
  }
</style>
