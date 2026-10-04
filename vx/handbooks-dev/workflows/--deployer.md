review & rate this workflow

- uses: actions/cache@v3
  with:
  path: ~/.pnpm-store
  key: pnpm-${{ hashFiles('pnpm-lock.yaml') }}

- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
  path: |
  ~/.pnpm-store
  node_modules
  .nx/cache
  key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}
  restore-keys: |
  ${{ runner.os }}-pnpm-

---

🧪 QA •
🚀 Release •

| Workflow | Badge |
| -------- | ----- |
| QA       | 🧪    |
| Release  | 🚀    |
| Deploy   | 🌐    |
| Build    | 🏗️    |
| Types    | 🧠    |
| Lint     | 🧹    |
| Prettier | 🎨    |
| Tests    | 🧪    |
| E2E      | 🎭    |
| Nightly  | 🌙    |
| Docs     | 📚    |
| AI-Fix   | 🤖    |

---

| Emoji | Meaning                               |
| ----- | ------------------------------------- |
| 🟠    | Composite / external action (`uses:`) |
| 🔵    | Inline script / native logic (`run:`) |
| ⛭     | Post-op / automation                  |
| 🧰    | Repo / Git                            |
| 🧩    | Setup                                 |
| 🪄    | Branch / magic                        |
| 🔁    | Retry / rebase                        |
| 📤    | Push                                  |
| 🚀    | PR / publish                          |
| 🧾    | Summary                               |
