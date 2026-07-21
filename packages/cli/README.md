# @asyncinnovator/hallint-cli

> CLI for hallint — detect security and quality issues in AI-generated code.

[![npm](https://img.shields.io/npm/v/@asyncinnovator/hallint-cli?color=crimson)](https://www.npmjs.com/package/@asyncinnovator/hallint-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Asyncinnovator/hallint/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## Install

```bash
npm install -g @asyncinnovator/hallint-cli
```

Or run without installing:

```bash
npx @asyncinnovator/hallint-cli ./src
```

**Requirements:** Node.js >= 18

---

## Usage

```bash
npx @asyncinnovator/hallint-cli [files] [options]
```

`files` accepts directories, file paths, and glob patterns:

```bash
npx @asyncinnovator/hallint-cli ./src
npx @asyncinnovator/hallint-cli "./src/**/*.ts"
npx @asyncinnovator/hallint-cli ./src/api.ts ./src/auth.ts
```

---

## Options

| Flag | Description | Default |
|---|---|---|
| `--rules` | Rule set: `recommended` or `all` | `recommended` |
| `--min-severity` | Minimum severity: `critical` `high` `medium` `low` `info` | `info` |
| `--no-color` | Disable colored output | off |
| `--help` | Show help | |
| `--version` | Show version | |

---

## Examples

```bash
# Scan a directory
npx @asyncinnovator/hallint-cli ./src

# Only critical and high findings
npx @asyncinnovator/hallint-cli ./src --min-severity high

# Run all available rules
npx @asyncinnovator/hallint-cli ./src --rules all

# Disable color (for CI logs)
npx @asyncinnovator/hallint-cli ./src --no-color

# Glob pattern
npx @asyncinnovator/hallint-cli "./src/**/*.ts" --min-severity high
```

---

## Output

```
hallint scanning ./src...

/path/to/src/api/users.ts
  users.ts:14  CRITICAL  [hardcoded-secret]
  Hardcoded secret detected — API key, token, or password in source code
  > const API_KEY = "sk-abc123defgh456789xyz"
  fix: Move to environment variables: process.env.YOUR_SECRET_NAME

  users.ts:31  HIGH  [missing-auth-check]
  Route handler may be missing authentication middleware
  > router.get("/users", async (req, res) => {
  fix: Add auth middleware: router.get('/route', authenticate, handler), or declare the path in publicRoutes config

  users.ts:45  HIGH  [jwt-in-localstorage]
  JWT or auth token stored in localStorage — vulnerable to XSS token theft
  > localStorage.setItem('token', jwtToken)
  fix: Use httpOnly cookies instead

  users.ts:52  HIGH  [swallowed-error]
  Empty or near-empty catch block — exception is silently discarded
  > } catch (e) {
  fix: Log the error or rethrow it: catch (e) { logger.error(e); throw e }

Summary: 4 issue(s) in 1 file(s) — 18ms
  2 critical
  2 high
```

---

## Inline Suppression

Suppress specific findings without removing code:

```ts
// Suppress all rules on this line
const key = "sk-abc123abc123abc123abc"  // hallint-disable

// Suppress a specific rule
const key = "sk-abc123abc123abc123abc"  // hallint-disable hardcoded-secret

// Suppress next line
// hallint-disable-next-line sql-injection
const q = db.query("SELECT * FROM users WHERE id = " + id)

// Suppress a block
// hallint-disable-block
eval(userInput)
// hallint-enable-block
```

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No issues found |
| `1` | One or more critical or high findings |
| `2` | Unexpected error |

Exit code `1` on critical/high makes hallint suitable as a hard CI gate.

---

## CI — GitHub Actions

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

---

## Links

- [GitHub](https://github.com/Asyncinnovator/hallint)
- [Library package — @asyncinnovator/hallint](https://www.npmjs.com/package/@asyncinnovator/hallint)
- [MIT License](https://github.com/Asyncinnovator/hallint/blob/main/LICENSE)