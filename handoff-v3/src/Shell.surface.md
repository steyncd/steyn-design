# Shell.svelte — the `surface` prop and registry-driven nav

Two changes. Both are small; the second removes a whole class of release pain.

---

## 1 · `surface`

```ts
let {
  portal,
  surface = "operator",   // NEW — "operator" | "home"
  nav = [],
  portals = null,         // NEW — see §2
  registryUrl = null,     // NEW — see §2
  children,
}: {
  portal: string;
  surface?: "operator" | "home";
  nav?: NavItem[];
  portals?: PortalLink[] | null;
  registryUrl?: string | null;
  children: Snippet;
} = $props();
```

Set it on the root element Shell already renders:

```svelte
<div class="shell sd-container" data-surface={surface}>
```

That is the entire mechanism. Everything else is CSS in `tokens.additions.css`:
`--row-h`, `--pad-x`, `--gap-section`, `--font-heading`, `--font-figure`.

**A portal never sets density itself.** If a component needs a row height it
reads `var(--row-h)`. A component with a hard-coded `34px` is a bug, because it
will be wrong on the other surface and nobody will notice until Vault ships.

### Who is what

| `operator` | `home` |
|---|---|
| Fabric, Hindsight | Front Door, Vault, Homestead, Waypoint, HA Dashboard |

The value comes from the portal's registry entry, not from a literal in the
portal — so it is visible in Fabric and changeable without a deploy.

### The badge

Render it in the header beside the portal name: `Operator` or `Home`, at
`--fs-micro`, in `--mut`, outlined. It is the honest answer to "why is this
screen so dense", and it costs one line.

---

## 2 · Registry-driven nav

`Shell` currently takes a literal `nav` array, and it is consumed at a pinned
tag. So today a new portal means editing every consumer and bumping every
dependant — nine repos to add one destination.

**Change:** when `registryUrl` is given, Shell fetches `GET /portals` (already
claim-filtered server-side) and builds the cross-portal rail from it. The
portal's own in-app `nav` stays a literal array, because that genuinely is the
portal's business.

```ts
let resolved = $state<PortalLink[] | null>(portals);

$effect(() => {
  if (portals || !registryUrl) return;
  const cached = sessionStorage.getItem("sd:portals");
  if (cached) { resolved = JSON.parse(cached); return; }

  fetch(registryUrl, { credentials: "include" })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => {
      resolved = d.portals;
      sessionStorage.setItem("sd:portals", JSON.stringify(d.portals));
    })
    // Fall back to the literal array. A Fabric outage must degrade the
    // switcher, never the app — Shell owning no data is the reason a bad tag
    // cannot break six portals at once, and this must not undo that.
    .catch(() => { resolved = portals ?? []; });
});
```

Cache for the session, not longer. A stale rail showing a portal that was
disabled an hour ago is a smaller problem than a rail that needs a deploy, but
it is still a problem.

### Rail rules this has to preserve

- **Same nine slots, same order, in every portal.** The order is the registry's
  `order` field; do not sort by name or by recency.
- The active portal gets a **copper left bar and a copper glyph** — a marker and
  a colour, never colour alone.
- Portals the user cannot open are **absent**, not disabled. `GET /portals`
  already filters by claims, so a `display` user's rail is genuinely shorter.
- Glyphs come from `Icon.svelte` by the registry's `icon` name. A registry entry
  with an unknown icon name renders nothing rather than a broken box — and the
  drift sweep should assert that every registered icon name exists in the map.

---

## 3 · View transition names

Add the two class names so the chrome stays still across navigation:

```svelte
<nav class="rail sd-rail">…</nav>
<header class="head sd-header">…</header>
```

The CSS is already in `tokens.additions.css`, including the reduced-motion
override.

---

## 4 · Speculation rules

One script tag in Shell, prefetching the portal a pointer is heading towards.
Free, and it removes the cold-start stutter that Cloud Run keep-warm was going
to be paid for (see `handoff-v2` item 14).

```svelte
<svelte:head>
  {@html `<script type="speculationrules">${JSON.stringify({
    prerender: [{ where: { selector_matches: ".rail a" }, eagerness: "moderate" }]
  })}<\/script>`}
</svelte:head>
```

`eagerness: "moderate"` fires on hover, not on render — nine prerenders on page
load would cost more than the cold start it avoids.

---

## Not changing

`Shell` still owns **no data and no routing**. It fetches one claim-filtered
list and nothing else. The reason `SignIn` is presentational and `Shell` owns no
routing is that moving `v3` changes six repositories at once, and a bad tag must
not be able to break sign-in or navigation everywhere simultaneously. Keep
anything with real failure risk in the consumer.
