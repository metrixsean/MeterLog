import { workspace } from "@xano/sdk";
import { households, users, meters, readings, tariffs } from "./tables.js";
import { authApi, signup, login } from "./api/auth.js";
import { metersApi, listMeters, createMeter } from "./api/meters.js";
import { readingsApi, listReadings, createReading } from "./api/readings.js";
import { tariffsApi, listTariffs, createTariff } from "./api/tariffs.js";
import { checkReading } from "./functions/check_reading.js";

export default workspace("meterlog")
  .registerTables([households, users, meters, readings, tariffs])
  .registerFunctions([checkReading])
  .registerApiGroups([authApi, metersApi, readingsApi, tariffsApi])
  .registerQueries([signup, login, listMeters, createMeter, listReadings, createReading, listTariffs, createTariff]);
