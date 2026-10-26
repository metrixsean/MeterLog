import { task, every, s, ref } from "@xano/sdk";
import { meters, readings } from "../tables.js";
import { flagReadings } from "../functions/flag_readings.js";

export const flagReadingsWeekly = task({
  name: "flag_readings_weekly",
  schedule: [{ startsOn: "2026-11-01T03:00:00Z", freq: every("1w") }],
  stack: [
    s.db.query({ table: meters, output: ["id", "rollover_digits"], as: "all_meters" }),
    s.foreach({
      list: ref("all_meters"),
      as: "meter",
      body: [
        s.function.run({
          fn: flagReadings,
          input: { meter_id: ref("meter.id"), rollover_digits: ref("meter.rollover_digits") },
          as: "flags",
        }),
        s.foreach({
          list: ref("flags"),
          as: "flag",
          body: [
            s.db.edit({
              table: readings,
              fieldValue: ref("flag.id"),
              row: { flagged: ref("flag.flagged"), flag_reason: ref("flag.flag_reason") },
            }),
          ],
        }),
      ],
    }),
  ],
});
