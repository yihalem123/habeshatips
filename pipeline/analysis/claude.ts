/**
 * Claude analysis call. One request per match, structured output, cached system prompt,
 * server-side refusal fallback enabled (fallbacks: "default").
 * Set ANALYSIS_MOCK=1 to return a canned analysis without calling the API.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MatchAnalysisSchema, type MatchAnalysis } from "./schema";
import { ANALYSIS_SYSTEM_PROMPT, buildUserMessage, type MatchPacket } from "./prompt";

export interface AnalysisResult {
  analysis: MatchAnalysis;
  model: string;
  usage: Record<string, unknown>;
  servedBy: string;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export function mockAnalysis(p: MatchPacket): MatchAnalysis {
  const b = p.model.blended;
  const pick = b.pH >= b.pA ? "H" : "A";
  return {
    probs1x2: { home: b.pH, draw: b.pD, away: b.pA },
    pOver25: b.pOver25,
    pBtts: b.pBtts,
    confidence: 3,
    bestAngle: { market: "1X2", selection: pick },
    keyFactors: ["Mock analysis: market-anchored probabilities", "No live model call was made"],
    riskFlags: ["ANALYSIS_MOCK=1"],
    headlineEn: `${p.home} vs ${p.away}: mock analysis`,
    headlineAm: `${p.home} ከ ${p.away}: የሙከራ ትንታኔ`,
    rationaleEn: `This is a mock rationale for ${p.home} against ${p.away}. The pipeline ran without calling Claude, so probabilities equal the market-blended model output. Bet responsibly.`,
    rationaleAm: `ይህ ለ${p.home} እና ${p.away} ጨዋታ የሙከራ ትንታኔ ነው። ክላውድ ሳይጠራ ስለሄደ እድሎቹ ከገበያው ጋር የተቀላቀሉ የሞዴል ውጤቶች ናቸው። በኃላፊነት ይወራረዱ።`,
  };
}

export async function analyzeMatch(packet: MatchPacket): Promise<AnalysisResult> {
  const model = process.env.ANALYSIS_MODEL ?? "claude-opus-5-5";
  if (process.env.ANALYSIS_MOCK === "1") {
    return { analysis: mockAnalysis(packet), model: "mock", usage: {}, servedBy: "mock" };
  }

  const effort = (process.env.ANALYSIS_EFFORT ?? "medium") as "low" | "medium" | "high";
  const response = await getClient().beta.messages.parse({
    model,
    max_tokens: 4096,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: ANALYSIS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserMessage(packet) }],
    output_config: { format: zodOutputFormat(MatchAnalysisSchema), effort },
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined to analyse ${packet.home} vs ${packet.away}: ${JSON.stringify(response.stop_details)}`);
  }
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`No structured output for ${packet.home} vs ${packet.away} (stop_reason=${response.stop_reason})`);

  const s = parsed.probs1x2.home + parsed.probs1x2.draw + parsed.probs1x2.away;
  if (s > 0) {
    parsed.probs1x2 = { home: parsed.probs1x2.home / s, draw: parsed.probs1x2.draw / s, away: parsed.probs1x2.away / s };
  }
  return {
    analysis: parsed,
    model,
    usage: JSON.parse(JSON.stringify(response.usage)),
    servedBy: response.model,
  };
}
