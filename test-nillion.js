import { NilaiOpenAIClient } from "@nillion/nilai-ts";
import "dotenv/config";

const apiKey = process.env.NILLION_API_KEY;
const baseURL = "https://nilai-a779.nillion.network/v1/";
const model = "google/gemma-3-27b-it";

console.log("Testing Nillion API...");
console.log("API Key (first 10 chars):", apiKey?.substring(0, 10) + "...");
console.log("Base URL:", baseURL);
console.log("Model:", model);

const client = new NilaiOpenAIClient({
  baseURL,
  apiKey,
});

try {
  console.log("\nMaking request...");
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: "Say hello!" }],
  });

  console.log("\nSuccess!");
  console.log("Response:", response.choices[0].message.content);
} catch (error) {
  console.error("\nError:", error.message);
  console.error("Status:", error.status);
  console.error("Full error:", error);
}
