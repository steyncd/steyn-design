<script lang="ts">
  /**
   * Icon — Lucide-shaped line icons at 1.7px stroke in currentColor.
   *
   * Same approach as HA Portal's Icon.svelte (inline path map, no runtime
   * dependency, no icon font, nothing to tree-shake) so the two look identical
   * side by side on the Front Door. Default 18px is the size the nav rail and
   * the status rows use; pass `size` for hero treatments.
   *
   * Colour is always inherited. An icon never sets its own hue — that rule is
   * what lets the same glyph mean "live" in blue and "attention" in amber
   * without a second component.
   */
  let {
    name,
    size = 18,
    title = undefined,
  }: { name: string; size?: number; title?: string } = $props();

  const P: Record<string, string> = {
    // ── status ───────────────────────────────────────────────────────────────
    // These four are the accessible-status set. They are deliberately distinct
    // in SHAPE, not just colour: Christo is red-green colour blind and the
    // programme's rule is glyph + label + colour, never colour alone.
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/>',
    pause: '<path d="M10 4v16M14 4v16"/>',
    dot: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',

    // ── the five modules + the four existing portals ─────────────────────────
    fabric: '<path d="M4 4h16v16H4z"/><path d="M4 10h16M4 15h16M10 4v16M15 4v16"/>',
    door: '<rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none"/>',
    vault: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8V6M12 18v-2M8 12H6M18 12h-2"/>',
    homestead: '<path d="M3 11 12 4l9 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
    waypoint: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    hindsight: '<path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 12v5h5"/><path d="M12 8v4l3 2"/>',
    house: '<path d="M3 11 12 4l9 7M6 10v9h12v-9"/>',
    finance: '<path d="M4 20V4M4 20h16"/><path d="M8 16V9M13 16v-4M18 16V6"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 9h5M16 9h5M3 15h5M16 15h5"/>',
    bot: '<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M12 8V4"/><circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none"/>',

    // ── actions & furniture ──────────────────────────────────────────────────
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
    "chevron-right": '<path d="M9 5l7 7-7 7"/>',
    "chevron-down": '<path d="M5 9l7 7 7-7"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-3.8 4-6 7.5-6s6.7 2.2 7.5 6"/>',
    users: '<circle cx="9" cy="8" r="3.4"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M17 11a2.5 2.5 0 1 0 0-5"/><path d="M21 20v-1a4 4 0 0 0-3-3.9"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
    inbox: '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14l2 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/>',
    wrench: '<path d="M15 5a4.5 4.5 0 0 0 5.9 5.9L11 20.8a3 3 0 0 1-4.2-4.2L16.7 6.8A4.5 4.5 0 0 0 15 5z"/>',
    car: '<path d="M5 16v-4l2-5h10l2 5v4"/><path d="M3 16h18"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/>',
    fuel: '<path d="M4 20V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15"/><path d="M3 20h11"/><path d="M13 9h3.5a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-2.5-3"/>',
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
    droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    shield: '<path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6z"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M7 14h10v6H7z"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  };
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="1.7"
  stroke-linecap="round"
  stroke-linejoin="round"
  role={title ? "img" : undefined}
  aria-label={title}
  aria-hidden={title ? undefined : "true"}
>
  {#if title}<title>{title}</title>{/if}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- path map is a build-time constant, never user input -->
  {@html P[name] ?? ""}
</svg>
