import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestCase {
  id: string;
  category: string;
  input: string;
  userProfile: {
    name: string;
    birthDate: string;
    birthTime: string;
    birthCity: string;
  };
  expectedToolCalled: string | null;
  expectedPass: boolean;
  notes: string;
}

interface TestResult {
  id: string;
  category: string;
  input: string;
  status: "PASS" | "FAIL" | "ERROR";
  latencyMs: number;
  toolsCalled: string[];
  responseSnippet: string;
  expectedPass: boolean;
  actuallyPassed: boolean;
  error?: string;
  estimatedTokens: number;
  estimatedCostUSD: number;
  fullResponse: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = process.env.VITE_API_URL || "http://localhost:3001";
const GPT4O_MINI_INPUT_COST = 0.00015 / 1000;   // $0.15 per 1M tokens
const GPT4O_MINI_OUTPUT_COST = 0.0006 / 1000;    // $0.60 per 1M tokens
const GOLDEN_SET_PATH = path.join(__dirname, "golden_set.jsonl");
const SCORECARD_PATH = path.join(__dirname, "SCORECARD.md");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  // Rough GPT token estimation: ~4 chars per token
  return Math.ceil(text.length / 4);
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * GPT4O_MINI_INPUT_COST) + (outputTokens * GPT4O_MINI_OUTPUT_COST);
}

function sanitizeThreadId(id: string): string {
  return `eval-${id}-${Date.now()}`;
}

async function loadGoldenSet(): Promise<TestCase[]> {
  const content = fs.readFileSync(GOLDEN_SET_PATH, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as TestCase);
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function saveProfile(testCase: TestCase, threadId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId,
        name: testCase.userProfile.name,
        birthDate: testCase.userProfile.birthDate,
        birthTime: testCase.userProfile.birthTime,
        birthCity: testCase.userProfile.birthCity,
        latitude: 0,      // Placeholder — agent will geocode
        longitude: 0,
        timezone: "UTC",  // Placeholder
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function runChatRequest(
  message: string,
  threadId: string
): Promise<{
  responseText: string;
  toolsCalled: string[];
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const start = Date.now();
      const toolsCalled: string[] = [];
      let responseText = "";

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, threadId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.slice(6).trim();
            continue;
          }

          if (trimmed.startsWith("data:")) {
            const rawData = trimmed.slice(5).trim();
            if (!rawData) continue;

            try {
              const parsed = JSON.parse(rawData);

              if (currentEvent === "token" || parsed.content !== undefined) {
                responseText += parsed.content || "";
              } else if (currentEvent === "tool_start" || parsed.input !== undefined) {
                if (parsed.tool && !toolsCalled.includes(parsed.tool)) {
                  toolsCalled.push(parsed.tool);
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      const latencyMs = Date.now() - start;
      const inputTokens = estimateTokens(message);
      const outputTokens = estimateTokens(responseText);

      return { responseText, toolsCalled, latencyMs, inputTokens, outputTokens };
    } catch (error) {
      attempt++;
      console.log(`\n⚠️ Fetch failed. Retrying ${attempt}/${MAX_RETRIES}...`);
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds before retrying
    }
  }
  throw new Error("Max retries reached");
}

// ─── Evaluation Logic ─────────────────────────────────────────────────────────

function evaluateResult(
  testCase: TestCase,
  responseText: string,
  toolsCalled: string[],
  latencyMs: number
): Partial<TestResult> {
  let actuallyPassed = true;
  let status: "PASS" | "FAIL" | "ERROR" = "PASS";

  // Check if expected tool was called
  if (testCase.expectedToolCalled) {
    const toolWasCalled = toolsCalled.includes(testCase.expectedToolCalled);
    if (!toolWasCalled) {
      actuallyPassed = false;
    }
  }

  // Check for graceful error handling on invalid cases
  if (!testCase.expectedPass) {
    // For invalid cases, we expect the agent to NOT blindly succeed — it should flag an error
    const hasErrorIndicators =
      responseText.toLowerCase().includes("invalid") ||
      responseText.toLowerCase().includes("doesn't exist") ||
      responseText.toLowerCase().includes("does not exist") ||
      responseText.toLowerCase().includes("incorrect") ||
      responseText.toLowerCase().includes("error") ||
      responseText.toLowerCase().includes("cannot") ||
      responseText.toLowerCase().includes("february only has") ||
      responseText.toLowerCase().includes("only has") ||
      responseText.toLowerCase().includes("not a valid") ||
      responseText.toLowerCase().includes("please check") ||
      responseText.toLowerCase().includes("not found");

    actuallyPassed = hasErrorIndicators;
  }

  // Response must be non-empty
  if (!responseText.trim()) {
    actuallyPassed = false;
    status = "ERROR";
  } else {
    status = actuallyPassed ? "PASS" : "FAIL";
  }

  return { actuallyPassed, status };
}

// ─── Scorecard Generator ──────────────────────────────────────────────────────

function generateScorecard(results: TestResult[]): string {
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const errors = results.filter((r) => r.status === "ERROR").length;
  
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0";
  const failureRate = total > 0 ? (((failed + errors) / total) * 100).toFixed(1) : "0";

  const totalLatency = results.reduce((s, r) => s + r.latencyMs, 0);
  const avgLatency = total > 0 ? Math.round(totalLatency / total) : 0;
  
  const sortedLatencies = [...results].map(r => r.latencyMs).sort((a, b) => a - b);
  const p50 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] : 0;
  const p95 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] : 0;

  const totalToolCalls = results.reduce((s, r) => s + r.toolsCalled.length, 0);
  const avgToolCalls = total > 0 ? (totalToolCalls / total).toFixed(1) : "0";
  
  const totalCost = results.reduce((s, r) => s + r.estimatedCostUSD, 0);
  const totalTokens = results.reduce((s, r) => s + r.estimatedTokens, 0);

  const categories = [...new Set(results.map((r) => r.category))];
  const categoryStats = categories
    .map((cat) => {
      const catResults = results.filter((r) => r.category === cat);
      const catPassed = catResults.filter((r) => r.status === "PASS").length;
      return `| ${cat} | ${catPassed}/${catResults.length} | ${((catPassed / catResults.length) * 100).toFixed(0)}% |`;
    })
    .join("\n");

  const rows = results
    .map((r) => {
      const statusEmoji = r.status === "PASS" ? "✅ PASS" : r.status === "FAIL" ? "❌ FAIL" : "⚠️ ERROR";
      const tools = r.toolsCalled.length > 0 ? r.toolsCalled.join(", ") : "none";
      const snippet = r.responseSnippet.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 60);
      return `| \`${r.id}\` | ${r.category} | ${statusEmoji} | ${r.latencyMs}ms | ${tools} | ${snippet}... |`;
    })
    .join("\n");

  return `# AstroAgent Evaluation Scorecard

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| **Pass Rate** | ${passRate}% |
| **Failure Rate** | ${failureRate}% |
| **Avg Latency** | ${(avgLatency / 1000).toFixed(1)}s |
| **P50 Latency** | ${(p50 / 1000).toFixed(1)}s |
| **P95 Latency** | ${(p95 / 1000).toFixed(1)}s |
| **Avg Tool Calls** | ${avgToolCalls} |
| **Tokens Used** | ${totalTokens} |
| **Estimated Cost** | $${totalCost.toFixed(4)} |

## Detailed Breakdown

- **Total Tests:** ${total}
- **Passed:** ${passed} ✅
- **Failed:** ${failed} ❌
- **Errors:** ${errors} ⚠️
- **Total Latency:** ${(totalLatency / 1000).toFixed(1)}s

## Pass Rate by Category

| Category | Passed | Rate |
|----------|--------|------|
${categoryStats}

## Detailed Results

| Test ID | Category | Status | Latency | Tools Called | Response Snippet |
|---------|----------|--------|---------|--------------|------------------|
${rows}

---
*Generated by AstroAgent Evaluation Runner — \`evals/runner.ts\`*
`;
}

function generateCSV(results: TestResult[]): string {
  const header = "ID,Category,Status,LatencyMs,ToolsCalled,EstimatedTokens,EstimatedCost,ExpectedPass,ActuallyPassed,Error\n";
  const rows = results.map(r => {
    return [
      r.id,
      r.category,
      r.status,
      r.latencyMs,
      `"${r.toolsCalled.join(",")}"`,
      r.estimatedTokens,
      r.estimatedCostUSD,
      r.expectedPass,
      r.actuallyPassed,
      `"${(r.error || "").replace(/"/g, '""')}"`
    ].join(",");
  }).join("\n");
  
  return header + rows;
}

// ─── Main Runner ──────────────────────────────────────────────────────────────

async function main() {
  console.log("🌟 AstroAgent Evaluation Runner");
  console.log("================================\n");

  // Check backend health
  try {
    const health = await fetch(`${API_BASE}/health`);
    if (!health.ok) throw new Error("Health check failed");
    console.log(`✅ Backend reachable at ${API_BASE}\n`);
  } catch (err) {
    console.error(`❌ Cannot reach backend at ${API_BASE}`);
    console.error("   Make sure to run: cd backend && npm run dev\n");
    process.exit(1);
  }

  const testCases = await loadGoldenSet();
  console.log(`📋 Loaded ${testCases.length} test cases from golden_set.jsonl\n`);

  const results: TestResult[] = [];
  let totalCost = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i]!;
    const threadId = sanitizeThreadId(tc.id);
    process.stdout.write(`[${i + 1}/${testCases.length}] ${tc.id} (${tc.category})... `);

    let result: TestResult = {
      id: tc.id,
      category: tc.category,
      input: tc.input,
      status: "ERROR",
      latencyMs: 0,
      toolsCalled: [],
      responseSnippet: "",
      fullResponse: "",
      expectedPass: tc.expectedPass,
      actuallyPassed: false,
      estimatedTokens: 0,
      estimatedCostUSD: 0,
    };

    try {
      // Save profile
      await saveProfile(tc, threadId);

      // Run chat
      const { responseText, toolsCalled, latencyMs, inputTokens, outputTokens } =
        await runChatRequest(tc.input, threadId);

      const cost = estimateCost(inputTokens, outputTokens);
      totalCost += cost;

      // Evaluate
      const evaluation = evaluateResult(tc, responseText, toolsCalled, latencyMs);

      result = {
        ...result,
        ...evaluation,
        latencyMs,
        toolsCalled,
        responseSnippet: responseText.slice(0, 100),
        fullResponse: responseText,
        estimatedTokens: inputTokens + outputTokens,
        estimatedCostUSD: cost,
      } as TestResult;

      const statusIcon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⚠️";
      console.log(`${statusIcon} ${result.latencyMs}ms`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.error = msg;
      result.status = "ERROR";
      console.log(`⚠️ ERROR: ${msg.slice(0, 50)}`);
    }

    results.push(result);

    // Small delay to avoid rate limits
    if (i < testCases.length - 1) {
      await new Promise((r) => setTimeout(r, 3500));
    }
  }

  // Summary
  const passed = results.filter((r) => r.status === "PASS").length;
  const passRate = ((passed / results.length) * 100).toFixed(1);

  console.log("\n================================");
  console.log(`📊 Results: ${passed}/${results.length} passed (${passRate}%)`);
  console.log(`💰 Estimated cost: $${totalCost.toFixed(4)} USD`);

  // Write scorecard
  const scorecard = generateScorecard(results);
  fs.writeFileSync(SCORECARD_PATH, scorecard, "utf-8");
  console.log(`\n📝 Scorecard written to: ${SCORECARD_PATH}`);

  // Write CSV
  const CSV_PATH = path.join(__dirname, "results.csv");
  const csvContent = generateCSV(results);
  fs.writeFileSync(CSV_PATH, csvContent, "utf-8");
  console.log(`📊 CSV results written to: ${CSV_PATH}`);

  // Write Judge Inputs
  const JUDGE_INPUTS_PATH = path.join(__dirname, "judge_inputs.json");
  const judgeInputs = results.map(r => ({
    id: r.id,
    input: r.input,
    expectedPass: r.expectedPass,
    referenceAnswer: testCases.find(tc => tc.id === r.id)?.notes || "",
    generatedAnswer: r.fullResponse || ""
  }));
  
  fs.writeFileSync(JUDGE_INPUTS_PATH, JSON.stringify(judgeInputs, null, 2), "utf-8");

  console.log("\n✨ Evaluation complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
