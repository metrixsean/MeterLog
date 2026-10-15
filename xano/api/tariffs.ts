import { apiGroup, query, input, s, ref, inp, auth, col, expr, guard } from "@xano/sdk";
import { meters, tariffs, users } from "../tables.js";

export const tariffsApi = apiGroup({ name: "tariffs", canonical: "tariffs" });

const meterStack = [
  s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me" }),
  s.db.get({ table: meters, fieldName: "id", fieldValue: inp("meter_id"), as: "meter" }),
  guard.found("meter", { message: "Meter not found." }),
  guard.require(expr(ref("meter.household_id"), "=", ref("me.household_id")), {
    errorType: "notfound",
    message: "Meter not found.",
  }),
];

export const listTariffs = query({
  name: "meters/{meter_id}/tariffs",
  verb: "GET",
  apiGroup: tariffsApi,
  auth: users,
  input: { meter_id: input.int({ required: true }) },
  stack: [
    ...meterStack,
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
  input: {
    meter_id: input.int({ required: true }),
    unit_price: input.decimal({ required: true, min: 0 }),
    standing_charge_per_day: input.decimal({ required: true, min: 0 }),
    valid_from: input.date({ required: true }),
    valid_to: input.date(),
  },
  stack: [
    ...meterStack,
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
