```
██╗  ██╗ █████╗ ██╗     ██╗     ██╗███╗   ██╗████████╗
██║  ██║██╔══██╗██║     ██║     ██║████╗  ██║╚══██╔══╝
███████║███████║██║     ██║     ██║██╔██╗ ██║   ██║
██╔══██║██╔══██║██║     ██║     ██║██║╚██╗██║   ██║
██║  ██║██║  ██║███████╗███████╗██║██║ ╚████║   ██║
╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝   ╚═╝
```

**Static analysis for AI-generated code.** Catch the security vulnerabilities that Copilot, Cursor, and other AI coding assistants consistently leave behind — before they reach production.

[![npm](https://img.shields.io/npm/v/@asyncinnovator/hallint?color=crimson&label=core)](https://www.npmjs.com/package/@asyncinnovator/hallint)
[![npm](https://img.shields.io/npm/v/@asyncinnovator/hallint-cli?color=crimson&label=cli)](https://www.npmjs.com/package/@asyncinnovator/hallint-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Asyncinnovator/hallint/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![CI](https://github.com/Asyncinnovator/hallint/actions/workflows/ci.yml/badge.svg)](https://github.com/Asyncinnovator/hallint/actions)

---

AI coding assistants are fast, but they repeatedly introduce the same classes of bugs: hardcoded secrets, SQL injection, missing authentication, unsafe eval. Existing linters were built for human-written code and don't target these patterns. hallint does.

---

## Table of Contents

- [Why hallint](#why-hallint)
- [Installation](#installation)
  - [Command not found?](#command-not-found)
- [CLI Usage](#cli-usage)
- [Library Usage](#library-usage)
- [Rules](#rules)
- [Inline Suppression](#inline-suppression)
- [Public Route Markers](#public-route-markers)
- [Custom Rules](#custom-rules)
- [CI Integration](#ci-integration)
- [Contributing](#contributing)
- [License](#license)

---

## Why hallint

Standard linters (ESLint, Pylint) catch style violations and common logic errors. They were not designed for the failure modes of AI code generation:

- **False-confidence patterns** — auth middleware wired up incorrectly but looking correct at a glance
- **Context blindness** — AI completes a function without knowing what the surrounding architecture expects
- **Hardcoded credentials** — the most common and fastest-shipped AI mistake

hallint targets these patterns specifically, with rules tuned to what AI assistants actually get wrong.

---

## Installation

```bash
# Global install — enables the `hallint` command in any terminal
npm install -g @asyncinnovator/hallint-cli

# Core library — import in your own tooling
npm install @asyncinnovator/hallint

# Run without installing
npx @asyncinnovator/hallint-cli ./src
```

**Requirements:** Node.js >= 18

### Command not found?

If `hallint ./src` throws `command not found` or a PowerShell `CommandNotFoundException`, the CLI binary isn't on your PATH. This happens when you install locally instead of globally. Fix:

| Approach | Command |
|---|---|
| Global install | `npm install -g @asyncinnovator/hallint-cli` |
| npx (no install) | `npx @asyncinnovator/hallint-cli ./src` |
| npm script | add `"lint:ai": "hallint ./src"` to `package.json` scripts, run `npm run lint:ai` |
| Local bin (Windows) | `.\node_modules\.bin\hallint .\src` |

The global install is the simplest fix if you want `hallint` as a standalone command.

---

## CLI Usage

### Basic scan

```bash
hallint ./src
```

**Example output:**

```
hallint scanning ./src...
src/routes/user.ts
  src/routes/user.ts:4 CRITICAL [hardcoded-secret]
  Hardcoded secret detected — API key, token, or password in source code
  > const apiKey = "sk-abc123def456ghi789jkl"
  fix: Move to environment variables: process.env.YOUR_SECRET_NAME
src/db/queries.ts
  src/db/queries.ts:12 CRITICAL [sql-injection]
  Possible SQL injection — user input directly concatenated or interpolated into a query string
  > const result = await db.query("SELECT * FROM users WHERE id = " + req.params.id)
  fix: Use parameterised queries: db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
src/routes/admin.ts
  src/routes/admin.ts:7 HIGH [missing-auth-check]
  Route handler may be missing authentication middleware
  > router.post('/admin/delete', async (req, res) => {
  fix: Add auth middleware: router.get('/route', authenticate, handler), or mark intentionally public routes with // public
src/utils/sandbox.ts
  src/utils/sandbox.ts:3 MEDIUM [async-no-catch]
  async function has no error handling — unhandled rejections can crash the process
  > const fetchUser = async (id) => {
  fix: Wrap await calls in try/catch or add a .catch() handler.
Summary: 4 issue(s) in 3 file(s) — 58ms
  2 critical
  1 high
  1 medium
```

---

### Scan with glob pattern

```bash
npx @asyncinnovator/hallint-cli "./src/**/*.ts"
```

### Only show high and critical issues

```bash
npx @asyncinnovator/hallint-cli ./src --min-severity high
```

### Run all rules (includes noisier heuristic rules)

```bash
npx @asyncinnovator/hallint-cli ./src --rules all
```

### Disable color output (for logs / CI)

```bash
npx @asyncinnovator/hallint-cli ./src --no-color
```

### Options

| Option | Description | Default |
|---|---|---|
| `--rules` | Rule set: `recommended` or `all` | `recommended` |
| `--min-severity` | Minimum severity: `critical` `high` `medium` `low` `info` | `info` |
| `--no-color` | Disable colored output | off |
| `--help` | Show help | |
| `--version` | Show version | |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | No issues found |
| `1` | One or more critical or high findings |
| `2` | Unexpected error |

---

## Library Usage

### Scan files

```ts
import { scan } from '@asyncinnovator/hallint'

const result = await scan({
  files: ['./src/**/*.ts'],
  rules: 'recommended',
  minSeverity: 'high',
  ignore: ['**/node_modules/**', '**/dist/**'],
})

result.findings.forEach(f => {
  console.log(`[${f.severity}] ${f.ruleId} — ${f.filePath}:${f.line}`)
  console.log(`  ${f.message}`)
  console.log(`  fix: ${f.fix}`)
})

console.log(result.summary)
// { critical: 2, high: 1, medium: 1, low: 0, info: 0 }
```

### Scan a string in memory

Useful for editor integrations, build plugins, or tests:

```ts
import { scanSource } from '@asyncinnovator/hallint'

const findings = scanSource(
  `const apiKey = "sk-abc123def456ghi789jkl"`,
  'virtual.ts'
)

console.log(findings)
// [
//   {
//     ruleId: 'hardcoded-secret',
//     severity: 'critical',
//     message: 'Hardcoded secret detected — API key, token, or password in source code',
//     fix: 'Move to environment variables: process.env.YOUR_SECRET_NAME',
//     filePath: 'virtual.ts',
//     line: 1,
//     snippet: 'const apiKey = "sk-abc123def456ghi789jkl"'
//   }
// ]
```

### ScanResult

```ts
{
  findings:     Finding[]
  scannedFiles: string[]
  durationMs:   number
  summary:      Record<'critical' | 'high' | 'medium' | 'low' | 'info', number>
}
```

### Finding

```ts
{
  ruleId:   string   // e.g. "hardcoded-secret"
  severity: string   // "critical" | "high" | "medium" | "low" | "info"
  message:  string
  fix?:     string
  filePath: string
  line:     number
  snippet?: string
}
```

---

## Rules

| Rule | Severity | What it catches |
|---|---|---|
| `hardcoded-secret` | critical | API keys, tokens, and known token prefixes (`ghp_`, `sk-`, `AKIA`, `xoxb-`, and more) |
| `sql-injection` | critical | User input directly concatenated or interpolated into a query string |
| `unsafe-eval` | critical | `eval()` or `new Function()` with dynamic input |
| `missing-auth-check` | high | Route handlers with no auth middleware |
| `xss-innerHTML` | high | Unsanitized strings assigned to `.innerHTML` |
| `permissive-cors` | high | `cors({ origin: '*' })` in route handlers |
| `async-no-catch` | medium | `async` functions with no `try/catch` or `.catch()` — in `--rules all` only |
| `http-not-https` | medium | Hardcoded `http://` URLs in fetch or axios calls |

### Examples

**hardcoded-secret** — catches both assignment-style and direct function call patterns:

```ts
// ✖ detected — assignment style
const apiKey = "ghp_abc123def456ghi789jklmno"

// ✖ detected — passed directly to a function (common AI pattern)
authenticate("sk-abc123def456ghi789jklmno0123456789")

// ✔ not flagged — environment variable
const apiKey = process.env.GITHUB_TOKEN
```

**missing-auth-check** — flags unprotected route handlers:

```ts
// ✖ detected — no auth middleware
router.post('/admin/delete', async (req, res) => {
  await db.query('DELETE FROM users WHERE id = $1', [req.body.id])
  res.sendStatus(200)
})

// ✔ not flagged — auth middleware present
router.post('/admin/delete', authenticate, async (req, res) => {
  await db.query('DELETE FROM users WHERE id = $1', [req.body.id])
  res.sendStatus(200)
})
```

**sql-injection** — catches template literal and string concatenation patterns:

```ts
// ✖ detected — template literal interpolation
const result = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`)

// ✖ detected — string concatenation
const result = await db.query("SELECT * FROM users WHERE name = '" + req.body.name + "'")

// ✔ not flagged — parameterised query
const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
```

---

## Public Route Markers

Routes intentionally exposed without authentication can be marked to suppress `missing-auth-check`:

```ts
// public
app.get('/health', (_req, res) => res.send('ok'))

// hallint-public
router.get('/status', (_req, res) => res.json({ status: 'up' }))

router.post('/webhook', /* hallint-public */ async (req, res) => {
  res.sendStatus(204)
})
```

All three marker styles are supported. The marker can appear on the line above the route or inline on the same line.

---

## Custom Rules

```ts
import type { Rule } from '@asyncinnovator/hallint'

const noConsoleLog: Rule = {
  id: 'no-console-log',
  severity: 'low',
  languages: ['js', 'ts'],
  layer: 'regex',
  pattern: /\bconsole\.log\s*\(/,
  message: 'console.log left in production code',
  fix: 'Remove or replace with a structured logger.',
}

await scan({ files: './src', rules: [noConsoleLog] })
```

For rules that need multi-line context or structured detection, use `match()` instead of `pattern`:

```ts
const noEmptyPromiseCatch: Rule = {
  id: 'no-empty-catch',
  severity: 'medium',
  languages: ['js', 'ts'],
  layer: 'ast',
  message: 'Empty catch block swallows errors silently',
  fix: 'Log or rethrow the error in the catch block.',
  match(source, _filePath) {
    const matches = []
    const lines = source.split('\n')
    lines.forEach((line, i) => {
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line))
        matches.push({ line: i + 1, snippet: line.trim() })
    })
    return matches
  },
}
```

---

## CI Integration

### GitHub Actions

hallint exits with code `1` on any critical or high finding, making it a natural PR gate:

```yaml
name: hallint

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  hallint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx @asyncinnovator/hallint-cli ./src --min-severity high
```

### Pre-commit hook

```bash
npm install --save-dev husky
npx husky init
echo "npx @asyncinnovator/hallint-cli ./src --min-severity high" > .husky/pre-commit
```

---

## Contributing

Each rule is a single file (~30–50 lines) with a `bad.ts` and `good.ts` fixture. Adding a new rule is a self-contained contribution.

1. Fork the repo
2. `git checkout -b feat/rule-your-rule-name`
3. Add your rule in `packages/core/src/rules/index.ts`
4. Add fixtures in `packages/core/tests/fixtures/your-rule-name/`
5. `npm test`
6. Open a PR

Issues labeled **good first issue** are pre-scoped and ready to pick up.

---

## License

MIT — free to use in personal and commercial projects.