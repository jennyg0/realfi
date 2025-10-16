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
import {
  BudgetSnapshot,
  GoalKind,
  NextActionRecommendation,
  StoredChatState,
  UserProfile,
} from "./types";
import { getTopYields, getYieldsByRisk, FilteredYield } from "../yields";

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

function chooseNextAction(
  profile: UserProfile,
  goal?: GoalKind
): NextActionRecommendation {
  const income = profile.incomeMonthly ?? 0;
  const debtBalance = profile.debtBalance ?? 0;
  const riskTolerance = profile.riskTolerance ?? "med";

  if (goal === "emergency_fund") {
    const target = Math.round(income * 3);
    const monthly = Math.max(100, Math.round(income * 0.2));
    return {
      action: `Automate ${monthly} per month toward a 3-month emergency fund (target ~${target}).`,
      rationale:
        "A buffered emergency fund protects against income gaps without taking on debt.",
    };
  }

  if (goal === "debt_paydown" || debtBalance > income * 4) {
    return {
      action:
        "List debts by APR and direct every extra dollar toward the highest-interest balance.",
      rationale:
        "Targeting high-APR debt first reduces interest drag and accelerates payoff momentum.",
    };
  }

  if (goal === "investing" || riskTolerance === "high") {
    const contribution = Math.max(150, Math.round(income * 0.15));
    return {
      action: `Schedule ${contribution}/month into a diversified index or crypto basket aligned with your risk.`,
      rationale:
        "Systematic contributions harness compounding and smooth out market volatility.",
    };
  }

  if (riskTolerance === "low") {
    return {
      action:
        "Grow your cash buffer to 6 months of essential expenses before adding investment risk.",
      rationale:
        "A larger cushion matches your risk preferences and keeps you flexible for future goals.",
    };
  }

  return {
    action:
      "Review your monthly cash flow and set a savings automation you can sustain.",
    rationale:
      "Consistent habit-based saving compounds over time and adapts with your income.",
  };
}

function buildSensitivePayload(
  state: StoredChatState | undefined,
  updates: Partial<SensitivePayload> = {}
) {
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
      const payload = buildSensitivePayload(state, { profile });

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
    description:
      "Persist the user's primary goal. Only call after the user commits to one of the enumerated options.",
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
      const recommendation = chooseNextAction(
        state?.profile ?? {},
        state?.goal
      );
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
      const payload = buildSensitivePayload(state, { answers });

      let recordId = state?.nillionRecordId ?? null;
      if (recordId) {
        await updateSensitive(recordId, payload);
      } else {
        recordId = await saveSensitive(userId, payload);
      }

      recordAnswer(userId, key, value, recordId ?? undefined);
      return JSON.stringify({
        ok: true,
        stored: key,
        nillionRecordId: recordId,
      });
    },
  });

  // NEW: DeFi yield recommendation tool
  const yieldRecommendationTool = new DynamicStructuredTool({
    name: "get_yield_recommendations",
    description:
      "Get personalized DeFi yield opportunities on Base network based on user's risk tolerance. Returns top stablecoin yields with APY, TVL, and safety info.",
    schema: z.object({
      userId: z.string(),
      limit: z
        .number()
        .int()
        .optional()
        .describe("Number of yields to return (default 5)"),
    }),
    func: async ({ userId, limit = 5 }) => {
      const state = getStoredState(userId);
      const riskTolerance = state?.profile.riskTolerance ?? "med";

      // Map risk tolerance to our risk categories
      const riskMap: Record<
        string,
        "Conservative" | "Balanced" | "Aggressive"
      > = {
        low: "Conservative",
        med: "Balanced",
        high: "Aggressive",
      };

      const riskCategory = riskMap[riskTolerance] || "Balanced";

      // Get yields filtered by risk
      let yields = await getYieldsByRisk(riskCategory);

      // If no yields for exact risk, fall back to all yields
      if (yields.length === 0) {
        yields = await getTopYields(limit);
      }

      // IMPORTANT: Only show yields that support deposits (canDeposit: true)
      const depositableYields = yields.filter((y) => y.canDeposit);

      // Format response - include the KEY field for DCA setup
      const recommendations = depositableYields.slice(0, limit).map((y) => ({
        key: y.key, // IMPORTANT: This is the protocol key needed for deposits/DCA
        protocol: y.protocol,
        asset: y.asset,
        apy: `${y.estApr}%`,
        tvl: `$${(y.tvl / 1000000).toFixed(1)}M`,
        risk: y.risk,
        summary: y.summary,
        canDeposit: y.canDeposit,
      }));

      return JSON.stringify({
        riskProfile: riskCategory,
        count: recommendations.length,
        yields: recommendations,
        message: `Found ${
          recommendations.length
        } ${riskCategory.toLowerCase()} risk opportunities on Base`,
      });
    },
  });

  // NEW: Explain DeFi concepts tool
  const defiExplainerTool = new DynamicStructuredTool({
    name: "explain_defi_concept",
    description:
      "Explain DeFi concepts like APY, TVL, stablecoins, liquidity pools, lending protocols in simple terms. Use when user asks 'what is...?'",
    schema: z.object({
      concept: z
        .string()
        .describe(
          "The DeFi concept to explain (e.g., 'APY', 'TVL', 'stablecoin')"
        ),
    }),
    func: async ({ concept }) => {
      const explanations: Record<string, string> = {
        apy: "APY (Annual Percentage Yield) is the yearly return on your investment including compound interest. For example, 5% APY means if you deposit $1000, you'll have $1050 after one year.",
        tvl: "TVL (Total Value Locked) shows how much money is deposited in a protocol. Higher TVL generally means more trust and security. For example, $10M TVL means $10 million is currently deposited.",
        stablecoin:
          "Stablecoins are cryptocurrencies pegged to $1 USD (like USDC, USDT, DAI). They don't fluctuate in price like Bitcoin or Ethereum, making them safer for earning yield.",
        "liquidity pool":
          "A liquidity pool is like a shared pot of money that enables trading. You deposit tokens and earn fees when people trade. Higher trading volume = more fees earned.",
        lending:
          "Lending protocols let you deposit crypto and earn interest from borrowers. It's like a bank savings account but typically with higher rates (4-8% vs 0.5%).",
        yield:
          "Yield is the return you earn on your crypto deposits. It comes from lending interest, trading fees, or protocol rewards. Think of it as passive income on your savings.",
        defi: "DeFi (Decentralized Finance) lets you earn interest, trade, and borrow without banks. Smart contracts handle everything automatically, often with better rates than traditional finance.",
      };

      const key = concept.toLowerCase();
      const explanation =
        explanations[key] ||
        explanations[
          Object.keys(explanations).find((k) => key.includes(k)) || ""
        ];

      return JSON.stringify({
        concept,
        explanation:
          explanation ||
          "I can explain concepts like APY, TVL, stablecoins, liquidity pools, lending, and yield. What would you like to know about?",
      });
    },
  });

  // NEW: Execute yield deposit tool
  const executeYieldDepositTool = new DynamicStructuredTool({
    name: "execute_yield_deposit",
    description:
      "Execute a one-time deposit into a DeFi yield protocol. Returns deposit confirmation. User must have wallet connected.",
    schema: z.object({
      userId: z.string(),
      protocolKey: z
        .string()
        .describe(
          "Protocol key from yield recommendations (e.g., 'aave-v3-usdc')"
        ),
      amount: z
        .number()
        .int()
        .describe("Amount in cents/smallest unit (e.g., 10000 = $100)"),
    }),
    func: async ({ userId, protocolKey, amount }) => {
      // This creates a pending deposit record that will be completed when user signs tx
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/yields/deposit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyId: userId,
            protocolKey,
            amount,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return JSON.stringify({
          error: data.error || "Failed to create deposit",
        });
      }

      return JSON.stringify({
        success: true,
        deposit: data.deposit,
        protocol: data.protocol,
        message: `Deposit of $${(amount / 100).toFixed(2)} into ${
          data.protocol.name
        } ${data.protocol.asset} created. APY: ${
          data.protocol.apy
        }%. Awaiting wallet signature.`,
      });
    },
  });

  // NEW: Setup DCA schedule tool
  const setupDcaScheduleTool = new DynamicStructuredTool({
    name: "setup_dca_schedule",
    description:
      "Set up recurring deposits (Dollar Cost Averaging) into a DeFi yield protocol. Automates regular deposits.",
    schema: z.object({
      userId: z.string(),
      protocolKey: z
        .string()
        .describe("Protocol key from yield recommendations"),
      amount: z
        .number()
        .int()
        .describe("Amount per deposit in cents (minimum 1000 = $10)"),
      frequency: z
        .enum(["daily", "weekly", "biweekly", "monthly"])
        .describe("How often to deposit"),
      startDate: z
        .string()
        .optional()
        .describe("ISO date string for first deposit (default: now)"),
      endDate: z
        .string()
        .optional()
        .describe("ISO date string for last deposit (null = indefinite)"),
    }),
    func: async ({
      userId,
      protocolKey,
      amount,
      frequency,
      startDate,
      endDate,
    }) => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/dca/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyId: userId,
            protocolKey,
            amount,
            frequency,
            startDate,
            endDate,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return JSON.stringify({
          error: data.error || "Failed to create DCA schedule",
        });
      }

      const schedule = data.schedule;
      return JSON.stringify({
        success: true,
        schedule: {
          id: schedule.id,
          amount: `$${(amount / 100).toFixed(2)}`,
          frequency,
          protocol: schedule.protocol,
          nextExecution: schedule.nextExecutionAt,
        },
        message: `DCA schedule created! Will deposit $${(amount / 100).toFixed(
          2
        )} ${frequency} into ${schedule.protocol.name} ${
          schedule.protocol.asset
        } (${schedule.protocol.apy}% APY).`,
      });
    },
  });

  // NEW: Get DCA schedules tool
  const getDcaSchedulesTool = new DynamicStructuredTool({
    name: "get_dca_schedules",
    description:
      "Get all DCA schedules for a user. Shows active and paused recurring deposit schedules.",
    schema: z.object({
      userId: z.string(),
    }),
    func: async ({ userId }) => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/dca/list?privyId=${userId}`
      );

      const data = await response.json();

      if (!response.ok) {
        return JSON.stringify({
          error: data.error || "Failed to fetch DCA schedules",
        });
      }

      const schedules = data.schedules.map(
        (s: {
          id: number;
          protocolKey: string;
          amount: number;
          frequency: string;
          isActive: boolean;
          nextExecutionAt: string;
          lastExecutedAt: string | null;
        }) => ({
          id: s.id,
          protocol: s.protocolKey,
          amount: `$${(s.amount / 100).toFixed(2)}`,
          frequency: s.frequency,
          isActive: s.isActive,
          nextExecution: s.nextExecutionAt,
          lastExecution: s.lastExecutedAt,
        })
      );

      return JSON.stringify({
        count: schedules.length,
        schedules,
        message:
          schedules.length === 0
            ? "No DCA schedules set up yet."
            : `You have ${schedules.length} DCA schedule${
                schedules.length > 1 ? "s" : ""
              }.`,
      });
    },
  });

  // NEW: Pause/Resume DCA schedule tool
  const updateDcaScheduleTool = new DynamicStructuredTool({
    name: "update_dca_schedule",
    description:
      "Pause or resume a DCA schedule. Use to temporarily stop or restart recurring deposits.",
    schema: z.object({
      userId: z.string(),
      scheduleId: z
        .number()
        .int()
        .describe("The ID of the DCA schedule to update"),
      isActive: z.boolean().describe("true to resume, false to pause"),
    }),
    func: async ({ userId, scheduleId, isActive }) => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/dca/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyId: userId,
            scheduleId,
            isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return JSON.stringify({
          error: data.error || "Failed to update DCA schedule",
        });
      }

      return JSON.stringify({
        success: true,
        message: data.message,
        schedule: data.schedule,
      });
    },
  });

  // NEW: Start a learning lesson
  const startLessonTool = new DynamicStructuredTool({
    name: "start_lesson",
    description:
      "Start an interactive learning lesson. User enters 'learning mode' where the bot teaches conversationally and quizzes interactively.",
    schema: z.object({
      userId: z.string(),
      lessonSlug: z
        .string()
        .describe(
          "Lesson slug (e.g., 'stock-market-investing', 'high-interest-savings')"
        ),
    }),
    func: async ({ userId, lessonSlug }) => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/learning/start-lesson`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ privyId: userId, lessonSlug }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return JSON.stringify({
          error: data.error || "Failed to start lesson",
        });
      }

      return JSON.stringify({
        success: true,
        sessionId: data.sessionId,
        lesson: data.lesson,
        firstSection: data.firstSection,
        message: `Starting lesson: ${data.lesson.title}. Now in learning mode!`,
      });
    },
  });

  // NEW: Submit answer to quiz question
  const submitAnswerTool = new DynamicStructuredTool({
    name: "submit_quiz_answer",
    description:
      "Submit user's answer to a quiz question during learning mode. Returns whether correct and guidance for next step.",
    schema: z.object({
      userId: z.string(),
      sessionId: z.number().int(),
      questionId: z.number().int(),
      userAnswer: z.string().describe("User's answer text or selected option"),
    }),
    func: async ({ userId, sessionId, questionId, userAnswer }) => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/learning/submit-answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyId: userId,
            sessionId,
            questionId,
            userAnswer,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return JSON.stringify({
          error: data.error || "Failed to submit answer",
        });
      }

      return JSON.stringify({
        correct: data.correct,
        correctAnswerIndex: data.correctAnswerIndex,
        explanation: data.explanation,
        progress: data.progress,
        message: data.correct
          ? "Correct!"
          : "Not quite right, let me help you understand...",
      });
    },
  });

  // NEW: Get current learning session state
  const getLearningStateTool = new DynamicStructuredTool({
    name: "get_learning_state",
    description:
      "Get the current state of user's active learning session. Shows which lesson, section, and question they're on.",
    schema: z.object({
      userId: z.string(),
    }),
    func: async ({ userId }) => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/learning/state?privyId=${userId}`
      );

      const data = await response.json();

      if (!response.ok) {
        return JSON.stringify({
          error: data.error || "Failed to get learning state",
        });
      }

      if (!data.session) {
        return JSON.stringify({
          inLearningMode: false,
          message: "No active learning session.",
        });
      }

      return JSON.stringify({
        inLearningMode: true,
        sessionId: data.session.id,
        lesson: data.lesson,
        currentSection: data.currentSection,
        progress: data.progress,
      });
    },
  });

  // NEW: Exit learning mode
  const exitLearningModeTool = new DynamicStructuredTool({
    name: "exit_learning_mode",
    description:
      "Exit learning mode and return to regular chat. Saves progress so user can resume later.",
    schema: z.object({
      userId: z.string(),
      sessionId: z.number().int().optional(),
    }),
    func: async ({ userId, sessionId }) => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/learning/exit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ privyId: userId, sessionId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return JSON.stringify({
          error: data.error || "Failed to exit learning mode",
        });
      }

      return JSON.stringify({
        success: true,
        message: "Exited learning mode. Your progress has been saved!",
      });
    },
  });

  return [
    consentTool,
    profileTool,
    goalTool,
    budgetTool,
    nextActionTool,
    faqTool,
    storeUserDataTool,
    yieldRecommendationTool,
    defiExplainerTool,
    executeYieldDepositTool,
    setupDcaScheduleTool,
    getDcaSchedulesTool,
    updateDcaScheduleTool,
    startLessonTool,
    submitAnswerTool,
    getLearningStateTool,
    exitLearningModeTool,
  ];
}
