import { apiGroup, query, input, s, ref, inp, auth, c, col, expr, guard, expect, resp } from "@xano/sdk";
import { readings, users } from "../tables.js";
import { meterGuard, mockedMeterGuard } from "./meter_guard.js";
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

const OWN_METER = { me: { id: 1, household_id: 1 }, meter: { id: 3, household_id: 1 } };
const READING = { id: 9, meter_id: 3, value: 1200 };

export const deleteReading = query({
  name: "meters/{meter_id}/readings/{reading_id}",
  verb: "DELETE",
  apiGroup: readingsApi,
  auth: users,
  input: { meter_id: input.int({ required: true }), reading_id: input.int({ required: true }) },
  stack: [
    ...mockedMeterGuard({
      "deletes own reading": OWN_METER,
      "reading on another meter is not found": OWN_METER,
      "other household is not found": { me: { id: 1, household_id: 1 }, meter: { id: 3, household_id: 2 } },
    }),
    s.db.get({
      table: readings,
      fieldName: "id",
      fieldValue: inp("reading_id"),
      as: "reading",
      mock: {
        "deletes own reading": c.obj(READING),
        "reading on another meter is not found": c.obj({ ...READING, meter_id: 4 }),
      },
    }),
    guard.require(expr(ref("reading.meter_id", { safe: true }), "=", inp("meter_id")), {
      errorType: "notfound",
      message: "Reading not found.",
    }),
    s.db.del({ table: readings, fieldValue: inp("reading_id"), mock: { "deletes own reading": c.null() } }),
  ],
  response: ref("reading"),
  tests: [
    {
      name: "deletes own reading",
      input: { meter_id: c.int(3), reading_id: c.int(9) },
      expect: [expect.to_equal(resp("id"), c.int(9))],
    },
    {
      name: "reading on another meter is not found",
      input: { meter_id: c.int(3), reading_id: c.int(9) },
      expect: [expect.to_throw(c.text("Reading not found."))],
    },
    {
      name: "other household is not found",
      input: { meter_id: c.int(3), reading_id: c.int(9) },
      expect: [expect.to_throw(c.text("Meter not found."))],
    },
  ],
});
