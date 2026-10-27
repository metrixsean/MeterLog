import { defineFunction, input, s, ref, inp, col, expr, c, expect, resp } from "@xano/sdk";
import { lam } from "@xano/sdk/node";
import { readings } from "../tables.js";

const DAY = 86_400_000;
const T0 = 1_760_000_000_000;

const row = (id: number, value: number, day: number, flagged = false, dismissed = false) => ({
  id,
  value,
  read_at: T0 + day * DAY,
  flagged,
  dismissed,
});

const meter = (digits = 5) => ({ meter_id: c.int(1), rollover_digits: c.int(digits) });

export type ReadingFlag = { id: number; flagged: boolean; flag_reason: string };

export const flagReadings = defineFunction({
  name: "flag_readings",
  input: {
    meter_id: input.int({ required: true }),
    rollover_digits: input.int({ required: true }),
  },
  stack: [
    s.db.query({
      table: readings,
      where: expr(col("meter_id"), "=", inp("meter_id")),
      sort: [{ sortBy: "read_at", dir: "asc" }],
      output: ["id", "value", "read_at", "flagged", "dismissed"],
      as: "history",
      mock: {
        "backwards reading is flagged": c.array([row(1, 100, 0), row(2, 120, 1), row(3, 110, 2), row(4, 130, 3)]),
        "rollover is not flagged": c.array([row(1, 990, 0), row(2, 5, 1)]),
        "spike over 3x median is flagged": c.array([
          row(1, 70, 0),
          row(2, 80, 1),
          row(3, 90, 2),
          row(4, 100, 3),
          row(5, 150, 4),
          row(6, 160, 5),
        ]),
        "flagged readings are skipped": c.array([row(1, 100, 0), row(2, 50, 1, true), row(3, 110, 2)]),
        "dismissed reading is not flagged again": c.array([
          row(1, 100, 0),
          row(2, 50, 1, false, true),
          row(3, 60, 2),
        ]),
      },
    }),
    s.lambda({ code: lam.file("../lambdas/flag_readings.ts"), as: "flags" }),
  ],
  response: ref("flags"),
  responseShape: null as unknown as ReadingFlag[],
  tests: [
    {
      name: "backwards reading is flagged",
      input: meter(),
      expect: [
        expect.to_equal(resp("0.id"), c.int(3)),
        expect.to_equal(resp("0.flag_reason"), c.text("lower than previous reading")),
        expect.to_not_be_defined(resp("1")),
      ],
    },
    {
      name: "rollover is not flagged",
      input: meter(3),
      expect: [expect.to_be_empty(resp())],
    },
    {
      name: "spike over 3x median is flagged",
      input: meter(),
      expect: [
        expect.to_equal(resp("0.id"), c.int(5)),
        expect.to_equal(resp("0.flag_reason"), c.text("daily rate over 3x the 90-day median")),
        expect.to_not_be_defined(resp("1")),
      ],
    },
    {
      name: "flagged readings are skipped",
      input: meter(),
      expect: [expect.to_be_empty(resp())],
    },
    {
      name: "dismissed reading is not flagged again",
      input: meter(),
      expect: [expect.to_be_empty(resp())],
    },
  ],
});
