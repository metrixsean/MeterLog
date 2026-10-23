import type { AmbientBindings } from "@xano/sdk";

export default function ({ $input, $var }: AmbientBindings) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const days: { usage: unknown; cost: unknown }[] = $var.usage?.days ?? [];
  const estimated = $var.usage?.total_cost == null ? null : Number($var.usage.total_cost);
  const billed = Number($input.billed_amount);

  return {
    days: days.length,
    covered_days: days.filter((d) => d.usage !== null).length,
    priced_days: days.filter((d) => d.cost !== null).length,
    total_usage: Number($var.usage?.total_usage ?? 0),
    estimated_cost: estimated,
    billed_amount: billed,
    difference: estimated === null ? null : round(billed - estimated),
  };
}
