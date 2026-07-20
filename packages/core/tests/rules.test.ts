import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { scanSource } from "../src/scanner"
import { allRules } from "../src/rules/index"

const FIXTURES = join(__dirname, "fixtures")

function fixture(rule: string, file: "bad" | "good") {
  return readFileSync(join(FIXTURES, rule, `${file}.ts`), "utf8")
}

function findingsFor(ruleId: string, source: string, filename = "test.ts") {
  return scanSource(source, filename, { rules: allRules }).filter(f => f.ruleId === ruleId)
}

describe("hardcoded-secret", () => {
  it("flags hardcoded API keys", () => expect(findingsFor("hardcoded-secret", fixture("hardcoded-secret", "bad")).length).toBeGreaterThan(0))
  it("does not flag env vars", () => expect(findingsFor("hardcoded-secret", fixture("hardcoded-secret", "good"))).toHaveLength(0))
})
describe("sql-injection", () => {
  it("flags string concatenation in db.query", () => expect(findingsFor("sql-injection", fixture("sql-injection", "bad")).length).toBeGreaterThan(0))
  it("does not flag parameterized queries", () => expect(findingsFor("sql-injection", fixture("sql-injection", "good"))).toHaveLength(0))
})
describe("unsafe-eval", () => {
  it("flags eval() and new Function()", () => expect(findingsFor("unsafe-eval", fixture("unsafe-eval", "bad")).length).toBeGreaterThanOrEqual(2))
  it("does not flag JSON.parse", () => expect(findingsFor("unsafe-eval", fixture("unsafe-eval", "good"))).toHaveLength(0))
})
describe("xss-innerHTML", () => {
  it("flags unsanitized innerHTML", () => expect(findingsFor("xss-innerHTML", fixture("xss-innerHTML", "bad")).length).toBeGreaterThan(0))
  it("does not flag textContent", () => expect(findingsFor("xss-innerHTML", fixture("xss-innerHTML", "good"))).toHaveLength(0))
})
describe("permissive-cors", () => {
  it("flags cors wildcard", () => expect(findingsFor("permissive-cors", fixture("permissive-cors", "bad")).length).toBeGreaterThan(0))
  it("does not flag specific origin", () => expect(findingsFor("permissive-cors", fixture("permissive-cors", "good"))).toHaveLength(0))
})
describe("http-not-https", () => {
  it("flags http:// fetch", () => expect(findingsFor("http-not-https", fixture("http-not-https", "bad")).length).toBeGreaterThan(0))
  it("does not flag https://", () => expect(findingsFor("http-not-https", fixture("http-not-https", "good"))).toHaveLength(0))
})
describe("async-no-catch", () => {
  it("flags async with no try/catch", () => expect(findingsFor("async-no-catch", fixture("async-no-catch", "bad")).length).toBeGreaterThan(0))
  it("does not flag async with try/catch", () => expect(findingsFor("async-no-catch", fixture("async-no-catch", "good"))).toHaveLength(0))
})
describe("missing-auth-check", () => {
  it("flags route with no auth", () => expect(findingsFor("missing-auth-check", fixture("missing-auth-check", "bad")).length).toBeGreaterThan(0))
  it("does not flag route with auth middleware", () => expect(findingsFor("missing-auth-check", fixture("missing-auth-check", "good"))).toHaveLength(0))
  it("does not flag routes marked as intentionally public", () => {
    const source = `
      // public
      app.get('/health', (_req, res) => res.send('ok'))

      router.post('/webhook', /* hallint-public */ async (req, res) => {
        res.sendStatus(204)
      })
    `

    expect(findingsFor("missing-auth-check", source)).toHaveLength(0)
  })
})


// ─── hallint-disable suppression ──────────────────────────────────────────────

describe("hallint-disable suppression", () => {
  const rules = allRules

  function findings(source: string) {
    return scanSource(source, "test.ts", { rules })
  }

  it("inline disable suppresses all rules on that line", () => {
    const src = `const apiKey = "sk-abc123abc123abc123abc" // hallint-disable`
    expect(findings(src)).toHaveLength(0)
  })

  it("inline disable with rule id suppresses only that rule", () => {
    const src = `const apiKey = "sk-abc123abc123abc123abc" // hallint-disable hardcoded-secret`
    expect(findings(src)).toHaveLength(0)
  })

  it("inline disable with wrong rule id does NOT suppress", () => {
    const src = `const apiKey = "sk-abc123abc123abc123abc" // hallint-disable sql-injection`
    expect(findings(src).some(f => f.ruleId === "hardcoded-secret")).toBe(true)
  })

  it("disable-next-line suppresses all rules on the following line", () => {
    const src = [
      `// hallint-disable-next-line`,
      `const apiKey = "sk-abc123abc123abc123abc"`,
    ].join("\n")
    expect(findings(src)).toHaveLength(0)
  })

  it("disable-next-line with rule id suppresses only that rule on next line", () => {
    const src = [
      `// hallint-disable-next-line hardcoded-secret`,
      `const apiKey = "sk-abc123abc123abc123abc"`,
    ].join("\n")
    expect(findings(src)).toHaveLength(0)
  })

  it("disable-next-line does NOT suppress two lines below", () => {
    const src = [
      `// hallint-disable-next-line`,
      `const x = 1`,
      `const apiKey = "sk-abc123abc123abc123abc"`,
    ].join("\n")
    expect(findings(src).some(f => f.ruleId === "hardcoded-secret")).toBe(true)
  })

  it("disable-block / enable-block suppresses all rules in range", () => {
    const src = [
      `// hallint-disable-block`,
      `const apiKey = "sk-abc123abc123abc123abc"`,
      `eval(userInput)`,
      `// hallint-enable-block`,
    ].join("\n")
    expect(findings(src)).toHaveLength(0)
  })

  it("disable-block with rule id suppresses only that rule in range", () => {
    const src = [
      `// hallint-disable-block hardcoded-secret`,
      `const apiKey = "sk-abc123abc123abc123abc"`,
      `// hallint-enable-block`,
    ].join("\n")
    expect(findings(src).some(f => f.ruleId === "hardcoded-secret")).toBe(false)
  })

  it("disable-block with rule id does NOT suppress other rules in range", () => {
    const src = [
      `// hallint-disable-block hardcoded-secret`,
      `eval(userInput)`,
      `// hallint-enable-block`,
    ].join("\n")
    expect(findings(src).some(f => f.ruleId === "unsafe-eval")).toBe(true)
  })

  it("unclosed disable-block suppresses to EOF", () => {
    const src = [
      `// hallint-disable-block`,
      `const apiKey = "sk-abc123abc123abc123abc"`,
    ].join("\n")
    expect(findings(src)).toHaveLength(0)
  })

  it("lines outside block are still flagged", () => {
    const src = [
      `const apiKey = "sk-abc123abc123abc123abc"`,
      `// hallint-disable-block`,
      `const other = 1`,
      `// hallint-enable-block`,
    ].join("\n")
    expect(findings(src).some(f => f.ruleId === "hardcoded-secret")).toBe(true)
  })
})


describe("publicRoutes allowlist", () => {
  it("does not flag routes declared in publicRoutes", () => {
    const src = `app.get('/health', async (req, res) => { res.send('ok') })`
    const result = scanSource(src, "test.ts", {
      rules: allRules,
      publicRoutes: ["/health"]
    })
    expect(result.some(f => f.ruleId === "missing-auth-check")).toBe(false)
  })

  it("still flags routes not in the allowlist", () => {
    const src = `app.get('/users', async (req, res) => { res.send(users) })`
    const result = scanSource(src, "test.ts", {
      rules: allRules,
      publicRoutes: ["/health"]
    })
    expect(result.some(f => f.ruleId === "missing-auth-check")).toBe(true)
  })

  it("supports regex patterns in publicRoutes", () => {
    const src = `app.get('/api/docs/intro', async (req, res) => { res.send(doc) })`
    const result = scanSource(src, "test.ts", {
      rules: allRules,
      publicRoutes: [/^\/api\/docs/]
    })
    expect(result.some(f => f.ruleId === "missing-auth-check")).toBe(false)
  })
})

describe("jwt-in-localstorage", () => {
  it("flags JWT stored in localStorage", () => expect(findingsFor("jwt-in-localstorage", fixture("jwt-in-localstorage", "bad")).length).toBeGreaterThan(0))
  it("does not flag non-auth localStorage usage", () => expect(findingsFor("jwt-in-localstorage", fixture("jwt-in-localstorage", "good"))).toHaveLength(0))
})