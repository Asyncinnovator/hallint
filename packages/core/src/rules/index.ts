import type { Rule } from "../types"

// Pass 1: assignment-style secrets (api_key = "...", password: "...")
const SECRET_ASSIGNMENT = /(?:api[_-]?key|secret|token|password|passwd|pwd)\s*[=:]\s*["'`][A-Za-z0-9+/=_-]{16,}["'`]/i

// Pass 2: well-known secret prefixes used verbatim anywhere in the line.
// These are provider-issued formats with unambiguous prefixes, so no assignment
// context is needed — their presence in source is always a leak.
const SECRET_PREFIX = /["'`](?:ghp_|ghs_|github_pat_|sk-[A-Za-z0-9]{20,}|xoxb-|xoxp-|xoxa-|AKIA[0-9A-Z]{16}|ya29\.|AIza[0-9A-Za-z_-]{35})[A-Za-z0-9_-]*["'`]/

export const hardcodedSecret: Rule = {
  id: "hardcoded-secret",
  severity: "critical",
  languages: ["js", "ts", "jsx", "tsx", "py"],
  layer: "regex",
  message: "Hardcoded secret detected — API key, token, or password in source code",
  fix: "Move to environment variables: process.env.YOUR_SECRET_NAME",
  docs: "https://hallint.dev/rules/hardcoded-secret",
  match(source, _filePath) {
    const matches: { line: number; snippet?: string }[] = []
    const lines = source.split("\n")
    lines.forEach((line, i) => {
      // Skip comments and env-var reads — not leaks
      const trimmed = line.trim()
      if (/^\s*(?:\/\/|#)/.test(line)) return
      if (/process\.env\.|os\.environ/.test(line)) return
      if (SECRET_ASSIGNMENT.test(line) || SECRET_PREFIX.test(line))
        matches.push({ line: i + 1, snippet: trimmed })
    })
    return matches
  },
}

export const sqlInjection: Rule = {
  id: "sql-injection",
  severity: "critical",
  languages: ["js", "ts", "jsx", "tsx", "py"],
  layer: "regex",
  pattern: /(?:query|execute|exec|db\.run)\s*\(\s*["'`].*?[$]\{|["'`]\s*\+\s*(?:req\.|params\.|body\.|query\.)/,
  message: "Possible SQL injection — user input directly concatenated or interpolated into a query string",
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
  fix: "Add auth middleware: router.get('/route', authenticate, handler), or mark intentionally public routes with // public",
  docs: "https://hallint.dev/rules/missing-auth-check",
  match(source, _filePath) {
    const matches: { line: number; snippet?: string }[] = []
    const lines = source.split("\n")
    const routePattern = /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["'`][^"'`]+["'`]\s*(?:,\s*\w+)*\s*,\s*(?:async\s*)?\([^)]*\)\s*=>/
    lines.forEach((line, i) => {
      if (routePattern.test(line)) {
        // Look up to 3 lines above + 1 line below for auth middleware and public markers.
        // Strip comment-only lines before running the auth check so that words like
        // "auth" or "authenticate" appearing in comment prose don't produce false negatives.
        const contextLines = lines.slice(Math.max(0, i - 3), i + 2)
        const codeLines = contextLines.filter(l => !/^\s*(?:\/\/|#)/.test(l))
        const hasAuth = /\b(?:auth|authenticate|requireAuth|isAuthenticated|protect|verifyToken|ensureLoggedIn)\b/.test(codeLines.join(" "))
        // Public markers are intentionally in comments — check the full context for those.
        const fullContext = contextLines.join(" ")
        const isPublic = /\/\/\s*(?:hallint-)?public\b|\/\*\s*(?:hallint-)?public\s*\*\//i.test(fullContext)
        if (!hasAuth && !isPublic) matches.push({ line: i + 1, snippet: line.trim() })
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
  pattern: /\.innerHTML\s*=\s*(?!["'`])/,
  message: "Unsanitized string assigned to innerHTML — potential XSS",
  fix: "Use textContent for plain text, or sanitize with DOMPurify first.",
  docs: "https://hallint.dev/rules/xss-innerHTML",
}

export const permissiveCors: Rule = {
  id: "permissive-cors",
  severity: "high",
  languages: ["js", "ts"],
  layer: "regex",
  pattern: /cors\s*\(\s*\{\s*origin\s*:\s*["'`]\*["'`]/,
  message: "CORS configured with wildcard origin (*) — allows any domain",
  fix: 'Restrict to specific domains: cors({ origin: "https://yourdomain.com" })',
  docs: "https://hallint.dev/rules/permissive-cors",
}

// Strip inline string literals from a line before counting braces, so that
// `{` / `}` inside quotes or template expressions don't throw off the depth counter.
// Handles single-line strings and template literals; multiline templates are left as-is
// (rare in practice). This is a heuristic — AST-based detection is planned for v0.2.
function stripStrings(line: string): string {
  return line
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/`[^`\\$]*(?:(?:\\.|\$(?!\{))[^`\\$]*)*`/g, "``")
    // Collapse ${...} expressions that weren't part of a full template (residual fragments)
    .replace(/\$\{[^}]*\}/g, "")
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
    const asyncFnPattern = /(?:^(?:export\s+)?(?:async\s+function|const\s+\w+\s*=\s*async\s*(?:\([^)]*\)|[^=]+)\s*=>)|async\s*(?:function\s*\w*\s*)?\([^)]*\)\s*=>|async\s*(?:function\s+\w+\s*)?\()/
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
        const stripped = stripStrings(line)
        braceDepth += (stripped.match(/\{/g) || []).length
        braceDepth -= (stripped.match(/\}/g) || []).length
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
  pattern: /(?:fetch|axios\.(?:get|post|put|delete|patch)|requests\.(?:get|post))\s*\(\s*["'`]http:\/\//,
  message: "Hardcoded http:// URL — data sent without encryption",
  fix: "Use https:// or move base URLs to environment config.",
  docs: "https://hallint.dev/rules/http-not-https",
}

export const allRules: Rule[] = [
  hardcodedSecret, sqlInjection, unsafeEval, missingAuthCheck,
  xssInnerHTML, permissiveCors, asyncNoCatch, httpNotHttps,
]

export const recommendedRules: Rule[] = allRules