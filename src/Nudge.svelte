<script lang="ts" module>
  /**
   * One counter for the whole page, so every wrapped thing gets its own popover
   * id and its own `anchor-name`. Two Nudges sharing an anchor name is not a
   * cosmetic bug — the second menu silently positions against the first one's
   * anchor, which only shows up on a long table where nobody is looking.
   */
  let seq = 0;
</script>

<script lang="ts">
  /**
   * Nudge — F24, "anything can become a nudge, from anywhere".
   *
   * Wraps any figure, row or job in any portal so that a long-press (touch) or a
   * right-click (pointer) turns it into a reminder. Four commands: remind me,
   * remind us, snooze until…, send to WhatsApp.
   *
   * ## It owns no data, deliberately
   *
   * `Nudge` calls **no API**. It builds a structured payload and hands it to
   * `onnudge`; the portal posts it to Fabric's `POST /attention`. This is the same
   * rule that makes `SignIn` presentational and `Shell` own no routing, and it
   * exists for the same reason: this package is consumed at a git tag by six
   * portals at once, so a component with a network call in it is a component that
   * can break sign-in — or here, every table in the estate — from a bad tag.
   *
   * It also means there is no confirmation state in here. The menu closes on
   * choice and the portal shows the toast, because only the portal knows whether
   * the write actually landed. A component that says "Reminder set" before anyone
   * has spoken to the server is a component that lies on a bad connection.
   *
   * ## Why timestamps and not "tomorrow"
   *
   * The snooze options emit an **absolute** ISO instant, never `"tomorrow"`. Item
   * 19's attention engine stores `snoozeUntil` and hides the item until then; if
   * the wire carried a relative word, the server would re-derive "tomorrow
   * morning" against its own clock and its own timezone, hours after the person
   * chose it and possibly on the other side of midnight. The person picked a
   * moment. Send the moment.
   *
   * ## Why the menu is a popover
   *
   * `popover` + CSS anchor positioning, per `01-design-language.md`. No
   * positioning library and no z-index stack: the top layer is above every
   * `overflow: hidden` card and every sticky header by construction, which is the
   * only way a menu opened on row 40 of a scrolling table is not clipped in half.
   * Browsers without anchor positioning get ~20 lines of JS below instead — still
   * no library.
   *
   * ## Cost
   *
   * The menu is only in the DOM while it is open (`{#if open}`), because the
   * intended use is one Nudge per row and 200 pre-rendered menus is 200 popovers
   * the browser has to keep. The one thing that is always rendered is the
   * keyboard trigger button, which is one extra tab stop per wrapped element — so
   * wrap the **row**, not every cell in it.
   */
  import type { Snippet } from "svelte";
  import { tick } from "svelte";
  import Icon from "./Icon.svelte";
  import { DASH, LOCALE, TZ } from "./fmt";

  /** The thing being nudged about. `key` is the attention doc's `dedupeKey`. */
  export type NudgeSubject = {
    /**
     * Stable within the portal — `vault:doc:1234`, `homestead:job:99`. Fabric
     * upserts on `(source, dedupeKey)`, so nudging the same row twice updates one
     * item instead of making two.
     */
    key: string;
    /** What the reminder is about, in words. Shown at the head of the menu. */
    title: string;
    /** Optional supporting sentence. */
    detail?: string | null;
    /** Deep link back to the thing, for the notification to point at. */
    url?: string | null;
    /** Portal id, if the caller knows it. Fabric derives `source` from the
     *  calling service account regardless — this is for the deep link, not auth. */
    portalId?: string | null;
  };

  export type NudgeSnoozeKey = "evening" | "tomorrow" | "weekend" | "next-week";

  export type NudgeWhen = {
    key: NudgeSnoozeKey;
    /** The words the person actually read — "This evening". For confirmation copy. */
    label: string;
    /** ISO 8601, UTC. Absolute: nothing downstream re-derives what "evening" meant. */
    at: string;
  };

  export type NudgeAction = "remind-me" | "remind-us" | "snooze" | "whatsapp";

  export type NudgePayload = {
    action: NudgeAction;
    audience: "me" | "household";
    /** `attention` → `POST /attention`. `whatsapp` → the outbound household path. */
    channel: "attention" | "whatsapp";
    /** Item 19's severity. Drives ordering and escalation server-side. */
    severity: "info" | "attention" | "urgent";
    subject: NudgeSubject;
    /** Null means *surface it now*; otherwise this is `snoozeUntil`. */
    when: NudgeWhen | null;
    createdAt: string;
  };

  let {
    subject,
    onnudge,
    as = "div",
    severity = "attention",
    disabled = false,
    children,
  }: {
    subject: NudgeSubject;
    /**
     * Called once per choice. The portal posts it; this component never does.
     * Required — a Nudge with nowhere to send the payload is a dead menu that
     * still costs a tab stop on every row.
     */
    onnudge: (payload: NudgePayload) => void;
    /**
     * The element rendered around the children. `div` by default; `td` or `li`
     * where the surrounding markup demands it.
     *
     * **Not `tr`.** The trigger button and the anchor have to live inside this
     * element, and a `<button>` inside a `<tr>` is hoisted out of the table by
     * the parser. Wrap the row's leading cell instead — which is where a thumb
     * lands anyway.
     */
    as?: string;
    severity?: "info" | "attention" | "urgent";
    disabled?: boolean;
    children: Snippet;
  } = $props();

  const uid = `sd-nudge-${++seq}`;
  const anchorName = `--${uid}`;

  let rootEl = $state<HTMLElement | null>(null);
  let menuEl = $state<HTMLElement | null>(null);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let anchorEl = $state<HTMLElement | null>(null);

  let open = $state(false);
  let snoozeOpen = $state(false);
  /** Anchor offset within the wrapper, so the menu opens where the finger was. */
  let anchorX = $state(0);
  let anchorY = $state(0);
  /**
   * Frozen at open. The labels say "18:00" and the payload must carry the instant
   * those labels described — recomputing per render would let the two disagree if
   * the menu is sitting open at 17:59:59.
   */
  let openedAt = $state(Date.now());

  /**
   * Anchor positioning is Chromium-only today. Gate on `position-area`, which is
   * the property that does the placing — `anchor-name` alone parsing is not
   * enough to conclude the layout will happen.
   */
  const supportsAnchor =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("anchor-name: --a") &&
    CSS.supports("position-area: block-end");

  // ───────────────────────────────────────────────────────────────────────────
  // When "this evening" is
  //
  // SAST is UTC+02:00 and has been since 1944 — no DST, ever. So the estate's
  // wall clock is exactly `UTC + 2h`, and a fixed offset here is not an
  // approximation of `Intl` but the same answer with no formatter round-trip.
  //
  // This matters when the device is not in South Africa: "tomorrow morning" has
  // to mean 07:00 at home, not 07:00 wherever the laptop is sitting.
  // ───────────────────────────────────────────────────────────────────────────
  const SAST_MS = 2 * 60 * 60 * 1000;

  /** The instant whose SAST wall clock is the given Y/M/D at hh:00. */
  function sastAt(y: number, mo: number, d: number, hh: number): Date {
    return new Date(Date.UTC(y, mo, d, hh - 2, 0, 0, 0));
  }

  function stamp(d: Date): string {
    if (!Number.isFinite(d.getTime())) return DASH;
    return d.toLocaleString(LOCALE, {
      timeZone: TZ,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  type Option = { key: NudgeSnoozeKey; word: string; icon: string; at: Date; stamp: string };

  /**
   * The four options, minus any that has already happened.
   *
   * An option that resolves to the past is a lie, and it is the specific lie that
   * makes a reminder never arrive — pick "this evening" at 21:00 and the item is
   * born already due, so the engine surfaces it instantly or drops it. Filtering
   * is why the list is shorter late at night, and that is correct.
   *
   * Duplicates go the same way. On a Sunday "tomorrow morning" and "next week"
   * are the same Monday 07:00, and two rows in a menu that do exactly the same
   * thing is the kind of detail that makes a person stop trusting the rest of it.
   * The earlier, more precise wording wins.
   */
  function snoozeOptions(now: Date): Option[] {
    const w = new Date(now.getTime() + SAST_MS); // read SAST wall clock via UTC getters
    const y = w.getUTCFullYear();
    const mo = w.getUTCMonth();
    const d = w.getUTCDate();
    const dow = w.getUTCDay();

    const toSat = (6 - dow + 7) % 7;
    const toMon = (8 - dow) % 7 || 7;

    const raw: Array<{ key: NudgeSnoozeKey; word: string; icon: string; at: Date }> = [
      { key: "evening", word: "This evening", icon: "moon", at: sastAt(y, mo, d, 18) },
      { key: "tomorrow", word: "Tomorrow morning", icon: "sunrise", at: sastAt(y, mo, d + 1, 7) },
      // Dropped on a Sunday: the weekend is already happening, and offering it
      // would put "this weekend" six days out and *after* "next week".
      ...(dow === 0
        ? []
        : [{ key: "weekend" as const, word: "This weekend", icon: "calendar", at: sastAt(y, mo, d + toSat, 8) }]),
      { key: "next-week", word: "Next week", icon: "calendar", at: sastAt(y, mo, d + toMon, 7) },
    ];

    const out: Option[] = [];
    const seen = new Set<number>();
    for (const o of raw) {
      const t = o.at.getTime();
      if (t <= now.getTime() || seen.has(t)) continue;
      seen.add(t);
      out.push({ ...o, stamp: stamp(o.at) });
    }
    return out;
  }

  const options = $derived(snoozeOptions(new Date(openedAt)));

  // ───────────────────────────────────────────────────────────────────────────
  // Opening and closing
  // ───────────────────────────────────────────────────────────────────────────
  const LONG_PRESS_MS = 500;
  const MOVE_CANCEL_PX = 10;

  let pressTimer: number | null = null;
  let pressX = 0;
  let pressY = 0;
  /** A long-press is followed by a click. Swallow exactly one. */
  let swallowClick = false;

  function cancelPress(): void {
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  /**
   * `x`/`y` are viewport coordinates, or null to hang the menu off the wrapper
   * itself — which is what the keyboard path wants, since there is no pointer.
   */
  async function openMenu(x: number | null, y: number | null): Promise<void> {
    if (disabled) return;
    cancelPress();

    const r = rootEl?.getBoundingClientRect();
    if (x !== null && y !== null && r) {
      anchorX = x - r.left;
      anchorY = y - r.top;
    } else {
      anchorX = 0;
      anchorY = r ? r.height : 0;
    }

    openedAt = Date.now();
    snoozeOpen = false;
    open = true;

    await tick();
    const m = menuEl;
    if (!m) return;
    if (typeof m.showPopover === "function" && !m.matches(":popover-open")) {
      try {
        m.showPopover();
      } catch {
        // Already open, or the element was detached mid-frame. Either way the
        // menu is still rendered and still usable; nothing to recover.
      }
    }
    if (!supportsAnchor) place();
    focusItem(0);
  }

  function closeMenu(restoreFocus: boolean): void {
    if (!open) return;
    const m = menuEl;
    if (m && typeof m.hidePopover === "function" && m.matches(":popover-open")) {
      try {
        m.hidePopover();
      } catch {
        /* already closed */
      }
    }
    open = false;
    snoozeOpen = false;
    if (restoreFocus) triggerEl?.focus();
  }

  function onContextMenu(e: MouseEvent): void {
    if (disabled) return;
    // Shift+right-click still reaches the browser's own menu. Copying a figure,
    // or opening a link in a new tab, must not become impossible because a row
    // grew a nudge.
    if (e.shiftKey) return;
    e.preventDefault();
    void openMenu(e.clientX, e.clientY);
  }

  function onPointerDown(e: PointerEvent): void {
    if (disabled || e.pointerType !== "touch") return;
    pressX = e.clientX;
    pressY = e.clientY;
    cancelPress();
    pressTimer = window.setTimeout(() => {
      pressTimer = null;
      swallowClick = true;
      void openMenu(pressX, pressY);
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: PointerEvent): void {
    if (pressTimer === null) return;
    // A scroll started as a press. Anything past ~10px is a drag, not a hold.
    if (Math.abs(e.clientX - pressX) > MOVE_CANCEL_PX || Math.abs(e.clientY - pressY) > MOVE_CANCEL_PX) {
      cancelPress();
    }
  }

  function onClickCapture(e: MouseEvent): void {
    if (!swallowClick) return;
    swallowClick = false;
    // The row underneath is usually a link. Without this, long-pressing a job to
    // remind yourself about it also navigates away from the job.
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * The context-menu key, on the wrapper. This bubbles, so focus can be on a link
   * *inside* the row and the Menu key still nudges the row — which is how the
   * keyboard path stops needing its own separate mental model.
   */
  function onRootKeydown(e: KeyboardEvent): void {
    if (disabled || open) return;
    if (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) {
      e.preventDefault();
      void openMenu(null, null);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // The JS fallback, for browsers without CSS anchor positioning
  //
  // Twenty lines and no dependency. The menu is in the top layer either way, so
  // this only has to answer "where", never "above what".
  // ───────────────────────────────────────────────────────────────────────────
  function place(): void {
    const m = menuEl;
    const a = anchorEl?.getBoundingClientRect();
    if (!m || !a) return;

    const gap = 4;
    const edge = 8;
    m.style.left = "0px";
    m.style.top = "0px";
    const r = m.getBoundingClientRect();

    let left = a.left;
    let top = a.bottom + gap;
    if (left + r.width > window.innerWidth - edge) left = window.innerWidth - edge - r.width;
    if (left < edge) left = edge;
    // Flip above rather than shrink: a menu that is scrolled internally is a menu
    // whose last item nobody finds.
    if (top + r.height > window.innerHeight - edge) top = a.top - gap - r.height;
    if (top < edge) top = edge;

    m.style.left = `${Math.round(left)}px`;
    m.style.top = `${Math.round(top)}px`;
  }

  // Light-dismiss and Escape are the popover's own; this is how we hear about it.
  $effect(() => {
    const m = menuEl;
    if (!m) return;
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "closed") {
        open = false;
        snoozeOpen = false;
      }
    };
    m.addEventListener("toggle", onToggle);
    return () => m.removeEventListener("toggle", onToggle);
  });

  /**
   * Scrolling or resizing closes it, which is what every native context menu
   * does. The alternative — tracking the anchor through a scrolling table — means
   * a menu that slides off the top of its own container while open, and there is
   * no good frame to draw that in.
   */
  $effect(() => {
    if (!open) return;
    const bail = () => closeMenu(false);
    window.addEventListener("scroll", bail, { capture: true, passive: true });
    window.addEventListener("resize", bail, { passive: true });
    return () => {
      window.removeEventListener("scroll", bail, true);
      window.removeEventListener("resize", bail);
    };
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Keyboard inside the menu — roving tabindex, arrows, Home/End, Escape
  // ───────────────────────────────────────────────────────────────────────────
  function items(): HTMLElement[] {
    return menuEl ? Array.from(menuEl.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
  }

  function focusItem(i: number): void {
    const list = items();
    if (!list.length) return;
    const n = ((i % list.length) + list.length) % list.length;
    list.forEach((el, k) => (el.tabIndex = k === n ? 0 : -1));
    list[n].focus();
  }

  function onMenuKeydown(e: KeyboardEvent): void {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(i + 1);
        return;
      case "ArrowUp":
        e.preventDefault();
        focusItem(i - 1);
        return;
      case "Home":
        e.preventDefault();
        focusItem(0);
        return;
      case "End":
        e.preventDefault();
        focusItem(list.length - 1);
        return;
      case "ArrowRight":
        if (document.activeElement === menuEl?.querySelector(".nudge__item--snooze") && !snoozeOpen) {
          e.preventDefault();
          void setSnooze(true);
        }
        return;
      case "ArrowLeft":
        if (snoozeOpen) {
          e.preventDefault();
          void setSnooze(false);
        }
        return;
      case "Escape":
        // Handled here rather than left to the popover so focus goes back where
        // it came from. A menu that closes and drops focus on <body> loses a
        // keyboard user their place in a 200-row table.
        e.preventDefault();
        e.stopPropagation();
        closeMenu(true);
        return;
    }
  }

  async function setSnooze(next: boolean): Promise<void> {
    snoozeOpen = next;
    await tick();
    // The menu just changed height; in the fallback path that means it may now
    // run off the bottom of the window.
    if (!supportsAnchor) place();
  }

  function emit(action: NudgeAction, when: NudgeWhen | null): void {
    onnudge({
      action,
      audience: action === "remind-us" ? "household" : "me",
      channel: action === "whatsapp" ? "whatsapp" : "attention",
      severity,
      subject,
      when,
      createdAt: new Date().toISOString(),
    });
    closeMenu(true);
  }

  const heading = $derived(subject.title || DASH);
</script>

<!-- `data-nudge-open` is here so a portal can mark the live row with
     `:has([data-nudge-open])` rather than a class toggled from JS, per the
     layout rules in 01-design-language.md. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- The wrapper takes handlers but no role, on purpose. It is whatever the portal
     wrapped — a figure, a row, a job — and it is not itself operable: right-click
     and long-press are *shortcuts to* the operable thing, which is the trigger
     button below. Giving this element `role="button"` to satisfy the linter would
     announce every row in a table as pressable and put a promise on it that Enter
     does not keep. The keyboard path is the button and the Menu key, both real. -->
<svelte:element
  this={as}
  bind:this={rootEl}
  class="nudge"
  data-nudge-open={open ? "" : undefined}
  oncontextmenu={onContextMenu}
  onkeydown={onRootKeydown}
  onpointerdown={onPointerDown}
  onpointerup={cancelPress}
  onpointermove={onPointerMove}
  onpointercancel={cancelPress}
  onclickcapture={onClickCapture}
>
  {@render children()}

  {#if !disabled}
    <!-- Visible on hover with a fine pointer, and whenever it is focused. It is a
         real button rather than ARIA on the wrapper, because a row that contains
         nothing focusable would otherwise have no keyboard path to the menu at
         all — and `aria-haspopup` on a bare div is a promise nothing keeps. -->
    <button
      bind:this={triggerEl}
      type="button"
      class="nudge__trigger"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? uid : undefined}
      aria-label={`Remind me about ${heading}`}
      onclick={() => void openMenu(null, null)}
    >
      <Icon name="bell" size={14} />
    </button>

    <span
      bind:this={anchorEl}
      class="nudge__anchor"
      aria-hidden="true"
      style="--nudge-x:{anchorX}px; --nudge-y:{anchorY}px; anchor-name:{anchorName};"
    ></span>
  {/if}

  {#if open}
    <div
      bind:this={menuEl}
      id={uid}
      popover="auto"
      class="nudge__menu"
      class:nudge__menu--js={!supportsAnchor}
      style="position-anchor:{anchorName};"
      role="menu"
      tabindex="-1"
      aria-label={`Reminders for ${heading}`}
      onkeydown={onMenuKeydown}
    >
      <p class="nudge__subject">{heading}</p>
      {#if subject.detail}<p class="nudge__detail">{subject.detail}</p>{/if}

      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        class="nudge__item nudge__item--primary"
        onclick={() => emit("remind-me", null)}
      >
        <span class="nudge__glyph nudge__glyph--acc"><Icon name="bell" size={16} /></span>
        <span class="nudge__word">Remind me</span>
      </button>

      <button type="button" role="menuitem" tabindex="-1" class="nudge__item" onclick={() => emit("remind-us", null)}>
        <span class="nudge__glyph"><Icon name="users" size={16} /></span>
        <span class="nudge__word">Remind us</span>
      </button>

      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        class="nudge__item nudge__item--snooze"
        aria-expanded={snoozeOpen}
        onclick={() => void setSnooze(!snoozeOpen)}
      >
        <span class="nudge__glyph"><Icon name="clock" size={16} /></span>
        <span class="nudge__word">Snooze until…</span>
        <span class="nudge__chev" class:nudge__chev--open={snoozeOpen}><Icon name="chevron-down" size={14} /></span>
      </button>

      {#if snoozeOpen}
        <div class="nudge__group" role="group" aria-label="Snooze until">
          {#each options as o (o.key)}
            <button
              type="button"
              role="menuitem"
              tabindex="-1"
              class="nudge__item nudge__item--sub"
              onclick={() => emit("snooze", { key: o.key, label: o.word, at: o.at.toISOString() })}
            >
              <span class="nudge__glyph"><Icon name={o.icon} size={15} /></span>
              <span class="nudge__word">{o.word}</span>
              <!-- The resolved instant, shown. If a person is choosing a moment
                   they are entitled to see which moment it is. -->
              <span class="nudge__stamp">{o.stamp}</span>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Deliberately the `chat` glyph in ordinary ink, not WhatsApp's mark.
           Rule 1 is no green carrying meaning, and a brand green here would be
           the only green on the screen and the loudest thing in the menu. -->
      <button type="button" role="menuitem" tabindex="-1" class="nudge__item nudge__item--last" onclick={() => emit("whatsapp", null)}>
        <span class="nudge__glyph"><Icon name="chat" size={16} /></span>
        <span class="nudge__word">Send to WhatsApp</span>
      </button>
    </div>
  {/if}
</svelte:element>

<style>
  .nudge {
    position: relative;
  }

  /* A 1×1 point the menu hangs off, moved to wherever the pointer was. It is a
     real element inside the wrapper rather than fixed viewport coordinates, so
     CSS anchor positioning tracks it while the table scrolls instead of pinning
     the menu to a spot the row has since left. */
  .nudge__anchor {
    position: absolute;
    left: var(--nudge-x, 0px);
    top: var(--nudge-y, 0px);
    width: 1px;
    height: 1px;
    pointer-events: none;
  }

  .nudge__trigger {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-end: var(--sp-1);
    translate: 0 -50%;
    display: grid;
    place-items: center;
    /* SC 2.5.8. The global :where() rule already sets this; repeated locally
       because the absolute positioning takes it out of normal flow and a future
       edit to `place-items` should not be able to shrink it. */
    min-width: var(--target-min);
    min-height: var(--target-min);
    border-radius: var(--r-control);
    color: var(--mut);
    background: var(--s2);
    box-shadow: inset 0 0 0 1px var(--line);
    opacity: 0;
    pointer-events: none;
  }
  @media (hover: hover) {
    .nudge:hover .nudge__trigger {
      opacity: 1;
      pointer-events: auto;
    }
  }
  .nudge__trigger:focus,
  .nudge:has(.nudge__trigger:focus) .nudge__trigger {
    opacity: 1;
    pointer-events: auto;
    color: var(--tx);
  }

  /* ── the menu ────────────────────────────────────────────────────────────── */
  .nudge__menu {
    /* The UA sheet centres a popover with `inset: 0; margin: auto`. Undo both, or
       every menu in the estate opens in the middle of the screen. */
    inset: auto;
    margin: 0;
    padding: calc(var(--pad-x) / 4) 0;
    min-width: 15rem;
    max-width: min(20rem, calc(100vw - 1rem));
    border: none;
    border-radius: var(--r-control);
    background: var(--s1);
    box-shadow:
      inset 0 0 0 1px var(--line),
      var(--shadow);
    color: var(--tx);
    /* Normalised once here so the items below can do arithmetic on it. --row-h
       is the density token, but it is the literal `auto` inside a narrow
       container (see tokens.css D1) and `auto` is not a length. */
    --nudge-row: var(--row-h);
  }
  .nudge__menu--js {
    position: fixed;
  }

  @supports (anchor-name: --a) and (position-area: block-end) {
    .nudge__menu {
      position-area: block-end span-inline-end;
      position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
      margin-block-start: var(--sp-1);
    }
  }

  /* The container is narrow — a phone. --row-h is `auto` there, and a thumb
     needs a real target, so the same query that widened the rows sets one. */
  @container panel (max-width: 560px) {
    .nudge__menu {
      --nudge-row: 44px;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    .nudge__menu:popover-open {
      animation: nudge-in var(--dur) var(--ease) both;
    }
  }
  @keyframes nudge-in {
    from {
      opacity: 0;
      translate: 0 -4px;
    }
  }

  .nudge__subject {
    margin: 0;
    padding: var(--sp-2) calc(var(--pad-x) / 2) var(--sp-1);
    font-size: var(--fs-micro);
    font-weight: 700;
    color: var(--mut);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nudge__detail {
    margin: 0;
    padding: 0 calc(var(--pad-x) / 2) var(--sp-2);
    font-size: var(--fs-small);
    line-height: 1.4;
    color: var(--tx2);
  }

  .nudge__item {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    width: 100%;
    min-height: var(--nudge-row);
    padding: var(--sp-1) calc(var(--pad-x) / 2);
    text-align: start;
    font-size: var(--fs-body);
    color: var(--tx);
    border-radius: 0;
  }
  .nudge__item:hover {
    background: var(--card-hover);
  }
  /* Additive, not a replacement. The global ring is :focus-visible, and a menu
     item focused programmatically after a right-click does not always qualify —
     but an unmarked item in an open menu is a menu with no cursor. Same tokens,
     inset so the menu's own edge cannot clip it. */
  .nudge__item:focus {
    outline: var(--focus-w) solid var(--focus-color);
    outline-offset: calc(var(--focus-offset) * -1);
  }
  .nudge__item--primary {
    font-weight: 700;
  }
  .nudge__item--last {
    margin-block-start: var(--sp-1);
    padding-block-start: calc(var(--sp-1) + 1px);
    box-shadow: inset 0 1px 0 var(--line);
  }
  .nudge__item--sub {
    padding-inline-start: var(--pad-x);
  }

  .nudge__glyph {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: var(--mut);
  }
  /* Copper means *you can act on this* — 01-design-language.md. The primary
     command is the one thing in here that gets it. */
  .nudge__glyph--acc {
    color: var(--acc);
  }
  .nudge__word {
    flex: 1;
    min-width: 0;
  }
  .nudge__stamp {
    flex-shrink: 0;
    /* --fs-micro is the floor, not a suggestion. Nothing here goes below it. */
    font-size: var(--fs-micro);
    font-family: var(--font-figure);
    font-variant-numeric: var(--figure-numeric);
    color: var(--mut);
  }
  .nudge__chev {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: var(--mut);
  }
  .nudge__chev--open {
    rotate: 180deg;
  }

  /* Not `display: contents`, which is the obvious choice and the wrong one: it has
     a history of dropping the element — and therefore this group's role and its
     "Snooze until" label — out of the accessibility tree. A plain block costs
     nothing here, since the items are full-width rows either way. */
  .nudge__group {
    display: block;
  }

  /* Touch. The primary command clears 44px; the rest clear 40, and the surface's
     own --row-h wins wherever it is already taller (home is 52px). */
  @media (pointer: coarse) {
    .nudge__item {
      min-height: max(var(--nudge-row), 40px);
    }
    .nudge__item--primary {
      min-height: max(var(--nudge-row), 44px);
    }
    /* The long-press is the affordance on touch; the hover button is not
       reachable and would only sit on top of the row's own content. */
    .nudge__trigger {
      display: none;
    }
  }
</style>
