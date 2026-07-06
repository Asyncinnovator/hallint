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
})