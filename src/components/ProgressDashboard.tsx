"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Flex } from "@/components/ui/flex";
import { Grid } from "@/components/ui/grid";
import { Heading, Text } from "@/components/ui/typography";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Target,
  Calendar,
  Award,
  DollarSign,
  Zap,
  BookOpen,
  Activity,
  ChevronDown,
  ChevronUp
} from "react-feather";
type DbProfile = {
  id: number;
  privyId: string;
  wallet: string;
  displayName?: string;
  riskPreference?: string;
  savingsTarget?: number;
  createdAt: Date;
  updatedAt: Date;
};

type DbGoal = {
  id: number;
  profileId: number;
  targetAmount: number;
  depositedAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

type ProgressData = {
  profile: DbProfile;
  goal: DbGoal | null;
  totalXp: number;
  streak: { current: number; longest: number } | null;
  completedLessons: number;
  totalLessons: number;
  totalDeposited: number;
  totalYieldEarned: number;
  badgeCount: number;
};

type ProgressDashboardProps = {
  data: ProgressData;
};

export function ProgressDashboard({ data }: ProgressDashboardProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  
  const {
    goal,
    totalXp,
    streak,
    completedLessons,
    totalLessons,
    totalDeposited,
    totalYieldEarned,
    badgeCount
  } = data;

  const goalProgress = goal 
    ? Math.min(Math.round((goal.depositedAmount / goal.targetAmount) * 100), 100)
    : 0;

  const learningProgress = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  const streakDays = streak?.current ?? 0;
  const longestStreak = streak?.longest ?? 0;

  const stats = useMemo(() => [
    {
      id: "savings",
      title: "Savings Progress",
      value: goal ? `${goalProgress}%` : "No goal set",
      subtitle: goal ? `$${goal.depositedAmount} / $${goal.targetAmount}` : "Set a savings goal to start",
      icon: <Target size={24} />,
      color: goalProgress >= 100 ? "#10b981" : "#1d9bf0",
      progress: goalProgress,
      details: goal ? {
        targetAmount: goal.targetAmount,
        depositedAmount: goal.depositedAmount,
        remaining: goal.targetAmount - goal.depositedAmount,
        monthlyTarget: Math.ceil((goal.targetAmount - goal.depositedAmount) / 12)
      } : null
    },
    {
      id: "learning",
      title: "Learning Progress", 
      value: `${learningProgress}%`,
      subtitle: `${completedLessons} of ${totalLessons} lessons completed`,
      icon: <BookOpen size={24} />,
      color: learningProgress >= 100 ? "#10b981" : "#8b5cf6",
      progress: learningProgress,
      details: {
        completedLessons,
        totalLessons,
        remainingLessons: totalLessons - completedLessons,
        nextMilestone: totalLessons
      }
    },
    {
      id: "streak",
      title: "Current Streak",
      value: `${streakDays} days`,
      subtitle: `Longest: ${longestStreak} days`,
      icon: <Activity size={24} />,
      color: streakDays >= 7 ? "#f59e0b" : "#6b7280",
      progress: Math.min((streakDays / 30) * 100, 100),
      details: {
        currentStreak: streakDays,
        longestStreak: longestStreak,
        nextMilestone: streakDays < 7 ? 7 : streakDays < 30 ? 30 : 100
      }
    },
    {
      id: "xp",
      title: "Total XP",
      value: totalXp.toLocaleString(),
      subtitle: "Experience points earned",
      icon: <Zap size={24} />,
      color: "#ec4899",
      progress: Math.min((totalXp / 1000) * 100, 100),
      details: {
        currentLevel: Math.floor(totalXp / 100) + 1,
        currentXp: totalXp % 100,
        xpForNextLevel: 100 - (totalXp % 100),
        totalXp
      }
    }
  ], [goalProgress, learningProgress, streakDays, longestStreak, totalXp, goal, completedLessons, totalLessons]);

  const achievements = useMemo(() => [
    {
      title: "Total Deposited",
      value: `$${totalDeposited.toLocaleString()}`,
      icon: <DollarSign size={20} />,
      color: "#10b981"
    },
    {
      title: "Yield Earned",
      value: `$${totalYieldEarned.toFixed(2)}`,
      icon: <TrendingUp size={20} />,
      color: "#059669"
    },
    {
      title: "Badges Earned",
      value: badgeCount.toString(),
      icon: <Award size={20} />,
      color: "#f59e0b"
    },
    {
      title: "Days Active",
      value: longestStreak.toString(),
      icon: <Calendar size={20} />,
      color: "#8b5cf6"
    }
  ], [totalDeposited, totalYieldEarned, badgeCount, longestStreak]);

  return (
    <Flex direction="column" gap="4">
      <Grid columns={{ initial: "2", sm: "2", lg: "4" }} gap="3">
        {stats.map((stat) => (
          <Card
            key={stat.id}
            className={`cursor-pointer ${
              selectedCard === stat.id
                ? "border-2 border-blue-500 bg-blue-50"
                : "border border-gray-200"
            }`}
            onClick={() => setSelectedCard(selectedCard === stat.id ? null : stat.id)}
          >
            <CardContent className="p-3">
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center">
                  <div style={{ color: stat.color }}>
                    <div className="scale-75">
                      {stat.icon}
                    </div>
                  </div>
                  <Flex align="center" gap="1">
                    <Badge
                      className={
                        stat.progress >= 100
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                      }
                    >
                      {Math.round(stat.progress)}%
                    </Badge>
                    {selectedCard === stat.id ? (
                      <ChevronUp size={14} color="#6b7280" />
                    ) : (
                      <ChevronDown size={14} color="#6b7280" />
                    )}
                  </Flex>
                </Flex>

                <Flex direction="column" gap="1">
                  <Text size="1" color="gray" weight="medium" className="truncate">
                    {stat.title}
                  </Text>
                  <Heading size="3">{stat.value}</Heading>
                  <Text size="1" color="gray" className="line-clamp-1">
                    {stat.subtitle}
                  </Text>
                </Flex>

                <Progress
                  value={stat.progress}
                  className={stat.progress >= 100 ? "bg-green-200" : "bg-blue-200"}
                />
              </Flex>
            </CardContent>
          </Card>
        ))}
      </Grid>

      {selectedCard && (
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardContent className="pt-6">
            <Flex direction="column" gap="4">
            {(() => {
              const selectedStat = stats.find(s => s.id === selectedCard);
              if (!selectedStat || !selectedStat.details) return null;

              switch (selectedCard) {
                case "savings":
                  const savingsDetails = selectedStat.details as { targetAmount: number; depositedAmount: number; remaining: number; monthlyTarget: number };
                  return (
                    <>
                      <Flex justify="between" align="center">
                        <Heading size="4">Savings Breakdown</Heading>
                        <Button variant="soft" size="1" onClick={() => setSelectedCard(null)}>
                          Close
                        </Button>
                      </Flex>
                      <Grid columns={{ initial: "1", sm: "3" }} gap="4">
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Target Amount</Text>
                          <Text size="5" weight="bold">${savingsDetails.targetAmount.toLocaleString()}</Text>
                        </Flex>
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Amount Saved</Text>
                          <Text size="5" weight="bold" color="green">${savingsDetails.depositedAmount.toLocaleString()}</Text>
                        </Flex>
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Remaining</Text>
                          <Text size="5" weight="bold">${savingsDetails.remaining.toLocaleString()}</Text>
                        </Flex>
                      </Grid>
                      {savingsDetails.remaining > 0 && (
                        <Card className="bg-slate-50">
                          <CardContent className="pt-6">
                            <Text size="2" weight="medium">Monthly Target</Text>
                            <Text size="2" color="gray">
                              Save ${savingsDetails.monthlyTarget} per month to reach your goal in 12 months.
                            </Text>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  );

                case "learning":
                  const learningDetails = selectedStat.details as { completedLessons: number; remainingLessons: number; totalLessons: number };
                  return (
                    <>
                      <Flex justify="between" align="center">
                        <Heading size="4">Learning Progress</Heading>
                        <Button variant="soft" size="1" onClick={() => setSelectedCard(null)}>
                          Close
                        </Button>
                      </Flex>
                      <Grid columns={{ initial: "1", sm: "3" }} gap="4">
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Completed</Text>
                          <Text size="5" weight="bold" color="green">{learningDetails.completedLessons}</Text>
                        </Flex>
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Remaining</Text>
                          <Text size="5" weight="bold">{learningDetails.remainingLessons}</Text>
                        </Flex>
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Total Available</Text>
                          <Text size="5" weight="bold">{learningDetails.totalLessons}</Text>
                        </Flex>
                      </Grid>
                    </>
                  );

                case "streak":
                  const streakDetails = selectedStat.details as { currentStreak: number; longestStreak: number; nextMilestone: number };
                  return (
                    <>
                      <Flex justify="between" align="center">
                        <Heading size="4">Streak Details</Heading>
                        <Button variant="soft" size="1" onClick={() => setSelectedCard(null)}>
                          Close
                        </Button>
                      </Flex>
                      <Grid columns={{ initial: "1", sm: "3" }} gap="4">
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Current Streak</Text>
                          <Text size="5" weight="bold">{streakDetails.currentStreak} days</Text>
                        </Flex>
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Longest Streak</Text>
                          <Text size="5" weight="bold" color="green">{streakDetails.longestStreak} days</Text>
                        </Flex>
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Next Milestone</Text>
                          <Text size="5" weight="bold">{streakDetails.nextMilestone} days</Text>
                        </Flex>
                      </Grid>
                    </>
                  );

                case "xp":
                  const xpDetails = selectedStat.details as { currentLevel: number; currentXp: number; xpForNextLevel: number; totalXp: number };
                  return (
                    <>
                      <Flex justify="between" align="center">
                        <Heading size="4">XP Progress</Heading>
                        <Button variant="soft" size="1" onClick={() => setSelectedCard(null)}>
                          Close
                        </Button>
                      </Flex>
                      <Grid columns={{ initial: "1", sm: "3" }} gap="4">
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Current Level</Text>
                          <Text size="5" weight="bold">{xpDetails.currentLevel}</Text>
                        </Flex>
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">Current XP</Text>
                          <Text size="5" weight="bold" color="green">{xpDetails.currentXp} / 100</Text>
                        </Flex>
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray" weight="medium">XP to Next Level</Text>
                          <Text size="5" weight="bold">{xpDetails.xpForNextLevel} XP</Text>
                        </Flex>
                      </Grid>
                    </>
                  );

                default:
                  return null;
              }
            })()}
            </Flex>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Flex direction="column" gap="3">
            <Heading size="4">Achievement Summary</Heading>
          
          <Grid columns={{ initial: "2", sm: "4" }} gap="3">
            {achievements.map((achievement) => (
              <Flex key={achievement.title} direction="column" gap="2" align="center" style={{ textAlign: "center" }}>
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "50%",
                    backgroundColor: `${achievement.color}20`,
                    color: achievement.color
                  }}
                >
                  {achievement.icon}
                </div>
                <Flex direction="column" gap="1" align="center">
                  <Text size="2" color="gray">{achievement.title}</Text>
                  <Text size="4" weight="bold">{achievement.value}</Text>
                </Flex>
              </Flex>
            ))}
          </Grid>
          </Flex>
        </CardContent>
      </Card>

      {goal && (
        <Card>
          <CardContent className="pt-6">
            <Flex direction="column" gap="4">
            <Heading size="5">Goal Breakdown</Heading>
            
            <Grid columns={{ initial: "1", sm: "3" }} gap="4">
              <Flex direction="column" gap="2">
                <Text size="2" color="gray" weight="medium">Target Amount</Text>
                <Text size="5" weight="bold">${goal.targetAmount.toLocaleString()}</Text>
              </Flex>
              
              <Flex direction="column" gap="2">
                <Text size="2" color="gray" weight="medium">Amount Saved</Text>
                <Text size="5" weight="bold" color="green">${goal.depositedAmount.toLocaleString()}</Text>
              </Flex>
              
              <Flex direction="column" gap="2">
                <Text size="2" color="gray" weight="medium">Remaining</Text>
                <Text size="5" weight="bold">${(goal.targetAmount - goal.depositedAmount).toLocaleString()}</Text>
              </Flex>
            </Grid>

            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Text size="3" weight="medium">Progress to Goal</Text>
                <Text size="3" weight="bold">{goalProgress}%</Text>
              </Flex>
              
              <div className="relative">
                <Progress
                  value={goalProgress}
                  className={goalProgress >= 100 ? "bg-green-200 h-3" : "bg-blue-200 h-3"}
                />
                {goalProgress >= 100 && (
                  <Flex
                    align="center"
                    justify="center"
                    className="absolute top-0 left-0 right-0 bottom-0"
                  >
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      Goal Achieved! 🎉
                    </Badge>
                  </Flex>
                )}
              </div>
            </Flex>

            {goalProgress < 100 && (
              <Card className="bg-blue-50">
                <CardContent className="pt-6">
                  <Flex direction="column" gap="2">
                    <Text size="3" weight="medium">Monthly Progress Needed</Text>
                    <Text size="2" color="gray">
                      To reach your goal in 12 months, save approximately ${Math.ceil((goal.targetAmount - goal.depositedAmount) / 12)} per month.
                    </Text>
                  </Flex>
                </CardContent>
              </Card>
            )}
            </Flex>
          </CardContent>
        </Card>
      )}
    </Flex>
  );
}