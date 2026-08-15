# Icon.svelte — three entries to add

Add to the `P` path map in `steyn-design/src/Icon.svelte`. Same 24×24 grid, same
1.7 stroke, same convention: entries that should read as a **dot** carry
`fill="currentColor" stroke="none"` explicitly, because a handle or a hub drawn
as a ring is a different glyph.

```ts
    // ── added v3 ─────────────────────────────────────────────────────────────
    // A key seen end-on: the conventional passkey mark, and distinct in SHAPE
    // from `shield` (which the design mocks borrowed while this was missing)
    // and from `lock`. Christo's estate has no lock glyph, so there is no
    // collision to worry about.
    passkey: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9"/><path d="M17 12v3.5"/><path d="M20.5 12v2.5"/>',

    // Chores (F6). A checklist rather than a tick, so it reads as "a list of
    // things to do" at 19px in the rail, where `check` already means "live".
    chore: '<path d="M4 6h3l1.5 1.5L11 5"/><path d="M4 13h3l1.5 1.5L11 12"/><path d="M14 6.5h6"/><path d="M14 13.5h6"/><path d="M4 20h16"/>',

    // A trip (F13). A road running to a point, distinct from `waypoint`, which
    // is the pin and stays the portal's own mark.
    trip: '<path d="M5 21c0-6 4-8 7-8s7-2 7-8"/><circle cx="5" cy="21" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none"/>',
```

## Why `passkey` had to be added

The design mocks used `shield` for the passkey button because the map had no
passkey glyph. A shield means *protected*; a passkey is a *credential*. Shipping
the shield would have taught the household the wrong association on the one
screen every single person sees.

This is the general rule and it is in the acceptance checklist: **if a glyph does
not exist, add it to the map — never inline an SVG locally.** Doing that twice
while producing this pack flattened `vault`, `door` and `film` into three
near-identical empty boxes in a nine-item rail.

## Verifying

```svelte
<!-- all three, both surfaces, both themes -->
{#each ["passkey", "chore", "trip"] as n}
  <Icon name={n} size={19} title={n} />
  <Icon name={n} size={30} title={n} />
{/each}
```

At 19px the three must be distinguishable from `shield`, `check` and `waypoint`
in a greyscale screenshot. That is the same bar every status glyph clears.
