import type { Rule } from "../types"

export const hardcodedSecret: Rule = {
  id: "hardcoded-secret",
  severity: "critical",
  languages: ["js", "ts", "jsx", "tsx", "py"],
  layer: "regex",
  pattern: /(?:api[_-]?key|secret|token|password|passwd|pwd)\s*[=:]\s*["'"'"'][A-Za-z0-9+/=_\-]{16,}["'"'"']/i,
  message: "Hardcoded secret detected — API key, token, or password in source code",
  fix: "Move to environment variables: process.env.YOUR_SECRET_NAME",
  docs: "https://hallint.dev/rules/hardcoded-secret",
}

export const sqlInjection: Rule = {
  id: "sql-injection",
  severity: "critical",
  languages: ["js", "ts", "jsx", "tsx", "py"],
  layer: "regex",
  pattern: /(?:query|execute|exec|db\.run)\s*\(\s*[`"'"'"'].*?\$\{|["'"'"'`]\s*\+\s*(?:req\.|params\.|body\.|query\.)/,
  message: "Possible SQL injection — user input interpolated into a query",
  fix: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [userId])',
  docs: "https://hallint.dev/rules/sql-injection",
}

export const unsafeEval: Rule = {
  id: "unsafe-eval",
  severity: "critical",
  languages: ["js", "ts", "jsx", "tsx"],
  layer: "regex",
  pattern: /\beval\s*\(|new\s+Function\s*\(/,
  message: "Unsafe eval() or new Function() — may execute attacker-controlled code",
  fix: "Avoid eval(). Use JSON.parse() for data, or a sandboxed interpreter.",
  docs: "https://hallint.dev/rules/unsafe-eval",
}

export const missingAuthCheck: Rule = {
  id: "missing-auth-check",
  severity: "high",
  languages: ["js", "ts"],
  layer: "ast",
  message: "Route handler may be missing authentication middleware",
  fix: "Add auth middleware: router.get('/route', authenticate, handler)",
  docs: "https://hallint.dev/rules/missing-auth-check",
  match(source, _filePath) {
    const matches: { line: number; snippet?: string }[] = []
    const lines = source.split("\n")
    const routePattern = /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["'"'"'`][^"'"'"'`,]+["'"'"'`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>/
    lines.forEach((line, i) => {
      if (routePattern.test(line)) {
        const context = lines.slice(Math.max(0, i - 1), i + 2).join(" ")
        const hasAuth = /\b(?:auth|authenticate|requireAuth|isAuthenticated|protect|verifyToken|ensureLoggedIn)\b/.test(context)
        if (!hasAuth) matches.push({ line: i + 1, snippet: line.trim() })
      }
    })
    return matches
  },
}

export const xssInnerHTML: Rule = {
  id: "xss-innerHTML",
  severity: "high",
  languages: ["js", "ts", "jsx", "tsx"],
  layer: "regex",
  pattern: /\.innerHTML\s*=\s*(?!["'"'"'`]<|["'"'"'`]\s*$)/,
  message: "Unsanitized string assigned to innerHTML — potential XSS",
  fix: "Use textContent for plain text, or sanitize with DOMPurify first.",
  docs: "https://hallint.dev/rules/xss-innerHTML",
}

export const permissiveCors: Rule = {
  id: "permissive-cors",
  severity: "high",
  languages: ["js", "ts"],
  layer: "regex",
  pattern: /cors\s*\(\s*\{\s*origin\s*:\s*["'"'"'`]\*["'"'"'`]/,
  message: "CORS configured with wildcard origin (*) — allows any domain",
  fix: 'Restrict to specific domains: cors({ origin: "https://yourdomain.com" })',
  docs: "https://hallint.dev/rules/permissive-cors",
}

export const asyncNoCatch: Rule = {
  id: "async-no-catch",
  severity: "medium",
  languages: ["js", "ts", "jsx", "tsx"],
  layer: "ast",
  message: "async function has no error handling — unhandled rejections can crash the process",
  fix: "Wrap await calls in try/catch or add a .catch() handler.",
  docs: "https://hallint.dev/rules/async-no-catch",
  match(source, _filePath) {
    const matches: { line: number; snippet?: string }[] = []
    const lines = source.split("\n")
    const asyncFnPattern = /^(?:export\s+)?(?:async\s+function|const\s+\w+\s*=\s*async\s*(?:\([^)]*\)|[^=]+)\s*=>)/
    let insideAsync = false
    let braceDepth = 0
    let asyncStartLine = -1
    let bodyLines: string[] = []
    lines.forEach((line, i) => {
      if (asyncFnPattern.test(line.trim())) {
        insideAsync = true; braceDepth = 0; asyncStartLine = i + 1; bodyLines = []
      }
      if (insideAsync) {
        bodyLines.push(line)
        braceDepth += (line.match(/\{/g) || []).length
        braceDepth -= (line.match(/\}/g) || []).length
        if (braceDepth <= 0 && bodyLines.length > 1) {
          const body = bodyLines.join("\n")
          if (/\bawait\b/.test(body) && !/\btry\b[\s\S]*\bcatch\b|\.catch\s*\(/.test(body))
            matches.push({ line: asyncStartLine, snippet: lines[asyncStartLine - 1].trim() })
          insideAsync = false
        }
      }
    })
    return matches
  },
}

export const httpNotHttps: Rule = {
  id: "http-not-https",
  severity: "medium",
  languages: ["js", "ts", "jsx", "tsx", "py"],
  layer: "regex",
  pattern: /(?:fetch|axios\.(?:get|post|put|delete|patch)|requests\.(?:get|post))\s*\(\s*["'"'"'`]http:\/\//,
  message: "Hardcoded http:// URL — data sent without encryption",
  fix: "Use https:// or move base URLs to environment config.",
  docs: "https://hallint.dev/rules/http-not-https",
}

export const allRules: Rule[] = [
  hardcodedSecret, sqlInjection, unsafeEval, missingAuthCheck,
  xssInnerHTML, permissiveCors, asyncNoCatch, httpNotHttps,
]

export const recommendedRules: Rule[] = allRules