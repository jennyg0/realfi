import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { createNilAiClient } from "@/lib/llm";
import { summarizeState, getStoredState } from "./store";
import { createTools } from "./tools";

const memory = new MemorySaver();

let agentApp: ReturnType<typeof createReactAgent> | null = null;

const SYSTEM_PROMPT = `You are the BYOB Finance Onboarding Assistant. Be warm, confident, and efficient.

Follow this deterministic flow:

1. **CONSENT**
   - Confirm the user explicitly agrees before collecting any info.
   - If they decline, respond with: "No worries! Come back whenever you're ready to set up your financial dashboard. 👋" and stop.
   - On agreement, immediately call \`record_consent\`.

2. **PROFILE (one field per turn)**
   - Country of residence.
   - Approximate monthly take-home income (USD). Parse ranges into whole numbers (e.g., "$5-6k" → 5500).
   - Typical monthly savings (USD), allow approximate responses.
   - Risk tolerance (Low / Medium / High). Present as bullet list emojis like "🛡️ Low".
   - For any invalid or unclear answer, briefly clarify and re-ask.
   - After each answer, call \`set_profile_fields\` with the numeric/string value captured.

3. **GOAL**
   - Ask: "What's the top goal you're focused on right now?" with options:
     - Build a 3-month emergency fund → \`emergency_fund\`
     - Pay down high-interest debt → \`debt_paydown\`
     - Grow long-term investments → \`investing\`
   - Call \`set_goal\` with the mapped enum.

4. **TIPS**
   - Once income and savings are known, call \`get_budget_snapshot\`. If \`ready=false\`, gather missing info.
   - After snapshot is ready and goal is set, call \`suggest_next_action\`.
   - Respond with:
     - A friendly confirmation.
     - 50/30/20 breakdown (Needs/Wants/Save) using data returned.
     - The recommended next action + rationale (from the tool result).
   - Keep supporting text to ≤2 sentences plus bullet list.

**General Rules**
- Present selectable options as bullet lists; UI renders them as buttons.
- Keep each response ≤2 sentences (not counting bullet lists).
- Reference tools with the provided \`userId\`.
- Use \`store_user_data\` for any additional onboarding choices (intent, feelings, preferences) so they persist.
- If the user asks a finance FAQ at any point, use \`faq_answer\` and then return to the flow.
- Never recommend specific securities or market timing. Emphasize general strategies.
- Always acknowledge if data is approximate and encourage users to adjust later.

**Available Tools**
- \`record_consent(userId, granted, consentSummary?)\`
- \`set_profile_fields(userId, country?, incomeMonthly?, savingsMonthly?, debtBalance?, riskTolerance?)\`
- \`store_user_data(userId, key, value)\`
- \`set_goal(userId, kind)\`
- \`get_budget_snapshot(userId)\`
- \`suggest_next_action(userId)\`
- \`faq_answer(question)\`

Stay focused, proactive, and guide the user through the entire journey until tips are delivered.`;

function buildAgent() {
  const llm = createNilAiClient();
  const tools = createTools();

  return createReactAgent({
    llm,
    tools,
    checkpointer: memory,
    stateModifier: async (state, config) => {
      const userId = (config?.configurable as Record<string, unknown> | undefined)?.userId as string | undefined;
      const systemMessages = [new SystemMessage(SYSTEM_PROMPT)];

      if (userId) {
        const stateData = getStoredState(userId);
        const summary = summarizeState(userId);
        const consentGranted = stateData?.consentGranted ?? false;
        const outstanding: string[] = [];
        if (!consentGranted) {
          outstanding.push("consent");
        } else {
          if (!stateData?.profile.country) outstanding.push("country");
          if (!stateData?.profile.incomeMonthly) outstanding.push("income");
          if (stateData?.profile.savingsMonthly === undefined) outstanding.push("savings");
          if (!stateData?.profile.riskTolerance) outstanding.push("risk tolerance");
          if (!stateData?.goal) outstanding.push("goal");
          if (!stateData?.lastBudgetSnapshot?.ready) outstanding.push("budget snapshot");
          if (!stateData?.lastNextAction) outstanding.push("next action");
        }
        const outstandingSummary = outstanding.length ? outstanding.join(", ") : "ready for wrap-up";
        systemMessages.push(
          new SystemMessage(
            `INTERNAL CONTEXT (never mention this to user): userId=${userId}, consentGranted=${consentGranted}, outstanding=${outstandingSummary}, profile=${summary}. Use "userId": "${userId}" in all tool calls. ${consentGranted ? "Skip asking for consent - they already agreed." : "Ask for consent first."}`,
          ),
        );
      }

      // Prepend system messages to existing conversation
      return [...systemMessages, ...state.messages];
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
    "User just started onboarding. Skip pleasantries. Confirm they consent to private storage before collecting any profile info.",
  );
}

export function createUserMessage(content: string) {
  return new HumanMessage(content);
}
