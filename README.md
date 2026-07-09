```
██╗  ██╗ █████╗ ██╗     ██╗     ██╗███╗   ██╗████████╗
██║  ██║██╔══██╗██║     ██║     ██║████╗  ██║╚══██╔══╝
███████║███████║██║     ██║     ██║██╔██╗ ██║   ██║   
██╔══██║██╔══██║██║     ██║     ██║██║╚██╗██║   ██║   
██║  ██║██║  ██║███████╗███████╗██║██║ ╚████║   ██║   
╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝   ╚═╝   
```

**Static analysis for AI-generated code.**
Catch the security holes Artificial Intelligence leave behind — before they reach production.

[![npm](https://img.shields.io/npm/v/@asyncinnovator/hallint?color=crimson&label=core)](https://www.npmjs.com/package/@asyncinnovator/hallint)
[![npm](https://img.shields.io/npm/v/@asyncinnovator/hallint-cli?color=crimson&label=cli)](https://www.npmjs.com/package/@asyncinnovator/hallint-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

AI coding assistants (Copilot, Cursor, etc.) are fast, but they consistently introduce the same classes of bugs: hardcoded secrets, SQL injection, missing auth, unsafe eval. hallint catches them.

---

## Table of Contents

- [Installation](#installation)
- [CLI Usage](#cli-usage)
- [Library Usage](#library-usage)
- [Rules](#rules)
- [Configuration](#configuration)
- [CI Integration](#ci-integration)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
npm install @asyncinnovator/hallint
```

Or run without installing:

```bash
npx @asyncinnovator/hallint-cli ./src
```

**Requirements:** Node.js >= 18

---

## CLI Usage

### Basic scan

```bash
npx @asyncinnovator/hallint-cli ./src
```

### Scan with glob pattern

```bash
npx @asyncinnovator/hallint-cli "./src/**/*.ts"
```

### Only show high and critical issues

```bash
npx @asyncinnovator/hallint-cli ./src --min-severity high
```

### Run all rules

```bash
npx @asyncinnovator/hallint-cli ./src --rules all
```

### Disable color output (for logs/CI)

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

### Basic scan

```ts
import { scan } from '@asyncinnovator/hallint'

const result = await scan({
  files: ['./src/**/*.ts'],
})

result.findings.forEach(f => {
  console.log(`${f.severity} [${f.ruleId}] ${f.filePath}:${f.line}`)
  console.log(`  ${f.message}`)
  console.log(`  fix: ${f.fix}`)
})
```

### With options

```ts
const result = await scan({
  files: ['./src/**/*.ts'],
  rules: 'recommended',
  minSeverity: 'high',
  ignore: ['**/node_modules/**', '**/dist/**'],
})
```

### Scan a string directly (no file system)

```ts
import { scanSource } from '@asyncinnovator/hallint'

const source = `const apiKey = "sk-abc123def456ghi789jk"`

const findings = scanSource(source, 'example.ts')

findings.forEach(f => console.log(f.ruleId, f.message))
```

### ScanResult shape

```ts
{
  findings: Finding[]       // all issues found
  scannedFiles: string[]    // list of files scanned
  durationMs: number        // time taken
  summary: {                // count per severity
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
}
```

### Finding shape

```ts
{
  ruleId: string        // e.g. "hardcoded-secret"
  severity: string      // "critical" | "high" | "medium" | "low" | "info"
  message: string       // human-readable description
  fix: string           // suggested fix
  filePath: string      // absolute path to the file
  line: number          // line number
  snippet: string       // the offending line of code
}
```

---

## Rules

| Rule | Severity | What it catches |
|---|---|---|
| `hardcoded-secret` | critical | API keys, tokens, passwords in source code |
| `sql-injection` | critical | User input interpolated into SQL queries |
| `unsafe-eval` | critical | `eval()` or `new Function()` with dynamic input |
| `missing-auth-check` | high | Route handlers with no auth middleware |
| `xss-innerHTML` | high | Unsanitized strings assigned to `innerHTML` |
| `permissive-cors` | high | `cors({ origin: '*' })` in route handlers |
| `async-no-catch` | medium | `async` functions with no `try/catch` or `.catch()` |
| `http-not-https` | medium | Hardcoded `http://` URLs in fetch or axios calls |

---

## Configuration

Create a `hallint.config.ts` at your project root:

```ts
import type { ScanConfig } from '@asyncinnovator/hallint'

export default {
  rules: 'recommended',
  minSeverity: 'medium',
  ignore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.test.ts',
  ],
} satisfies Omit<ScanConfig, 'files'>
```

---

## CI Integration

### GitHub Actions

Add hallint as a PR gate — it exits with code `1` on any critical or high finding:

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

Install [husky](https://github.com/typicode/husky):

```bash
npm install --save-dev husky
npx husky init
echo "npx @asyncinnovator/hallint-cli ./src --min-severity high" > .husky/pre-commit
```

---

## Contributing

Contributions are welcome. Each rule is a single file (~30 lines) with a `bad.ts` / `good.ts` fixture — a new rule is a good first contribution.

1. Fork the repo
2. Create a branch: `git checkout -b feat/rule-your-rule-name`
3. Add your rule in `packages/core/src/rules/index.ts`
4. Add fixtures in `packages/core/tests/fixtures/your-rule-name/`
5. Run tests: `npm test`
6. Open a PR

Issues labeled **good first issue** are pre-scoped and ready to pick up.

---

## License

MIT — free to use in personal and commercial projects.
