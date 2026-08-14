<script lang="ts">
  /**
   * The four states a panel can be in, decided once.
   *
   * Every portal hand-rolled loading, failure and empty. They had drifted into six
   * different phrasings of "could not load", some with a retry and some without, and
   * two that showed an empty list for a failed request — which is the single worst
   * outcome available, because "Fabric is unreachable" and "you own no portals" look
   * identical and only one of them is alarming.
   *
   * Three rules this enforces:
   *
   *  · **A failure never renders as empty.** If `error` is set, the empty state is
   *    not reachable. That is the whole reason this component exists.
   *  · **A failure always offers a way forward.** `onretry` puts a button there; if a
   *    panel genuinely cannot be retried it has to say so in its own words.
   *  · **Empty says what to do next.** The `empty` snippet is required to be
   *    supplied, so nobody ships a bare "Nothing here." — the message that leaves a
   *    person with no idea whether that is normal or broken.
   */
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import Skeleton from "./Skeleton.svelte";

  let {
    loading = false,
    error = null,
    /** True when the request succeeded and returned nothing. */
    isEmpty = false,
    onretry = null,
    /** Shape of the skeleton — see Skeleton. */
    variant = "row",
    rows = 3,
    /** What to do when there is nothing. Required: an empty state must teach. */
    empty,
    children,
  }: {
    loading?: boolean;
    error?: string | null;
    isEmpty?: boolean;
    onretry?: (() => void) | null;
    variant?: "row" | "card" | "text";
    rows?: number;
    empty: Snippet;
    children: Snippet;
  } = $props();
</script>

{#if error}
  <!-- Checked first, deliberately. A panel that is both errored and empty is
       errored, and ordering these the other way round is how "could not read" ends
       up looking like "nothing there". -->
  <div class="state state--bad" role="alert">
    <span class="state__badge" aria-hidden="true"><Icon name="alert" size={13} /></span>
    <div class="state__body">
      <p class="state__t">{error}</p>
      <p class="state__s">This is a failure to read, not an empty result — what is here may be out of date.</p>
    </div>
    {#if onretry}
      <button class="state__btn" onclick={onretry}>Try again</button>
    {/if}
  </div>
{:else if loading}
  <Skeleton {variant} {rows} />
{:else if isEmpty}
  <div class="state state--empty">
    <span class="state__badge state__badge--quiet" aria-hidden="true"><Icon name="pause" size={13} /></span>
    <div class="state__body">{@render empty()}</div>
  </div>
{:else}
  {@render children()}
{/if}

<style>
  .state {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-3, 12px);
    padding: var(--sp-4, 16px);
    border-radius: var(--r-control, 10px);
    background: var(--fill, var(--s2));
    box-shadow: inset 0 0 0 1px var(--line);
  }
  /* Amber, never red — and the glyph carries the meaning regardless, because
     red/green is the axis this household cannot separate. */
  .state--bad {
    border-left: 3px solid var(--warn);
  }
  .state__badge {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--warn);
    color: var(--bg);
  }
  .state__badge--quiet {
    background: var(--mut);
  }
  .state__body {
    flex: 1;
    min-width: 0;
    font-size: var(--fs-small, 0.78rem);
    color: var(--tx2);
    line-height: 1.5;
  }
  .state__t {
    margin: 0;
    font-weight: 700;
    color: var(--tx);
  }
  .state__s {
    margin: 3px 0 0;
    color: var(--mut);
  }
  .state__btn {
    flex-shrink: 0;
    padding: 7px 14px;
    border-radius: var(--r-pill);
    font-size: var(--fs-micro, 0.72rem);
    font-weight: 800;
    color: var(--acc-ink);
    background: var(--grad);
  }
</style>
