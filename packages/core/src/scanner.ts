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

function scanFile(filePath: string, source: string, rules: Rule[]): Finding[] {
  const lang = extToLanguage(filePath)
  if (!lang) return []
  const findings: Finding[] = []
  const lines = source.split("\n")
  for (const rule of rules) {
    if (!rule.languages.includes(lang)) continue
    if (rule.layer === "regex" && rule.pattern) {
      lines.forEach((line, i) => {
        if (rule.pattern!.test(line)) {
          findings.push({ ruleId: rule.id, severity: rule.severity, message: rule.message,
            fix: rule.fix, docs: rule.docs, filePath, line: i + 1, snippet: line.trim() })
        }
      })
    }
    if (rule.layer === "ast" && rule.match) {
      for (const m of rule.match(source, filePath)) {
        findings.push({ ruleId: rule.id, severity: rule.severity, message: rule.message,
          fix: rule.fix, docs: rule.docs, filePath, line: m.line, column: m.column, snippet: m.snippet })
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
    allFindings.push(...scanFile(filePath, source, rules).filter(f => meetsMinSeverity(f, minSeverity)))
  }
  const summary = emptyCount()
  for (const f of allFindings) summary[f.severity]++
  return { findings: allFindings, scannedFiles: filePaths, durationMs: Date.now() - start, summary }
}

export function scanSource(source: string, filePath: string, config: Omit<ScanConfig, "files"> = {}): Finding[] {
  return scanFile(filePath, source, resolveRules(config.rules))
}

async function resolveFiles(input: string | string[], ignore: string[] = []): Promise<string[]> {
  const patterns = Array.isArray(input) ? input : [input]
  try {
    const { glob } = await import('glob')
    const results: string[] = []
    for (const pattern of patterns) results.push(...await glob(pattern, { ignore, absolute: true }))
    return [...new Set(results)]
  } catch {
    // glob failed — fall back to treating inputs as direct file paths
    const { existsSync, realpathSync } = await import('fs')
    return patterns.filter(p => existsSync(p)).map(p => realpathSync(p))
  }
}