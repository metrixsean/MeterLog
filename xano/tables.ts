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
