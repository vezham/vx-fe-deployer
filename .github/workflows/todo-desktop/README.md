# Desktop workflow archive

These six files preserve the legacy desktop deployment and CI implementation for
review before the native desktop rewrite:

- `apps-desktop.yml`: desktop workflow entrypoint.
- `apps-desktop.helper.yml`: shared desktop build and artifact flow.
- `-dc-apps-desktop.suites-one.yml`: Suites One environment deployments.
- `-dc-apps-desktop.suites-hq.yml`: Suites HQ environment deployments.
- `-dc-apps-desktop.apps-messenger.yml`: Messenger environment deployments.
- `tva.yml`: legacy desktop dependency setup and formatting CI.

These nested workflows are inactive reference snapshots. Their original reusable
workflow paths and implementation are preserved for review; they cannot be called
from this directory. Desktop source callers need the replacement workflow before
resuming deployment. Shared desktop actions remain in `vx-deployer` for the rewrite.

The web registry, category promotion workflows and scheduled web rebuilds remain
at the top level and do not call these desktop workflows.
