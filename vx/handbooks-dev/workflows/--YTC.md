# CI Style Guide — Emoji Grammar

This repository follows a structured emoji grammar in GitHub Actions workflows to make CI logs readable, scannable, and self-describing.

Emojis are not decoration — they communicate **execution semantics**.

---

## Legend

### Execution Type

| Emoji | Meaning                               |
| ----- | ------------------------------------- |
| 🟠    | Composite / external action (`uses:`) |
| 🔵    | Native shell / repo script (`run:`)   |

---

### Function Markers

| Emoji | Meaning                        |
| ----- | ------------------------------ |
| 🧰    | Checkout / repository handling |
| 👤    | Git identity / user setup      |
| 🧩    | Debugging / inspection         |
| 🪄    | Branch / version manipulation  |
| 🔁    | Retry / rebase logic           |
| 🔗    | Remote / connection            |
| 🧹    | Cleanup / skip logic           |
| 📤    | Push / upload                  |
| 🚀    | Release / PR / publish         |
| ⛭     | Post-ops / automation          |
| 🧾    | Summary / reporting            |
| 🎨    | Formatting / code style        |
| 🧠    | Typecheck                      |
| 🧪    | Testing                        |
| 🏗️    | Build                          |
| 🎭    | E2E / Playwright               |
| 📦    | Packaging                      |
| 🔐    | Auth / credentials             |
| ⚙️    | Infra / system                 |
| 🕒    | Scheduled run                  |
| ⚡    | Manual / workflow_dispatch     |
| 🔄    | Sync / mirror                  |
| 🚨    | Failure / exit                 |

---

## Naming Format

### Standard Pattern

# CI Style Pack

## CI_STYLE_LITE.md

```
EXECUTION TYPE
🟠 composite `uses:`
🔵 native `run:`

FORMAT
<type> · <icon> Label • Detail

EXAMPLES
🟠 · 🧰 Checkout • repo@branch
🔵 · 🏗️ Build
🟠 · ⛭ NX • Post Ops

RULES
- 🟠 only with `uses:`
- 🔵 only with `run:`
- Emoji is semantic, not decorative
```

---

## VSCode Snippets (ci-snippets.code-snippets)

```json
{
  "ci-composite": {
    "prefix": "ci:use",
    "body": [
      "- name: 🟠 · ${1:icon} ${2:Label} • ${3:Detail}",
      "  uses: ${4:action}@${5:ref}"
    ]
  },
  "ci-native": {
    "prefix": "ci:run",
    "body": ["- name: 🔵 · ${1:icon} ${2:Label}", "  run: ${3:command}"]
  }
}
```

---

## Regex Lint Hints

```regex
^🟠 · .*\n\s+uses:
^🔵 · .*\n\s+run:
```

---

## README Legend Snippet

```md
### CI Emoji Legend

🟠 Composite Action
🔵 Native Script
🧰 Checkout ⛭ Post Ops 🏗️ Build 🧪 Test 🧾 Summary
```

---

## Enforcement Checklist

- [ ] Every step starts with 🟠 or 🔵
- [ ] No mixed semantics
- [ ] Consistent separators
- [ ] No decorative emojis
