import {
  apiGroup, query, input, s, ref, inp, auth, c, col, expr, guard, statements, expect, resp,
} from "@xano/sdk";
import { billingPeriods, meters, users } from "../tables.js";
import { meterGuard } from "./meter_guard.js";
import { periodSummary } from "../functions/period_summary.js";

export const billingApi = apiGroup({ name: "billing", canonical: "billing" });

const fields = {
  start_date: input.date({ required: true }),
  end_date: input.date({ required: true }),
  billed_amount: input.decimal({ required: true, min: 0 }),
};

const validRange = guard.require(expr(inp("end_date"), ">=", inp("start_date")), {
  errorType: "badrequest",
  message: "end_date is before start_date.",
});

type Row = Record<string, string | number | null>;
type GuardMock = { me: Row; period: Row; meter: Row };

const periodGuard = (mocks: Record<string, GuardMock> = {}) => {
  const pick = (key: keyof GuardMock) =>
    Object.fromEntries(Object.entries(mocks).map(([name, m]) => [name, c.obj(m[key])]));
  return statements(
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me", mock: pick("me") }),
    s.db.get({ table: billingPeriods, fieldName: "id", fieldValue: inp("period_id"), as: "period", mock: pick("period") }),
    guard.found("period", { message: "Billing period not found." }),
    s.db.get({ table: meters, fieldName: "id", fieldValue: ref("period.meter_id"), as: "meter", mock: pick("meter") }),
    guard.require(expr(ref("meter.household_id", { safe: true }), "=", ref("me.household_id")), {
      errorType: "notfound",
      message: "Billing period not found.",
    }),
  );
};

const PERIOD = { id: 4, meter_id: 3, start_date: "2026-01-01", end_date: "2026-03-31", billed_amount: 120 };
const ownHousehold: GuardMock = {
  me: { id: 1, household_id: 1 },
  period: PERIOD,
  meter: { id: 3, household_id: 1, rollover_digits: 5 },
};
const otherHousehold: GuardMock = { ...ownHousehold, meter: { id: 3, household_id: 2, rollover_digits: 5 } };

const editInput = (end_date: string) => ({
  period_id: c.int(4),
  start_date: c.text("2026-01-01"),
  end_date: c.text(end_date),
  billed_amount: c.decimal(130),
});

export const listBillingPeriods = query({
  name: "meters/{meter_id}/billing_periods",
  verb: "GET",
  apiGroup: billingApi,
  auth: users,
  input: { meter_id: input.int({ required: true }) },
  stack: [
    ...meterGuard,
    s.db.query({
      table: billingPeriods,
      where: expr(col("meter_id"), "=", inp("meter_id")),
      sort: [{ sortBy: "start_date", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});

export const createBillingPeriod = query({
  name: "create_billing_period",
  verb: "POST",
  apiGroup: billingApi,
  auth: users,
  input: { meter_id: input.int({ required: true }), ...fields },
  stack: [
    ...meterGuard,
    validRange,
    s.db.add({
      table: billingPeriods,
      row: {
        meter_id: inp("meter_id"),
        start_date: inp("start_date"),
        end_date: inp("end_date"),
        billed_amount: inp("billed_amount"),
      },
      as: "period",
    }),
  ],
  response: ref("period"),
});

export const updateBillingPeriod = query({
  name: "billing_periods/{period_id}",
  verb: "PATCH",
  apiGroup: billingApi,
  auth: users,
  input: { period_id: input.int({ required: true }), ...fields },
  stack: [
    ...periodGuard({
      "updates own period": ownHousehold,
      "other household is not found": otherHousehold,
      "rejects end before start": ownHousehold,
    }),
    validRange,
    s.db.edit({
      table: billingPeriods,
      fieldValue: inp("period_id"),
      row: {
        start_date: inp("start_date"),
        end_date: inp("end_date"),
        billed_amount: inp("billed_amount"),
      },
      as: "updated",
      mock: { "updates own period": c.obj({ ...PERIOD, billed_amount: 130 }) },
    }),
  ],
  response: ref("updated"),
  tests: [
    {
      name: "updates own period",
      input: editInput("2026-03-31"),
      expect: [expect.to_equal(resp("billed_amount"), c.decimal(130))],
    },
    {
      name: "other household is not found",
      input: editInput("2026-03-31"),
      expect: [expect.to_throw(c.text("Billing period not found."))],
    },
    {
      name: "rejects end before start",
      input: editInput("2025-12-31"),
      expect: [expect.to_throw(c.text("end_date is before start_date."))],
    },
  ],
});

export const deleteBillingPeriod = query({
  name: "billing_periods/{period_id}",
  verb: "DELETE",
  apiGroup: billingApi,
  auth: users,
  input: { period_id: input.int({ required: true }) },
  stack: [
    ...periodGuard({
      "deletes own period": ownHousehold,
      "other household is not found": otherHousehold,
    }),
    s.db.del({ table: billingPeriods, fieldValue: inp("period_id"), mock: { "deletes own period": c.null() } }),
  ],
  response: ref("period"),
  tests: [
    {
      name: "deletes own period",
      input: { period_id: c.int(4) },
      expect: [expect.to_equal(resp("id"), c.int(4))],
    },
    {
      name: "other household is not found",
      input: { period_id: c.int(4) },
      expect: [expect.to_throw(c.text("Billing period not found."))],
    },
  ],
});

export const getPeriodSummary = query({
  name: "billing_periods/{period_id}/summary",
  verb: "GET",
  apiGroup: billingApi,
  auth: users,
  input: { period_id: input.int({ required: true }) },
  stack: [
    ...periodGuard({
      "summarises own period": ownHousehold,
      "other household is not found": otherHousehold,
    }),
    s.function.run({
      fn: periodSummary,
      input: {
        meter_id: ref("period.meter_id"),
        rollover_digits: ref("meter.rollover_digits"),
        start_date: ref("period.start_date"),
        end_date: ref("period.end_date"),
        billed_amount: ref("period.billed_amount"),
      },
      as: "summary",
      mock: {
        "summarises own period": c.obj({
          days: 90,
          covered_days: 90,
          priced_days: 90,
          total_usage: 800,
          estimated_cost: 115.5,
          billed_amount: 120,
          difference: 4.5,
        }),
      },
    }),
  ],
  response: ref("summary"),
  tests: [
    {
      name: "summarises own period",
      input: { period_id: c.int(4) },
      expect: [expect.to_equal(resp("difference"), c.decimal(4.5))],
    },
    {
      name: "other household is not found",
      input: { period_id: c.int(4) },
      expect: [expect.to_throw(c.text("Billing period not found."))],
    },
  ],
});
