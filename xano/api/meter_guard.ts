import { s, ref, inp, auth, expr, guard, statements } from "@xano/sdk";
import { meters, users } from "../tables.js";

export const meterGuard = statements(
  s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me" }),
  s.db.get({ table: meters, fieldName: "id", fieldValue: inp("meter_id"), as: "meter" }),
  guard.found("meter", { message: "Meter not found." }),
  guard.require(expr(ref("meter.household_id"), "=", ref("me.household_id")), {
    errorType: "notfound",
    message: "Meter not found.",
  }),
);
