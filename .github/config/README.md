# Web app deployments

`web-apps.yaml` is the common registry for all Firebase/Nx web applications. It stores
promotion repository paths, category groups, environment profiles and
credential **secret names**. Secret values stay in GitHub Actions secrets. YAML
comments can document app-specific choices; numeric and boolean values remain typed.
The YAML language server directive links to `../../vx/schemas/web-apps.json`
for editor validation and autocomplete. `schema: 2` identifies the grouped registry format.

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

## Category groups

Keep one registry with shared `defaults` and top-level app groups. The group
determines the scheduler category: `apps` maps to `apps`, `apps-cdns` to `cdns`,
and similarly for the other groups. App entries have no `category` field.
Promotion lookup and dropdown generation search every group by globally unique
app ID. Duplicate IDs, including disabled entries, are rejected.

```yaml
schema: 2
defaults:
  environments: # Shared build profiles
    # ...
apps:
  books:
    # repository, path, credential_secrets
  demo:
    # repository, path, credential_secrets
apps-cdns:
  static-cdn:
    # repository, path, credential_secrets
apps-internals:
  home:
    # repository, path, credential_secrets
```

## Workflow ownership

Each app needs one source-repository trigger and one registry entry. The trigger
calls `vezham/vx-fe-deployer/.github/workflows/web-app.yml@timeline` directly,
passing its app ID and `CALLER`. The shared workflow loads app settings,
serializes each app/environment/Production-target deployment, and calls the shared source
preparation action and build/deploy workflow in `vx-deployer`. App-specific
deployer wrappers, helper and promotion workflows are unnecessary.

The shared execution still builds with destination-specific `.env` values.
It deploys both Firebase preview and live channels, updates the source commit
tracker, and journals completed Dev/QA/Preview/Production attempts centrally.
TVA stays in the source commit tracker only. Promotion defaults to
TVA → Dev → QA → Preview → Production for the same app and full SHA. Apps may
shorten that path explicitly, independently of their category.

TVA inherits Contents/Commit statuses write permissions from its source caller.
The central promotion dispatcher and category scheduler also grant Issues write
for journal updates. Validation and deployment mint separate source App tokens;
tokens and credential values are never passed as job outputs.

## TVA from source repositories and forks

Automatic TVA builds derive the checkout repository from the calling workflow's
`github.repository`. An app repo and its fork can both pass `APP: demo` and
`CALLER: timeline`; each builds its own `timeline` branch and records deployment
statuses and the tracker comment on its own source commit. No repository input or
duplicate registry app entry is needed. App IDs identify shared app profiles.

Both repositories use the configured app path, TVA profile and secret **names**.
Each caller provides its own Actions secret values: for example,
`PLAYGROUND_DOCS_TVA_GCP_SA_KEY` in each repo can contain credentials for that
repo's TVA Firebase project. Referenced build secrets likewise come from that
caller. Configure these secrets in a fork before running its TVA workflow.
Public `values` and `secret_values` mappings are shared by app ID; this change
does not introduce per-repository public-value overrides.

The existing caller shape stays the same:

```yaml
deploy:
  permissions:
    contents: write
    statuses: write
  uses: vezham/vx-fe-deployer/.github/workflows/web-app.yml@timeline
  secrets: inherit
  with:
    APP: demo
    CALLER: ${{ github.ref_name }}
```

TVA checkout and tracking use the caller's built-in token because the source is
that repository. Concurrency already includes the caller repository, so builds
from separate forks have separate locks. TVA remains limited to the existing
`timeline` branch (and the legacy `-scheduler` alias for it).

Manual promotion and scheduled Production source selection stay as they are:
`repository` in the registry identifies the source. Fork promotion selection is
outside this change.

## Per-app promotion paths

Add an optional `promotion_path` to any app entry to skip stages. Omission keeps
`[tva, dev, qa, preview, production]`. Category does not affect this policy.

```yaml
apps-cdns:
  static-cdn:
    promotion_path: [tva, preview, production]
    # repository, path, credential_secrets
  another-cdn:
    promotion_path: [tva, production]
    # repository, path, credential_secrets
```

These are configuration examples; existing entries keep the full order until an
explicit override is added. Every path must begin with TVA, end with Production
and follow the standard stage order without duplicates. Each destination requires
a successful deployment of the preceding included stage for the same app and SHA.
For the first example, Preview requires TVA and Production requires Preview; for
the second, Production requires TVA. Destinations omitted from the path fail
validation even if selected in the shared environment dropdown.

Manual promotions and scheduled Production rebuilds use the same path. The run
summary records the selected path and prerequisite deployment. Skipped stages
are never marked successful in source tracking or the journal. Keep non-Production credential mappings in the registry; Production needs either
its single credential mapping or credentials for each named target. Stage selection
controls which environments can be deployed. Update the shared `vx-deployer` actions
before publishing workflow wiring or app overrides in `vx-fe-deployer`.

## App, environment and Production-target configuration

Use `values` for public build values and `secret_values` for variable-to-secret-name
mappings.
Each is optional at `defaults`, app, environment profile and Production-target levels.
The merge order is defaults → app → default environment → app environment → target.
Values merge by variable name; a later public value replaces an earlier secret reference
and a later secret reference replaces an earlier public value. A variable cannot be
both kinds in the same layer. Core `V_APP_*`, `V_RELEASE_CHANNEL`, `V_IS_DEBUG` and
`V_PRODUCTION_TARGET` settings are managed by the workflow and cannot be overridden.

Without `production_targets`, an app has one `default` Production deployment using
`credential_secrets.production`. Named targets are specific to that app; any lowercase
ID made of letters, digits and hyphens is allowed. There is no common region list.
Each target requires its own `credential_secret` name and can override public values,
secret references, build environment, release channel and debug mode.
A shared credential can be referenced by multiple targets when that is intentional.

Example fragment for a regional app (existing registry entries are not changed):

```yaml
apps-platforms:
  academy:
    repository: vezham/vx-fe-apps-platforms
    path: apps-platforms/academy
    credential_secrets:
      tva: ACADEMY_TVA_GCP_SA_KEY
      dev: ACADEMY_DEV_GCP_SA_KEY
      qa: ACADEMY_QA_GCP_SA_KEY
      preview: ACADEMY_PREVIEW_GCP_SA_KEY
    values:
      V_FEATURE_ENABLED: true
    environments:
      dev:
        values:
          V_API_URL: https://dev.example.com
        secret_values:
          V_API_KEY: ACADEMY_DEV_API_KEY
    production_targets:
      us:
        credential_secret: ACADEMY_US_LIVE_GCP_SA_KEY
        values:
          V_API_URL: https://us.example.com
        secret_values:
          V_API_KEY: ACADEMY_US_API_KEY
      eu:
        credential_secret: ACADEMY_EU_LIVE_GCP_SA_KEY
        values:
          V_API_URL: https://eu.example.com
        secret_values:
          V_API_KEY: ACADEMY_EU_API_KEY
```

Other apps can use different targets or omit the map entirely. `PRODUCTION_TARGET`
is a text input on the common dispatcher; enter a target listed for the selected app.
Leave it empty for single Production, or when the app explicitly defines a `default`
target. Named-only maps require an explicit selection. Unknown targets and targets
passed to Dev, QA, Preview or TVA are rejected before deployment.

Every target follows the same app `promotion_path`; Production/US and Production/EU
both require the preceding configured stage for the same app and SHA. Source commit
tracking adds a separate row, status context and URL set for each target. The central
issue remains one journal per app, with target-specific entries and latest successful
SHA selection. Existing unqualified Production entries belong only to `default`.
The CDN scheduler expands each app's actual target list into a deployment matrix;
other category schedulers retain their previous implementations until migration.

The resolver emits only public values and secret **names**. The caller forwards its
available Actions secrets through a reusable-workflow secret input. The build action
selects and masks referenced secrets, fails on missing values, writes `.env` after
checkout, and exports the variables for build steps. The generated file uses owner-only
permissions. Secrets are never written to registry outputs, status comments or the
journal. Values included in browser bundles are visible to browser users, even when
CI obtains them from Actions secrets; this does not create a server runtime.

The existing app `.env` is preserved and resolved settings are appended; exported
process variables take precedence during the build. Every environment and Production
target uses `vx/deploy/firebase/<app path>.json`. It is copied to root `firebase.json`
after deploy-config generation. The selected credential identifies the Firebase project.
Each Production target rebuilds the selected SHA with its configuration.

## Add an app

1. Add an app under its top-level group (`apps`, `apps-cdns`, `apps-internals`,
   `apps-platforms`, `apps-pods`, `apps-suites` or `apps-widgets`), with
   `repository`, `path` and `credential_secrets` mappings (or per-target
   Production credentials). App IDs use
   lowercase letters, digits and hyphens and must be unique across all groups. The app must have Nx build/deploy-generation targets and a Firebase
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
each app/target's latest successful Production SHA independently. Targets without
a successful journal entry are skipped, with no fallback to another target or timeline. Set `enabled: false` to exclude
an app from manual and scheduled deployment. Other category schedulers retain
their existing implementations until migrated.

## Migration targets

The registry includes the existing Static CDN plus 21 Firebase web app migration
targets derived from the old wrappers. Entries use planned `vx-fe-apps-*` source
repositories and hyphenated app IDs and directories. Books and Demo use
`vx-fe-apps` with `apps/books` and `apps/demo`; Home uses `vx-fe-apps-internals`
with `apps-internals/home`. These target repositories and app directories still
need the source-side migration before their callers use the shared workflow.

Existing per-environment credential secret names are preserved, including shared
TVA credentials in the playground workflows and the Home-to-Playground mappings.
Old `live` credentials map to `production`. The Static CDN mapping is unchanged.
Old wrappers and category schedulers remain available during source migration;
native desktop and Vercel mock apps are excluded.

| Old workflow / app                        | Registry app ID   | Planned app path                 |
| ----------------------------------------- | ----------------- | -------------------------------- |
| `apps-books.yml` / `books`                | `books`           | `apps/books`                     |
| `play-demo.yml` / `demo`                  | `demo`            | `apps/demo`                      |
| `vezham-home.yml` / `home`                | `home`            | `apps-internals/home`            |
| `playbook.yml` / `playbook`               | `playbook`        | `apps-internals/playbook`        |
| `playground.yml` / `playground`           | `playground`      | `apps-internals/playground`      |
| `playground-app.yml` / `playground-app`   | `playground-app`  | `apps-internals/playground-app`  |
| `playground-cdn.yml` / `playground-cdn`   | `playground-cdn`  | `apps-internals/playground-cdn`  |
| `playground-docs.yml` / `playground-docs` | `playground-docs` | `apps-internals/playground-docs` |
| `storybook.yml` / `storybook`             | `storybook`       | `apps-internals/storybook`       |
| `storybook-sb.yml` / `storybook-sb`       | `storybook-sb`    | `apps-internals/storybook-sb`    |
| `academy.yml` / `academy`                 | `academy`         | `apps-platforms/academy`         |
| `blogs.yml` / `blogs`                     | `blogs`           | `apps-platforms/blogs`           |
| `help_center.yml` / `help_center`         | `help-center`     | `apps-platforms/help-center`     |
| `policy_center.yml` / `policy_center`     | `policy-center`   | `apps-platforms/policy-center`   |
| `whats_new.yml` / `whats_new`             | `whats-new`       | `apps-platforms/whats-new`       |
| `accounts.yml` / `accounts`               | `accounts`        | `apps-pods/accounts`             |
| `business.yml` / `business`               | `business`        | `apps-pods/business`             |
| `iam.yml` / `iam`                         | `iam`             | `apps-pods/iam`                  |
| `hq.yml` / `hq`                           | `hq`              | `apps-suites/hq`                 |
| `one.yml` / `one`                         | `one`             | `apps-suites/one`                |
| `chat_widget.yml` / `chat_widget`         | `chat-widget`     | `apps-widgets/chat-widget`       |

The shared flow sets `V_APP_NAME`, `V_APP_ENV`, `V_RELEASE_CHANNEL`, `V_IS_DEBUG`
and, for Production, `V_PRODUCTION_TARGET`. Configure these legacy differences
using the per-app fields described below before switching source callers:

- Accounts, Business, IAM and HQ previously passed API, IAM, account, business,
  HQ and sandbox URLs and flags. Chat Widget passed API and widget URLs.
- Playground, Playbook and Home previously passed mock/API URL inputs.
- Storybook SB used the Storybook project and `storybook-sb` Firebase config,
  plus a Figma access-token secret. Its new registry entry expects a separate
  `storybook-sb` app with the standard Nx targets and deploy config.
- Chat Widget had US/EU/IN/AU production jobs using one credential secret.
  The baseline registry still records one Production deployment. Add explicit
  `production_targets` before replacing those regional jobs.

Each migrated source app must provide a Node runtime declaration in its app or
workspace `package.json`, a pnpm package-manager declaration, standard Nx build
and deployment-generation targets, and `vx/deploy/firebase/<app path>.json`.
Install source App access and pass `APP: <registry ID>` with `CALLER: timeline`
from its caller. The first configured promotion stage requires a successful TVA
deployment for the same app and SHA.

## Registry version and publishing

Central runs read the registry at the caller commit SHA. TVA reads it from
`vezham/vx-fe-deployer@timeline`, matching its reusable workflow references.
The registry is public in the current repository; making this repository private
requires a token with read access for source-repository TVA callers.

The grouped `schema: 2` format is the baseline. The resolver rejects other
registry versions.

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
