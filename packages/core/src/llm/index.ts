// LLM layer — optional contextual explanations and fix suggestions.
// Full implementation ships in v0.2. Providers: OpenAI, Anthropic, Ollama.
import type { Finding, LLMConfig } from "../types"

export interface LLMProvider {
  explain(finding: Finding): Promise<string>
}

export function createLLMProvider(_config: LLMConfig): LLMProvider {
  return {
    async explain(finding: Finding): Promise<string> {
      return finding.fix ?? "No explanation available without LLM provider configured."
    },
  }
}