import { apiGroup, query, input, s, ref, inp, auth, c, col, expr, guard, statements, expect, resp } from "@xano/sdk";
import { meters, readings, users } from "../tables.js";
import { meterGuard, mockedMeterGuard, type MeterGuardMock } from "./meter_guard.js";
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

export const listFlaggedReadings = query({
  name: "flagged_readings",
  verb: "GET",
  apiGroup: readingsApi,
  auth: users,
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me" }),
    s.db.query({
      table: readings,
      bind: [{ table: meters, as: "meter_row", where: expr(col("meter_id"), "=", col("meter_row.id")) }],
      where: [
        expr(col("flagged"), "=", c.bool(true)),
        expr(col("meter_row.household_id"), "=", ref("me.household_id")),
      ],
      eval: [
        { name: "meter_row.kind", as: "meter_kind" },
        { name: "meter_row.unit", as: "meter_unit" },
      ],
      sort: [{ sortBy: "read_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});

type ReadingMock = MeterGuardMock & { reading: Record<string, string | number | null> };

const readingGuard = (mocks: Record<string, ReadingMock>) =>
  statements(
    ...mockedMeterGuard(Object.fromEntries(Object.entries(mocks).map(([name, m]) => [name, { me: m.me, meter: m.meter }]))),
    s.db.get({
      table: readings,
      fieldName: "id",
      fieldValue: inp("reading_id"),
      as: "reading",
      mock: Object.fromEntries(Object.entries(mocks).map(([name, m]) => [name, c.obj(m.reading)])),
    }),
    guard.require(expr(ref("reading.meter_id", { safe: true }), "=", inp("meter_id")), {
      errorType: "notfound",
      message: "Reading not found.",
    }),
  );

const READING = { id: 9, meter_id: 3, value: 1200 };
const ownReading: ReadingMock = { me: { id: 1, household_id: 1 }, meter: { id: 3, household_id: 1 }, reading: READING };
const otherMeter: ReadingMock = { ...ownReading, reading: { ...READING, meter_id: 4 } };
const otherHousehold: ReadingMock = { ...ownReading, meter: { id: 3, household_id: 2 } };
const readingInput = { meter_id: c.int(3), reading_id: c.int(9) };

export const dismissReading = query({
  name: "meters/{meter_id}/readings/{reading_id}/dismiss",
  verb: "POST",
  apiGroup: readingsApi,
  auth: users,
  input: { meter_id: input.int({ required: true }), reading_id: input.int({ required: true }) },
  stack: [
    ...readingGuard({
      "dismisses own reading": ownReading,
      "reading on another meter is not found": otherMeter,
      "other household is not found": otherHousehold,
    }),
    s.db.edit({
      table: readings,
      fieldValue: inp("reading_id"),
      row: { flagged: c.bool(false), flag_reason: c.null(), dismissed: c.bool(true) },
      as: "updated",
      mock: { "dismisses own reading": c.obj({ ...READING, flagged: false, flag_reason: null, dismissed: true }) },
    }),
  ],
  response: ref("updated"),
  tests: [
    {
      name: "dismisses own reading",
      input: readingInput,
      expect: [expect.to_equal(resp("flagged"), c.bool(false)), expect.to_equal(resp("dismissed"), c.bool(true))],
    },
    {
      name: "reading on another meter is not found",
      input: readingInput,
      expect: [expect.to_throw(c.text("Reading not found."))],
    },
    {
      name: "other household is not found",
      input: readingInput,
      expect: [expect.to_throw(c.text("Meter not found."))],
    },
  ],
});

export const deleteReading = query({
  name: "meters/{meter_id}/readings/{reading_id}",
  verb: "DELETE",
  apiGroup: readingsApi,
  auth: users,
  input: { meter_id: input.int({ required: true }), reading_id: input.int({ required: true }) },
  stack: [
    ...readingGuard({
      "deletes own reading": ownReading,
      "reading on another meter is not found": otherMeter,
      "other household is not found": otherHousehold,
    }),
    s.db.del({ table: readings, fieldValue: inp("reading_id"), mock: { "deletes own reading": c.null() } }),
  ],
  response: ref("reading"),
  tests: [
    {
      name: "deletes own reading",
      input: readingInput,
      expect: [expect.to_equal(resp("id"), c.int(9))],
    },
    {
      name: "reading on another meter is not found",
      input: readingInput,
      expect: [expect.to_throw(c.text("Reading not found."))],
    },
    {
      name: "other household is not found",
      input: readingInput,
      expect: [expect.to_throw(c.text("Meter not found."))],
    },
  ],
});
