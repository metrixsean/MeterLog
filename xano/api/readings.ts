import { apiGroup, query, input, s, ref, inp, auth, c, col, expr, guard } from "@xano/sdk";
import { meters, readings, users } from "../tables.js";
import { checkReading } from "../functions/check_reading.js";

export const readingsApi = apiGroup({ name: "readings", canonical: "readings" });

export const listReadings = query({
  name: "meters/{meter_id}/readings",
  verb: "GET",
  apiGroup: readingsApi,
  auth: users,
  input: { meter_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me" }),
    s.db.get({ table: meters, fieldName: "id", fieldValue: inp("meter_id"), as: "meter" }),
    guard.found("meter", { message: "Meter not found." }),
    guard.require(expr(ref("meter.household_id"), "=", ref("me.household_id")), {
      errorType: "notfound",
      message: "Meter not found.",
    }),
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
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me" }),
    s.db.get({ table: meters, fieldName: "id", fieldValue: inp("meter_id"), as: "meter" }),
    guard.found("meter", { message: "Meter not found." }),
    guard.require(expr(ref("meter.household_id"), "=", ref("me.household_id")), {
      errorType: "notfound",
      message: "Meter not found.",
    }),
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
