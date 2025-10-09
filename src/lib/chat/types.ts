export type ChatState = "WELCOME" | "CONSENT" | "PROFILE" | "GOAL" | "TIPS" | "FAQ";

export type RiskTolerance = "low" | "med" | "high";

export type GoalKind = "emergency_fund" | "debt_paydown" | "investing";

export interface UserProfile {
  country?: string;
  incomeMonthly?: number;
  savingsMonthly?: number;
  debtBalance?: number;
  riskTolerance?: RiskTolerance;
}

export interface ConversationContext {
  userId: string;
  turnCount: number;
  consentGranted: boolean;
  currentState: ChatState;
  profile: UserProfile;
  goal?: GoalKind;
  nillionRecordId?: string;
  auditTrail: AuditLogEntry[];
}

export type ToolName =
  | "set_profile_fields"
  | "set_goal"
  | "get_budget_snapshot"
  | "suggest_next_action"
  | "faq_answer";

export interface ToolCall<TName extends ToolName = ToolName, TArgs = Record<string, unknown>> {
  name: TName;
  args: TArgs;
  timestamp: number;
}

export interface AuditLogEntry {
  tool: ToolName;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  stateAfter: ChatState;
  timestamp: number;
}

export interface ChatTurnResult {
  assistantText: string;
  nextState: ChatState;
  context: ConversationContext;
  toolCalls: ToolCall[];
  faqAnswer?: string;
  budgetSnapshot?: BudgetSnapshot;
  nextAction?: NextActionRecommendation;
}

export interface BudgetSnapshot {
  ready: boolean;
  rule?: "50/30/20";
  needs?: number;
  wants?: number;
  save?: number;
}

export interface NextActionRecommendation {
  action: string;
  rationale: string;
}

export interface ChatRequestPayload {
  userId: string;
  userText: string;
}
