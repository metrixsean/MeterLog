import { workspace } from "@xano/sdk";
import { households, users, meters } from "./tables.js";
import { authApi, signup, login } from "./api/auth.js";
import { metersApi, listMeters, createMeter } from "./api/meters.js";

export default workspace("meterlog")
  .registerTables([households, users, meters])
  .registerApiGroups([authApi, metersApi])
  .registerQueries([signup, login, listMeters, createMeter]);
