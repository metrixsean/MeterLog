import { table, f } from "@xano/sdk";

export const households = table({
  name: "households",
  schema: {
    name: f.text({ required: true }),
  },
});

export const users = table({
  name: "users",
  auth: true,
  schema: {
    household_id: f.tableRef(households),
    email: f.email({ required: true }),
    password: f.password({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});

export const meters = table({
  name: "meters",
  schema: {
    household_id: f.tableRef(households),
    kind: f.enum(["electric", "gas", "water"], { required: true }),
    unit: f.text({ required: true }),
    serial: f.text(),
    rollover_digits: f.int({ required: true }),
  },
  index: [{ type: "btree", fields: [{ name: "household_id" }] }],
});

export const readings = table({
  name: "readings",
  schema: {
    meter_id: f.tableRef(meters),
    value: f.decimal({ required: true }),
    read_at: f.timestamp({ required: true }),
    photo: f.image(),
    entered_by: f.tableRef(users),
    flagged: f.bool(),
    flag_reason: f.text(),
  },
  index: [{ type: "btree", fields: [{ name: "meter_id" }, { name: "read_at" }] }],
});

export const tariffs = table({
  name: "tariffs",
  schema: {
    meter_id: f.tableRef(meters),
    unit_price: f.decimal({ required: true }),
    standing_charge_per_day: f.decimal({ required: true }),
    valid_from: f.date({ required: true }),
    valid_to: f.date(),
  },
  index: [{ type: "btree", fields: [{ name: "meter_id" }, { name: "valid_from" }] }],
});
