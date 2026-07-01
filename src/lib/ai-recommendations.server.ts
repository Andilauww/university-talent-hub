import { createServerFn } from "@tanstack/react-start";
import {
  generateAIRecommendations,
  type AIRecommendationResult,
  type StudentContext,
} from "@/lib/ai-recommendations";

/** Server function: generate AI recommendations from the provided context. */
export const getAIRecommendations = createServerFn({ method: "POST" })
  .validator((input: { ctx: StudentContext }) => input)
  .handler(async ({ data }): Promise<AIRecommendationResult> => {
    return generateAIRecommendations(data.ctx);
  });
