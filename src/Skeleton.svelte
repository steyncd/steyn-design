<script lang="ts">
  /**
   * A loading placeholder shaped like the thing that is coming.
   *
   * Every panel in the estate said "Loading…" — one line of text where a table or a
   * grid of cards was about to appear. Two problems with that: the page jumps when
   * the real content lands and pushes everything down, and a single line gives no
   * sense of whether two rows or forty are on their way.
   *
   * `rows` and `variant` exist so the placeholder can be roughly the size of the
   * answer. Roughly is the point — a skeleton that pretends to know the exact shape
   * is a different lie.
   *
   * `aria-hidden` with a live region alongside: a screen reader should hear "loading"
   * once, not a description of eight grey rectangles.
   */
  let {
    rows = 3,
    variant = "row",
    label = "Loading",
  }: {
    rows?: number;
    /** `row` for lists and tables, `card` for tile grids, `text` for a paragraph. */
    variant?: "row" | "card" | "text";
    label?: string;
  } = $props();
</script>

<div class="sk sk--{variant}" role="status" aria-live="polite" aria-busy="true">
  <span class="sr">{label}…</span>
  {#each Array(rows) as _, i (i)}
    <!-- Widths vary so it reads as content rather than as a loading bar. The
         sequence is deterministic, not random: a placeholder that reshuffles on
         every render is its own kind of distracting. -->
    <div class="sk__b" aria-hidden="true" style="--w: {[100, 82, 91, 74, 96, 68][i % 6]}%; --d: {i * 90}ms"></div>
  {/each}
</div>

<style>
  .sk {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2, 8px);
    padding: var(--sp-2, 8px) 0;
  }
  .sk--card {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
    gap: var(--sp-3, 12px);
  }

  .sk__b {
    width: var(--w);
    height: 1rem;
    border-radius: var(--r-control, 10px);
    /* A moving highlight rather than a pulsing opacity: pulse draws the eye to the
       placeholder, sweep reads as "in progress" and settles into the background. */
    background: linear-gradient(90deg, var(--s2) 0%, var(--line) 40%, var(--s2) 80%);
    background-size: 300% 100%;
    animation: sweep 1.4s var(--d) linear infinite;
  }
  .sk--card .sk__b {
    width: 100%;
    height: 7.5rem;
  }
  .sk--text .sk__b {
    height: 0.8rem;
  }

  @keyframes sweep {
    from {
      background-position: 150% 0;
    }
    to {
      background-position: -150% 0;
    }
  }

  /* A sweeping gradient behind text is exactly the kind of motion that causes
     trouble, and it conveys nothing a static block does not. */
  @media (prefers-reduced-motion: reduce) {
    .sk__b {
      animation: none;
      background: var(--s2);
    }
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
