import { defineFunction, input, s, ref, inp, col, expr, c, expect, resp } from "@xano/sdk";
import { lam } from "@xano/sdk/node";
import { readings } from "../tables.js";

const DAY = 86_400_000;
const T0 = 1_760_000_000_000;

const at = (value: number, read_at: number, digits = 5) => ({
  meter_id: c.int(1),
  rollover_digits: c.int(digits),
  value: c.decimal(value),
  read_at: c.int(read_at),
});

export const checkReading = defineFunction({
  name: "check_reading",
  input: {
    meter_id: input.int({ required: true }),
    rollover_digits: input.int({ required: true }),
    value: input.decimal({ required: true }),
    read_at: input.timestamp({ required: true }),
  },
  stack: [
    s.db.query({
      table: readings,
      where: [
        expr(col("meter_id"), "=", inp("meter_id")),
        expr(col("read_at"), "<", inp("read_at")),
      ],
      sort: [{ sortBy: "read_at", dir: "desc" }],
      paging: { per_page: 200, metadata: false },
      output: ["value", "read_at", "flagged"],
      as: "history",
      mock: {
        "drop below previous is flagged": c.array([{ value: 500, read_at: T0, flagged: false }]),
        "rollover is not flagged": c.array([{ value: 995, read_at: T0, flagged: false }]),
        "spike over 3x median is flagged": c.array(
          [3, 2, 1, 0].map((d) => ({ value: 100 - d * 10, read_at: T0 - d * DAY, flagged: false })),
        ),
      },
    }),
    s.lambda({ code: lam.file("../lambdas/check_reading.ts"), as: "result" }),
  ],
  response: ref("result"),
  tests: [
    {
      name: "first reading is not flagged",
      input: at(120, T0),
      expect: [expect.to_be_false(resp("flagged"))],
    },
    {
      name: "drop below previous is flagged",
      input: at(400, T0 + DAY),
      expect: [
        expect.to_be_true(resp("flagged")),
        expect.to_equal(resp("flag_reason"), c.text("lower than previous reading")),
      ],
    },
    {
      name: "rollover is not flagged",
      input: at(5, T0 + DAY, 3),
      expect: [
        expect.to_be_false(resp("flagged")),
        expect.to_equal(resp("consumption"), c.int(10)),
      ],
    },
    {
      name: "spike over 3x median is flagged",
      input: at(150, T0 + DAY),
      expect: [expect.to_be_true(resp("flagged"))],
    },
  ],
});
