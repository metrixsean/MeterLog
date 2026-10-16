import { apiGroup, query, input, s, ref, inp } from "@xano/sdk";
import { users } from "../tables.js";
import { meterGuard } from "./meter_guard.js";
import { meterUsage } from "../functions/meter_usage.js";

export const usageApi = apiGroup({ name: "usage", canonical: "usage" });

export const getUsage = query({
  name: "meters/{meter_id}/usage",
  verb: "GET",
  apiGroup: usageApi,
  auth: users,
  input: {
    meter_id: input.int({ required: true }),
    from: input.date({ required: true }),
    to: input.date({ required: true }),
  },
  stack: [
    ...meterGuard,
    s.function.run({
      fn: meterUsage,
      input: {
        meter_id: inp("meter_id"),
        rollover_digits: ref("meter.rollover_digits"),
        from: inp("from"),
        to: inp("to"),
      },
      as: "usage",
    }),
  ],
  response: ref("usage"),
});
