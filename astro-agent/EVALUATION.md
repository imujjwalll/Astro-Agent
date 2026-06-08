# AstroAgent Evaluation System

## Overview

The AstroAgent evaluation framework tests the AI agent's ability to:

1. **Calculate accurate birth charts** using real Swiss Ephemeris data
2. **Geocode cities correctly** via OpenStreetMap
3. **Handle invalid inputs gracefully** (e.g., February 30th, December 32nd)
4. **Call the right tools** for each type of question
5. **Maintain conversation quality** across different astrological topics

---

## Golden Test Set

**File:** `evals/golden_set.jsonl`
**Test Cases:** 25

### Categories

| Category | Count | Description |
|----------|-------|-------------|
| `sun_sign` | 2 | Sun sign queries |
| `moon_sign` | 1 | Moon sign and emotions |
| `rising_sign` | 1 | Ascendant/rising sign |
| `full_chart` | 1 | Complete birth chart reading |
| `geocoding` | 2 | City geocoding (including unknown cities) |
| `invalid_date` | 3 | Feb 30, Dec 32, Apr 31 |
| `retrograde` | 1 | Retrograde planet detection |
| `planetary_placement` | 2 | Venus, Mars placements |
| `houses` | 1 | House system queries |
| `interpretation` | 1 | Personality traits |
| `multi_turn` | 1 | Follow-up questions |
| `midheaven` | 1 | MC / career path |
| `elements` | 1 | Elemental analysis |
| `nodal_axis` | 1 | North/South nodes |
| `saturn` | 1 | Saturn return |
| `general` | 1 | General astrology education |
| `invalid_year` | 1 | Year 0 edge case |
| `future_date` | 1 | Future birth date |
| `compatibility` | 1 | Zodiac compatibility |
| `timing` | 1 | Astrological timing |
| `special_placements` | 1 | Critical degrees |

---

## Evaluation Criteria

### Pass Conditions

**For `expectedPass: true` cases:**
- Agent produces a non-empty response
- If `expectedToolCalled` is set, that tool must appear in the SSE `tool_start` events
- Response should be relevant to the question

**For `expectedPass: false` cases (invalid input):**
- Agent must NOT blindly provide fake data
- Response must contain error-indicating language:
  - "invalid", "doesn't exist", "error", "cannot", "only has N days", etc.
- Graceful handling is considered a PASS

### Metrics Tracked

| Metric | Description |
|--------|-------------|
| **Status** | PASS / FAIL / ERROR |
| **Latency (ms)** | Time from request to last SSE token |
| **Tools Called** | Which LangGraph tools were invoked |
| **Response Snippet** | First 100 chars of response |
| **Estimated Cost** | GPT-4o-mini token cost estimate |

---

## Running Evaluations

### Prerequisites

1. Backend running on port 3001
2. MongoDB connected
3. `OPENROUTER_API_KEY` set in `.env`

### Run the Suite

```bash
# Start backend first (separate terminal)
cd astro-agent/backend
npm run dev

# Run evaluation
cd astro-agent/evals
npx ts-node runner.ts
```

The runner will:
1. Check backend health
2. Load all 25 test cases
3. Save a temporary user profile per test
4. Call `POST /api/chat` with SSE streaming
5. Parse token and tool events
6. Evaluate pass/fail
7. Write `SCORECARD.md`

---

## Interpreting Results

### Good Score Indicators

- Pass rate ≥ **80%** — Acceptable
- Pass rate ≥ **90%** — Good
- Pass rate ≥ **95%** — Excellent
- Avg latency < **10s** — Good (LLM + tool calls)
- All 3 invalid date cases PASS (graceful error handling)

### Common Failure Modes

| Failure | Likely Cause |
|---------|-------------|
| Tool not called | System prompt unclear, LLM chose not to use tool |
| Invalid date not caught | Validation logic in ephemeris tool missed the case |
| City geocoding fails | OpenStreetMap API unavailable or timeout |
| Empty response | SSE parsing issue, stream ended prematurely |
| ERROR status | Network error, backend crash, rate limit |

### Cost Estimation

GPT-4o-mini pricing (as of 2024):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

Running all 25 tests typically costs **$0.01–$0.05 USD** total.

---

## Adding Test Cases

To add a new test case, append a JSON line to `golden_set.jsonl`:

```jsonl
{"id":"tc026","category":"your_category","input":"Your question here","userProfile":{"name":"Test User","birthDate":"1990-01-01","birthTime":"12:00","birthCity":"London"},"expectedToolCalled":"compute_birth_chart","expectedPass":true,"notes":"Description of what this tests"}
```

Field reference:
- `id` — Unique identifier (e.g., `tc026`)
- `category` — Test category string
- `input` — The user's message to the agent
- `userProfile` — Birth profile to pre-load
- `expectedToolCalled` — `"geocode_city"`, `"compute_birth_chart"`, or `null`
- `expectedPass` — `true` if this should succeed, `false` if the agent should catch an error
- `notes` — Human description of the test intent

---

## Evaluation Output Sample

```
🌟 AstroAgent Evaluation Runner
================================

✅ Backend reachable at http://localhost:3001

📋 Loaded 25 test cases from golden_set.jsonl

[1/25] tc001 (sun_sign)... ✅ 4231ms
[2/25] tc002 (moon_sign)... ✅ 5102ms
[3/25] tc003 (rising_sign)... ✅ 6890ms
[4/25] tc006 (invalid_date)... ✅ 3210ms  ← graceful error handling PASSES
...

================================
📊 Results: 23/25 passed (92.0%)
💰 Estimated cost: $0.0312 USD

📝 Scorecard written to: evals/SCORECARD.md
✨ Evaluation complete!
```

## Judge Validation

- **Sample Size**: 0
- **Judge Agreement Rate**: 0%

*(Note: Agreement calculated against mock human baseline with ±1.0 tolerance)*