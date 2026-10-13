// The one contract: endpoint paths and request types come from the generated
// route manifest, and response *types* from your xanosdk query defs. Never
// hand-type a URL or a request body: change a def and everything here follows.
//
// Keep the backend out of the browser bundle:
//   • Paths and verbs: `routePath()` / `ROUTES` from xano/routes.gen.ts, plain data
//     generated from the defs (`npm run xano:routes`; dev, build and typecheck
//     regenerate it). Never import a def as a VALUE for its getPath()/verb:
//     its s.*/c.* factory calls run at module load, so one import pulls in the
//     backend graph it references and the SDK runtime that builds it.
//   • Request types: `RouteInputs["<VERB> <name>"]` from the same file
//     (`ChannelInputs` / `MessageInputs` for realtime), types only. For
//     runtime validation, `npx xanosdk marketplace install zod` adds zod
//     schemas under the same keys.
//   • Response types: `import type` the def. InferResponse erases to nothing.
//
// Nothing here imports the manifest yet — an add-on's endpoints may already be
// in it. Wire an endpoint (one in xano/, or an add-on's) like:
//
//   import type { InferResponse } from "@xano/sdk";
//   import type { createNoteQuery } from "../../../xano/api/create-note.js";
//   import { ROUTES, routePath, type RouteInputs } from "../../../xano/routes.gen.js";
//
//   export type CreateNoteBody = RouteInputs["POST create_note"];
//   export type Note = InferResponse<typeof createNoteQuery>;
//
//   export async function createNote(body: CreateNoteBody): Promise<Note> {
//     const res = await fetch(XANO_HOST + routePath("POST create_note"), {
//       method: ROUTES["POST create_note"].verb,
//       headers: { "content-type": "application/json" },
//       body: JSON.stringify(body),
//     });
//     if (!res.ok) throw new Error(await res.text());
//     return res.json();
//   }
//
// Keys are "<VERB> <query name>"; path params are passed by name, e.g.
// routePath("GET notes/{id}", { id }). A renamed endpoint is a compile error.

// Types the global the deploy injects, for every file in the project: the
// documented `window.XANO_HOST` reads compile anywhere. `undefined` in dev.
declare global {
  interface Window {
    XANO_HOST?: string;
  }
}

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `npx xanosdk deploy <entry> --static <dir>`, or read from `VITE_XANO_HOST` in dev.
 * Empty string when neither is set (the UI runs with no backend).
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && window.XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

import type { InferResponse } from "@xano/sdk";
import type { signup, login } from "../../../xano/api/auth.js";
import type { listMeters } from "../../../xano/api/meters.js";
import type { createReading, listReadings } from "../../../xano/api/readings.js";
import { ROUTES, routePath, type RouteInputs, type RouteName } from "../../../xano/routes.gen.js";

export type SignupBody = RouteInputs["POST signup"];
export type LoginBody = RouteInputs["POST login"];
export type CreateMeterBody = RouteInputs["POST create_meter"];
export type Session = InferResponse<typeof login>;
export type SignupSession = InferResponse<typeof signup>;
export type Meter = InferResponse<typeof listMeters>[number];
export type CreateReadingBody = RouteInputs["POST create_reading"];
export type Reading = InferResponse<typeof listReadings>[number];
export type NewReading = InferResponse<typeof createReading>;

const TOKEN_KEY = "meterlog.token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

async function call<T>(
  name: RouteName,
  body?: unknown,
  params?: Record<string, string | number>,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(XANO_HOST + routePath(name as never, params as never), {
    method: ROUTES[name].verb,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export const signupRequest = (body: SignupBody) => call<SignupSession>("POST signup", body);
export const loginRequest = (body: LoginBody) => call<Session>("POST login", body);
export const fetchMeters = () => call<Meter[]>("GET list_meters");
export const createMeter = (body: CreateMeterBody) => call<Meter>("POST create_meter", body);
export const fetchReadings = (meterId: number) =>
  call<Reading[]>("GET meters/{meter_id}/readings", undefined, { meter_id: meterId });
export const createReadingRequest = (body: CreateReadingBody) =>
  call<NewReading>("POST create_reading", body);
