export type RiskTolerance = "low" | "med" | "high";

export type GoalKind = "emergency_fund" | "debt_paydown" | "investing";

export interface UserProfile {
  country?: string;
  incomeMonthly?: number;
  savingsMonthly?: number;
  debtBalance?: number;
  riskTolerance?: RiskTolerance;
  intent?: string;
  feeling?: string;
  connect_first?: string;
  top_goal?: string;
  help_preference?: string;
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

export interface LearningModeState {
  isActive: boolean;
  sessionId?: number;
  lessonId?: number;
  lessonTitle?: string;
  currentSection?: number;
  awaitingAnswer?: boolean; // True when bot asked a quiz question
}

export interface StoredChatState {
  userId: string;
  consentGranted: boolean;
  profile: UserProfile;
  goal?: GoalKind;
  answers?: Record<string, string>;
  phase?: string;
  nillionRecordId?: string;
  consentRecordId?: string;
  lastBudgetSnapshot?: BudgetSnapshot;
  lastNextAction?: NextActionRecommendation;
  learningMode?: LearningModeState;
  userData?: Record<string, any>; // For storing intent, feeling, preferences, etc.
  lastUpdated: number;
}
