import { workspace } from "@xano/sdk";

/**
 * The meterlog backend.
 *
 * A workspace is assembled by registering typed objects onto a workspace()
 * instance and default-exporting it. This starter is intentionally empty and
 * already compiles + deploys — add your first table and endpoint below.
 *
 * ── Add your first table + endpoint ─────────────────────────────────────────
 *
 *   import { workspace, table, apiGroup, query, f, input, s, ref, c, expect, resp } from "@xano/sdk";
 *
 *   const notes = table({
 *     name: "notes",
 *     // `id` (int PK) + `created_at` (epochms) are auto-injected.
 *     schema: {
 *       body: f.text({ required: true }),
 *     },
 *   });
 *
 *   const api = apiGroup({ name: "notes", canonical: "notes" }); // pin the slug
 *
 *   const createNote = query({
 *     name: "create_note",
 *     verb: "POST",
 *     apiGroup: api,
 *     input: { body: input.text({ required: true }) },
 *     // ...build the stack with the s.* statement helpers...
 *     // Assertions ride along with the object they cover; `npm run xano:test`
 *     // runs them against whatever you last deployed.
 *     tests: [
 *       {
 *         name: "creates a note",
 *         input: { body: c.text("hello") },
 *         expect: [expect.to_be_defined(resp())],
 *       },
 *     ],
 *   });
 *
 *   export default workspace("meterlog")
 *     .registerTables([notes])
 *     .registerApiGroups([api])
 *     .registerQueries([createNote]);
 *
 * Discover the exact builders and options from the package's own types and its
 * shipped docs — read `node_modules/@xano/sdk/llms.txt` first (it ends with a
 * map of the `llms/*.md` topic files), then the .d.ts files.
 * See `xano/EXAMPLE.md` for the full walkthrough.
 *
 * ── Optional add-ons ─────────────────────────────────────────────────────────
 * Nothing below is installed. Reach for an add-on when you need it, not before.
 *
 * @xano-sdk/auth registers turnkey auth (user/login/signup) onto this same
 * workspace. Install it first (`npx xanosdk marketplace install @xano-sdk/auth`), then
 * `registerAuth(workspace("meterlog"), { canonical: "authn" })` returns the
 * instance to chain your own .register*() calls onto:
 *
 *   registerAuth(workspace("meterlog"), { canonical: "authn" })
 *     .registerTables([notes])
 *     .registerApiGroups([api])
 *     .registerQueries([createNote]);
 *
 * That is not the whole catalogue. `npx xanosdk marketplace list` prints every
 * published add-on and `npx xanosdk marketplace details <package>` prints what one
 * installs plus the registration to paste here — no login required.
 */
export default workspace("meterlog");
