# hallint

Detect security and quality issues in AI-generated code — before they reach production.

AI coding assistants (Copilot, Cursor, etc.) are fast, but they consistently introduce the same classes of bugs: hardcoded secrets, SQL injection, missing auth, unsafe eval. hallint catches them.

## Install

```bash
npm install hallint
```

## CLI

```bash
npx hallint ./src
npx hallint "./src/**/*.ts" --min-severity high
npx hallint ./src --rules all
```

## Library

```ts
import { scan } from 'hallint'

const result = await scan({ files: ['./src/**/*.ts'] })

result.findings.forEach(f => {
  console.log(`${f.severity} [${f.ruleId}] ${f.filePath}:${f.line}`)
  console.log(`  ${f.message}`)
  console.log(`  fix: ${f.fix}`)
})
```

## Rules (v0.1)

| Rule | Severity |
|---|---|
| `hardcoded-secret` | critical |
| `sql-injection` | critical |
| `unsafe-eval` | critical |
| `missing-auth-check` | high |
| `xss-innerHTML` | high |
| `permissive-cors` | high |
| `async-no-catch` | medium |
| `http-not-https` | medium |

## Config

```ts
// hallint.config.ts
import type { ScanConfig } from 'hallint'

export default {
  rules: 'recommended',
  minSeverity: 'medium',
  ignore: ['**/node_modules/**', '**/dist/**'],
} satisfies Omit<ScanConfig, 'files'>
```

## CI (GitHub Actions)

```yaml
- name: Run hallint
  run: npx hallint ./src --min-severity high
```

Exits with code `1` on any critical or high finding — safe to use as a PR gate.

## Contributing

Each rule is a single file (~30 lines) with a `bad.ts` / `good.ts` fixture. Issues labeled **good first issue** are pre-scoped new rules — pick one up and open a PR.

## License

MIT