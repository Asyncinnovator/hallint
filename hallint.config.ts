// hallint.config.ts — project-level configuration (place in your project root)
import type { ScanConfig } from "@asyncinnovator/hallint"

const config: Omit<ScanConfig, "files"> = {
  rules: "recommended",

  // Uncomment to use LLM-powered explanations (v0.2+):
  // llm: {
  //   provider: "anthropic",
  //   model: "claude-haiku-4-5",
  // },

  minSeverity: "medium",

  ignore: [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.test.ts",
    "**/*.spec.ts",
  ],
}

export default config