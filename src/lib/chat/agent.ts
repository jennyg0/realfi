import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { createNilAiClient } from "@/lib/llm";
import { buildContextSummary } from "./store";
import { createTools } from "./tools";

const memory = new MemorySaver();

let agentApp: ReturnType<typeof createReactAgent> | null = null;

const SYSTEM_PROMPT = `
You are the Finance Onboarding Assistant. Be concise, friendly, and strategic.

- Always respect guardrails: no specific securities, no market timing, no guaranteed returns.
- Collect consent explicitly before storing any personal data.
- Ask one profile question per turn (country, income range, savings, debt, risk tolerance).
- After profile is complete, confirm a goal (emergency fund, debt paydown, investing).
- Use tools to store or fetch data; never invent values. Tool outputs are authoritative.
- Once the profile and goal are captured, call get_budget_snapshot then suggest_next_action.
- Tailor guidance to the user’s context and prefer ranges over precise dollar amounts.
- If unsure, ask a clarifying question; never guess.
`.trim();

function buildAgent() {
  const llm = createNilAiClient();
  const tools = createTools();

  return createReactAgent({
    llm,
    tools,
    checkpointer: memory,
    stateModifier: async (_state, config) => {
      const userId = (config?.configurable as Record<string, unknown> | undefined)?.userId as string | undefined;
      const base = [new SystemMessage(SYSTEM_PROMPT)];

      if (userId) {
        const summary = buildContextSummary(userId);
        base.push(
          new SystemMessage(
            `Current userId: ${userId}. Known profile summary: ${summary}. Always include "userId": "${userId}" in tool calls.`,
          ),
        );
      }

      return base;
    },
  });
}

export function getOnboardingAgent() {
  if (!agentApp) {
    agentApp = buildAgent();
  }
  return agentApp;
}

export function createStartMessage() {
  return new HumanMessage(
    "We are starting a new onboarding session. Greet the user, explain what you can help with, and request explicit consent to proceed.",
  );
}

export function createUserMessage(content: string) {
  return new HumanMessage(content);
}
