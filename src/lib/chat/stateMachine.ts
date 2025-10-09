import { CONSENT_KEYWORDS, GOAL_KEYWORDS, PROFILE_FIELD_ORDER, RISK_TOLERANCE_KEYWORDS } from "./constants";
import {
  ChatRequestPayload,
  ChatTurnResult,
  ConversationContext,
  GoalKind,
  ToolCall,
  UserProfile,
} from "./types";
import { faqAnswer, getBudgetSnapshot, setGoal, setProfileFields, suggestNextAction } from "./tools";

const MAX_TURNS_BEFORE_ESCALATION = 8;

export function createInitialContext(userId: string): ConversationContext {
  return {
    userId,
    turnCount: 0,
    consentGranted: false,
    currentState: "WELCOME",
    profile: {},
    auditTrail: [],
  };
}

export function ensureContext(contexts: Map<string, ConversationContext>, userId: string): ConversationContext {
  const existing = contexts.get(userId);
  if (existing) {
    return existing;
  }
  const fresh = createInitialContext(userId);
  contexts.set(userId, fresh);
  return fresh;
}

function normalizeText(input: string): string {
  return input.trim().toLowerCase();
}

function parseNumber(value: string): number | undefined {
  const digits = value.replace(/[^0-9.]/g, "");
  if (!digits) {
    return undefined;
  }
  const parsed = Number.parseFloat(digits);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed);
}

function parseRiskTolerance(value: string) {
  const normalized = normalizeText(value);
  for (const [keyword, mapped] of Object.entries(RISK_TOLERANCE_KEYWORDS)) {
    if (normalized.includes(keyword)) {
      return mapped;
    }
  }
  return undefined;
}

function detectGoal(value: string): GoalKind | undefined {
  const normalized = normalizeText(value);
  for (const [goal, keywords] of Object.entries(GOAL_KEYWORDS) as [GoalKind, readonly string[]][]) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return goal;
    }
  }
  if (/emergency/.test(normalized)) {
    return "emergency_fund";
  }
  if (/debt|payoff|pay off|loan/.test(normalized)) {
    return "debt_paydown";
  }
  if (/invest|retire|growth|portfolio|crypto/.test(normalized)) {
    return "investing";
  }
  return undefined;
}

function nextProfileField(context: ConversationContext) {
  return PROFILE_FIELD_ORDER.find((field) => context.profile[field as keyof typeof context.profile] === undefined);
}

function buildProfileQuestion(field: (typeof PROFILE_FIELD_ORDER)[number]) {
  switch (field) {
    case "country":
      return "Which country do you currently live in?";
    case "incomeMonthly":
      return "Roughly how much do you take home each month? You can answer with a range like $3k-$4k.";
    case "savingsMonthly":
      return "How much are you able to set aside for savings monthly? Ballpark is perfect.";
    case "riskTolerance":
      return "What's your comfort with risk? Low, medium, or high?";
    default:
      return "Tell me a bit more about your finances.";
  }
}

function buildGoalPrompt() {
  return "What is your top focus right now? Options: building an emergency fund, paying down debt, or investing for growth.";
}

function buildTipsResponse(context: ConversationContext) {
  const { output: snapshot, auditEntry: snapshotAudit, toolCall: snapshotCall } = getBudgetSnapshot(context);
  context.auditTrail.push(snapshotAudit);
  const toolCalls = [snapshotCall];

  const { output: nextAction, auditEntry: nextAudit, toolCall: nextCall } = suggestNextAction(context);
  context.auditTrail.push(nextAudit);
  toolCalls.push(nextCall);

  const lines = [] as string[];
  lines.push("Here's your budget snapshot based on what you've shared:");
  if (snapshot.ready && snapshot.rule === "50/30/20") {
    lines.push(`• Needs (50%): ~$${snapshot.needs}`);
    lines.push(`• Wants (30%): ~$${snapshot.wants}`);
    lines.push(`• Savings (20%): ~$${snapshot.save}`);
  } else {
    lines.push("I need your income and savings to calculate the 50/30/20 breakdown.");
  }
  lines.push("");
  lines.push(`Next step: ${nextAction.action}`);
  lines.push(`Why: ${nextAction.rationale}`);

  return {
    assistantText: lines.join("\n"),
    toolCalls,
    snapshot,
    nextAction,
  };
}

function handleWelcome(context: ConversationContext): ChatTurnResult {
  context.currentState = "CONSENT";
  const assistantText =
    "Hi! I'm your finance onboarding guide. I can help you build a quick budget snapshot and suggest your next best step. To begin, I need your consent to process the info you share. Reply with “I agree” to continue.";
  return {
    assistantText,
    nextState: context.currentState,
    context,
    toolCalls: [],
  };
}

function handleConsent(context: ConversationContext, message: string): ChatTurnResult {
  const normalized = normalizeText(message);
  const consentGiven = CONSENT_KEYWORDS.some((keyword) => normalized.includes(keyword));

  if (!consentGiven) {
    return {
      assistantText:
        "Totally fine—just let me know when you're ready by replying with “I agree” so I can capture your info securely.",
      nextState: context.currentState,
      context,
      toolCalls: [],
    };
  }

  context.consentGranted = true;
  context.currentState = "PROFILE";

  const prompt = buildProfileQuestion("country");

  return {
    assistantText: `Thanks! Let's start with the basics. ${prompt}`,
    nextState: context.currentState,
    context,
    toolCalls: [],
  };
}

function handleProfile(context: ConversationContext, message: string): ChatTurnResult {
  const pendingField = nextProfileField(context);
  const toolCalls: ToolCall[] = [];

  if (!pendingField) {
    context.currentState = "GOAL";
    return {
      assistantText: buildGoalPrompt(),
      nextState: context.currentState,
      context,
      toolCalls: [],
    };
  }

  let parsedValue: unknown;
  if (pendingField === "country") {
    parsedValue = message.trim();
  } else if (pendingField === "incomeMonthly" || pendingField === "savingsMonthly" || pendingField === "debtBalance") {
    parsedValue = parseNumber(message);
  } else if (pendingField === "riskTolerance") {
    parsedValue = parseRiskTolerance(message);
  }

  if (parsedValue === undefined || parsedValue === "") {
    return {
      assistantText: `Got it. ${buildProfileQuestion(pendingField)} (Feel free to give a quick range or single word.)`,
      nextState: context.currentState,
      context,
      toolCalls: [],
    };
  }

  const update = {
    [pendingField]: parsedValue,
  } as Partial<UserProfile>;
  const { auditEntry, toolCall } = setProfileFields(context, update);

  context.auditTrail.push(auditEntry);
  toolCalls.push(toolCall);

  const nextField = nextProfileField(context);
  if (!nextField) {
    context.currentState = "GOAL";
    return {
      assistantText: `Perfect. ${buildGoalPrompt()}`,
      nextState: context.currentState,
      context,
      toolCalls,
    };
  }

  return {
    assistantText: buildProfileQuestion(nextField),
    nextState: context.currentState,
    context,
    toolCalls,
  };
}

function handleGoal(context: ConversationContext, message: string): ChatTurnResult {
  const detectedGoal = detectGoal(message);

  if (!detectedGoal) {
    return {
      assistantText: "Thanks for sharing. Could you pick one focus: emergency fund, paying down debt, or investing?",
      nextState: context.currentState,
      context,
      toolCalls: [],
    };
  }

  const { auditEntry, toolCall } = setGoal(context, detectedGoal);
  context.auditTrail.push(auditEntry);
  context.currentState = "TIPS";

  const tips = buildTipsResponse(context);

  return {
    assistantText: tips.assistantText,
    nextState: context.currentState,
    context,
    toolCalls: [toolCall, ...tips.toolCalls],
    budgetSnapshot: tips.snapshot,
    nextAction: tips.nextAction,
  };
}

function handleTips(context: ConversationContext, message: string): ChatTurnResult {
  const faq = faqAnswer(message);
  if (faq.answer) {
    const assistantText = `${faq.answer}\n\nHave more questions or want to adjust any profile details? I'm here to help.`;
    return {
      assistantText,
      nextState: context.currentState,
      context,
      toolCalls: [],
      faqAnswer: faq.answer,
    };
  }

  if (context.turnCount >= MAX_TURNS_BEFORE_ESCALATION) {
    return {
      assistantText:
        "Thanks for the update! For deeper planning or on-chain steps, a human coach will follow up soon. Anything else you'd like to cover?",
      nextState: context.currentState,
      context,
      toolCalls: [],
    };
  }

  return {
    assistantText:
      "Thanks for the note. If you want to tweak your goal or re-run the budget snapshot, let me know what changed.",
    nextState: context.currentState,
    context,
    toolCalls: [],
  };
}

export function runOnboardingTurn(
  contexts: Map<string, ConversationContext>,
  payload: ChatRequestPayload,
): ChatTurnResult {
  const context = ensureContext(contexts, payload.userId);
  context.turnCount += 1;

  if (!context.consentGranted && context.currentState === "WELCOME") {
    return handleWelcome(context);
  }

  switch (context.currentState) {
    case "CONSENT":
      return handleConsent(context, payload.userText);
    case "PROFILE":
      return handleProfile(context, payload.userText);
    case "GOAL":
      return handleGoal(context, payload.userText);
    case "TIPS":
      return handleTips(context, payload.userText);
    case "WELCOME":
      return handleWelcome(context);
    default:
      return {
        assistantText: "I'm here to help you with your finance onboarding journey.",
        nextState: context.currentState,
        context,
        toolCalls: [],
      };
  }
}
