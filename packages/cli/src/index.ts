#!/usr/bin/env node
import { scan } from "hallint"
import type { ScanConfig, Finding, Severity } from "hallint"

const args = process.argv.slice(2)

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.log(`
  hallint — detect security and quality issues in AI-generated code

  Usage:
    hallint [files]                    Scan files (glob patterns supported)
    hallint ./src                      Scan a directory
    hallint ./src --rules all
    hallint ./src --min-severity high

  Options:
    --rules <set>        Rule set: recommended (default) | all
    --min-severity       Minimum: critical | high | medium | low | info
    --no-color           Disable colored output
    --help, -h           Show this help
    --version, -v        Show version
  `)
  process.exit(0)
}

if (args.includes("--version") || args.includes("-v")) { console.log("0.1.0"); process.exit(0) }

const noColor = args.includes("--no-color")
const rulesIdx = args.indexOf("--rules")
const rules = rulesIdx !== -1 ? args[rulesIdx + 1] : "recommended"
const minSevIdx = args.indexOf("--min-severity")
const minSeverity = minSevIdx !== -1 ? (args[minSevIdx + 1] as Severity) : "info"
const files = args.filter(a => !a.startsWith("--") && a !== rules && a !== minSeverity)

if (!files.length) { console.error("Error: no files specified."); process.exit(1) }

const c = {
  reset: noColor ? "" : "\x1b[0m", bold: noColor ? "" : "\x1b[1m", dim: noColor ? "" : "\x1b[2m",
  red: noColor ? "" : "\x1b[31m", yellow: noColor ? "" : "\x1b[33m", blue: noColor ? "" : "\x1b[34m",
  cyan: noColor ? "" : "\x1b[36m", green: noColor ? "" : "\x1b[32m",
}

const SEV_COLOR: Record<Severity, string> = {
  critical: c.red, high: c.red, medium: c.yellow, low: c.blue, info: c.dim,
}
function sevColor(s: Severity): string { return SEV_COLOR[s] }

function fmt(f: Finding): string {
  const loc = `${f.filePath}:${f.line}`
  const sev = `${sevColor(f.severity)}${f.severity.toUpperCase()}${c.reset}`
  const lines = [`  ${c.bold}${loc}${c.reset} ${sev} ${c.dim}[${f.ruleId}]${c.reset}`, `  ${f.message}`]
  if (f.snippet) lines.push(`  ${c.dim}> ${f.snippet}${c.reset}`)
  if (f.fix)     lines.push(`  ${c.cyan}fix: ${f.fix}${c.reset}`)
  return lines.join("\n")
}

;(async () => {
  const config: ScanConfig = { files, rules: rules === "all" ? "all" : "recommended", minSeverity }
  console.log(`\n${c.bold}hallint${c.reset} scanning ${files.join(", ")}...\n`)
  try {
    const result = await scan(config)
    if (!result.findings.length) {
      console.log(`${c.green}✓ No issues found${c.reset} in ${result.scannedFiles.length} file(s) (${result.durationMs}ms)\n`)
      process.exit(0)
    }
    const byFile = new Map<string, Finding[]>()
    for (const f of result.findings) { if (!byFile.has(f.filePath)) byFile.set(f.filePath, []); byFile.get(f.filePath)!.push(f) }
    for (const [file, findings] of byFile) { console.log(`${c.bold}${file}${c.reset}`); for (const f of findings) { console.log(fmt(f)); console.log() } }
    const { critical, high, medium, low, info } = result.summary
    const total = result.findings.length
    console.log(`${c.bold}Summary:${c.reset} ${total} issue(s) in ${result.scannedFiles.length} file(s) — ${result.durationMs}ms`)
    if (critical) console.log(`  ${c.red}${critical} critical${c.reset}`)
    if (high)     console.log(`  ${c.red}${high} high${c.reset}`)
    if (medium)   console.log(`  ${c.yellow}${medium} medium${c.reset}`)
    if (low)      console.log(`  ${c.blue}${low} low${c.reset}`)
    if (info)     console.log(`  ${c.dim}${info} info${c.reset}`)
    process.exit(critical > 0 || high > 0 ? 1 : 0)
  } catch (err) { console.error(`${c.red}Error:${c.reset}`, err); process.exit(2) }
})()