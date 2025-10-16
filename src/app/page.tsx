"use client";

import { useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Zap,
  CheckCircle,
  BookOpen,
  TrendingUp,
} from "react-feather";
import { LessonModal } from "../components/LessonModal";
import { GoalsManager } from "../components/GoalsManager";
import { StrategyDetails } from "../components/StrategyDetails";
import { WelcomeFlow } from "../components/WelcomeFlow";
import { AccountBalances } from "../components/AccountBalances";
import { PortfolioPieChart } from "../components/PortfolioPieChart";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { GoodDollarClaim } from "../components/GoodDollarClaim";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Heading, Text } from "@/components/ui/typography";
import { Flex } from "@/components/ui/flex";
import { Grid } from "@/components/ui/grid";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const RISK_OPTIONS = [
  {
    value: "Conservative",
    label: "Conservative",
    copy: "Safety-first, steady yields",
  },
  {
    value: "Balanced",
    label: "Balanced",
    copy: "Blend of yield and stability",
  },
  {
    value: "Aggressive",
    label: "Aggressive",
    copy: "Higher upside, higher risk",
  },
] as const;

type RiskValue = (typeof RISK_OPTIONS)[number]["value"];

type Profile = {
  id: number;
  privyId: string;
  wallet: string;
  displayName?: string;
  riskPreference?: string;
  savingsTarget?: number;
  createdAt: Date;
  updatedAt: Date;
};

type Goal = {
  id: number;
  profileId: number;
  targetAmount: number;
  depositedAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

type Streak = {
  current: number;
  longest: number;
};

type UserBadge = {
  id: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  xp?: number;
};

type Lesson = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  order: number;
  xpReward: number;
};

type DashboardSummary = {
  profile: Profile;
  goal: Goal | null;
  totalXp: number;
  streak: Streak | null;
  badges: UserBadge[];
  completedLessons: number;
  totalExternalBalances: number;
  totalGoalBalances: number;
};

type Strategy = {
  key: string;
  title: string;
  protocol: string;
  chain: string;
  estApr: number;
  summary: string;
  risk: string;
};

export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const queryClient = useQueryClient();

  // Fetch profile data
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/profiles/current?privyId=${user.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: authenticated && ready && !!user,
  });

  // Fetch lessons
  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await fetch("/api/lessons/list");
      return res.json();
    },
  });

  // Fetch real yields from DefiLlama
  const { data: yields = [] } = useQuery({
    queryKey: ["yields"],
    queryFn: async () => {
      const res = await fetch("/api/yields?all=true");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Also fetch legacy strategies for backwards compatibility
  const { data: strategies = [] } = useQuery({
    queryKey: ["strategies"],
    queryFn: async () => {
      const res = await fetch("/api/strategies/list");
      return res.json();
    },
    enabled: authenticated && ready,
  });

  // Fetch all badges
  const { data: allBadges = [] } = useQuery({
    queryKey: ["allBadges"],
    queryFn: async () => {
      const res = await fetch("/api/badges/list");
      return res.json();
    },
  });

  // Fetch account balances
  const { data: accountBalances = [], refetch: refetchBalances } = useQuery({
    queryKey: ["balances", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/balances/list?privyId=${user.id}`);
      return res.json();
    },
    enabled: authenticated && ready && !!user,
  });

  // Fetch DCA schedules
  const { data: dcaSchedulesData } = useQuery({
    queryKey: ["dcaSchedules", user?.id],
    queryFn: async () => {
      if (!user?.id) return { schedules: [] };
      const res = await fetch(`/api/dca/list?privyId=${user.id}`);
      if (!res.ok) return { schedules: [] };
      return res.json();
    },
    enabled: authenticated && ready && !!user,
    refetchInterval: 10000, // Auto-refetch every 10 seconds to catch DCA created via chat
  });

  const primaryWallet = useMemo(() => {
    if (!user) return "";
    if (user.wallet?.address) return user.wallet.address;
    const linkedWallet = user.linkedAccounts?.find((account) =>
      "address" in account ? Boolean(account.address) : false
    ) as { address?: string } | undefined;
    return linkedWallet?.address ?? "";
  }, [user]);

  if (!ready) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="text-center space-y-4">
          <Text size="6">Initializing app…</Text>
          <Text size="3" color="gray">
            Setting up authentication
          </Text>
          <Button
            variant="soft"
            onClick={() => window.location.reload()}
            style={{ marginTop: "20px" }}
          >
            Refresh if stuck
          </Button>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return <LandingScreen onConnect={login} />;
  }

  // Show loading while fetching profile
  if (profileLoading) {
    return <DashboardSkeleton />;
  }

  // Show onboarding if no profile exists
  if (!profileData) {
    return (
      <OnboardingScreen
        defaultWallet={primaryWallet}
        onSubmit={async (values) => {
          try {
            if (!user?.id) throw new Error("No user ID");
            const res = await fetch("/api/profiles/upsert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                privyId: user.id,
                wallet: values.wallet,
                displayName: values.displayName,
                riskPreference: values.risk,
                savingsTarget: values.goal,
              }),
            });

            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.error || "Failed to create profile");
            }

            // Invalidate profile query to refetch
            await queryClient.invalidateQueries({
              queryKey: ["profile", user.id],
            });
          } catch (error) {
            alert(
              `Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }}
        onLogout={logout}
      />
    );
  }

  // Create dashboard summary from real data
  const dashboard: DashboardSummary = {
    profile: profileData.profile,
    goal: profileData.goal,
    totalXp: profileData.totalXp,
    streak: profileData.streak,
    badges: profileData.badges,
    completedLessons: profileData.completedLessons || 0,
    totalExternalBalances: profileData.totalExternalBalances || 0,
    totalGoalBalances: profileData.totalGoalBalances || 0,
  };

  return (
    <DashboardScreen
      dashboard={dashboard}
      lessons={lessons}
      strategies={yields.length > 0 ? yields : strategies ?? []}
      allBadges={allBadges ?? []}
      accountBalances={[...accountBalances]}
      dcaSchedules={dcaSchedulesData?.schedules ?? []}
      privyId={user!.id}
      onLogout={logout}
      onBalanceChange={() => refetchBalances()}
      onDataChange={async () => {
        await queryClient.invalidateQueries({
          queryKey: ["profile", user!.id],
        });
        await queryClient.invalidateQueries({
          queryKey: ["balances", user!.id],
        });
        await queryClient.invalidateQueries({
          queryKey: ["dcaSchedules", user!.id],
        });
      }}
    />
  );
}

type LandingProps = {
  onConnect: () => void;
};

function LandingScreen({ onConnect }: LandingProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-gray-50">
      <div className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="mb-6 text-6xl">💰</div>
          <Heading size="9" className="mb-4">
            RealFi: Your Path to Financial Freedom
          </Heading>
          <Text size="5" color="gray" className="mb-8 max-w-3xl mx-auto">
            Learn DeFi, earn real yields, and claim free daily UBI. Build wealth
            with interactive lessons and actionable strategies.
          </Text>
          <Flex justify="center">
            <Button size="lg" onClick={onConnect}>
              Get Started Free <ArrowRight size={20} />
            </Button>
          </Flex>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
            <CardContent className="pt-6">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4 mx-auto">
                <Text size="6">🎁</Text>
              </div>
              <Heading size="4" className="mb-3 text-center">
                Daily UBI Claims
              </Heading>
              <Text size="2" color="gray" className="text-center mb-4">
                Claim free G$ tokens every day through GoodDollar&apos;s
                Universal Basic Income program on Celo and Fuse networks.
              </Text>
              <div className="bg-white p-3 rounded-lg">
                <Text size="1" weight="bold" className="text-center block mb-1">
                  Free Daily Income
                </Text>
                <Text size="1" color="gray" className="text-center block">
                  No investment required
                </Text>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-purple-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center mb-4 mx-auto">
                <BookOpen size={32} color="white" />
              </div>
              <Heading size="4" className="mb-3 text-center">
                Interactive Learning
              </Heading>
              <Text size="2" color="gray" className="text-center mb-4">
                Master DeFi concepts through bite-sized lessons. Earn XP, unlock
                badges, and build your financial knowledge.
              </Text>
              <div className="space-y-2">
                <Flex justify="between" className="bg-white p-2 rounded">
                  <Text size="1">Lessons Completed</Text>
                  <Text size="1" weight="bold">
                    0/12
                  </Text>
                </Flex>
                <Flex justify="between" className="bg-white p-2 rounded">
                  <Text size="1">XP Earned</Text>
                  <Text size="1" weight="bold">
                    0
                  </Text>
                </Flex>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center mb-4 mx-auto">
                <TrendingUp size={32} color="white" />
              </div>
              <Heading size="4" className="mb-3 text-center">
                Yield Strategies
              </Heading>
              <Text size="2" color="gray" className="text-center mb-4">
                Access curated DeFi strategies with real yields. Compare returns
                and grow your savings faster than traditional banks.
              </Text>
              <div className="bg-white p-3 rounded-lg">
                <Text size="1" color="gray" className="text-center block mb-1">
                  Average APR
                </Text>
                <Heading
                  size="5"
                  className="text-center"
                  style={{ color: "#10b981" }}
                >
                  4.5%
                </Heading>
                <Text size="1" color="gray" className="text-center block">
                  vs 0.05% in banks
                </Text>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mb-16">
          <CardContent className="pt-6">
            <Heading size="5" className="mb-8 text-center">
              How It Works
            </Heading>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center mb-4 mx-auto">
                  <Text size="5" className="text-white font-bold">
                    1
                  </Text>
                </div>
                <Heading size="3" className="mb-2">
                  Connect
                </Heading>
                <Text size="2" color="gray">
                  Connect your wallet with email or existing wallet
                </Text>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4 mx-auto">
                  <Text size="5" className="text-white font-bold">
                    2
                  </Text>
                </div>
                <Heading size="3" className="mb-2">
                  Learn
                </Heading>
                <Text size="2" color="gray">
                  Complete interactive lessons and earn XP
                </Text>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center mb-4 mx-auto">
                  <Text size="5" className="text-white font-bold">
                    3
                  </Text>
                </div>
                <Heading size="3" className="mb-2">
                  Claim
                </Heading>
                <Text size="2" color="gray">
                  Claim free daily UBI from GoodDollar
                </Text>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-pink-500 flex items-center justify-center mb-4 mx-auto">
                  <Text size="5" className="text-white font-bold">
                    4
                  </Text>
                </div>
                <Heading size="3" className="mb-2">
                  Grow
                </Heading>
                <Text size="2" color="gray">
                  Deploy strategies and watch your wealth grow
                </Text>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Comparison */}
        <Card className="mb-16">
          <CardContent className="pt-6">
            <Heading size="5" className="mb-6 text-center">
              Why Choose RealFi Over Traditional Banking?
            </Heading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Heading size="3" className="mb-4 text-center">
                  Traditional Banking
                </Heading>
                <div className="space-y-3">
                  <Flex
                    gap="3"
                    align="center"
                    className="p-3 bg-red-50 rounded-lg"
                  >
                    <div className="text-red-500 text-xl">❌</div>
                    <Text size="2">0.05% average savings rate</Text>
                  </Flex>
                  <Flex
                    gap="3"
                    align="center"
                    className="p-3 bg-red-50 rounded-lg"
                  >
                    <div className="text-red-500 text-xl">❌</div>
                    <Text size="2">No financial education</Text>
                  </Flex>
                  <Flex
                    gap="3"
                    align="center"
                    className="p-3 bg-red-50 rounded-lg"
                  >
                    <div className="text-red-500 text-xl">❌</div>
                    <Text size="2">Hidden fees and charges</Text>
                  </Flex>
                  <Flex
                    gap="3"
                    align="center"
                    className="p-3 bg-red-50 rounded-lg"
                  >
                    <div className="text-red-500 text-xl">❌</div>
                    <Text size="2">No passive income options</Text>
                  </Flex>
                </div>
              </div>
              <div>
                <Heading size="3" className="mb-4 text-center">
                  RealFi Platform
                </Heading>
                <div className="space-y-3">
                  <Flex
                    gap="3"
                    align="center"
                    className="p-3 bg-green-50 rounded-lg"
                  >
                    <CheckCircle size={20} color="#10b981" />
                    <Text size="2">4.5%+ DeFi yields</Text>
                  </Flex>
                  <Flex
                    gap="3"
                    align="center"
                    className="p-3 bg-green-50 rounded-lg"
                  >
                    <CheckCircle size={20} color="#10b981" />
                    <Text size="2">Interactive lessons with XP rewards</Text>
                  </Flex>
                  <Flex
                    gap="3"
                    align="center"
                    className="p-3 bg-green-50 rounded-lg"
                  >
                    <CheckCircle size={20} color="#10b981" />
                    <Text size="2">Transparent, no hidden costs</Text>
                  </Flex>
                  <Flex
                    gap="3"
                    align="center"
                    className="p-3 bg-green-50 rounded-lg"
                  >
                    <CheckCircle size={20} color="#10b981" />
                    <Text size="2">Free daily UBI from GoodDollar</Text>
                  </Flex>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Final CTA */}
        <Card className="bg-gradient-to-br from-blue-500 to-purple-600 border-0 text-center">
          <CardContent className="pt-8 pb-8">
            <Heading size="6" className="mb-4" style={{ color: "white" }}>
              Ready to Transform Your Financial Future?
            </Heading>
            <Text
              size="3"
              className="mb-6"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              Join thousands learning DeFi, claiming UBI, and building wealth.
            </Text>
            <Button
              size="lg"
              onClick={onConnect}
              style={{ backgroundColor: "white", color: "#6366f1" }}
            >
              Get Started Now <ArrowRight size={20} />
            </Button>
            <div className="mt-6 flex justify-center gap-8">
              <div>
                <Text size="1" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Free Forever
                </Text>
              </div>
              <div>
                <Text size="1" style={{ color: "rgba(255,255,255,0.7)" }}>
                  No Credit Card
                </Text>
              </div>
              <div>
                <Text size="1" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Start Earning Today
                </Text>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

type OnboardingValues = {
  displayName: string;
  wallet: string;
  risk: RiskValue;
  goal: number;
};

type OnboardingProps = {
  defaultWallet: string;
  onSubmit: (values: OnboardingValues) => Promise<void>;
  onLogout: () => void;
};

function OnboardingScreen({
  defaultWallet,
  onSubmit,
  onLogout,
}: OnboardingProps) {
  const [displayName, setDisplayName] = useState("");
  const [goal, setGoal] = useState(200);
  const [risk, setRisk] = useState<RiskValue>("Conservative");
  const [wallet, setWallet] = useState(defaultWallet);
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "done">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const readyToSubmit = wallet.trim().length > 0 && goal > 0;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-background">
      <Card className="max-w-[520px] w-full">
        <CardContent className="pt-6">
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
              <Heading size="6">Set up your plan</Heading>
              <Button variant="ghost" size="2" onClick={onLogout}>
                Log out
              </Button>
            </Flex>
            <Text color="gray" size="3">
              Tell us how you want to save so we can personalize lessons and
              yield actions.
            </Text>

            <label className="flex flex-col gap-2">
              <Text weight="medium">Display name</Text>
              <input
                className="rounded-md border px-3 py-2"
                placeholder="Optional nickname"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <Text weight="medium">Primary wallet</Text>
              <input
                className="rounded-md border px-3 py-2"
                placeholder="0x..."
                value={wallet}
                onChange={(event) => setWallet(event.target.value)}
              />
              <Text size="2" color="gray">
                We use your Privy smart wallet for gasless deposits. Update if
                you want yields to flow to another account.
              </Text>
            </label>

            <label className="flex flex-col gap-2">
              <Text weight="medium">Savings goal (USDC)</Text>
              <input
                type="number"
                min={50}
                step={50}
                className="rounded-md border px-3 py-2"
                value={goal}
                onChange={(event) => setGoal(Number(event.target.value))}
              />
            </label>

            <Flex direction="column" gap="2">
              <Text weight="medium">Risk appetite</Text>
              <Grid columns={{ initial: "1", sm: "3" }} gap="3">
                {RISK_OPTIONS.map((option) => {
                  const selected = risk === option.value;
                  return (
                    <div key={option.value}>
                      <button
                        type="button"
                        onClick={() => setRisk(option.value)}
                        className="rounded-lg border px-3 py-3 text-left transition-colors"
                        style={{
                          borderColor: selected
                            ? "#1d9bf0"
                            : "rgba(23, 23, 23, 0.12)",
                          backgroundColor: selected
                            ? "rgba(29, 155, 240, 0.12)"
                            : "transparent",
                        }}
                      >
                        <Text weight="medium">{option.label}</Text>
                        <Text size="2" color="gray">
                          {option.copy}
                        </Text>
                      </button>
                    </div>
                  );
                })}
              </Grid>
            </Flex>

            {status === "error" && error ? (
              <Callout.Root color="red">
                <Callout.Icon>
                  <Zap size={16} />
                </Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            ) : null}

            <Button
              size="3"
              disabled={!readyToSubmit || status === "saving"}
              onClick={async () => {
                if (!readyToSubmit) return;
                setStatus("saving");
                setError(null);
                try {
                  await onSubmit({ displayName, wallet, risk, goal });
                  setStatus("done");
                } catch (err) {
                  console.error(err);
                  setStatus("error");
                  setError("Could not save profile. Please try again.");
                }
              }}
            >
              {status === "saving"
                ? "Saving..."
                : status === "done"
                ? "Saved"
                : "Continue"}
            </Button>
          </Flex>
        </CardContent>
      </Card>
    </main>
  );
}

type AccountBalance = {
  id: number;
  category: string;
  label: string;
  amount: number;
  countTowardGoal: boolean;
};

type DCASchedule = {
  id: number;
  profileId: number;
  protocolKey: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  lastExecutedAt: string | null;
  nextExecutionAt: string;
  createdAt: string;
  updatedAt: string;
};

type DashboardProps = {
  dashboard: DashboardSummary;
  lessons: Lesson[];
  strategies: Strategy[];
  allBadges: UserBadge[];
  accountBalances: AccountBalance[];
  dcaSchedules: DCASchedule[];
  privyId: string;
  onLogout: () => void;
  onBalanceChange: () => void;
  onDataChange: () => Promise<void>;
};

function DashboardScreen({
  dashboard,
  lessons,
  strategies,
  allBadges,
  accountBalances,
  dcaSchedules,
  privyId,
  onLogout,
  onBalanceChange,
  onDataChange,
}: DashboardProps) {
  const {
    profile,
    goal,
    totalXp,
    streak,
    badges,
    completedLessons,
    totalExternalBalances,
    totalGoalBalances,
  } = dashboard;
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(
    null
  );
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [showProjectionModal, setShowProjectionModal] = useState(false);
  const [showLessonsModal, setShowLessonsModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [defiRate, setDefiRate] = useState(4.5);
  const [bankRate, setBankRate] = useState(0.05);
  const [monthlyContribution, setMonthlyContribution] = useState(50);
  const [showRateEditor, setShowRateEditor] = useState(false);

  // Show welcome flow for new users (no XP yet)
  const [showWelcome, setShowWelcome] = useState(totalXp === 0 && !goal);

  const handleLessonComplete = async (score: number) => {
    if (!selectedLesson) return;

    try {
      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyId,
          lessonId: selectedLesson.id,
          score,
        }),
      });

      if (!res.ok) throw new Error("Failed to complete lesson");

      setSelectedLesson(null);
      // Refresh data to show updated XP/badges
      await onDataChange();
    } catch (error) {
      console.error("Error completing lesson:", error);
    }
  };

  const handleCreateGoal = async (goalData: {
    targetAmount: number;
    category: string;
    title: string;
  }) => {
    try {
      const res = await fetch("/api/goals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyId,
          ...goalData,
        }),
      });

      if (!res.ok) throw new Error("Failed to create goal");

      // Refresh data to show new goal
      await onDataChange();
    } catch (error) {
      console.error("Error creating goal:", error);
    }
  };

  const handleDeposit = async (amount: number) => {
    if (!selectedStrategy) return;

    try {
      const res = await fetch("/api/deposits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyId,
          strategyKey: selectedStrategy.key,
          amount,
        }),
      });

      if (!res.ok) throw new Error("Failed to create deposit");

      setSelectedStrategy(null);
      // Refresh data to show updated goal progress
      await onDataChange();
    } catch (error) {
      console.error("Error creating deposit:", error);
    }
  };

  // Calculate compound interest projections with monthly contributions
  const calculateGrowth = (
    principal: number,
    rate: number,
    years: number,
    monthlyAddition: number = 0
  ) => {
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;
    return Array.from({ length: months + 1 }, (_, i) => {
      if (i === 0) {
        return { month: 0, amount: principal };
      }
      // Formula: FV = P(1+r)^n + PMT * [((1+r)^n - 1) / r]
      // Where P = principal, PMT = monthly payment, r = monthly rate, n = number of months
      const compoundedPrincipal = principal * Math.pow(1 + monthlyRate, i);
      const contributionGrowth =
        monthlyAddition * ((Math.pow(1 + monthlyRate, i) - 1) / monthlyRate);
      const amount = compoundedPrincipal + contributionGrowth;
      return { month: i, amount };
    });
  };

  const initialAmount = goal?.targetAmount || 1000;
  const years = 5;
  const defiGrowth = calculateGrowth(
    initialAmount,
    defiRate,
    years,
    monthlyContribution
  );
  const bankGrowth = calculateGrowth(
    initialAmount,
    bankRate,
    years,
    monthlyContribution
  );

  const resetRates = () => {
    setDefiRate(4.5);
    setBankRate(0.05);
    setMonthlyContribution(50);
  };

  return (
    <>
      {/* Welcome Flow for New Users */}
      {showWelcome && <WelcomeFlow onComplete={() => setShowWelcome(false)} />}

      <main className="min-h-screen bg-background">
        {/* Simple Header */}
        <div className="bg-card border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-3">
            <Flex justify="between" align="center">
              <Heading size="4">RealFi</Heading>
              <Flex gap="2" align="center">
                <Button
                  variant="ghost"
                  size="2"
                  onClick={() => setShowWelcome(true)}
                >
                  Tour
                </Button>
                <Button variant="ghost" size="2" onClick={onLogout}>
                  Log out
                </Button>
              </Flex>
            </Flex>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 py-10">
          {/* Welcome Header with Stats */}
          <div className="mb-10">
            <Flex justify="between" align="start" className="mb-6">
              <div>
                <Heading size="7" className="mb-2">
                  Welcome back
                  {profile.displayName ? `, ${profile.displayName}` : ""}! 👋
                </Heading>
                <Text size="3" color="gray">
                  You&apos;re on a {streak?.current || 0} day streak. Keep it
                  going!
                </Text>
              </div>
              <Flex gap="3" align="center">
                <Badge variant="default" className="px-3 py-2">
                  Level {Math.floor(totalXp / 100) + 1}
                </Badge>
                <Badge
                  variant="secondary"
                  className="px-3 py-2 bg-green-100 text-green-800 hover:bg-green-200"
                >
                  {totalXp} XP
                </Badge>
              </Flex>
            </Flex>
          </div>

          {/* Goals & GoodDollar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <GoalsManager
              currentGoal={goal}
              totalGoalBalances={totalGoalBalances}
              onCreateGoal={handleCreateGoal}
              onOpenProjection={() => setShowProjectionModal(true)}
            />
            <GoodDollarClaim
              privyId={privyId}
              onClaimSuccess={() => onDataChange()}
            />
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Financial Overview */}
            <Card
              className="bg-gradient-to-br from-purple-500 to-purple-700 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setShowPortfolioModal(true)}
            >
              <CardContent className="pt-6">
                <Flex justify="between" align="start" className="mb-4">
                  <Heading size="3" style={{ color: "white" }}>
                    Portfolio
                  </Heading>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <TrendingUp size={20} color="white" />
                  </div>
                </Flex>
                <div className="space-y-3">
                  <div>
                    <Text size="2" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Total Portfolio
                    </Text>
                    <Heading size="6" style={{ color: "white" }}>
                      $
                      {(
                        (goal?.depositedAmount || 0) + totalExternalBalances
                      ).toLocaleString()}
                    </Heading>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/20">
                    <div>
                      <Text size="1" style={{ color: "rgba(255,255,255,0.7)" }}>
                        DeFi
                      </Text>
                      <Text size="3" weight="bold" style={{ color: "white" }}>
                        ${(goal?.depositedAmount || 0).toLocaleString()}
                      </Text>
                    </div>
                    <div>
                      <Text size="1" style={{ color: "rgba(255,255,255,0.7)" }}>
                        External
                      </Text>
                      <Text size="3" weight="bold" style={{ color: "#10b981" }}>
                        ${totalExternalBalances.toLocaleString()}
                      </Text>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Learning Progress */}
            <Card
              className="bg-gradient-to-br from-pink-400 to-red-500 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setShowLessonsModal(true)}
            >
              <CardContent className="pt-6">
                <Flex justify="between" align="start" className="mb-4">
                  <Heading size="3" style={{ color: "white" }}>
                    Learning
                  </Heading>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <BookOpen size={20} color="white" />
                  </div>
                </Flex>
                <div className="space-y-3">
                  <div>
                    <Text size="2" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Lessons Complete
                    </Text>
                    <Heading size="6" style={{ color: "white" }}>
                      {completedLessons} / {lessons.length}
                    </Heading>
                  </div>
                  <Progress
                    value={
                      lessons.length > 0
                        ? (completedLessons / lessons.length) * 100
                        : 0
                    }
                    style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                  />
                  <Flex gap="3" className="pt-2">
                    <div>
                      <Text size="1" style={{ color: "rgba(255,255,255,0.7)" }}>
                        Streak
                      </Text>
                      <Text size="3" weight="bold" style={{ color: "white" }}>
                        {streak?.current || 0} 🔥
                      </Text>
                    </div>
                    <div>
                      <Text size="1" style={{ color: "rgba(255,255,255,0.7)" }}>
                        Total XP
                      </Text>
                      <Text size="3" weight="bold" style={{ color: "white" }}>
                        {totalXp}
                      </Text>
                    </div>
                  </Flex>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="pt-6">
                <Heading size="3" className="mb-4">
                  Quick Actions
                </Heading>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (lessons.length > 0) {
                        window.dispatchEvent(
                          new CustomEvent("startLesson", {
                            detail: {
                              slug: lessons[0].slug,
                              title: lessons[0].title,
                            },
                          })
                        );
                      }
                    }}
                    className="w-full p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition text-left"
                  >
                    <Flex gap="3" align="center">
                      <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                        <BookOpen size={18} color="white" />
                      </div>
                      <div>
                        <Text size="2" weight="medium">
                          Start Learning
                        </Text>
                        <Text size="1" color="gray">
                          Continue next lesson
                        </Text>
                      </div>
                    </Flex>
                  </button>
                  <button
                    onClick={() => setShowYieldModal(true)}
                    className="w-full p-3 rounded-lg bg-green-50 hover:bg-green-100 transition text-left"
                  >
                    <Flex gap="3" align="center">
                      <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                        <TrendingUp size={18} color="white" />
                      </div>
                      <div>
                        <Text size="2" weight="medium">
                          Browse Strategies
                        </Text>
                        <Text size="1" color="gray">
                          Find yield opportunities
                        </Text>
                      </div>
                    </Flex>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Achievements Section */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <Flex justify="between" align="center" className="mb-6">
                <div>
                  <Heading size="4" className="mb-1">
                    Achievements
                  </Heading>
                  <Text size="2" color="gray">
                    Earn badges by completing lessons and reaching milestones
                  </Text>
                </div>
                <Badge variant="default">
                  {badges.length} / {allBadges.length}
                </Badge>
              </Flex>
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-4">
                {allBadges.map((badge) => {
                  const isUnlocked = badges.some((b) => b.id === badge.id);
                  return (
                    <div
                      key={badge.id}
                      className="flex flex-col items-center gap-2"
                      title={badge.description}
                    >
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                          isUnlocked
                            ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                            : "bg-gray-100 border-2 border-dashed border-gray-300"
                        }`}
                      >
                        <Text size="4">{isUnlocked ? "🏆" : "🔒"}</Text>
                      </div>
                      <div className="text-center">
                        <Text
                          size="1"
                          weight="medium"
                          className={isUnlocked ? "" : "text-gray-400"}
                        >
                          {badge.title}
                        </Text>
                        {!isUnlocked && (
                          <Text
                            size="1"
                            color="gray"
                            className="mt-1 line-clamp-2"
                          >
                            {badge.description}
                          </Text>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedLesson && (
            <LessonModal
              lesson={selectedLesson}
              isOpen={true}
              onClose={() => setSelectedLesson(null)}
              onComplete={handleLessonComplete}
            />
          )}

          {selectedStrategy && (
            <StrategyDetails
              strategy={selectedStrategy}
              isOpen={true}
              onClose={() => setSelectedStrategy(null)}
              onDeposit={handleDeposit}
              userRiskProfile={profile.riskPreference || "Conservative"}
            />
          )}

          {/* Yield Opportunities Modal */}
          <Dialog open={showYieldModal} onOpenChange={setShowYieldModal}>
            <DialogContent className="max-w-[800px] max-h-[80vh] overflow-auto">
              <DialogTitle>Yield Opportunities</DialogTitle>
              <div className="mt-4">
                <Text size="2" color="gray" className="mb-6">
                  Safe stablecoin yields on Base • {strategies.length} pools
                  available
                </Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {strategies.map((strategy) => (
                    <button
                      key={strategy.key}
                      onClick={() => {
                        setShowYieldModal(false);
                        // Open chat to discuss strategy
                        window.dispatchEvent(
                          new CustomEvent("startLesson", {
                            detail: {
                              slug: "strategy-discussion",
                              title: `Tell me about ${strategy.title} - ${strategy.protocol} on ${strategy.chain} with ${strategy.estApr}% APR. Should I set up a DCA strategy? What do I need to know?`,
                            },
                          })
                        );
                      }}
                      className="text-left p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition border border-green-100"
                    >
                      <Flex justify="between" align="center" className="mb-2">
                        <Text size="3" weight="medium">
                          {strategy.title}
                        </Text>
                        <Badge
                          variant="secondary"
                          className={
                            strategy.risk === "Aggressive"
                              ? "bg-red-100 text-red-800 hover:bg-red-200"
                              : strategy.risk === "Conservative"
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                          }
                        >
                          {strategy.estApr}% APR
                        </Badge>
                      </Flex>
                      <Text size="1" color="gray" className="mb-2">
                        {strategy.protocol} · {strategy.chain}
                      </Text>
                      <Text size="2" className="line-clamp-2">
                        {strategy.summary}
                      </Text>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <Text size="1" color="blue" weight="medium">
                          💬 Click to discuss with AI assistant
                        </Text>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Growth Projection Modal */}
          <Dialog
            open={showProjectionModal}
            onOpenChange={setShowProjectionModal}
          >
            <DialogContent className="max-w-[900px] max-h-[90vh] overflow-auto">
              <DialogTitle>Growth Projection</DialogTitle>
              <div className="mt-4 space-y-6">
                <Flex justify="between" align="start">
                  <Text size="2" color="gray">
                    Compare DeFi yields vs traditional bank savings over 5 years
                    {monthlyContribution > 0 &&
                      ` with $${monthlyContribution}/month contributions`}
                  </Text>
                  <Flex gap="2">
                    <Button
                      variant="soft"
                      size="1"
                      onClick={() => setShowRateEditor(!showRateEditor)}
                    >
                      {showRateEditor ? "Hide" : "Edit"} Rates
                    </Button>
                    <Button variant="ghost" size="1" onClick={resetRates}>
                      Reset
                    </Button>
                  </Flex>
                </Flex>

                {/* Rate Editor */}
                {showRateEditor && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Grid columns={{ initial: "1", sm: "3" }} gap="4">
                      <div>
                        <Text size="2" weight="medium" className="mb-2">
                          DeFi APR (%)
                        </Text>
                        <input
                          type="number"
                          value={defiRate}
                          onChange={(e) => setDefiRate(Number(e.target.value))}
                          step="0.1"
                          min="0"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <Text size="2" weight="medium" className="mb-2">
                          Bank APR (%)
                        </Text>
                        <input
                          type="number"
                          value={bankRate}
                          onChange={(e) => setBankRate(Number(e.target.value))}
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <Text size="2" weight="medium" className="mb-2">
                          Monthly Addition ($)
                        </Text>
                        <input
                          type="number"
                          value={monthlyContribution}
                          onChange={(e) =>
                            setMonthlyContribution(Number(e.target.value))
                          }
                          step="10"
                          min="0"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </Grid>
                  </div>
                )}

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Text size="2" color="gray" className="mb-1">
                      Starting Amount
                    </Text>
                    <Heading size="5">
                      ${initialAmount.toLocaleString()}
                    </Heading>
                    <Text size="1" color="gray" className="mt-1">
                      +${monthlyContribution}/mo × {years * 12} months
                    </Text>
                    <Text size="1" color="blue" className="font-semibold">
                      $
                      {(
                        initialAmount +
                        monthlyContribution * years * 12
                      ).toLocaleString()}{" "}
                      contributed
                    </Text>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <Text size="2" color="gray" className="mb-1">
                      DeFi ({defiRate}% APR)
                    </Text>
                    <Heading size="5" style={{ color: "#10b981" }}>
                      $
                      {defiGrowth[defiGrowth.length - 1].amount.toLocaleString(
                        undefined,
                        { maximumFractionDigits: 0 }
                      )}
                    </Heading>
                    <Text size="1" color="green">
                      +$
                      {(
                        defiGrowth[defiGrowth.length - 1].amount -
                        initialAmount -
                        monthlyContribution * years * 12
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      interest earned
                    </Text>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <Text size="2" color="gray" className="mb-1">
                      Bank ({bankRate}% APR)
                    </Text>
                    <Heading size="5" style={{ color: "#ef4444" }}>
                      $
                      {bankGrowth[bankGrowth.length - 1].amount.toLocaleString(
                        undefined,
                        { maximumFractionDigits: 0 }
                      )}
                    </Heading>
                    <Text size="1" color="red">
                      +$
                      {(
                        bankGrowth[bankGrowth.length - 1].amount -
                        initialAmount -
                        monthlyContribution * years * 12
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      interest earned
                    </Text>
                  </div>
                </div>

                {/* Simple Line Chart */}
                <div className="relative h-64 bg-gradient-to-b from-gray-50 to-white rounded-lg p-4 border">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 800 200"
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines */}
                    <line
                      x1="0"
                      y1="0"
                      x2="800"
                      y2="0"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="50"
                      x2="800"
                      y2="50"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="100"
                      x2="800"
                      y2="100"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="150"
                      x2="800"
                      y2="150"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="200"
                      x2="800"
                      y2="200"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />

                    {/* DeFi line */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      points={defiGrowth
                        .filter((_, i) => i % 3 === 0)
                        .map((point, i, arr) => {
                          const x = (i / (arr.length - 1)) * 800;
                          const maxAmount = Math.max(
                            ...defiGrowth.map((p) => p.amount)
                          );
                          const y =
                            200 -
                            ((point.amount - initialAmount) /
                              (maxAmount - initialAmount)) *
                              180;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />

                    {/* Bank line */}
                    <polyline
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeDasharray="5,5"
                      points={bankGrowth
                        .filter((_, i) => i % 3 === 0)
                        .map((point, i, arr) => {
                          const x = (i / (arr.length - 1)) * 800;
                          const maxAmount = Math.max(
                            ...defiGrowth.map((p) => p.amount)
                          );
                          const y =
                            200 -
                            ((point.amount - initialAmount) /
                              (maxAmount - initialAmount)) *
                              180;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  </svg>

                  {/* Legend */}
                  <div className="absolute bottom-2 right-2 bg-white p-3 rounded-lg shadow-sm border">
                    <Flex gap="4" align="center">
                      <Flex gap="2" align="center">
                        <div className="w-6 h-1 bg-green-500 rounded"></div>
                        <Text size="1">DeFi {defiRate}%</Text>
                      </Flex>
                      <Flex gap="2" align="center">
                        <div
                          className="w-6 h-1 bg-red-500 rounded"
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 5px, transparent 5px, transparent 10px)",
                          }}
                        ></div>
                        <Text size="1">Bank {bankRate}%</Text>
                      </Flex>
                    </Flex>
                  </div>

                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                    <span>
                      $
                      {defiGrowth[defiGrowth.length - 1].amount.toLocaleString(
                        undefined,
                        { maximumFractionDigits: 0 }
                      )}
                    </span>
                    <span>${initialAmount.toLocaleString()}</span>
                  </div>

                  {/* X-axis labels */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 pt-2 px-8">
                    <span>Now</span>
                    <span>Year 1</span>
                    <span>Year 2</span>
                    <span>Year 3</span>
                    <span>Year 4</span>
                    <span>Year 5</span>
                  </div>
                </div>

                {/* Key Insight */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <Flex gap="3" align="start">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={20} color="white" />
                    </div>
                    <div>
                      <Text size="2" weight="bold" className="mb-1">
                        You could earn $
                        {(
                          defiGrowth[defiGrowth.length - 1].amount -
                          bankGrowth[bankGrowth.length - 1].amount
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        more with DeFi
                      </Text>
                      <Text size="2" color="gray">
                        That&apos;s {(defiRate / bankRate - 1).toFixed(0)}x more
                        interest over 5 years compared to traditional banks.
                      </Text>
                    </div>
                  </Flex>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Lessons Modal */}
          <Dialog open={showLessonsModal} onOpenChange={setShowLessonsModal}>
            <DialogContent className="max-w-[900px] max-h-[80vh] overflow-auto">
              <DialogTitle>Available Lessons</DialogTitle>
              <div className="mt-4">
                <Text size="2" color="gray" className="mb-6">
                  Master personal finance and investing basics •{" "}
                  {lessons.length} lessons available
                </Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lessons.map((lesson, idx) => (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setShowLessonsModal(false);
                        // Trigger custom event to open chat and start lesson
                        window.dispatchEvent(
                          new CustomEvent("startLesson", {
                            detail: { slug: lesson.slug, title: lesson.title },
                          })
                        );
                      }}
                      className="text-left p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition border border-blue-100"
                    >
                      <Flex gap="3" align="start" className="mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <Text size="3" weight="bold" className="text-white">
                            {idx + 1}
                          </Text>
                        </div>
                        <div className="flex-1">
                          <Text size="3" weight="medium" className="mb-1 block">
                            {lesson.title}
                          </Text>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-green-100 text-green-800 hover:bg-green-200"
                          >
                            +{lesson.xpReward} XP
                          </Badge>
                        </div>
                      </Flex>
                      <Text size="2" color="gray" className="mb-3">
                        {lesson.summary}
                      </Text>
                      <div className="pt-3 border-t border-gray-200">
                        <Text size="1" color="blue" weight="medium">
                          💬 Click to start lesson with AI assistant
                        </Text>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Portfolio Modal */}
          <Dialog
            open={showPortfolioModal}
            onOpenChange={setShowPortfolioModal}
          >
            <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-auto">
              <DialogTitle>Portfolio Overview</DialogTitle>
              <div className="mt-4 space-y-6">
                <Text size="2" color="gray">
                  Complete view of your assets, balances, and automated
                  strategies
                </Text>

                {/* Embedded Portfolio Pie Chart */}
                <div>
                  <PortfolioPieChart
                    balances={accountBalances}
                    defiAmount={goal?.depositedAmount || 0}
                  />
                </div>

                {/* DCA Strategies Section */}
                {dcaSchedules.length > 0 && (
                  <div>
                    <Flex justify="between" align="center" className="mb-4">
                      <div>
                        <Heading size="4" className="mb-1">
                          Recurring Investments
                        </Heading>
                        <Text size="2" color="gray">
                          Dollar-cost averaging schedules
                        </Text>
                      </div>
                      <Badge variant="default">
                        {dcaSchedules.filter((s) => s.isActive).length} active
                      </Badge>
                    </Flex>
                    <div className="space-y-3">
                      {dcaSchedules.map((schedule) => {
                        const nextExecution = new Date(
                          schedule.nextExecutionAt
                        );
                        const formattedDate = nextExecution.toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        );
                        const protocol = strategies.find(
                          (s) => s.key === schedule.protocolKey
                        );
                        const protocolName =
                          protocol?.title || schedule.protocolKey;

                        const handleToggleActive = async () => {
                          try {
                            const res = await fetch("/api/dca/update", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                privyId,
                                scheduleId: schedule.id,
                                isActive: !schedule.isActive,
                              }),
                            });
                            if (res.ok) {
                              await onDataChange();
                            }
                          } catch (error) {
                            console.error(
                              "Error toggling DCA schedule:",
                              error
                            );
                          }
                        };

                        const handleDelete = async () => {
                          if (
                            !confirm(
                              "Are you sure you want to delete this DCA schedule?"
                            )
                          )
                            return;
                          try {
                            const res = await fetch("/api/dca/delete", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                privyId,
                                scheduleId: schedule.id,
                              }),
                            });
                            if (res.ok) {
                              await onDataChange();
                            }
                          } catch (error) {
                            console.error(
                              "Error deleting DCA schedule:",
                              error
                            );
                          }
                        };

                        return (
                          <div
                            key={schedule.id}
                            className={`p-4 rounded-lg border transition-all ${
                              schedule.isActive
                                ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                                : "bg-gray-50 border-gray-200 opacity-60"
                            }`}
                          >
                            <Flex
                              justify="between"
                              align="start"
                              className="mb-3"
                            >
                              <div className="flex-1">
                                <Flex gap="2" align="center" className="mb-2">
                                  <Text size="3" weight="bold">
                                    {protocolName}
                                  </Text>
                                  {schedule.isActive ? (
                                    <Badge
                                      variant="secondary"
                                      className="bg-green-100 text-green-800 hover:bg-green-200"
                                    >
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="bg-gray-300 text-gray-700"
                                    >
                                      Paused
                                    </Badge>
                                  )}
                                </Flex>
                                <Text size="2" color="gray">
                                  ${(schedule.amount / 100).toFixed(2)} •{" "}
                                  {schedule.frequency}
                                </Text>
                              </div>
                              <div className="text-right">
                                <Text size="1" color="gray">
                                  Next execution
                                </Text>
                                <Text size="2" weight="medium">
                                  {formattedDate}
                                </Text>
                              </div>
                            </Flex>

                            {schedule.lastExecutedAt && (
                              <Text size="1" color="gray" className="mt-2">
                                Last:{" "}
                                {new Date(
                                  schedule.lastExecutedAt
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </Text>
                            )}

                            {protocol && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <Flex justify="between" align="center">
                                  <Text size="1" color="gray">
                                    {protocol.protocol} • {protocol.chain}
                                  </Text>
                                  <Text
                                    size="1"
                                    weight="bold"
                                    style={{ color: "#10b981" }}
                                  >
                                    {protocol.estApr}% APR
                                  </Text>
                                </Flex>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <Flex gap="2" justify="end">
                                <button
                                  onClick={handleToggleActive}
                                  className="px-3 py-1 text-xs rounded border hover:bg-gray-50 transition"
                                >
                                  {schedule.isActive ? "Pause" : "Resume"}
                                </button>
                                <button
                                  onClick={handleDelete}
                                  className="px-3 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition"
                                >
                                  Delete
                                </button>
                              </Flex>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Embedded Account Balances */}
                <div>
                  <AccountBalances
                    balances={accountBalances}
                    privyId={privyId}
                    onBalanceChange={() => {
                      onBalanceChange();
                    }}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </>
  );
}
