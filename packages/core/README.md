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
  console.log(`  fix: ${f.fix}`)
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
| `llm` | `LLMConfig` | — | Optional LLM layer for explanations |

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
| `hardcoded-secret` | critical | API keys, tokens, passwords in source |
| `sql-injection` | critical | User input interpolated into SQL queries |
| `unsafe-eval` | critical | `eval()` or `new Function()` with dynamic input |
| `missing-auth-check` | high | Route handlers with no auth middleware |
| `xss-innerHTML` | high | Non-literal values assigned to `.innerHTML` |
| `permissive-cors` | high | `cors({ origin: '*' })` in route handlers |
| `async-no-catch` | medium | `async` functions with no error handling |
| `http-not-https` | medium | Hardcoded `http://` URLs in fetch/axios calls |

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

## LLM layer (optional)

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

No API key required when using Ollama:

```ts
llm: { provider: 'ollama', model: 'llama3', baseUrl: 'http://localhost:11434' }
```

---

## Links

- [GitHub](https://github.com/Asyncinnovator/hallint)
- [CLI package — @asyncinnovator/hallint-cli](https://www.npmjs.com/package/@asyncinnovator/hallint-cli)
- [MIT License](https://github.com/Asyncinnovator/hallint/blob/main/LICENSE)