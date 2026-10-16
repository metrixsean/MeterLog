import type { AmbientBindings } from "@xano/sdk";

export default function ({ $input, $var }: AmbientBindings) {
  const DAY = 86_400_000;
  const MAX_DAYS = 400;
  const toMs = (d: unknown) => {
    const text = String(d);
    if (typeof d === "number" || /^\d+$/.test(text)) return Number(d);
    return Date.parse(text.length === 10 ? `${text}T00:00:00Z` : text);
  };
  const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

  const range = Math.pow(10, Number($input.rollover_digits));
  const start = Math.floor(toMs($input.from) / DAY) * DAY;
  const end = Math.floor(toMs($input.to) / DAY) * DAY;
  const count = Number.isFinite(start) && Number.isFinite(end) && end >= start
    ? Math.min((end - start) / DAY + 1, MAX_DAYS)
    : 0;

  const all: { value: number; read_at: number; flagged: boolean }[] = ($var.history ?? [])
    .map((r: { value: unknown; read_at: unknown; flagged: unknown }) => ({
      value: Number(r.value),
      read_at: Number(r.read_at),
      flagged: Boolean(r.flagged),
    }))
    .sort((a: { read_at: number }, b: { read_at: number }) => a.read_at - b.read_at);
  const good = all.filter((r) => !r.flagged);
  const last = all[all.length - 1];

  const used = new Array<number>(count).fill(0);
  const covered = new Array<number>(count).fill(0);
  for (let i = 1; i < good.length; i++) {
    const a = good[i - 1];
    const b = good[i];
    const span = b.read_at - a.read_at;
    if (span <= 0) continue;
    let delta = b.value - a.value;
    if (delta < 0) delta += range;
    const perMs = delta / span;
    const first = Math.max(0, Math.floor((a.read_at - start) / DAY));
    const stop = Math.min(count - 1, Math.floor((b.read_at - start) / DAY));
    for (let d = first; d <= stop; d++) {
      const dayStart = start + d * DAY;
      const overlap = Math.min(b.read_at, dayStart + DAY) - Math.max(a.read_at, dayStart);
      if (overlap <= 0) continue;
      used[d] += perMs * overlap;
      covered[d] += overlap;
    }
  }

  const tariffs: { unit_price: number; standing: number; from: number; to: number }[] = ($var.rates ?? [])
    .map((t: { unit_price: unknown; standing_charge_per_day: unknown; valid_from: unknown; valid_to: unknown }) => ({
      unit_price: Number(t.unit_price),
      standing: Number(t.standing_charge_per_day),
      from: toMs(t.valid_from),
      to: t.valid_to ? toMs(t.valid_to) : Infinity,
    }))
    .sort((a: { from: number }, b: { from: number }) => b.from - a.from);

  let totalUsage = 0;
  let totalCost = 0;
  let pricedDays = 0;
  const days = [];
  for (let d = 0; d < count; d++) {
    const day = start + d * DAY;
    const usage = covered[d] > 0 ? round(used[d], 3) : null;
    const tariff = tariffs.find((t) => t.from <= day && day <= t.to);
    const cost = usage !== null && tariff ? round(usage * tariff.unit_price + tariff.standing, 4) : null;
    if (usage !== null) totalUsage += usage;
    if (cost !== null) {
      totalCost += cost;
      pricedDays++;
    }
    days.push({ date: new Date(day).toISOString().slice(0, 10), usage, cost });
  }

  return {
    days,
    total_usage: round(totalUsage, 3),
    total_cost: pricedDays ? round(totalCost, 2) : null,
    last_reading: last ? { value: last.value, read_at: last.read_at, flagged: last.flagged } : null,
  };
}
