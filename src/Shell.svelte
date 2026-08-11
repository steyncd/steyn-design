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

<div class="shell" class:shell--open={open}>
  <aside class="rail">
    <a class="brand" href={homeHref} aria-label={product}>
      <span class="brand__mark" aria-hidden="true">
        {#if mark}<Icon name={mark} size={13} />{/if}
      </span>
      <span class="brand__name">{product}</span>
    </a>

    <nav class="nav" aria-label="Sections">
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
    <header class="head">
      <button
        class="head__burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onclick={() => (open = !open)}
      >
        <Icon name={open ? "x" : "chevron-down"} size={18} />
      </button>
      <div class="head__slot">
        {@render header?.()}
      </div>
    </header>

    <main class="content">
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
    font-size: 15px;
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
    font-size: 12.5px;
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
    font-size: 10.5px;
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
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .switch__head:hover {
    color: var(--tx);
  }
  .switch__n {
    margin-left: auto;
    font-size: 10.5px;
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
    font-size: 12px;
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
    font-size: 11.5px;
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
  .head__slot {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    min-width: 0;
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
