// LLM layer — optional contextual explanations and fix suggestions.
// Opt-in only: set config.llm to enable. Never affects exit codes.
// Errors (rate limits, bad key, timeout) are silently swallowed —
// findings are still returned without llmExplanation.
import type { Finding, LLMConfig } from "../types"

export interface LLMProvider {
  explain(finding: Finding): Promise<string>
}

function buildPrompt(finding: Finding): string {
  return [
    `You are a security code reviewer. A static analysis tool flagged the following issue:`,
    ``,
    `Rule: ${finding.ruleId}`,
    `Severity: ${finding.severity}`,
    `File: ${finding.filePath} (line ${finding.line})`,
    `Code: ${finding.snippet ?? "(no snippet)"}`,
    `Message: ${finding.message}`,
    ``,
    `In 2-4 sentences, explain why this is dangerous in plain English and what the developer should do to fix it. Be specific to the code snippet. Do not repeat the rule name or severity.`,
  ].join("\n")
}

function createOpenAIProvider(config: LLMConfig): LLMProvider {
  return {
    async explain(finding: Finding): Promise<string> {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model ?? "gpt-4o-mini",
          max_tokens: 200,
          messages: [{ role: "user", content: buildPrompt(finding) }],
        }),
      })
      const data = await response.json() as { choices: { message: { content: string } }[] }
      return data.choices[0].message.content.trim()
    },
  }
}

function createAnthropicProvider(config: LLMConfig): LLMProvider {
  return {
    async explain(finding: Finding): Promise<string> {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model ?? "claude-haiku-4-5",
          max_tokens: 200,
          messages: [{ role: "user", content: buildPrompt(finding) }],
        }),
      })
      const data = await response.json() as { content: { text: string }[] }
      return data.content[0].text.trim()
    },
  }
}

function createOllamaProvider(config: LLMConfig): LLMProvider {
  const baseUrl = config.baseUrl ?? "http://localhost:11434"
  return {
    async explain(finding: Finding): Promise<string> {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model ?? "llama3",
          stream: false,
          messages: [{ role: "user", content: buildPrompt(finding) }],
        }),
      })
      const data = await response.json() as { message: { content: string } }
      return data.message.content.trim()
    },
  }
}

export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case "openai":     return createOpenAIProvider(config)
    case "anthropic":  return createAnthropicProvider(config)
    case "ollama":     return createOllamaProvider(config)
    default:           throw new Error(`Unknown LLM provider: ${(config as LLMConfig).provider}`)
  }
}