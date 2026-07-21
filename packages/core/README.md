# @asyncinnovator/hallint

> Static analysis library for AI-generated code. Detects security and quality issues that AI coding assistants commonly introduce.

[![npm](https://img.shields.io/npm/v/@asyncinnovator/hallint?color=crimson)](https://www.npmjs.com/package/@asyncinnovator/hallint)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Asyncinnovator/hallint/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## Install

```bash
npm install @asyncinnovator/hallint
```

---

## Usage

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
  if (f.llmExplanation) console.log(`  → ${f.llmExplanation}`)
})
```

### Scan a string in memory

Useful for editor integrations, build plugins, or tests:

```ts
import { scanSource } from '@asyncinnovator/hallint'

const findings = scanSource(
  `const apiKey = "sk-abc123defgh456789xyz"`,
  'virtual.ts'
)

findings.forEach(f => console.log(f.ruleId, f.message))
```

---

## API

### `scan(config): Promise<ScanResult>`

| Field | Type | Default | Description |
|---|---|---|---|
| `files` | `string \| string[]` | — | Paths, globs, or directories |
| `rules` | `'recommended' \| 'all' \| Rule[]` | `'recommended'` | Rule set to run |
| `minSeverity` | `Severity` | `'info'` | Skip findings below this level |
| `ignore` | `string[]` | `[]` | Glob patterns to exclude |
| `publicRoutes` | `Array<string \| RegExp>` | `[]` | Route paths exempt from `missing-auth-check` |
| `llm` | `LLMConfig` | — | Optional LLM layer for plain-English explanations |

### `scanSource(source, filePath, config?): Finding[]`

Scans a source string directly without touching the file system.

### `ScanResult`

```ts
{
  findings:     Finding[]
  scannedFiles: string[]
  durationMs:   number
  summary:      Record<'critical' | 'high' | 'medium' | 'low' | 'info', number>
}
```

### `Finding`

```ts
{
  ruleId:          string   // e.g. "hardcoded-secret"
  severity:        string   // "critical" | "high" | "medium" | "low" | "info"
  message:         string
  fix?:            string
  filePath:        string
  line:            number
  snippet?:        string
  llmExplanation?: string   // populated when config.llm is set
}
```

### `LLMConfig`

```ts
{
  provider: 'openai' | 'anthropic' | 'ollama'
  model?:   string
  apiKey?:  string
  baseUrl?: string   // Ollama only, default: http://localhost:11434
}
```

---

## Rules

| Rule | Severity | What it catches |
|---|---|---|
| `hardcoded-secret` | critical | API keys, tokens, and known token prefixes (`ghp_`, `sk-`, `AKIA`, `xoxb-`, and more) |
| `sql-injection` | critical | User input interpolated into SQL queries |
| `unsafe-eval` | critical | `eval()` or `new Function()` with dynamic input |
| `auth-masking` | critical | Catch blocks that swallow auth errors, allowing failed auth to silently pass |
| `missing-auth-check` | high | Route handlers with no auth middleware |
| `xss-innerHTML` | high | Non-literal values assigned to `.innerHTML` |
| `permissive-cors` | high | `cors({ origin: '*' })` in route handlers |
| `jwt-in-localstorage` | high | JWT or auth tokens stored in `localStorage` |
| `swallowed-error` | high | Empty or comment-only catch blocks |
| `http-not-https` | medium | Hardcoded `http://` URLs in fetch/axios calls |
| `async-no-catch` | medium | `async` functions with no error handling (`--rules all` only) |

### Examples

**hardcoded-secret:**

```ts
// ✖ detected
const apiKey = "ghp_abc123def456ghi789jklmno"

// ✔ not flagged
const apiKey = process.env.GITHUB_TOKEN
```

**sql-injection:**

```ts
// ✖ detected — template literal
const result = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`)

// ✔ not flagged — parameterised
const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
```

**missing-auth-check:**

```ts
// ✖ detected
router.post('/admin/delete', async (req, res) => { ... })

// ✔ not flagged
router.post('/admin/delete', authenticate, async (req, res) => { ... })
```

**jwt-in-localstorage:**

```ts
// ✖ detected
localStorage.setItem('token', jwtToken)

// ✔ not flagged
localStorage.setItem('theme', 'dark')
```

**swallowed-error:**

```ts
// ✖ detected — empty catch
try {
  await db.query(sql)
} catch (e) {
}

// ✔ not flagged
} catch (e) {
  console.error(e)
}
```

**auth-masking:**

```ts
// ✖ detected — auth error swallowed
try {
  await verifyToken(req.headers.authorization)
} catch (e) {
  next()
}

// ✔ not flagged
} catch (e) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

---

## Inline Suppression

```ts
// Suppress all rules on this line
const key = "sk-abc123abc123abc123abc"  // hallint-disable

// Suppress a specific rule on this line
const key = "sk-abc123abc123abc123abc"  // hallint-disable hardcoded-secret

// Suppress all rules on the next line
// hallint-disable-next-line
const key = "sk-abc123abc123abc123abc"

// Suppress a block
// hallint-disable-block
const key1 = "sk-abc123abc123abc123abc"
const key2 = "ghp_abc123abc123abc123abc"
// hallint-enable-block
```

---

## Public Route Allowlist

```ts
await scan({
  files: './src',
  publicRoutes: ['/health', '/login', '/register', /^\/api\/docs/],
})
```

Routes matching any entry are excluded from `missing-auth-check`. Supports exact strings and regex patterns.

You can also mark individual routes inline:

```ts
// public
app.get('/health', (_req, res) => res.send('ok'))

// hallint-public
router.get('/status', (_req, res) => res.json({ status: 'up' }))
```

---

## LLM Layer

```ts
await scan({
  files: './src',
  llm: {
    provider: 'anthropic',   // 'openai' | 'anthropic' | 'ollama'
    model: 'claude-haiku-4-5',
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
})
```

Each finding gets an `llmExplanation` field. LLM errors are silently ignored — findings are always returned regardless.

**Ollama (no API key required):**
```ts
llm: { provider: 'ollama', model: 'llama3', baseUrl: 'http://localhost:11434' }
```

---

## Custom rules

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

---

## Links

- [GitHub](https://github.com/Asyncinnovator/hallint)
- [CLI package — @asyncinnovator/hallint-cli](https://www.npmjs.com/package/@asyncinnovator/hallint-cli)
- [MIT License](https://github.com/Asyncinnovator/hallint/blob/main/LICENSE)