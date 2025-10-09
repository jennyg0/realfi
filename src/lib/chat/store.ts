import { BudgetSnapshot, GoalKind, NextActionRecommendation, StoredChatState, UserProfile } from "./types";

const chatStateStore = new Map<string, StoredChatState>();

function getOrCreateState(userId: string): StoredChatState {
  const existing = chatStateStore.get(userId);
  if (existing) {
    return existing;
  }
  const fresh: StoredChatState = {
    userId,
    consentGranted: false,
    profile: {},
    lastUpdated: Date.now(),
  };
  chatStateStore.set(userId, fresh);
  return fresh;
}

export function recordConsent(userId: string, granted: boolean, consentRecordId?: string) {
  const state = getOrCreateState(userId);
  state.consentGranted = granted;
  if (consentRecordId) {
    state.consentRecordId = consentRecordId;
  }
  state.lastUpdated = Date.now();
  chatStateStore.set(userId, state);
  return state;
}

export function upsertProfile(userId: string, fields: Partial<UserProfile>, nillionRecordId?: string) {
  const state = getOrCreateState(userId);
  state.profile = {
    ...state.profile,
    ...fields,
  };
  if (nillionRecordId) {
    state.nillionRecordId = nillionRecordId;
  }
  state.lastUpdated = Date.now();
  chatStateStore.set(userId, state);
  return state.profile;
}

export function setGoal(userId: string, goal: GoalKind) {
  const state = getOrCreateState(userId);
  state.goal = goal;
  state.lastUpdated = Date.now();
  chatStateStore.set(userId, state);
  return goal;
}

export function setBudgetSnapshot(userId: string, snapshot: BudgetSnapshot) {
  const state = getOrCreateState(userId);
  state.lastBudgetSnapshot = snapshot;
  state.lastUpdated = Date.now();
  chatStateStore.set(userId, state);
  return snapshot;
}

export function setNextAction(userId: string, nextAction: NextActionRecommendation) {
  const state = getOrCreateState(userId);
  state.lastNextAction = nextAction;
  state.lastUpdated = Date.now();
  chatStateStore.set(userId, state);
  return nextAction;
}

export function getStoredState(userId: string) {
  return chatStateStore.get(userId);
}

export function summarizeState(userId: string) {
  const state = chatStateStore.get(userId);
  if (!state) {
    return "No profile data stored yet.";
  }
  const parts = [];
  if (state.profile.country) {
    parts.push(`Country: ${state.profile.country}`);
  }
  if (state.profile.incomeMonthly) {
    parts.push(`Monthly income: ~${state.profile.incomeMonthly}`);
  }
  if (state.profile.savingsMonthly !== undefined) {
    parts.push(`Savings per month: ~${state.profile.savingsMonthly}`);
  }
  if (state.profile.debtBalance) {
    parts.push(`Debt balance approx: ${state.profile.debtBalance}`);
  }
  if (state.profile.riskTolerance) {
    parts.push(`Risk tolerance: ${state.profile.riskTolerance}`);
  }
  if (state.goal) {
    parts.push(`Goal: ${state.goal}`);
  }
  if (!parts.length) {
    return "Profile not captured yet.";
  }
  return parts.join(" | ");
}
