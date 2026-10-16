import { apiGroup, query, input, s, ref, inp, auth, col, expr } from "@xano/sdk";
import { readings, users } from "../tables.js";
import { meterGuard } from "./meter_guard.js";
import { checkReading } from "../functions/check_reading.js";

export const readingsApi = apiGroup({ name: "readings", canonical: "readings" });

export const listReadings = query({
  name: "meters/{meter_id}/readings",
  verb: "GET",
  apiGroup: readingsApi,
  auth: users,
  input: { meter_id: input.int({ required: true }) },
  stack: [
    ...meterGuard,
    s.db.query({
      table: readings,
      where: expr(col("meter_id"), "=", inp("meter_id")),
      sort: [{ sortBy: "read_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});

export const createReading = query({
  name: "create_reading",
  verb: "POST",
  apiGroup: readingsApi,
  auth: users,
  input: {
    meter_id: input.int({ required: true }),
    value: input.decimal({ required: true, min: 0 }),
    read_at: input.timestamp({ required: true }),
  },
  stack: [
    ...meterGuard,
    s.function.run({
      fn: checkReading,
      input: {
        meter_id: inp("meter_id"),
        rollover_digits: ref("meter.rollover_digits"),
        value: inp("value"),
        read_at: inp("read_at"),
      },
      as: "check",
    }),
    s.db.add({
      table: readings,
      row: {
        meter_id: inp("meter_id"),
        value: inp("value"),
        read_at: inp("read_at"),
        entered_by: auth("id"),
        flagged: ref("check.flagged"),
        flag_reason: ref("check.flag_reason"),
      },
      as: "reading",
    }),
  ],
  response: ref("reading"),
});
