# @asyncinnovator/hallint-cli

> CLI for hallint — detect security and quality issues in AI-generated code.

[![npm](https://img.shields.io/npm/v/@asyncinnovator/hallint-cli?color=crimson)](https://www.npmjs.com/package/@asyncinnovator/hallint-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Asyncinnovator/hallint/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## Install

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
  fix: Add auth middleware: router.get('/route', authenticate, handler)

Summary: 2 issue(s) in 1 file(s) — 18ms
  2 critical
  1 high
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

## CI — Pre-commit hook

Install [husky](https://github.com/typicode/husky):

```bash
npm install --save-dev husky
npx husky init
echo "npx @asyncinnovator/hallint-cli ./src --min-severity high" > .husky/pre-commit
```

---

## Links

- [GitHub](https://github.com/Asyncinnovator/hallint)
- [Library package — @asyncinnovator/hallint](https://www.npmjs.com/package/@asyncinnovator/hallint)
- [MIT License](https://github.com/Asyncinnovator/hallint/blob/main/LICENSE)