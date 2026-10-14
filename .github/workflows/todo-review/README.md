# Web workflow review archive

These 42 files preserve the 21 legacy Firebase app wrappers and helpers exactly.
Their app profiles, credentials, env values and secret-name mappings are now in
[web-apps.yaml](../../config/web-apps.yaml). Existing planned repository/app paths
and the configured Chat Widget regional credentials remain authoritative.

These nested files are inactive reference snapshots. Their historical reusable
workflow paths are preserved for review and cannot be called from this directory.
Use the top-level shared web workflow for new app callers.

Before switching a source caller, complete its repository/path migration and
standard Nx build/deploy-generation targets. Storybook SB previously built the
Storybook project with separate prebuild/build scripts; its planned standalone
app must provide the standard targets before deployment. Optional legacy API
inputs that were unset are kept as empty values for review. The legacy desktop
workflows and TVA implementation are archived separately in
[todo-desktop](../todo-desktop/README.md) for the native desktop rewrite.
