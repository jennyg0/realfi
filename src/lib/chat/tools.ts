import {
  AuditLogEntry,
  BudgetSnapshot,
  ConversationContext,
  GoalKind,
  NextActionRecommendation,
  ToolCall,
  ToolName,
  UserProfile,
} from "./types";
import { FAQ_CORPUS } from "./constants";

type ToolResult<T> = {
  output: T;
  auditEntry: AuditLogEntry;
  toolCall: ToolCall;
};

function logTool<T extends Record<string, unknown>>(
  context: ConversationContext,
  name: ToolName,
  args: Record<string, unknown>,
  result: T,
): ToolResult<T> {
  const timestamp = Date.now();
  const auditEntry: AuditLogEntry = {
    tool: name,
    args,
    result: result as unknown as Record<string, unknown>,
    stateAfter: context.currentState,
    timestamp,
  };

  const toolCall: ToolCall = {
    name,
    args,
    timestamp,
  };

  return {
    output: result,
    auditEntry,
    toolCall,
  };
}

export function setProfileFields(
  context: ConversationContext,
  fields: Partial<UserProfile>,
): ToolResult<{ ok: true; profile: UserProfile }> {
  context.profile = {
    ...context.profile,
    ...fields,
  };

  const result = logTool(context, "set_profile_fields", { userId: context.userId, ...fields }, { ok: true });

  return {
    output: {
      ok: true,
      profile: context.profile,
    },
    auditEntry: result.auditEntry,
    toolCall: result.toolCall,
  };
}

export function setGoal(
  context: ConversationContext,
  goal: GoalKind,
): ToolResult<{ ok: true; goal: GoalKind }> {
  context.goal = goal;
  const result = logTool(context, "set_goal", { userId: context.userId, kind: goal }, { ok: true });

  return {
    output: {
      ok: true,
      goal,
    },
    auditEntry: result.auditEntry,
    toolCall: result.toolCall,
  };
}

export function getBudgetSnapshot(context: ConversationContext): ToolResult<BudgetSnapshot> {
  const { incomeMonthly, savingsMonthly } = context.profile;

  if (!incomeMonthly || incomeMonthly <= 0 || savingsMonthly === undefined || savingsMonthly < 0) {
    const result = logTool(context, "get_budget_snapshot", { userId: context.userId }, { ready: false });

    return {
      output: {
        ready: false,
      },
      auditEntry: result.auditEntry,
      toolCall: result.toolCall,
    };
  }

  const save = Math.round(savingsMonthly);
  const needs = Math.round(incomeMonthly * 0.5);
  const wants = Math.round(incomeMonthly * 0.3);

  const snapshot: BudgetSnapshot = {
    ready: true,
    rule: "50/30/20",
    needs,
    wants,
    save,
  };

  const result = logTool(context, "get_budget_snapshot", { userId: context.userId }, snapshot);

  return {
    output: snapshot,
    auditEntry: result.auditEntry,
    toolCall: result.toolCall,
  };
}

export function suggestNextAction(context: ConversationContext): ToolResult<NextActionRecommendation> {
  const { goal } = context;
  const { savingsMonthly = 0, incomeMonthly = 0, debtBalance = 0, riskTolerance = "med" } = context.profile;

  let action = "Review your budget";
  let rationale = "Understanding where your cash goes each month keeps you in control.";

  if (goal === "emergency_fund") {
    const target = Math.round(incomeMonthly * 3);
    action = `Set aside ${Math.max(100, Math.round(incomeMonthly * 0.2))}/month toward a 3-month emergency fund (target: ${target}).`;
    rationale =
      "A healthy emergency fund shields you from surprise expenses without relying on debt.";
  } else if (goal === "debt_paydown" || debtBalance > savingsMonthly * 4) {
    action = "List debts by APR and funnel extra cash toward the highest-interest balance first.";
    rationale = "High-interest debt compounds quickly; directing surplus cash there saves on interest.";
  } else if (goal === "investing" || riskTolerance === "high") {
    action = "Automate a monthly contribution into a diversified index fund or broad crypto exposure.";
    rationale =
      "Consistent contributions harness compounding over time; adjust amounts as your income grows.";
  } else if (riskTolerance === "low") {
    action = "Keep at least 6 months of essentials in a high-yield savings account before investing.";
    rationale =
      "A larger cash buffer matches your lower risk appetite while keeping options open for future investing.";
  }

  const recommendation: NextActionRecommendation = {
    action,
    rationale,
  };

  const result = logTool(context, "suggest_next_action", { userId: context.userId }, recommendation);

  return {
    output: recommendation,
    auditEntry: result.auditEntry,
    toolCall: result.toolCall,
  };
}

export function faqAnswer(question: string): { match?: string; answer?: string } {
  for (const entry of Object.values(FAQ_CORPUS)) {
    if (entry.match.test(question)) {
      return {
        match: entry.match.source,
        answer: entry.answer,
      };
    }
  }

  return {};
}
