import { readFileSync } from "fs"
import { extname } from "path"
import type { Rule, Finding, ScanConfig, ScanResult, Language, Severity } from "./types"
import { recommendedRules, allRules } from "./rules/index"

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"]

function extToLanguage(filePath: string): Language | null {
  const ext = extname(filePath).toLowerCase().slice(1)
  const map: Record<string, Language> = { js: "js", jsx: "jsx", ts: "ts", tsx: "tsx", py: "py" }
  return map[ext] ?? null
}

function resolveRules(ruleSet: ScanConfig["rules"]): Rule[] {
  if (!ruleSet || ruleSet === "recommended") return recommendedRules
  if (ruleSet === "all") return allRules
  return ruleSet as Rule[]
}

function meetsMinSeverity(finding: Finding, min: Severity): boolean {
  return SEVERITY_ORDER.indexOf(finding.severity) <= SEVERITY_ORDER.indexOf(min)
}

function emptyCount(): Record<Severity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
}

// ─── Suppression ──────────────────────────────────────────────────────────────
// Supported comment forms (JS/TS // and Python #):
//   hallint-disable                        → suppress all rules on this line
//   hallint-disable rule-id                → suppress specific rule on this line
//   hallint-disable-next-line              → suppress all rules on next line
//   hallint-disable-next-line rule-id      → suppress specific rule on next line
//   hallint-disable-block                  → suppress all rules until hallint-enable-block
//   hallint-disable-block rule-id          → suppress specific rule until hallint-enable-block
//   hallint-enable-block                   → end block suppression

type BlockSuppression = { rules: string[] | null }  // null = all rules

function buildSuppressionIndex(lines: string[]): {
  suppressedLines: Map<number, string[] | null>   // 1-based line → null=all, array=specific
  blockSuppressed: (line: number, ruleId: string) => boolean
} {
  // Per-line suppressions (1-based)
  const suppressedLines = new Map<number, string[] | null>()

  // Block suppression state
  const activeBlocks: BlockSuppression[] = []
  // line → list of blocks starting at that line (processed as we iterate)
  // We'll compute block membership on the fly via a boolean check closure

  // First pass: collect per-line and block markers
  const blockRanges: Array<{ from: number; to: number; rules: string[] | null }> = []
  const openBlocks: Array<{ from: number; rules: string[] | null }> = []

  lines.forEach((line, i) => {
    const lineNo = i + 1
    const comment = extractHallintComment(line)
    if (!comment) return

    if (comment.type === "disable-line") {
      const existing = suppressedLines.get(lineNo)
      if (existing === null) return  // already suppressing all
      if (comment.rules === null) {
        suppressedLines.set(lineNo, null)
      } else {
        suppressedLines.set(lineNo, [...(existing ?? []), ...comment.rules])
      }
    } else if (comment.type === "disable-next-line") {
      const nextLine = lineNo + 1
      const existing = suppressedLines.get(nextLine)
      if (existing === null) return
      if (comment.rules === null) {
        suppressedLines.set(nextLine, null)
      } else {
        suppressedLines.set(nextLine, [...(existing ?? []), ...comment.rules])
      }
    } else if (comment.type === "disable-block") {
      openBlocks.push({ from: lineNo, rules: comment.rules })
    } else if (comment.type === "enable-block") {
      const block = openBlocks.pop()
      if (block) blockRanges.push({ from: block.from, to: lineNo, rules: block.rules })
    }
  })

  // Close any unclosed blocks at EOF
  for (const block of openBlocks) {
    blockRanges.push({ from: block.from, to: lines.length, rules: block.rules })
  }

  function blockSuppressed(lineNo: number, ruleId: string): boolean {
    for (const range of blockRanges) {
      if (lineNo < range.from || lineNo > range.to) continue
      if (range.rules === null || range.rules.includes(ruleId)) return true
    }
    return false
  }

  return { suppressedLines, blockSuppressed }
}

type CommentDirective =
  | { type: "disable-line"; rules: string[] | null }
  | { type: "disable-next-line"; rules: string[] | null }
  | { type: "disable-block"; rules: string[] | null }
  | { type: "enable-block" }

function extractHallintComment(line: string): CommentDirective | null {
  // Match `// hallint-*` or `# hallint-*`
  const m = line.match(/(?:\/\/|#)\s*(hallint-[^\s]*)(?:\s+(.+))?/)
  if (!m) return null
  const directive = m[1].trim()
  const rest = m[2]?.trim() ?? ""
  const rules: string[] | null = rest ? rest.split(/[\s,]+/).filter(Boolean) : null

  if (directive === "hallint-disable") return { type: "disable-line", rules }
  if (directive === "hallint-disable-next-line") return { type: "disable-next-line", rules }
  if (directive === "hallint-disable-block") return { type: "disable-block", rules }
  if (directive === "hallint-enable-block") return { type: "enable-block" }
  return null
}

function isSuppressed(
  lineNo: number,
  ruleId: string,
  suppressedLines: Map<number, string[] | null>,
  blockSuppressed: (line: number, ruleId: string) => boolean
): boolean {
  const lineSup = suppressedLines.get(lineNo)
  if (lineSup !== undefined) {
    if (lineSup === null || lineSup.includes(ruleId)) return true
  }
  return blockSuppressed(lineNo, ruleId)
}

// ─── Scanner ──────────────────────────────────────────────────────────────────

function scanFile(filePath: string, source: string, rules: Rule[], config: ScanConfig): Finding[] {
  const lang = extToLanguage(filePath)
  if (!lang) return []
  const findings: Finding[] = []
  const lines = source.split("\n")
  const { suppressedLines, blockSuppressed } = buildSuppressionIndex(lines)

  for (const rule of rules) {
    if (!rule.languages.includes(lang)) continue
    if (rule.pattern && !rule.match) {
      lines.forEach((line, i) => {
        const lineNo = i + 1
        if (isSuppressed(lineNo, rule.id, suppressedLines, blockSuppressed)) return
        if (rule.pattern!.test(line)) {
          findings.push({
            ruleId: rule.id, severity: rule.severity, message: rule.message,
            fix: rule.fix, docs: rule.docs, filePath, line: lineNo, snippet: line.trim()
          })
        }
      })
    }
    if (rule.match) {
      for (const m of rule.match(source, filePath, config)) {
        if (isSuppressed(m.line, rule.id, suppressedLines, blockSuppressed)) continue
        findings.push({
          ruleId: rule.id, severity: rule.severity, message: rule.message,
          fix: rule.fix, docs: rule.docs, filePath, line: m.line, column: m.column, snippet: m.snippet
        })
      }
    }
  }
  return findings
}

export async function scan(config: ScanConfig): Promise<ScanResult> {
  const start = Date.now()
  const rules = resolveRules(config.rules)
  const minSeverity = config.minSeverity ?? "info"
  const filePaths = await resolveFiles(config.files, config.ignore)
  const allFindings: Finding[] = []
  for (const filePath of filePaths) {
    let source: string
    try { source = readFileSync(filePath, "utf8") } catch { continue }
    allFindings.push(...scanFile(filePath, source, rules, config).filter(f => meetsMinSeverity(f, minSeverity)))
  }
  const summary = emptyCount()
  for (const f of allFindings) summary[f.severity]++
  return { findings: allFindings, scannedFiles: filePaths, durationMs: Date.now() - start, summary }
}

export function scanSource(source: string, filePath: string, config: Omit<ScanConfig, "files"> = {}): Finding[] {
  return scanFile(filePath, source, resolveRules(config.rules), { ...config, files: [filePath] })
}

async function resolveFiles(input: string | string[], ignore: string[] = []): Promise<string[]> {
  const { statSync, existsSync, realpathSync } = await import('fs')
  const rawPatterns = Array.isArray(input) ? input : [input]

  const patterns = rawPatterns.map(p => {
    try {
      if (existsSync(p) && statSync(p).isDirectory()) {
        return p.replace(/\/?$/, '') + '/**/*.{js,jsx,ts,tsx,py}'
      }
    } catch { /* fall through */ }
    return p
  })

  try {
    const { glob } = await import('glob')
    const results: string[] = []
    for (const pattern of patterns) results.push(...await glob(pattern, { ignore, absolute: true }))
    return [...new Set(results)]
  } catch {
    return patterns.filter(p => existsSync(p) && statSync(p).isFile()).map(p => realpathSync(p))
  }
}