import { NillionChatModel } from "./nillion-chat-model";
import { ChatOpenAI } from "@langchain/openai";

const DEFAULT_MODEL = process.env.NIL_AI_MODEL ?? "google/gemma-3-27b-it";

export function createNilAiClient() {
  // Try Nillion first (primary for hackathon)
  const nillionApiKey =
    process.env.NILLION_NILAI_API_KEY ??
    process.env.NILLION_API_KEY ??
    process.env.NIL_AI_TOKEN;

  if (nillionApiKey) {
    console.log("[LLM] Using Nillion NilAI");
    const baseURL = process.env.NIL_AI_BASEURL ?? "https://nilai-a779.nillion.network/v1/";

    return new NillionChatModel({
      apiKey: nillionApiKey,
      model: DEFAULT_MODEL,
      temperature: 0.2,
      baseURL,
      maxRetries: Number.parseInt(process.env.NIL_AI_MAX_RETRIES ?? "5", 10),
    });
  }

  // Fallback to OpenAI if Nillion not configured
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey.startsWith('sk-')) {
    console.log("[LLM] Falling back to OpenAI (Nillion not configured)");
    return new ChatOpenAI({
      openAIApiKey: openaiKey,
      modelName: "gpt-4o-mini",
      temperature: 0.2,
      maxRetries: 3,
    });
  }

  throw new Error("NILLION_NILAI_API_KEY or OPENAI_API_KEY required");
}
