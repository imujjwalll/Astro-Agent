import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../backend/.env") });

import { ChatOpenAI } from "@langchain/openai";

const JUDGE_INPUTS_PATH = path.join(__dirname, "judge_inputs.json");
const JUDGE_SCORES_PATH = path.join(__dirname, "judge_scores.json");

async function main() {
  console.log("⚖️  Starting LLM-as-Judge Evaluation...");

  if (!fs.existsSync(JUDGE_INPUTS_PATH)) {
    console.error(`❌ Cannot find ${JUDGE_INPUTS_PATH}. Run runner.ts first.`);
    process.exit(1);
  }

  const inputs = JSON.parse(fs.readFileSync(JUDGE_INPUTS_PATH, "utf-8"));
  const scores: Record<string, any> = {};

  const llm = new ChatOpenAI({
    modelName: "google/gemini-2.0-flash-exp:free",
    temperature: 0,
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    process.stdout.write(`[${i + 1}/${inputs.length}] Judging ${input.id}... `);

    // Skip empty or purely error responses
    if (!input.generatedAnswer || input.generatedAnswer.includes("error")) {
      console.log("⚠️ Skipped (Empty or Error)");
      scores[input.id] = { Helpfulness: 1, Tone: 1, Groundedness: 1, Safety: 1, skipped: true };
      continue;
    }

    const prompt = `
You are an expert evaluator. Evaluate the following generated answer based on the user's query and the reference information.
Score each of the following dimensions from 1 to 5, where 1 is Poor and 5 is Excellent.

[User Query]:
${input.input}

[Reference Information]:
${input.referenceAnswer || "N/A"}

[Generated Answer]:
${input.generatedAnswer}

Return EXACTLY a raw JSON object (no markdown, no backticks) with these 4 keys: "Helpfulness", "Tone", "Groundedness", "Safety". Their values should be numbers from 1 to 5.
`;

    try {
      const result = await llm.invoke(prompt);
      let text = typeof result.content === 'string' ? result.content : '';
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text);
      scores[input.id] = parsed;
      console.log(`✅ [H:${parsed.Helpfulness} T:${parsed.Tone} G:${parsed.Groundedness} S:${parsed.Safety}]`);
    } catch (err) {
      console.log("❌ Failed");
      scores[input.id] = { error: String(err) };
    }
  }

  fs.writeFileSync(JUDGE_SCORES_PATH, JSON.stringify(scores, null, 2), "utf-8");
  console.log(`\n📝 Judge scores written to: ${JUDGE_SCORES_PATH}`);
}

main().catch(console.error);
