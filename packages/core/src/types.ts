// ─── Core types for hallint ───────────────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low" | "info"
export type DetectionLayer = "regex" | "ast" | "llm"
export type Language = "js" | "ts" | "jsx" | "tsx" | "py" | "go" | "ruby"

export interface Rule {
  id: string
  message: string
  severity: Severity
  languages: Language[]
  layer: DetectionLayer
  pattern?: RegExp
  fix?: string
  docs?: string
  match?: (source: string, filePath: string) => RuleMatch[]
}

export interface RuleMatch {
  line: number
  column?: number
  snippet?: string
}

export interface Finding {
  ruleId: string
  severity: Severity
  message: string
  fix?: string
  docs?: string
  filePath: string
  line: number
  column?: number
  snippet?: string
  llmExplanation?: string
}

export type RuleSet = "recommended" | "all" | Rule[]

export interface LLMConfig {
  provider: "openai" | "anthropic" | "ollama"
  model?: string
  apiKey?: string
  baseUrl?: string
}

export interface ScanConfig {
  files: string | string[]
  rules?: RuleSet
  llm?: LLMConfig
  minSeverity?: Severity
  ignore?: string[]
}

export interface ScanResult {
  findings: Finding[]
  scannedFiles: string[]
  durationMs: number
  summary: Record<Severity, number>
}