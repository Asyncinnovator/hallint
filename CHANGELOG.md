# Changelog

All notable changes to hallint are documented here.
 
hallint is a monorepo with two independently versioned packages:
- `@asyncinnovator/hallint` — core library (rules, scanner, types)
- `@asyncinnovator/hallint-cli` — CLI wrapper around the core
Each GitHub release tag (e.g. `v0.1.6`) represents a shipping milestone. The core and CLI packages may have different version numbers within the same release — both are listed in each entry so you know exactly what was published.

---

## [0.2.0] — 2025-07-21

`core v0.2.0 · cli v0.2.0`
 
### New Rules
 
- **`jwt-in-localstorage`** (high) — Detects JWT and auth tokens stored in `localStorage`. Tokens stored there are readable by any JavaScript on the page, making them vulnerable to XSS theft. Use `httpOnly` cookies instead.
- **`swallowed-error`** (high) — Detects empty or comment-only `catch` blocks that silently discard exceptions. A caught error that goes nowhere makes broken code look like working code and makes production debugging nearly impossible.
- **`auth-masking`** (critical) — Detects `catch` blocks that swallow errors thrown during authentication or token verification. If `verifyToken()` throws and the catch does nothing, the request proceeds as if auth succeeded — a direct security hole.
### New Features
 
- **`hallint-disable` inline suppression** — Suppress findings without removing code. Supports four forms:
  - `// hallint-disable` — suppress all rules on the current line
  - `// hallint-disable rule-id` — suppress a specific rule on the current line
  - `// hallint-disable-next-line [rule-id]` — suppress the following line
  - `// hallint-disable-block [rule-id]` / `// hallint-enable-block` — suppress a block of lines
  - Works with JS/TS (`//`) and Python (`#`) comment styles
  - Unclosed `hallint-disable-block` suppresses to end of file
- **`publicRoutes` config allowlist** — Declare intentionally public routes once in `ScanConfig` instead of adding inline comments to every route. Supports exact strings and regex patterns. Routes matching any entry are excluded from `missing-auth-check`.
```ts
  await scan({
    files: './src',
    publicRoutes: ['/health', '/login', /^\/api\/docs/],
  })
```
 
- **LLM layer opt-in** — Set `config.llm` to get plain-English explanations attached to every finding as `llmExplanation`. Supports OpenAI, Anthropic, and Ollama. Fully opt-in — works without any LLM config. LLM errors are silently ignored and never affect exit codes.
```ts
  await scan({
    files: './src',
    llm: { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY },
  })
```
 
### Breaking Changes
 
None. All v0.1.x configs and rule sets continue to work without modification.


## [v0.1.6] — 2025-07-15
`core v0.1.7, v0.1.8 · cli v0.1.5, v0.1.6, v0.1.7`

### Fixes

- **missing-auth-check:** Context window expanded from 1 line to 3 lines above the route — `// public` and `// hallint-public` markers placed above a route are now reliably detected. Comment-only lines are stripped before the auth keyword check to prevent words like `auth` in comment prose from suppressing a real finding.
- **hallint --version:** Replaced hardcoded `"0.1.0"` with a dynamic read from `package.json`. Now prints both CLI and core versions:
  ```
  hallint-cli  v0.1.7
  hallint core v0.1.8
  ```
  Added `./package.json` to core `exports` to prevent `ERR_PACKAGE_PATH_NOT_EXPORTED` on Node 22.

### Documentation

- README rewritten with full CLI usage, real terminal output examples, inline suppression docs, public route marker docs, CI integration, and Windows installation troubleshooting.

---

## [v0.1.5] — 2025-07-13
`core v0.1.6 · cli v0.1.4`

### Fixes

- **hardcoded-secret:** Added prefix-based detection for well-known token formats — secrets passed directly to functions (e.g. `authenticate("ghp_...")`) are now caught without requiring an assignment separator. Covered prefixes: `ghp_`, `ghs_`, `github_pat_`, `sk-`, `xoxb-`, `xoxp-`, `xoxa-`, `AKIA`, `ya29.`, `AIza`. Comment lines and `process.env.` / `os.environ` reads are excluded.
- **async-no-catch:** Brace counter now strips inline string literals and template expressions before counting `{` / `}`, reducing false positives caused by braces inside quoted strings or `${...}` interpolations.
- **sql-injection:** Scoped finding message to accurately reflect actual detection coverage (direct concatenation and template literal interpolation only). No change to detection logic.

### Internal

- Scanner dispatch refactored: routing now checks for `rule.match()` presence rather than `rule.layer`. `layer` is now metadata only.

---

## [v0.1.4] — 2025-07-12
`core v0.1.4, v0.1.5 · cli v0.1.3, v0.1.4`

### Fixes

- **missing-auth-check:** Routes intentionally exposed without authentication can now be marked to suppress the rule. Supported markers:
  ```ts
  // public
  app.get('/health', (_req, res) => res.send('ok'))

  // hallint-public
  router.get('/status', (_req, res) => res.json({ status: 'up' }))

  router.post('/webhook', /* hallint-public */ async (req, res) => {
    res.sendStatus(204)
  })
  ```
  The marker can appear on the line above the route or inline on the same line.

---

## [v0.1.3] — 2025-07-08
`core v0.1.1, v0.1.2, v0.1.3 · cli v0.1.1, v0.1.2`

### Fixes

- **Directory scanning:** `hallint ./src` now correctly walks the directory and scans all `.js`, `.ts`, `.jsx`, `.tsx`, `.py` files. Previously, passing a bare directory path returned 0 findings because the glob received the folder path rather than its contents.
- **sql-injection — template literals:** User input interpolated via template literals (`` db.query(`SELECT ... ${req.params.id}`) ``) is now correctly detected. The regex used `\$` which the JS engine treated as an end-of-line anchor instead of a literal dollar sign.
- **xss-innerHTML — false positives:** Static string assignments (`el.innerHTML = "<b>safe</b>"`) are no longer flagged. Mixed Unicode/straight quotes in the negative lookahead broke the match logic entirely.

---

## [v0.1.2] — 2025-07-08
`core v0.1.0 · cli v0.1.0`

### Fixes

- Fixed CLI package not publishing correctly to npm. `@asyncinnovator/hallint-cli` is now available and installable.
- Fixed tsconfig paths alias for scoped package name.
- Updated lock file for scoped package name.

### Documentation

- Added README.md to `packages/core` and `packages/cli` — now displayed on individual npm package pages for `@asyncinnovator/hallint` and `@asyncinnovator/hallint-cli`.
- Fixed CLI command examples in docs.

---

## [v0.1.1] — 2025-07-07
`core v0.1.0 · cli v0.1.0`

### Fixes

- Fixed shebang line placement in CLI output.
- Added `files` field to CLI `package.json` to ensure correct files are included in the published package.
- Fixed scoped package name references across tsconfig.

---

## [v0.1.0] — 2025-07-07
`core v0.1.0 · cli v0.1.0`

Initial release of hallint.

### Packages

- `@asyncinnovator/hallint` — core library
- `@asyncinnovator/hallint-cli` — CLI wrapper

### Rules

| Rule | Severity | What it catches |
|---|---|---|
| `hardcoded-secret` | critical | API keys, tokens, passwords in source |
| `sql-injection` | critical | User input concatenated into query strings |
| `unsafe-eval` | critical | `eval()` or `new Function()` with dynamic input |
| `missing-auth-check` | high | Route handlers with no auth middleware |
| `xss-innerHTML` | high | Unsanitized strings assigned to `.innerHTML` |
| `permissive-cors` | high | `cors({ origin: '*' })` in route handlers |
| `async-no-catch` | medium | `async` functions with no error handling |
| `http-not-https` | medium | Hardcoded `http://` URLs in fetch/axios calls |

### Features

- `scan()` and `scanSource()` library API
- CLI with `--rules`, `--min-severity`, `--no-color`, `--help`, `--version` flags
- Regex and AST detection layers
- 16 tests across all 8 rules
- GitHub Actions CI on Node 20, 22, 24
- MIT license