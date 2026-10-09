import { apiGroup, query, input, s, ref, inp, auth, col, expr } from "@xano/sdk";
import { meters, users } from "../tables.js";

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
