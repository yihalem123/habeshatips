/** Structured output contract for the Claude match analysis. */
import { z } from "zod";

export const ProbTriple = z.object({
  home: z.number().min(0).max(1),
  draw: z.number().min(0).max(1),
  away: z.number().min(0).max(1),
});

export const MatchAnalysisSchema = z.object({
  /** Claude's final probability estimates after weighing the model, the market and the context. */
  probs1x2: ProbTriple,
  pOver25: z.number().min(0).max(1),
  pBtts: z.number().min(0).max(1),
  /** 1 (coin flip) to 5 (very confident) for the single best angle on this match. */
  confidence: z.number().int().min(1).max(5),
  bestAngle: z.object({
    market: z.enum(["1X2", "OU25", "BTTS"]),
    selection: z.enum(["H", "D", "A", "O", "U", "Y", "N"]),
  }),
  keyFactors: z.array(z.string()).min(2).max(6),
  riskFlags: z.array(z.string()).max(5),
  headlineEn: z.string(),
  headlineAm: z.string(),
  rationaleEn: z.string(),
  rationaleAm: z.string(),
});

export type MatchAnalysis = z.infer<typeof MatchAnalysisSchema>;
