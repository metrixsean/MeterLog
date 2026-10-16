import { defineFunction, input, s, ref, inp, col, expr, c, expect, resp } from "@xano/sdk";
import { lam } from "@xano/sdk/node";
import { readings, tariffs } from "../tables.js";

const DAY = 86_400_000;
const JAN1 = Date.UTC(2026, 0, 1);

export type UsageDay = { date: string; usage: number | null; cost: number | null };
export type MeterUsage = {
  days: UsageDay[];
  total_usage: number;
  total_cost: number | null;
  last_reading: { value: number; read_at: number; flagged: boolean } | null;
};

const span = (from: string, to: string, digits = 5) => ({
  meter_id: c.int(1),
  rollover_digits: c.int(digits),
  from: c.text(from),
  to: c.text(to),
});

const reading = (value: number, read_at: number, flagged = false) => ({ value, read_at, flagged });

export const meterUsage = defineFunction({
  name: "meter_usage",
  input: {
    meter_id: input.int({ required: true }),
    rollover_digits: input.int({ required: true }),
    from: input.date({ required: true }),
    to: input.date({ required: true }),
  },
  stack: [
    s.db.query({
      table: readings,
      where: expr(col("meter_id"), "=", inp("meter_id")),
      sort: [{ sortBy: "read_at", dir: "asc" }],
      output: ["value", "read_at", "flagged"],
      as: "history",
      mock: {
        "spreads usage across days": c.array([reading(100, JAN1), reading(120, JAN1 + 2 * DAY)]),
        "handles rollover": c.array([reading(990, JAN1), reading(10, JAN1 + DAY)]),
        "skips flagged readings": c.array([
          reading(100, JAN1),
          reading(50, JAN1 + DAY, true),
          reading(110, JAN1 + 2 * DAY),
        ]),
        "no readings leaves usage empty": c.array([]),
      },
    }),
    s.db.query({
      table: tariffs,
      where: expr(col("meter_id"), "=", inp("meter_id")),
      output: ["unit_price", "standing_charge_per_day", "valid_from", "valid_to"],
      as: "rates",
      mock: {
        "spreads usage across days": c.array([
          { unit_price: 0.5, standing_charge_per_day: 0.2, valid_from: "2025-12-01", valid_to: null },
        ]),
        "handles rollover": c.array([]),
        "skips flagged readings": c.array([]),
        "no readings leaves usage empty": c.array([]),
      },
    }),
    s.lambda({ code: lam.file("../lambdas/meter_usage.ts"), as: "result" }),
  ],
  response: ref("result"),
  responseShape: null as unknown as MeterUsage,
  tests: [
    {
      name: "spreads usage across days",
      input: span("2026-01-01", "2026-01-02"),
      expect: [
        expect.to_equal(resp("days.0.usage"), c.decimal(10)),
        expect.to_equal(resp("days.1.cost"), c.decimal(5.2)),
        expect.to_equal(resp("total_cost"), c.decimal(10.4)),
      ],
    },
    {
      name: "handles rollover",
      input: span("2026-01-01", "2026-01-01", 3),
      expect: [expect.to_equal(resp("total_usage"), c.decimal(20))],
    },
    {
      name: "skips flagged readings",
      input: span("2026-01-01", "2026-01-02"),
      expect: [
        expect.to_equal(resp("days.0.usage"), c.decimal(5)),
        expect.to_equal(resp("last_reading.value"), c.decimal(110)),
      ],
    },
    {
      name: "no readings leaves usage empty",
      input: span("2026-01-01", "2026-01-03"),
      expect: [
        expect.to_be_null(resp("days.0.usage")),
        expect.to_be_null(resp("last_reading")),
        expect.to_be_null(resp("total_cost")),
      ],
    },
  ],
});
