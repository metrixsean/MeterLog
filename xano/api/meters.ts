import { apiGroup, query, input, s, ref, inp, auth, c, col, expr, expect, resp } from "@xano/sdk";
import { billingPeriods, meters, readings, tariffs, users } from "../tables.js";
import { meterGuard, mockedMeterGuard, type MeterGuardMock } from "./meter_guard.js";

export const metersApi = apiGroup({ name: "meters", canonical: "meters" });

export const listMeters = query({
  name: "list_meters",
  verb: "GET",
  apiGroup: metersApi,
  auth: users,
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me" }),
    s.db.query({
      table: meters,
      where: expr(col("household_id"), "=", ref("me.household_id")),
      sort: [{ sortBy: "created_at", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});

export const createMeter = query({
  name: "create_meter",
  verb: "POST",
  apiGroup: metersApi,
  auth: users,
  input: {
    kind: input.enum(["electric", "gas", "water"], { required: true }),
    unit: input.text({ required: true }),
    serial: input.text(),
    rollover_digits: input.int({ required: true, min: 1, max: 12 }),
  },
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me" }),
    s.db.add({
      table: meters,
      row: {
        household_id: ref("me.household_id"),
        kind: inp("kind"),
        unit: inp("unit"),
        serial: inp("serial"),
        rollover_digits: inp("rollover_digits"),
      },
      as: "meter",
    }),
  ],
  response: ref("meter"),
});

export const getMeter = query({
  name: "meters/{meter_id}",
  verb: "GET",
  apiGroup: metersApi,
  auth: users,
  input: { meter_id: input.int({ required: true }) },
  stack: [...meterGuard],
  response: ref("meter"),
});

const METER = { id: 3, household_id: 1, kind: "electric", unit: "kWh", serial: "A1", rollover_digits: 5 };
const ownMeter: MeterGuardMock = { me: { id: 1, household_id: 1 }, meter: METER };
const otherHousehold: MeterGuardMock = { ...ownMeter, meter: { ...METER, household_id: 2 } };
const editInput = { meter_id: c.int(3), unit: c.text("kWh"), serial: c.text("B2"), rollover_digits: c.int(6) };

export const updateMeter = query({
  name: "meters/{meter_id}",
  verb: "PATCH",
  apiGroup: metersApi,
  auth: users,
  input: {
    meter_id: input.int({ required: true }),
    unit: input.text({ required: true }),
    serial: input.text(),
    rollover_digits: input.int({ required: true, min: 1, max: 12 }),
  },
  stack: [
    ...mockedMeterGuard({
      "updates own meter": ownMeter,
      "other household is not found": otherHousehold,
    }),
    s.db.edit({
      table: meters,
      fieldValue: inp("meter_id"),
      row: { unit: inp("unit"), serial: inp("serial"), rollover_digits: inp("rollover_digits") },
      as: "updated",
      mock: { "updates own meter": c.obj({ ...METER, serial: "B2", rollover_digits: 6 }) },
    }),
  ],
  response: ref("updated"),
  tests: [
    {
      name: "updates own meter",
      input: editInput,
      expect: [expect.to_equal(resp("rollover_digits"), c.int(6)), expect.to_equal(resp("serial"), c.text("B2"))],
    },
    {
      name: "other household is not found",
      input: editInput,
      expect: [expect.to_throw(c.text("Meter not found."))],
    },
  ],
});

const deletesOwn = { "deletes own meter": c.int(0) };

export const deleteMeter = query({
  name: "meters/{meter_id}",
  verb: "DELETE",
  apiGroup: metersApi,
  auth: users,
  input: { meter_id: input.int({ required: true }) },
  stack: [
    ...mockedMeterGuard({
      "deletes own meter": ownMeter,
      "other household is not found": otherHousehold,
    }),
    s.db.transaction({
      body: [
        s.db.bulk.delete({ table: readings, where: expr(col("meter_id"), "=", inp("meter_id")), mock: deletesOwn }),
        s.db.bulk.delete({ table: tariffs, where: expr(col("meter_id"), "=", inp("meter_id")), mock: deletesOwn }),
        s.db.bulk.delete({
          table: billingPeriods,
          where: expr(col("meter_id"), "=", inp("meter_id")),
          mock: deletesOwn,
        }),
        s.db.del({ table: meters, fieldValue: inp("meter_id"), mock: { "deletes own meter": c.null() } }),
      ],
    }),
  ],
  response: ref("meter"),
  tests: [
    {
      name: "deletes own meter",
      input: { meter_id: c.int(3) },
      expect: [expect.to_equal(resp("id"), c.int(3))],
    },
    {
      name: "other household is not found",
      input: { meter_id: c.int(3) },
      expect: [expect.to_throw(c.text("Meter not found."))],
    },
  ],
});
