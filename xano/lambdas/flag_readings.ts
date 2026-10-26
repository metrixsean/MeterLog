import type { AmbientBindings } from "@xano/sdk";

export default function ({ $input, $var }: AmbientBindings) {
  const DAY = 86_400_000;
  const range = Math.pow(10, Number($input.rollover_digits));
  type Row = { id: number; value: number; read_at: number };
  const rows: (Row & { flagged: boolean })[] = ($var.history ?? [])
    .map((r: { id: number; value: number; read_at: number; flagged: boolean }) => ({
      id: Number(r.id),
      value: Number(r.value),
      read_at: Number(r.read_at),
      flagged: Boolean(r.flagged),
    }))
    .sort((a: Row, b: Row) => a.read_at - b.read_at);

  const clean: Row[] = [];
  const flags: { id: number; flagged: boolean; flag_reason: string }[] = [];

  for (const row of rows) {
    if (row.flagged) continue;
    const prev = clean[clean.length - 1];
    if (!prev) {
      clean.push(row);
      continue;
    }

    let used = row.value - prev.value;
    if (used < 0) {
      const wrapped = row.value + range - prev.value;
      if (wrapped > range * 0.1) {
        flags.push({ id: row.id, flagged: true, flag_reason: "lower than previous reading" });
        continue;
      }
      used = wrapped;
    }

    const days = (row.read_at - prev.read_at) / DAY;
    const rates: number[] = [];
    for (let i = 1; i < clean.length; i++) {
      const a = clean[i - 1];
      const b = clean[i];
      if (b.read_at < row.read_at - 90 * DAY) continue;
      const span = (b.read_at - a.read_at) / DAY;
      let delta = b.value - a.value;
      if (delta < 0) delta += range;
      if (span > 0) rates.push(delta / span);
    }

    if (days > 0 && rates.length >= 3) {
      rates.sort((x, y) => x - y);
      const mid = Math.floor(rates.length / 2);
      const median = rates.length % 2 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2;
      if (median > 0 && used / days > 3 * median) {
        flags.push({ id: row.id, flagged: true, flag_reason: "daily rate over 3x the 90-day median" });
        continue;
      }
    }
    clean.push(row);
  }

  return flags;
}
