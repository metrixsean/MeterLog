import {
  apiGroup, query, input, s, ref, inp, auth, c, col, expr, or, guard, statements, expect, resp,
} from "@xano/sdk";
import { meters, tariffs, users } from "../tables.js";
import { meterGuard } from "./meter_guard.js";

export const tariffsApi = apiGroup({ name: "tariffs", canonical: "tariffs" });

const rates = {
  unit_price: input.decimal({ required: true, min: 0 }),
  standing_charge_per_day: input.decimal({ required: true, min: 0 }),
  valid_from: input.date({ required: true }),
  valid_to: input.date(),
};

const validRange = guard.require(
  or(expr(inp("valid_to"), "=", c.null()), expr(inp("valid_to"), ">=", inp("valid_from"))),
  { errorType: "badrequest", message: "valid_to is before valid_from." },
);

type Row = Record<string, string | number | null>;
type GuardMock = { me: Row; tariff: Row; meter: Row };

const tariffGuard = (mocks: Record<string, GuardMock> = {}) => {
  const pick = (key: keyof GuardMock) =>
    Object.fromEntries(Object.entries(mocks).map(([name, m]) => [name, c.obj(m[key])]));
  return statements(
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me", mock: pick("me") }),
    s.db.get({ table: tariffs, fieldName: "id", fieldValue: inp("tariff_id"), as: "tariff", mock: pick("tariff") }),
    guard.found("tariff", { message: "Tariff not found." }),
    s.db.get({ table: meters, fieldName: "id", fieldValue: ref("tariff.meter_id"), as: "meter", mock: pick("meter") }),
    guard.require(expr(ref("meter.household_id", { safe: true }), "=", ref("me.household_id")), {
      errorType: "notfound",
      message: "Tariff not found.",
    }),
  );
};

const TARIFF = { id: 7, meter_id: 3, unit_price: 0.3, standing_charge_per_day: 0.5, valid_from: "2026-01-01", valid_to: null };
const ownHousehold: GuardMock = { me: { id: 1, household_id: 1 }, tariff: TARIFF, meter: { id: 3, household_id: 1 } };
const otherHousehold: GuardMock = { ...ownHousehold, meter: { id: 3, household_id: 2 } };

const editInput = (valid_to: string | null) => ({
  tariff_id: c.int(7),
  unit_price: c.decimal(0.25),
  standing_charge_per_day: c.decimal(0.5),
  valid_from: c.text("2026-01-01"),
  valid_to: valid_to === null ? c.null() : c.text(valid_to),
});

export const listTariffs = query({
  name: "meters/{meter_id}/tariffs",
  verb: "GET",
  apiGroup: tariffsApi,
  auth: users,
  input: { meter_id: input.int({ required: true }) },
  stack: [
    ...meterGuard,
    s.db.query({
      table: tariffs,
      where: expr(col("meter_id"), "=", inp("meter_id")),
      sort: [{ sortBy: "valid_from", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});

export const createTariff = query({
  name: "create_tariff",
  verb: "POST",
  apiGroup: tariffsApi,
  auth: users,
  input: { meter_id: input.int({ required: true }), ...rates },
  stack: [
    ...meterGuard,
    validRange,
    s.db.add({
      table: tariffs,
      row: {
        meter_id: inp("meter_id"),
        unit_price: inp("unit_price"),
        standing_charge_per_day: inp("standing_charge_per_day"),
        valid_from: inp("valid_from"),
        valid_to: inp("valid_to"),
      },
      as: "tariff",
    }),
  ],
  response: ref("tariff"),
});

export const updateTariff = query({
  name: "tariffs/{tariff_id}",
  verb: "PATCH",
  apiGroup: tariffsApi,
  auth: users,
  input: { tariff_id: input.int({ required: true }), ...rates },
  stack: [
    ...tariffGuard({
      "updates own tariff": ownHousehold,
      "other household is not found": otherHousehold,
      "rejects end before start": ownHousehold,
    }),
    validRange,
    s.db.edit({
      table: tariffs,
      fieldValue: inp("tariff_id"),
      row: {
        unit_price: inp("unit_price"),
        standing_charge_per_day: inp("standing_charge_per_day"),
        valid_from: inp("valid_from"),
        valid_to: inp("valid_to"),
      },
      as: "updated",
      mock: { "updates own tariff": c.obj({ ...TARIFF, unit_price: 0.25 }) },
    }),
  ],
  response: ref("updated"),
  tests: [
    {
      name: "updates own tariff",
      input: editInput("2026-06-30"),
      expect: [expect.to_equal(resp("unit_price"), c.decimal(0.25))],
    },
    {
      name: "other household is not found",
      input: editInput(null),
      expect: [expect.to_throw(c.text("Tariff not found."))],
    },
    {
      name: "rejects end before start",
      input: editInput("2025-12-31"),
      expect: [expect.to_throw(c.text("valid_to is before valid_from."))],
    },
  ],
});

export const deleteTariff = query({
  name: "tariffs/{tariff_id}",
  verb: "DELETE",
  apiGroup: tariffsApi,
  auth: users,
  input: { tariff_id: input.int({ required: true }) },
  stack: [
    ...tariffGuard({
      "deletes own tariff": ownHousehold,
      "other household is not found": otherHousehold,
    }),
    s.db.del({ table: tariffs, fieldValue: inp("tariff_id"), mock: { "deletes own tariff": c.null() } }),
  ],
  response: ref("tariff"),
  tests: [
    {
      name: "deletes own tariff",
      input: { tariff_id: c.int(7) },
      expect: [expect.to_equal(resp("id"), c.int(7))],
    },
    {
      name: "other household is not found",
      input: { tariff_id: c.int(7) },
      expect: [expect.to_throw(c.text("Tariff not found."))],
    },
  ],
});
