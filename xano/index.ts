import { workspace } from "@xano/sdk";
import { households, users, meters, readings, tariffs, billingPeriods } from "./tables.js";
import { authApi, signup, login, invite } from "./api/auth.js";
import { metersApi, listMeters, createMeter, getMeter } from "./api/meters.js";
import { readingsApi, listReadings, createReading } from "./api/readings.js";
import { tariffsApi, listTariffs, createTariff, updateTariff, deleteTariff } from "./api/tariffs.js";
import { usageApi, getUsage } from "./api/usage.js";
import {
  billingApi,
  listBillingPeriods,
  createBillingPeriod,
  updateBillingPeriod,
  deleteBillingPeriod,
  getPeriodSummary,
} from "./api/billing_periods.js";
import { checkReading } from "./functions/check_reading.js";
import { meterUsage } from "./functions/meter_usage.js";
import { periodSummary } from "./functions/period_summary.js";
import { flagReadings } from "./functions/flag_readings.js";
import { flagReadingsWeekly } from "./tasks/flag_readings_weekly.js";

export default workspace("meterlog")
  .registerTables([households, users, meters, readings, tariffs, billingPeriods])
  .registerFunctions([checkReading, meterUsage, periodSummary, flagReadings])
  .registerTasks([flagReadingsWeekly])
  .registerApiGroups([authApi, metersApi, readingsApi, tariffsApi, usageApi, billingApi])
  .registerQueries([
    signup, login, invite,
    listMeters, createMeter, getMeter,
    listReadings, createReading,
    listTariffs, createTariff, updateTariff, deleteTariff,
    getUsage,
    listBillingPeriods, createBillingPeriod, updateBillingPeriod, deleteBillingPeriod, getPeriodSummary,
  ]);
