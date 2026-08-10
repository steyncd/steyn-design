/**
 * fmt.ts — the four formatters every Steyn module shares.
 *
 * Everything renders in South African time with en-ZA formatting, pinned so a
 * value reads the same regardless of the viewing device's locale or timezone.
 * Numeric output is meant to sit inside `.num` / `.big`, which carry
 * `font-variant-numeric: tabular-nums` — columns of figures then line up.
 *
 * Null is a first-class input everywhere: these render an em dash rather than
 * throwing or printing "NaN". A dashboard that crashes on a missing sensor is
 * worse than one that admits it does not know.
 */

export const LOCALE = "en-ZA";
export const TZ = "Africa/Johannesburg";

/** The em dash used wherever a value is genuinely unknown. */
export const DASH = "—";

/**
 * South African Rand — "R 4 182" or "R 4 182.16".
 *
 * Whole rands by default: household figures are read at a glance and the cents
 * are noise. Pass `cents: true` where the exact figure matters — a bill total
 * being routed to HQ, for instance, where a rounded number would be wrong.
 */
export function zar(v: number | null | undefined, opts: { cents?: boolean } = {}): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  const digits = opts.cents ? 2 : 0;
  return (
    "R " +
    v.toLocaleString(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  );
}

/**
 * Dates in en-ZA / SAST.
 *
 *   short  → "2026/08/10"
 *   medium → "Mon, 10 Aug"      (default — the one most screens want)
 *   long   → "10 August 2026"
 *
 * Accepts a Date, an epoch number, or an ISO string, because the three arrive
 * from Firestore, the HA websocket and JSON APIs respectively and callers
 * should not have to care which.
 */
export function dateZA(
  t: Date | number | string | null | undefined,
  style: "short" | "medium" | "long" = "medium",
): string {
  const d = toDate(t);
  if (!d) return DASH;
  const base = { timeZone: TZ } as const;
  if (style === "short") return d.toLocaleDateString(LOCALE, base);
  if (style === "long")
    return d.toLocaleDateString(LOCALE, { ...base, day: "numeric", month: "long", year: "numeric" });
  return d.toLocaleDateString(LOCALE, { ...base, weekday: "short", day: "numeric", month: "short" });
}

/**
 * Energy — "12.4 kWh", scaling down to Wh below 1 kWh and up to MWh above
 * 1 000. Returns value and unit separately so a caller can render the unit in
 * `.big .unit`, which is sized and weighted differently from the figure.
 */
export function kwh(v: number | null | undefined): { val: string; unit: string } {
  if (v == null || !Number.isFinite(v)) return { val: DASH, unit: "kWh" };
  const a = Math.abs(v);
  if (a >= 1000) return { val: fixed(v / 1000, 2), unit: "MWh" };
  if (a < 1) return { val: fixed(v * 1000, 0), unit: "Wh" };
  return { val: fixed(v, a >= 100 ? 0 : 1), unit: "kWh" };
}

/**
 * Durations given in HOURS — "7h 12m", "45m", "3d 4h".
 *
 * Named for its input unit deliberately: the programme's durations come from
 * drive times, run-hours and warranty spans, all of which are naturally hours.
 * Passing seconds here is the obvious mistake and the name is the guard.
 */
export function durationH(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v < 0) return DASH;
  const totalMins = Math.round(v * 60);
  if (totalMins < 1) return "0m";
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = totalMins % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function fixed(v: number, digits: number): string {
  return v.toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Firestore timestamps arrive as `{ toDate() }`, APIs as ISO strings, the HA
 * bridge as epoch millis. Normalise all three, and return null rather than an
 * Invalid Date so every caller's `if (!d)` branch does the right thing.
 */
function toDate(t: Date | number | string | { toDate(): Date } | null | undefined): Date | null {
  if (t == null) return null;
  if (t instanceof Date) return Number.isFinite(t.getTime()) ? t : null;
  if (typeof t === "object" && typeof (t as { toDate?: unknown }).toDate === "function") {
    return toDate((t as { toDate(): Date }).toDate());
  }
  const d = new Date(t as string | number);
  return Number.isFinite(d.getTime()) ? d : null;
}
