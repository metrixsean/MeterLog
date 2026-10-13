import type { AmbientBindings } from "@xano/sdk";

export default function ({ $input, $var }: AmbientBindings) {
  const DAY = 86_400_000;
  const value = Number($input.value);
  const readAt = Number($input.read_at);
  const range = Math.pow(10, Number($input.rollover_digits));
  const history: { value: number; read_at: number; flagged: boolean }[] = ($var.history ?? [])
    .filter((r: { flagged: boolean }) => !r.flagged)
    .map((r: { value: number; read_at: number }) => ({ value: Number(r.value), read_at: Number(r.read_at) }))
    .sort((a: { read_at: number }, b: { read_at: number }) => a.read_at - b.read_at);

  const prev = history[history.length - 1];
  if (!prev) return { flagged: false, flag_reason: "", consumption: null };

  let consumption = value - prev.value;
  if (consumption < 0) {
    const wrapped = value + range - prev.value;
    // A wrap only explains a drop when the dial was near the top of its range.
    if (wrapped > range * 0.1) {
      return { flagged: true, flag_reason: "lower than previous reading", consumption };
    }
    consumption = wrapped;
  }

  const days = (readAt - prev.read_at) / DAY;
  if (days <= 0) return { flagged: false, flag_reason: "", consumption };

  const rates: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1];
    const b = history[i];
    if (b.read_at < readAt - 90 * DAY) continue;
    const span = (b.read_at - a.read_at) / DAY;
    let used = b.value - a.value;
    if (used < 0) used += range;
    if (span > 0) rates.push(used / span);
  }
  if (rates.length < 3) return { flagged: false, flag_reason: "", consumption };

  rates.sort((x, y) => x - y);
  const mid = Math.floor(rates.length / 2);
  const median = rates.length % 2 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2;
  const rate = consumption / days;
  if (median > 0 && rate > 3 * median) {
    return { flagged: true, flag_reason: "daily rate over 3x the 90-day median", consumption };
  }
  return { flagged: false, flag_reason: "", consumption };
}
