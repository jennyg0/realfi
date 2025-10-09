import { ChatOpenAI } from "@langchain/openai";

const DEFAULT_MODEL = process.env.NIL_AI_MODEL ?? "gpt-4o-mini";

export function createNilAiClient() {
  const apiKey = process.env.NIL_AI_TOKEN ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("NIL_AI_TOKEN (or OPENAI_API_KEY) is required to call the LLM");
  }

  return new ChatOpenAI({
    apiKey,
    model: DEFAULT_MODEL,
    streaming: true,
    temperature: 0.2,
    configuration: {
      baseURL: process.env.NIL_AI_BASEURL ?? process.env.OPENAI_BASE_URL,
    },
  });
}
