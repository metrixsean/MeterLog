import { workspace } from "@xano/sdk";
import { households, users, meters, readings } from "./tables.js";
import { authApi, signup, login } from "./api/auth.js";
import { metersApi, listMeters, createMeter } from "./api/meters.js";
import { readingsApi, listReadings, createReading } from "./api/readings.js";
import { checkReading } from "./functions/check_reading.js";

export default workspace("meterlog")
  .registerTables([households, users, meters, readings])
  .registerFunctions([checkReading])
  .registerApiGroups([authApi, metersApi, readingsApi])
  .registerQueries([signup, login, listMeters, createMeter, listReadings, createReading]);
