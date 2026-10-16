# meterlog

Log your electricity, gas and water meter readings and see what you use. A household
adds its meters, records readings by hand, and enters the tariff from each bill; the
app works out consumption and estimates cost.

Built so far: signup (creates a household), login, meters, readings (flagged on entry when
they drop or spike), tariffs through the API, and daily usage with a cost estimate from the
active tariff. The dashboard shows each meter's last reading and this month's usage; a
meter's page charts daily usage and lists its readings. The tariffs editor, billing
periods, invites and the weekly flagging task are not written yet.

The backend is TypeScript in [`xano/`](xano/), authored with the
[Xano SDK](https://github.com/xano-sdk/sdk) and run on the Xano Engine. The frontend is
React, Vite, Tailwind and shadcn/ui in [`frontend/`](frontend/).

## Run it

Node 20.19 or later.

```bash
npm install
npm run xano:deploy   # backend on the local Xano Engine
npm run dev           # frontend, pointed at it
```

## Scripts

- `npm run xano:test` runs the backend tests against the last deploy.
- `npm run xano:check` is the CI gate: strict export, stale `xano/routes.gen.ts`, lock drift.
- `npm run build` typechecks both halves and builds the frontend.

`frontend/src/lib/api.ts` takes paths and request types from `xano/routes.gen.ts`, which
`npm run xano:routes` regenerates. Commit it with `xano/xano.lock`.

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
