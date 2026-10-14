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
The central promotion dispatcher and unified scheduler also grant Issues write
for journal updates and Actions read for deployment-result metadata. Validation and deployment mint separate source App tokens;
tokens and credential values are never passed as job outputs.

## Workflow display names

Only step names use the QA color prefixes: `🟠 ·` identifies shared action calls;
`🔵 ·` identifies local scripts, inline GitHub scripts and local calls. A second icon
describes the work, such as `🧰` checkout, `🔐` authentication, `🏗️` build,
`🚀` deployment or `🧾` tracking. Use `🔥` for Firebase-specific steps. Workflow,
job and composite action titles keep descriptive names and task icons without
the color prefixes.

Run names identify scheduled execution with `🕒 Scheduled` and manual execution
with `⚡ Trails`, and include the actor. Promotion runs also include app, destination,
Production target when present and source SHA. IDs, artifact names, status contexts
and concurrency groups remain independent of these display labels.

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
is an optional text input on the common promotion dispatcher. For Production,
leave it empty to promote the selected SHA to every configured target of that app.
Apps without a target map still receive one `default` Production deployment. A map
containing both `default` and named targets includes all of them when left empty.
Enter a configured target ID to promote only to that destination.

The dispatcher validates the complete target selection before starting a matrix,
then calls the existing shared deployment workflow once per target. Each retains
its credentials, build values, promotion-order checks, deployment lock, source
tracker row and journal state. Up to five targets run at once, with fail-fast disabled
so one failed target does not cancel the others. The run's overall result still
reports failures. An empty Production target is displayed as `all targets` in the
run name; each deployment job displays its actual target.

Dev, QA and Preview still run one deployment. Leave `PRODUCTION_TARGET` empty for
those environments; region inputs there are rejected. Unknown Production targets,
disabled apps, invalid target settings and destinations omitted from the app's
promotion path fail validation. Schedule-day filtering applies only to scheduled
rebuilds, not manual promotion.

Every target follows the same app `promotion_path`; Production/US and Production/EU
both require the preceding configured stage for the same app and SHA. Source commit
tracking adds a separate row, status context and URL set for each target. The central
state index remains one closed issue per app, with target-specific latest successful
SHA selection. History is grouped into monthly category issues. Existing unqualified Production entries belong only to `default`.
The unified scheduler expands enabled apps across all category groups, including
`apps`, into bounded target batches. Each batch uses the same shared Production flow.

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

## Per-app rebuild schedules

The common `schedule-build.yaml` wakes every day at 05:00 IST. `defaults.schedule`
sets the app cadence; the baseline retains Monday, Thursday and Saturday builds.
An app can replace that cadence independently of category and `promotion_path`:

```yaml
defaults:
  schedule:
    frequency: weekly
    days: [mon, thu, sat]
  # environments, values and secret_values

apps-cdns:
  static-cdn:
    schedule:
      frequency: daily
    # repository, path and credential_secrets

apps:
  books:
    schedule:
      frequency: monthly
      day: 1
    # repository, path and credential_secrets
  demo:
    schedule:
      enabled: false
    # repository, path and credential_secrets
```

These app overrides are examples, not changes to the registered apps. Omit an app's
`schedule` to inherit the default. A full app rule replaces the frequency and its
calendar fields; it does not retain weekly `days` when changing to daily or monthly.
The `enabled` flag inherits independently and defaults to true. An enabled-only
app override changes that flag without replacing the default cadence. Disabling
scheduled rebuilds leaves TVA, manual promotion and promotion dropdowns available.

Weekly rules require unique lowercase weekdays (`sun` through `sat`). Monthly
rules require `day: 1` through `31`; dates absent from a month are skipped, so use
1–28 for a rebuild every month. Rules contain only fields relevant to their frequency.
All of an app's Production targets follow its app schedule and retain their own
latest successful SHAs and build configuration.

Both cron and manual scheduler runs select apps due on the workflow run's creation
date in `Asia/Kolkata`. The resolver reads that timestamp with Actions read permission,
so runner delays, queued runs and reruns retain the original run date. Date selection
occurs before journal discovery and batching. An empty selection skips deployment.
There is no automatic catch-up for a date when GitHub did not create a run. GitHub
schedules can be delayed or dropped; see the [schedule event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
Use manual promotion for an immediate deployment outside an app's schedule.

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

Manual promotion offers enabled registry app IDs in the `promote.yml` dropdown,
then accepts the full source SHA and destination. The dropdown is generated from
this registry; do not maintain app options by hand. After adding, removing or
disabling an app, regenerate and commit the workflow alongside the registry:

```sh
bash ../vx-deployer/.github/actions/deployment/resolve-web-app/bin/setup.sh
node ../vx-deployer/.github/actions/deployment/resolve-web-app/bin/sync-choices.cjs \
  .github/config/web-apps.yaml .github/workflows/promote.yml write
```

`promote-check-choices.yml` checks registry and promotion-workflow changes on pull
requests and pushes to `timeline`. A stale dropdown fails the check. Shared
generation logic lives in `vx-deployer`; adding an app requires no routing job.

## Scheduled Production execution

The common `schedule-build.yaml` discovers due targets across all
seven registry groups and runs one batch at a time. Each batch contains at most
100 targets and runs at most five app/target deployments in parallel, with
`fail-fast: false` and category labels in each deployment name.
It rebuilds that target's latest successful Production SHA from the journal. Targets
without a successful entry are skipped; there is no fallback to another target or
timeline. Set `enabled: false` to exclude an app from manual and scheduled deployment.

The daily wake-up is 05:00 AM IST (`30 23 * * *` UTC), with a manual
trigger that applies the same app schedule filter. Shared defaults retain Mon/Thu/Sat rebuilds. This workflow replaces the six category scheduler
files. Dated temporary CDN test cron entries are removed during consolidation.

## Scheduling 150+ apps

The scheduler remains one entry workflow. Shared batching and validation live in
`vx-deployer`, in `scheduled-web-apps.yml` and `deployment/prepare-scheduled-batch`.
For 150 apps with five targets each, 750 targets become eight batches (seven of
100 and one of 50). The outer matrix runs one batch at a time; the inner matrix
runs five deployments at a time. A workflow concurrency group queues overlapping
scheduled/manual runs, keeping the rebuild cap at five per scheduler run. Manual
promotions and other repository workflows share the account's runner capacity.

Batch validation checks target identity, duplicates, issue numbers, per-batch size,
outer matrix size and serialized output size. More than 256 batches or an output
above the job budget fails with a clear message before execution. Disabled apps are
excluded. The discovery job scans the central issue directory once and attaches
canonical app journal IDs. Apps with no journal at discovery wait until a later run;
there is no fallback to `timeline` or a different app's deployment.

The closed app state issue body stores a current-state index for each environment and
Production target, with latest attempt and latest successful deployment. Monthly category issues retain attempt history in comments. Known journal IDs allow one issue GET to select the SHA;
indexed reads do not scan historical comments. Legacy journals are read once to
bootstrap the index under the per-app journal lock. Regions retain separate state.
A failed or cancelled attempt preserves the latest successful SHA and URLs.

The build job uploads one small public `result.json` artifact, retained for seven
days. Only its numeric ID crosses the job boundary: provider masking can suppress
URLs passed as job outputs. The monthly preparation and state writer jobs check the artifact belongs to this run
and download it by name with a filtered lookup. It never downloads build output or
credentials. Rerunning a failed journal job records the original deployment attempt;
expired metadata requires rerunning the deployment.

State writes run in a separate job, serialized per app. The resolver's bootstrap
job uses the same lock. `queue: max` keeps pending regional writes from cancelling
each other. An append intent and monthly issue number are persisted before writing the history comment; if
an append or final index update is interrupted, the next locked read/write recovers
that intent before exposing a successful SHA. Read-only callers fail on an unfinished
intent instead of attempting repair without write permission. The issue body is
bounded; very large numbers of destinations within one app require splitting that
app's state, while 150 apps with five targets each keep independent small indexes.

Routine rebuilds pass `IS_REBUILD: true`, record `kind: rebuild` in the journal,
and update the current-state index. They do not create source promotion statuses
or modify the promotion comment. TVA and manual promotions keep their existing
tracking. Latest rebuild URLs and times are in the journal; source comments show
TVA and promotion results. Existing promotion-order checks still apply to rebuilds.

Journal/discovery API clients honor primary quota resets and secondary retry-after
responses, with bounded retries. Authorization errors fail immediately. For a large
first-time legacy migration, history bootstrap can wait for API quota, after which
normal reads use the index. Large runs can still take hours, including API quota
waits and runner queues; five deployments is a scheduler cap, not reserved account
capacity. Source repositories still need their build migration,
credentials and GitHub App access before live deployment.

The queue syntax follows [GitHub's concurrency documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
Local actionlint 1.7.12 does not recognize `queue`. Validate those concurrency fields
against the documented schema and use a narrow ignore for that known parser gap;
all other actionlint checks remain enabled. Publish `vx-deployer` first, then the
controller workflow changes in `vx-fe-deployer`, before testing the new scheduler.

## Monthly category history

Read deployment history in `Deployment log | <category> | <YYYY-MM>`, for example
`Deployment log | cdns | 2026-10`. Each entry names the app, environment/target,
source SHA, status, completion time, actor, run and deployment URLs. Dev, QA, Preview
and Production promotions and rebuilds are included; TVA remains on source commits.
Use the automatic `deployment-history:<category>` issue label to find category logs.

The first recorded deployment for a month creates its issue. When a new category
month is created, older open monthly issues for that category close automatically.
Grouping uses UTC deployment completion time; schedule selection still uses IST.
Late entries and journal-only retries go to the original completion month, even
when that issue is closed. A retry of an older month leaves newer months open.

The existing per-app issue is retained as a closed `Deployment state | <app>` index.
Its current-state table links to monthly history, and its earlier comments remain
unchanged. The scheduler continues reading that stable index directly, so monthly
rotation and failures never erase a target's latest successful SHA. Apps receive
this closed state presentation on their next index write. Nothing migrates or
rewrites historical deployment comments.

Monthly issue creation/rotation runs under a short category lock in a separate
preparation job. App index writes and pending recovery keep their existing per-app
lock. Concurrent app comments do not overwrite one another. Durable pending records
include the destination monthly issue; recovery searches older monthly pages if
other apps have appended since an interrupted write. Indexed reads remain constant
in size as monthly history grows. Publish the shared actions/workflow in
`vx-deployer` before the category forwarding change in `vx-fe-deployer`.

## Synced legacy settings and review archives

All 21 legacy Firebase app wrappers and their helpers have registry entries.
Deployment profiles and credential names were checked against the wrappers;
existing planned source repositories, normalized app paths, promotion paths and
Chat Widget's five regional credentials were preserved. App-specific env values
and secret references were carried over before archiving. No secret contents
are stored in the registry.

The 42 legacy web files are under `.github/workflows/todo-review/`. The 32 mock
files are under `.github/workflows/todo/` and still need a separate Vercel migration.
These nested directories are reference archives, not runnable workflows. The
shared `web-app.yml`, `promote.yml`, unified scheduler and desktop workflows
remain at the top level. App source repos still need their planned migration and
caller updates; their files were not changed here.

The unified scheduler reads the app journal directory once, skips apps with no
journal, and passes the known issue number into each target rebuild. Source SHA
selection happens under the existing per-target deployment lock, using the journal
index. Targets with no successful Production history are skipped. The daily wake-up time is 05:00 IST; inherited app rebuilds retain Mon/Thu/Sat. Archived wrappers are not referenced
by the active scheduler.

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
Legacy web wrappers and helpers are retained in `.github/workflows/todo-review/`
for source migration review. Mock workflows are retained in `.github/workflows/todo/`
and are excluded from the Firebase registry. Native desktop workflows remain active.

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
and, for Production, `V_PRODUCTION_TARGET`. The legacy settings are synced;
source-specific build requirements still need review before switching callers:

- Accounts, Business, IAM and HQ API URLs and sandbox flags are synced into app
  `values` and `environments`. Identical settings use shared YAML aliases.
  Chat Widget keeps its regional Production credentials and all five targets;
  non-Production API and widget URLs are synced from the legacy wrapper.
- Books, Playground, Playbook and Home mock/API URL bindings are synced.
  Optional values omitted in the legacy workflow remain empty strings.
- Storybook SB used the Storybook project and `storybook-sb` Firebase config,
  plus a Figma access-token secret, now mapped as
  `V_STORYBOOK_FIGMA_ACCESS_TOKEN: STORYBOOK_SB_TVA_FIGMA_AT`. Its registry entry expects a separate
  `storybook-sb` app with the standard Nx targets and deploy config.
- Chat Widget previously had US/EU/IN/AU Production jobs sharing one credential.
  Its registry now has US/EU/IN/AU/SG targets with separate credential names.
  Those explicit mappings remain unchanged by this sync.

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
Coordinate this archive change with source-repository caller updates. The
shared `vx-fe-deployer` workflow already exists; update old source callers to use
it before publishing removal of their top-level per-app workflow paths. The snapshots in `todo-review/` and `todo/` are inactive reference files;
reusable workflows must remain at the top level to run. Desktop workflows are
outside this implementation.

## Validation

In `vx-deployer`, run:

```sh
bash .github/actions/deployment/resolve-web-app/bin/setup.sh
node --test .github/actions/deployment/resolve-web-app/bin/main.test.cjs
node --test .github/actions/deployment/deployment-journal/bin/journal.test.cjs
```

Use actionlint for the modified reusable workflows and dispatchers. Live
deployment requires publishing both repositories and running GitHub Actions.
