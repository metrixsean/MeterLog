import { s, ref, inp, auth, c, expr, guard, statements } from "@xano/sdk";
import { meters, users } from "../tables.js";

type Row = Record<string, string | number | null>;
export type MeterGuardMock = { me: Row; meter: Row };

export const mockedMeterGuard = (mocks: Record<string, MeterGuardMock> = {}) => {
  const pick = (key: keyof MeterGuardMock) =>
    Object.fromEntries(Object.entries(mocks).map(([name, m]) => [name, c.obj(m[key])]));
  return statements(
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me", mock: pick("me") }),
    s.db.get({ table: meters, fieldName: "id", fieldValue: inp("meter_id"), as: "meter", mock: pick("meter") }),
    guard.found("meter", { message: "Meter not found." }),
    guard.require(expr(ref("meter.household_id", { safe: true }), "=", ref("me.household_id")), {
      errorType: "notfound",
      message: "Meter not found.",
    }),
  );
};

export const meterGuard = mockedMeterGuard();
