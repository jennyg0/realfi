import { NillionChatModel } from "./nillion-chat-model";

const DEFAULT_MODEL = process.env.NIL_AI_MODEL ?? "google/gemma-3-27b-it";

export function createNilAiClient() {
  const apiKey =
    process.env.NILLION_NILAI_API_KEY ??
    process.env.NILLION_API_KEY ??
    process.env.NIL_AI_TOKEN;
  if (!apiKey) {
    throw new Error("NILLION_NILAI_API_KEY (or NIL_AI_TOKEN) is required to use the NilAI client");
  }

  const baseURL = process.env.NIL_AI_BASEURL ?? "https://nilai-a779.nillion.network/v1/";

  return new NillionChatModel({
    apiKey,
    model: DEFAULT_MODEL,
    temperature: 0.2,
    baseURL,
    maxRetries: Number.parseInt(process.env.NIL_AI_MAX_RETRIES ?? "5", 10),
  });
}
