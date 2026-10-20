import { workspace } from "@xano/sdk";
import { households, users, meters, readings, tariffs } from "./tables.js";
import { authApi, signup, login, invite } from "./api/auth.js";
import { metersApi, listMeters, createMeter, getMeter } from "./api/meters.js";
import { readingsApi, listReadings, createReading } from "./api/readings.js";
import { tariffsApi, listTariffs, createTariff, updateTariff, deleteTariff } from "./api/tariffs.js";
import { usageApi, getUsage } from "./api/usage.js";
import { checkReading } from "./functions/check_reading.js";
import { meterUsage } from "./functions/meter_usage.js";

export default workspace("meterlog")
  .registerTables([households, users, meters, readings, tariffs])
  .registerFunctions([checkReading, meterUsage])
  .registerApiGroups([authApi, metersApi, readingsApi, tariffsApi, usageApi])
  .registerQueries([signup, login, invite, listMeters, createMeter, getMeter, listReadings, createReading, listTariffs, createTariff, updateTariff, deleteTariff, getUsage]);
