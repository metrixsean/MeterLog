import { defineFunction, input, s, ref, inp, c, expect, resp } from "@xano/sdk";
import { lam } from "@xano/sdk/node";
import { meterUsage } from "./meter_usage.js";

export type PeriodSummary = {
  days: number;
  covered_days: number;
  priced_days: number;
  total_usage: number;
  estimated_cost: number | null;
  billed_amount: number;
  difference: number | null;
};

const period = (billed: number) => ({
  meter_id: c.int(1),
  rollover_digits: c.int(5),
  start_date: c.text("2026-01-01"),
  end_date: c.text("2026-01-02"),
  billed_amount: c.decimal(billed),
});

const day = (date: string, usage: number | null, cost: number | null) => ({ date, usage, cost });

export const periodSummary = defineFunction({
  name: "period_summary",
  input: {
    meter_id: input.int({ required: true }),
    rollover_digits: input.int({ required: true }),
    start_date: input.date({ required: true }),
    end_date: input.date({ required: true }),
    billed_amount: input.decimal({ required: true }),
  },
  stack: [
    s.function.run({
      fn: meterUsage,
      input: {
        meter_id: inp("meter_id"),
        rollover_digits: inp("rollover_digits"),
        from: inp("start_date"),
        to: inp("end_date"),
      },
      as: "usage",
      mock: {
        "compares estimate with bill": c.obj({
          days: [day("2026-01-01", 10, 3.2), day("2026-01-02", 10, 3.2)],
          total_usage: 20,
          total_cost: 6.4,
          last_reading: null,
        }),
        "counts days without readings": c.obj({
          days: [day("2026-01-01", 5, 2), day("2026-01-02", null, null)],
          total_usage: 5,
          total_cost: 2,
          last_reading: null,
        }),
        "no tariff leaves estimate empty": c.obj({
          days: [day("2026-01-01", 10, null), day("2026-01-02", 10, null)],
          total_usage: 20,
          total_cost: null,
          last_reading: null,
        }),
      },
    }),
    s.lambda({ code: lam.file("../lambdas/period_summary.ts"), as: "result" }),
  ],
  response: ref("result"),
  responseShape: null as unknown as PeriodSummary,
  tests: [
    {
      name: "compares estimate with bill",
      input: period(7.5),
      expect: [
        expect.to_equal(resp("estimated_cost"), c.decimal(6.4)),
        expect.to_equal(resp("difference"), c.decimal(1.1)),
        expect.to_equal(resp("covered_days"), c.int(2)),
      ],
    },
    {
      name: "counts days without readings",
      input: period(4),
      expect: [
        expect.to_equal(resp("days"), c.int(2)),
        expect.to_equal(resp("covered_days"), c.int(1)),
        expect.to_equal(resp("priced_days"), c.int(1)),
      ],
    },
    {
      name: "no tariff leaves estimate empty",
      input: period(7.5),
      expect: [
        expect.to_be_null(resp("estimated_cost")),
        expect.to_be_null(resp("difference")),
        expect.to_equal(resp("total_usage"), c.decimal(20)),
      ],
    },
  ],
});
