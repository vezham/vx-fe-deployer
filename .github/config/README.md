# Web app deployments

`web-apps.yaml` is the common registry for all Firebase/Nx web applications. It stores
repository paths, category IDs, environment profiles and
credential **secret names**. Secret values stay in GitHub Actions secrets. YAML
comments can document app-specific choices; numeric and boolean values remain typed.
The YAML language server directive links to `../../vx/schemas/web-apps.json`
for editor validation and autocomplete. `schema: 1` remains the registry format version.

Shared defaults preserve the current profiles: TVA builds Dev/Beta with debug
enabled, Dev builds Dev/Beta with debug enabled, QA builds QA/Beta without debug,
and Preview/Production use Stable without debug. An app can override individual
fields under `environments`.

Node is selected after checkout from the source app’s `package.json`
(`volta.node` or `engines.node`), falling back to the source workspace root’s
`package.json` when the app inherits its runtime. The shared setup passes that
file to `actions/setup-node`; no Node version is stored in this registry. Missing
or malformed runtime declarations fail the build instead of selecting a fixed
default. Pin an exact version in the source package when an exact runtime is
required; an engine range permits any matching version. pnpm still installs
dependencies from the committed lockfile with `--frozen-lockfile`.

Static CDN deliberately retains `PLAYGROUND_DOCS_TVA_GCP_SA_KEY` for every
environment. Change its `credential_secrets` entries when the separate projects
are configured; there is no automatic credential fallback between environments.

## Workflow ownership

Each app needs one source-repository trigger and one registry entry. The trigger
calls `vezham/vx-fe-deployer/.github/workflows/web-app.yml@timeline` directly,
passing its app ID and `CALLER`. The shared workflow loads app settings,
serializes each app/environment deployment, and calls the shared source
preparation action and build/deploy workflow in `vx-deployer`. App-specific
deployer wrappers, helper and promotion workflows are unnecessary.

The shared execution still builds with destination-specific `.env` values.
It deploys both Firebase preview and live channels, updates the source commit
tracker, and journals completed Dev/QA/Preview/Production attempts centrally.
TVA stays in the source commit tracker only. Promotion prerequisites remain
TVA → Dev → QA → Preview → Production for the same app and full SHA.

TVA inherits Contents/Commit statuses write permissions from its source caller.
The central promotion dispatcher and category scheduler also grant Issues write
for journal updates. Validation and deployment mint separate source App tokens;
tokens and credential values are never passed as job outputs.

## Add an app

1. Add an app entry with `category`, `repository`, `path` and all five
   `credential_secrets` mappings. App IDs use lowercase letters, digits and
   hyphens. The app must have Nx build/deploy-generation targets and a Firebase
   config at `vx/deploy/firebase/<app path>.json`, as existing web apps do.
2. Add a source-repository trigger that calls the shared web app workflow
   directly, with the registry app ID, `CALLER` and inherited secrets:

   ```yaml
   deploy:
     permissions:
       contents: write
       statuses: write
     uses: vezham/vx-fe-deployer/.github/workflows/web-app.yml@timeline
     secrets: inherit
     with:
       APP: static-cdn
       CALLER: ${{ github.ref_name }}
   ```

3. Install Vezham Deployer on the source repository and configure the required
   credential secrets and HeroUI token in the applicable caller repositories.

Manual promotion offers enabled registry app IDs in the `-promote.yml` dropdown,
then accepts the full source SHA and destination. The dropdown is generated from
this registry; do not maintain app options by hand. After adding, removing or
disabling an app, regenerate and commit the workflow alongside the registry:

```sh
bash ../vx-deployer/.github/actions/deployment/resolve-web-app/bin/setup.sh
node ../vx-deployer/.github/actions/deployment/resolve-web-app/bin/sync-choices.cjs \
  .github/config/web-apps.yaml .github/workflows/-promote.yml write
```

`check-promote-choices.yml` checks registry and promotion-workflow changes on pull
requests and pushes to `timeline`. A stale dropdown fails the check. Shared
generation logic lives in `vx-deployer`; adding an app requires no routing job.

The CDN scheduler discovers enabled `cdns` entries automatically and rebuilds
each app's latest successful Production SHA. Set `enabled: false` to exclude
an app from manual and scheduled deployment. Other category schedulers retain
their existing implementations until migrated.

## Registry version and publishing

Central runs read the registry at the caller commit SHA. TVA reads it from
`vezham/vx-fe-deployer@timeline`, matching its reusable workflow references.
The registry is public in the current repository; making this repository private
requires a token with read access for source-repository TVA callers.

Publish `vx-deployer` to `timeline` before publishing this refactor in
`vx-fe-deployer`, so the new shared actions/workflow exist when callers run.
Publish the shared `vx-fe-deployer` workflow before updating source-repository
callers to use it directly. Remove old per-app deployer wrappers after their
callers have migrated. Desktop workflows are outside this implementation.

## Validation

In `vx-deployer`, run:

```sh
bash .github/actions/deployment/resolve-web-app/bin/setup.sh
node --test .github/actions/deployment/resolve-web-app/bin/main.test.cjs
node --test .github/actions/deployment/deployment-journal/bin/journal.test.cjs
```

Use actionlint for the modified reusable workflows and dispatchers. Live
deployment requires publishing both repositories and running GitHub Actions.
