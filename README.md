# meterlog

[![Built on Xano](https://img.shields.io/badge/built_on-Xano-0055FF)](https://xano.com)

_Describe meterlog here: what it does and who it is for._

The backend under [`xano/`](xano/) is TypeScript, authored with the
[Xano SDK](https://github.com/xano-sdk/sdk) and running on [Xano](https://xano.com). It runs
on your machine as the **Xano Engine** and ships to Xano's cloud with the same command. The
React + Vite frontend under [`frontend/`](frontend/) takes its request paths and types
from the backend defs rather than hand-typing them.

## Quick start

```bash
npm install
npm run xano:deploy   # run the backend on the Xano Engine, on this machine
npm run dev           # run the frontend, already pointed at it
```

No Xano account needed. Then author your backend in [`xano/index.ts`](xano/index.ts),
starting with the walkthrough in [`xano/EXAMPLE.md`](xano/EXAMPLE.md), and rerun
`npm run xano:deploy` after each change.

## Run it on your machine

The Xano Engine is Xano running on your machine. `npm run xano:deploy` typechecks the
backend and deploys it to the engine: no sign-in, and no network round-trip.
It prints the backend URL, a link that opens Xano's visual builder on the engine, and
points `npm run dev` at it through `.env.local` (restart the dev server if it was already
running).

- **It works on a fresh machine with nothing set.** The first run downloads the latest
  engine once per machine and pins its version in `package.json`. Commit that change, so
  everyone on the project runs the same engine.
- **It keeps your table rows across redeploys** (`--keep-data`). The first run seeds and
  later runs merge your changes in without re-seeding. Rows survive only in tables and columns that keep
  their names (a rename drops the old one with its rows), and only while the engine runs. An
  engine update or restart starts it empty and the next run seeds again.
  `npm run xano:deploy -- --reset` gives a clean, re-seeded slate.
- **Updates are yours to take.** When a newer engine ships, a deploy offers it and never
  applies it without a yes. `npx xanosdk local update` moves the pin on purpose,
  and `npx xanosdk local cache clear` reclaims the disk space. To try another engine
  without moving the pin, export `XANOSDK_ENGINE_OVERRIDE` with a version (`v0.1.5`)
  or an engine archive path.
- **The rest of the CLI follows.** After a local deploy, `npm run xano:test`,
  `npx xanosdk tables` and `npx xanosdk status` reach the engine with no flag.
  `npx xanosdk local stop <name>` shuts it down.

## Deploy to Xano's cloud

```bash
npx xanosdk login               # once, to authenticate against your Xano account
npm run xano:deploy:ephemeral   # build the frontend, then ship it with the backend
```

That deploys the backend and the built frontend to a live **ephemeral** environment on
Xano and prints its URL. Run it again to refresh the same environment; if it expired, a
fresh one is created and the new URL is called out. `npx xanosdk status` says who you
are signed in as, which workspace you are bound to, and which environment this project
last deployed to — its URL, and when it expires — so you never have to remember the
environment's name. Your **workspace** is reached through a release (`deploy --ephemeral --test`,
`release create`, `promote`); see the
[deploying guide](https://github.com/xano-sdk/sdk/blob/main/guides/deploying.md).

The other scripts:

- `npm run xano:deploy:frontend` rebuilds the frontend and republishes it to the
  environment this project last deployed to — no backend compile or import, so it
  is the quick loop for UI-only changes. After `npm run xano:deploy` the engine serves
  it; `npm run xano:deploy:frontend -- --to ephemeral` sends it to an ephemeral instead,
  and `npx xanosdk publish ./frontend/dist --to workspace` puts the same build in front
  of your real workspace.
- `npm run xano:test` runs the tests the DEPLOYED environment carries — the `tests`
  on a query/function/middleware and any `workflowTest()`. It compiles nothing, so
  deploy first. A failing suite exits 5, distinct from a crash. `npx xanosdk deploy
  ./xano/index.ts --test` does both in one step.
- `npm run xano:export` compiles the backend to `workspace.json` (don't commit it).

## `xano.lock` — commit it

Object identity derives from `(type, name)`, so a rename would otherwise change
an object's guid and the engine would **delete and recreate** it rather than
renaming it in place — losing its rows on a record-preserving import.
[`xano/xano.lock`](xano/xano.lock) freezes each guid and each API group's
canonical slug, so renames and re-deploys keep the same identities (and the same
public URLs).

Every build writes it — no flag — and it **must be committed**. Ignoring it means
each build mints identities and public URLs that are thrown away and re-invented
next time. If you release to a workspace that already exists, adopt what it
already serves first with `npx xanosdk lock import <live-bundle.json> --lock=xano/xano.lock`;
that is also the recovery path once identities have drifted.

```bash
npm run xano:check      # CI: fail on ANY build warning (it runs --strict), if the export
                        # would change xano.lock, or if the lock carries an entry no
                        # object matches — writes nothing and needs no secrets, so a
                        # fresh clone runs it as-is
```

To rename an object: rename it in code and run `npm run xano:export`. Only if it
warns of an orphaned entry, run the `npx xanosdk lock rename <kind> <old> <new>` it prints, then
export again. Every `lock` subcommand finds `xano/xano.lock` from the project entry, as
`export` does — `--entry=<file>` names another entry, `--lock=<path>` the lock itself.

## The one contract

[`frontend/src/lib/api.ts`](frontend/src/lib/api.ts) takes request paths from
`xano/routes.gen.ts` (`routePath("GET notes/{id}", { id })`), request types from the
same file (`RouteInputs["POST create_note"]`, `MessageInputs[...]` for realtime), and
response types from the query defs (`import type` + `InferResponse`).
Never hand-type a URL or a request body — change a def and the frontend follows.

`npm run xano:routes` writes `xano/routes.gen.ts` from the defs; `dev`, `build`
and `typecheck` run it first, and `xano:check` fails on a missing or stale copy — commit it.
`init --from` and `pull` write it with the decoded backend.
It is plain data that imports nothing. Importing a def as a value for its
`getPath()` would instead pull the backend graph and the SDK runtime into the
browser bundle.

> To spot-check a def from Node (read `getPath()`/`verb`, log a value), run a real
> file with `tsx <file.ts>` **from inside the project root** — not `tsx -e`, not
> bare `node file.ts`, and not from another directory (they mis-resolve the
> intra-workspace `.js` imports and the `@xano/sdk` specifier). Or use
> `npx xanosdk routes xano/index.ts` to list every endpoint's verb + path.

## The frontend

React + Vite, styled with [Tailwind CSS](https://tailwindcss.com) v4 and
[shadcn/ui](https://ui.shadcn.com). shadcn is not a dependency — its components
are copied into [`frontend/src/components/ui/`](frontend/src/components/ui/) and
owned by this project, so edit them freely. `Button` and `Card` are already
there; add more with:

```bash
npx shadcn@latest add dialog input form
```

[`components.json`](components.json) is pre-configured, so that works with no
`shadcn init` step. Icons are [Lucide](https://lucide.dev/icons), installed as `lucide-react` and
imported by name from the package root —
`import { ArrowRight } from "lucide-react";`.
[`frontend/src/App.tsx`](frontend/src/App.tsx) already uses one.

Components import through the `@/` alias (`@/components/ui/button`), which
maps to `frontend/src/` in both `tsconfig.json` and `vite.config.ts` — change
one and change the other. `cn()` comes from shadcn's `cn` package, which is
what the CLI writes into every component it adds.

Colors come from the theme tokens in
[`frontend/src/index.css`](frontend/src/index.css) — see **Theming** below.

## Theming

Scaffolded with the **Zinc Rose** theme. Every color in the app comes from
the semantic tokens at the top of
[`frontend/src/index.css`](frontend/src/index.css) — `--primary`,
`--muted-foreground`, `--border`, the `--chart-*` ramp, the `--sidebar-*` set —
and every shadcn component reads those names, so editing one value rebrands
everything that uses it. Style with the token classes (`bg-primary`,
`text-muted-foreground`) rather than raw palette classes like `bg-gray-100`, or
the theme stops being one.

Tailwind v4 has no `tailwind.config.js`; that stylesheet *is* the config.

To swap the whole palette later:

```bash
npx shadcn@latest add https://ui.shadcn.com/r/themes/stone.json   # or any registry theme
```

Dark mode follows the OS until the user says otherwise. The pieces:
an inline script in the HTML entry applies the mode before first paint,
[`frontend/src/lib/theme.ts`](frontend/src/lib/theme.ts) holds and persists it,
and the mode toggle on the landing page cycles system → light → dark.

## Add-ons

Xano SDK is composable with other `@xano-sdk/*` packages:

- **[`@xano-sdk/auth`](https://www.npmjs.com/package/@xano-sdk/auth)** — turnkey
  authentication (user/login/signup tables and endpoints). Install it with
  `npx xanosdk marketplace install @xano-sdk/auth`, then register it in
  `xano/index.ts`. Authentication only — **not** authorization: it has no
  roles, permissions, or route guards, and its tokens carry no role claim.
  Enforce roles off the caller's row with `@xano/sdk`: spread
  `...guard.role(userTable, "admin")` into the endpoint's stack.
- More `@xano-sdk/*` packages register onto the same workspace. This list
  does not update itself — run `npx xanosdk marketplace list` for the live
  catalogue, `npx xanosdk marketplace search <words>` to narrow it, and
  `npx xanosdk marketplace details <package>` to see what an add-on installs and
  how to register it. All three work before you log in.

None of these ship with the scaffold. Install one only when you need it — an
add-on you never register is weight in `package.json` for nothing.

<!-- BEGIN:xanosdk-built-with -->
<!-- xanosdk 1.0.7 — generated; edits inside this block are overwritten -->

## Built with

- [Xano](https://xano.com) hosts everything under [`xano/`](xano/): the database, APIs,
  auth, background tasks, realtime, file storage and AI agents. It runs on your machine as
  the Xano Engine and in the cloud from the same command. [Docs](https://docs.xano.com) ·
  [Community](https://community.xano.com)
- [Xano SDK](https://github.com/xano-sdk/sdk) is the TypeScript the backend is authored in.
  The [guides](https://github.com/xano-sdk/sdk/blob/main/guides/README.md) cover signing in
  and deploying, releasing to production, the typed frontend, and every CLI command.
<!-- END:xanosdk-built-with -->
