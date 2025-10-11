import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { saveSensitive, updateSensitive } from "@/lib/nillion";
import {
  getStoredState,
  recordAnswer,
  recordConsent,
  setBudgetSnapshot,
  setGoal,
  setNextAction,
  setPhase,
  upsertProfile,
} from "./store";
import { FAQ_CORPUS } from "./constants";
import { BudgetSnapshot, GoalKind, NextActionRecommendation, StoredChatState, UserProfile } from "./types";

type SensitivePayload = Record<string, unknown>;

function parseBudgetSnapshot(profile: UserProfile): BudgetSnapshot {
  const income = profile.incomeMonthly;
  const savings = profile.savingsMonthly;

  if (!income || income <= 0 || savings === undefined || savings < 0) {
    return {
      ready: false,
    };
  }

  const needs = Math.round(income * 0.5);
  const wants = Math.round(income * 0.3);
  const save = Math.round(Math.max(savings, income * 0.2));

  return {
    ready: true,
    rule: "50/30/20",
    needs,
    wants,
    save,
  };
}

function chooseNextAction(profile: UserProfile, goal?: GoalKind): NextActionRecommendation {
  const income = profile.incomeMonthly ?? 0;
  const debtBalance = profile.debtBalance ?? 0;
  const riskTolerance = profile.riskTolerance ?? "med";

  if (goal === "emergency_fund") {
    const target = Math.round(income * 3);
    const monthly = Math.max(100, Math.round(income * 0.2));
    return {
      action: `Automate ${monthly} per month toward a 3-month emergency fund (target ~${target}).`,
      rationale: "A buffered emergency fund protects against income gaps without taking on debt.",
    };
  }

  if (goal === "debt_paydown" || debtBalance > income * 4) {
    return {
      action: "List debts by APR and direct every extra dollar toward the highest-interest balance.",
      rationale: "Targeting high-APR debt first reduces interest drag and accelerates payoff momentum.",
    };
  }

  if (goal === "investing" || riskTolerance === "high") {
    const contribution = Math.max(150, Math.round(income * 0.15));
    return {
      action: `Schedule ${contribution}/month into a diversified index or crypto basket aligned with your risk.`,
      rationale: "Systematic contributions harness compounding and smooth out market volatility.",
    };
  }

  if (riskTolerance === "low") {
    return {
      action: "Grow your cash buffer to 6 months of essential expenses before adding investment risk.",
      rationale: "A larger cushion matches your risk preferences and keeps you flexible for future goals.",
    };
  }

  return {
    action: "Review your monthly cash flow and set a savings automation you can sustain.",
    rationale: "Consistent habit-based saving compounds over time and adapts with your income.",
  };
}

function buildSensitivePayload(state: StoredChatState | undefined, updates: Partial<SensitivePayload> = {}) {
  const base = {
    profile: state?.profile ?? {},
    answers: state?.answers ?? {},
    goal: state?.goal ?? null,
    consent: state?.consentGranted
      ? {
          granted: state.consentGranted,
          consentRecordId: state.consentRecordId ?? null,
        }
      : null,
  };
  return {
    ...base,
    ...updates,
    updatedAt: Date.now(),
  };
}

export function createTools() {
  const consentTool = new DynamicStructuredTool({
    name: "record_consent",
    description:
      "Persist the user's consent decision. Call this exactly once when the user explicitly says they agree (or refuse).",
    schema: z.object({
      userId: z.string(),
      granted: z.boolean(),
      consentSummary: z.string().optional(),
    }),
    func: async ({ userId, granted, consentSummary }) => {
      const state = getStoredState(userId);
      const payload = buildSensitivePayload(state, {
        consent: {
          granted,
          summary: consentSummary ?? null,
          timestamp: Date.now(),
        },
      });

      let recordId = state?.nillionRecordId;
      if (recordId) {
        await updateSensitive(recordId, payload);
      } else {
        recordId = await saveSensitive(userId, payload);
      }

      recordConsent(userId, granted, recordId);
      setPhase(userId, granted ? "profile" : "closed");
      return JSON.stringify({ ok: true, consentRecordId: recordId });
    },
  });

  const profileTool = new DynamicStructuredTool({
    name: "set_profile_fields",
    description:
      "Upsert basic profile attributes. Always include userId. Ask one field at a time. Use coarse ranges for numbers.",
    schema: z.object({
      userId: z.string(),
      country: z.string().optional(),
      incomeMonthly: z.number().int().optional(),
      savingsMonthly: z.number().int().optional(),
      debtBalance: z.number().int().optional(),
      riskTolerance: z.enum(["low", "med", "high"]).optional(),
    }),
    func: async ({ userId, ...fields }) => {
      const state = getStoredState(userId);
      const profile = { ...(state?.profile ?? {}), ...fields } as UserProfile;
      const payload = buildSensitivePayload({ ...state, profile });

      let recordId = state?.nillionRecordId ?? null;
      if (recordId) {
        await updateSensitive(recordId, payload);
      } else {
        recordId = await saveSensitive(userId, payload);
      }

      upsertProfile(userId, profile, recordId ?? undefined);
      return JSON.stringify({ ok: true, profile, nillionRecordId: recordId });
    },
  });

  const goalTool = new DynamicStructuredTool({
    name: "set_goal",
    description: "Persist the user's primary goal. Only call after the user commits to one of the enumerated options.",
    schema: z.object({
      userId: z.string(),
      kind: z.enum(["emergency_fund", "debt_paydown", "investing"]),
      targetAmount: z.number().int().optional(),
      targetDate: z.string().optional(),
    }),
    func: async ({ userId, kind }) => {
      const state = getStoredState(userId);
      const payload = buildSensitivePayload(state, { goal: kind });

      let recordId = state?.nillionRecordId ?? null;
      if (recordId) {
        await updateSensitive(recordId, payload);
      } else {
        recordId = await saveSensitive(userId, payload);
      }

      const goal = setGoal(userId, kind, recordId ?? undefined);
      return JSON.stringify({ ok: true, goal, nillionRecordId: recordId });
    },
  });

  const budgetTool = new DynamicStructuredTool({
    name: "get_budget_snapshot",
    description:
      "Compute a 50/30/20 snapshot from collected profile data. Only returns ready=true if income and savings are known.",
    schema: z.object({
      userId: z.string(),
    }),
    func: async ({ userId }) => {
      const state = getStoredState(userId);
      const snapshot = parseBudgetSnapshot(state?.profile ?? {});
      setBudgetSnapshot(userId, snapshot);
      return JSON.stringify(snapshot);
    },
  });

  const nextActionTool = new DynamicStructuredTool({
    name: "suggest_next_action",
    description:
      "Generate one actionable CTA (<150 chars) plus rationale tailored to the user's profile and goal. Call after snapshot is ready.",
    schema: z.object({
      userId: z.string(),
    }),
    func: async ({ userId }) => {
      const state = getStoredState(userId);
      const recommendation = chooseNextAction(state?.profile ?? {}, state?.goal);
      setNextAction(userId, recommendation);
      setPhase(userId, "tips");
      return JSON.stringify(recommendation);
    },
  });

  const faqTool = new DynamicStructuredTool({
    name: "faq_answer",
    description:
      "Return concise, static FAQ answers for common personal finance questions (budgeting, emergency funds, debt payoff).",
    schema: z.object({
      question: z.string(),
    }),
    func: async ({ question }) => {
      for (const entry of Object.values(FAQ_CORPUS)) {
        if (entry.match.test(question)) {
          return JSON.stringify({ answer: entry.answer });
        }
      }
      return JSON.stringify({ answer: "No FAQ match found." });
    },
  });

  const storeUserDataTool = new DynamicStructuredTool({
    name: "store_user_data",
    description:
      "Store any onboarding answer (intent, feeling, connect_first, top_goal, help_preference). Stores in NilDB privately.",
    schema: z.object({
      userId: z.string(),
      key: z.string(),
      value: z.string(),
    }),
    func: async ({ userId, key, value }) => {
      const state = getStoredState(userId);
      const answers = {
        ...(state?.answers ?? {}),
        [key]: value,
      };
      const payload = buildSensitivePayload({ ...state, answers });

      let recordId = state?.nillionRecordId ?? null;
      if (recordId) {
        await updateSensitive(recordId, payload);
      } else {
        recordId = await saveSensitive(userId, payload);
      }

      recordAnswer(userId, key, value, recordId ?? undefined);
      return JSON.stringify({ ok: true, stored: key, nillionRecordId: recordId });
    },
  });

  return [consentTool, profileTool, goalTool, budgetTool, nextActionTool, faqTool, storeUserDataTool];
}
