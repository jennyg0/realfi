import { NilaiOpenAIClient, NilAuthInstance } from "@nillion/nilai-ts";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const API_KEY = process.env.NILLION_API_KEY;

async function main() {
  console.log("Testing Nillion API connection...");
  console.log("API Key present:", !!API_KEY);

  const client = new NilaiOpenAIClient({
    baseURL: "https://nilai-a779.nillion.network/v1/",
    apiKey: API_KEY,
    nilauthInstance: NilAuthInstance.SANDBOX,
  });

  try {
    const response = await client.chat.completions.create({
      model: "google/gemma-3-27b-it",
      messages: [{ role: "user", content: "Say hello in one sentence." }],
    });

    console.log("Success! Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Status:", error.status);
    console.error("Full error:", error);
  }
}

main();
