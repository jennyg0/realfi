"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flex } from "@/components/ui/flex";
import { Grid } from "@/components/ui/grid";
import { Heading, Text } from "@/components/ui/typography";
import { Progress } from "@/components/ui/progress";
import {
  Award,
  Target,
  Zap,
  TrendingUp,
  Shield,
  Star,
  Activity,
  BookOpen,
  CheckCircle
} from "react-feather";
type DbBadge = {
  id: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  xp?: number;
};

type BadgeData = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: "learning" | "savings" | "streak" | "achievement";
  requirement: string;
  xpReward: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
};

const BADGE_SYSTEM: BadgeData[] = [
  {
    id: "first-lesson",
    title: "Scholar",
    description: "Complete your first DeFi lesson",
    icon: <BookOpen size={20} />,
    category: "learning",
    requirement: "Complete 1 lesson",
    xpReward: 50,
    rarity: "common",
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: "lesson-master",
    title: "DeFi Expert",
    description: "Complete all available lessons",
    icon: <Star size={20} />,
    category: "learning", 
    requirement: "Complete all lessons",
    xpReward: 500,
    rarity: "epic",
    unlocked: false,
    progress: 0,
    maxProgress: 5
  },
  {
    id: "first-deposit",
    title: "Saver",
    description: "Make your first deposit into a yield strategy",
    icon: <Target size={20} />,
    category: "savings",
    requirement: "Make first deposit",
    xpReward: 100,
    rarity: "common",
    unlocked: false
  },
  {
    id: "goal-achiever",
    title: "Goal Crusher",
    description: "Reach 100% of your savings goal",
    icon: <CheckCircle size={20} />,
    category: "achievement",
    requirement: "Complete savings goal",
    xpReward: 1000,
    rarity: "legendary",
    unlocked: false
  },
  {
    id: "week-streak",
    title: "Consistent",
    description: "Maintain a 7-day learning streak",
    icon: <Activity size={20} />,
    category: "streak",
    requirement: "7 day streak",
    xpReward: 200,
    rarity: "rare",
    unlocked: false,
    progress: 0,
    maxProgress: 7
  },
  {
    id: "month-streak",
    title: "Dedicated",
    description: "Maintain a 30-day learning streak",
    icon: <Zap size={20} />,
    category: "streak",
    requirement: "30 day streak",
    xpReward: 750,
    rarity: "epic",
    unlocked: false,
    progress: 0,
    maxProgress: 30
  },
  {
    id: "risk-manager",
    title: "Risk Master",
    description: "Try strategies from all risk levels",
    icon: <Shield size={20} />,
    category: "achievement",
    requirement: "Use Conservative, Balanced & Aggressive strategies",
    xpReward: 300,
    rarity: "rare",
    unlocked: false,
    progress: 0,
    maxProgress: 3
  },
  {
    id: "yield-hunter",
    title: "Yield Hunter",
    description: "Earn over 100 USDC in yield",
    icon: <TrendingUp size={20} />,
    category: "savings",
    requirement: "Earn 100+ USDC yield",
    xpReward: 400,
    rarity: "rare",
    unlocked: false,
    progress: 0,
    maxProgress: 100
  }
];

type BadgeShowcaseProps = {
  userBadges: DbBadge[];
  currentStreak: number;
  completedLessons: number;
  totalYieldEarned: number;
};

export function BadgeShowcase({
  userBadges,
  currentStreak,
  completedLessons,
  totalYieldEarned
}: BadgeShowcaseProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case "rare": return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "epic": return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case "legendary": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "learning": return <BookOpen size={16} />;
      case "savings": return <Target size={16} />;
      case "streak": return <Activity size={16} />;
      case "achievement": return <Award size={16} />;
      default: return <Star size={16} />;
    }
  };

  const updateBadgeProgress = (badge: BadgeData): BadgeData => {
    const updatedBadge = { ...badge };
    const isUnlocked = userBadges.some(userBadge => userBadge?.slug === badge.id);
    
    if (isUnlocked) {
      updatedBadge.unlocked = true;
      updatedBadge.progress = updatedBadge.maxProgress;
      return updatedBadge;
    }

    switch (badge.id) {
      case "first-lesson":
        updatedBadge.progress = Math.min(completedLessons, 1);
        updatedBadge.unlocked = completedLessons >= 1;
        break;
      case "lesson-master":
        updatedBadge.progress = completedLessons;
        updatedBadge.unlocked = completedLessons >= 5;
        break;
      case "week-streak":
        updatedBadge.progress = Math.min(currentStreak, 7);
        updatedBadge.unlocked = currentStreak >= 7;
        break;
      case "month-streak":
        updatedBadge.progress = Math.min(currentStreak, 30);
        updatedBadge.unlocked = currentStreak >= 30;
        break;
      case "yield-hunter":
        updatedBadge.progress = Math.min(totalYieldEarned, 100);
        updatedBadge.unlocked = totalYieldEarned >= 100;
        break;
    }

    return updatedBadge;
  };

  const badgesWithProgress = BADGE_SYSTEM.map(updateBadgeProgress);
  const unlockedBadges = badgesWithProgress.filter(badge => badge.unlocked);
  const lockedBadges = badgesWithProgress.filter(badge => !badge.unlocked);

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
              <Heading size="5">Badge Collection</Heading>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{unlockedBadges.length} / {BADGE_SYSTEM.length}</Badge>
            </Flex>

          {unlockedBadges.length > 0 && (
            <>
              <Text size="3" weight="medium" color="gray">Unlocked Badges</Text>
              <Grid columns={{ initial: "3", sm: "4", md: "5" }} gap="2">
                {unlockedBadges.map((badge) => (
                  <Card
                    key={badge.id}
                    className={`cursor-pointer bg-blue-50 ${
                      badge.rarity === "legendary"
                        ? "border-2 border-yellow-400"
                        : "border-2 border-blue-500"
                    }`}
                    onClick={() => setSelectedBadge(badge)}
                  >
                    <CardContent className="p-2 text-center">
                      <Flex direction="column" gap="1" align="center">
                        <div className="text-blue-500 scale-75">
                          {badge.icon}
                        </div>
                        <Text size="1" weight="medium" className="truncate text-center leading-tight">
                          {badge.title}
                        </Text>
                        <Badge className={getRarityColor(badge.rarity)}>
                          {badge.rarity.charAt(0)}
                        </Badge>
                      </Flex>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </>
          )}

          {lockedBadges.length > 0 && (
            <>
              <Text size="3" weight="medium" color="gray" className="mt-2">Available to Unlock</Text>
              <Grid columns={{ initial: "2", sm: "3", md: "4" }} gap="2">
                {lockedBadges.slice(0, 8).map((badge) => (
                  <Card
                    key={badge.id}
                    className="cursor-pointer opacity-60 border border-dashed border-gray-300"
                    onClick={() => setSelectedBadge(badge)}
                  >
                    <CardContent className="p-3">
                      <Flex direction="column" gap="2" align="center">
                        <div className="text-gray-500">
                          {badge.icon}
                        </div>
                        <Text size="1" weight="medium" color="gray" className="text-center leading-tight">
                          {badge.title}
                        </Text>
                        {badge.maxProgress && badge.progress !== undefined && (
                          <Progress
                            value={(badge.progress / badge.maxProgress) * 100}
                            className="w-full h-1"
                          />
                        )}
                      </Flex>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </>
          )}
          </Flex>
        </CardContent>
      </Card>

      {selectedBadge && (
        <Dialog open={true} onOpenChange={() => setSelectedBadge(null)}>
          <DialogContent className="max-w-[400px]">
            <Flex direction="column" gap="4" align="center" className="text-center">
              <div
                className={`p-5 rounded-full ${
                  selectedBadge.unlocked ? "bg-blue-50 text-blue-500" : "bg-gray-50 text-gray-500"
                }`}
              >
                {selectedBadge.icon}
              </div>

              <Flex direction="column" gap="2" align="center">
                <DialogTitle>{selectedBadge.title}</DialogTitle>
                <Badge className={getRarityColor(selectedBadge.rarity)}>
                  {selectedBadge.rarity.charAt(0).toUpperCase() + selectedBadge.rarity.slice(1)}
                </Badge>
              </Flex>

              <Text color="gray" className="max-w-[300px]">
                {selectedBadge.description}
              </Text>

              <Card className="w-full">
                <CardContent className="pt-6">
                  <Flex direction="column" gap="3">
                    <Flex align="center" gap="2">
                      {getCategoryIcon(selectedBadge.category)}
                      <Text size="2" weight="medium">
                        {selectedBadge.category.charAt(0).toUpperCase() + selectedBadge.category.slice(1)}
                      </Text>
                    </Flex>

                    <Flex justify="between">
                      <Text size="2" color="gray">Requirement:</Text>
                      <Text size="2" weight="medium">{selectedBadge.requirement}</Text>
                    </Flex>

                    <Flex justify="between">
                      <Text size="2" color="gray">XP Reward:</Text>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{selectedBadge.xpReward} XP</Badge>
                    </Flex>

                    {selectedBadge.maxProgress && selectedBadge.progress !== undefined && (
                      <Flex direction="column" gap="2">
                        <Flex justify="between">
                          <Text size="2" color="gray">Progress:</Text>
                          <Text size="2" weight="medium">
                            {selectedBadge.progress} / {selectedBadge.maxProgress}
                          </Text>
                        </Flex>
                        <Progress
                          value={(selectedBadge.progress / selectedBadge.maxProgress) * 100}
                          className={selectedBadge.unlocked ? "bg-green-200" : "bg-blue-200"}
                        />
                      </Flex>
                    )}
                  </Flex>
                </CardContent>
              </Card>

              {selectedBadge.unlocked && (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                  <CheckCircle size={14} className="mr-1" />
                  Unlocked!
                </Badge>
              )}

              <Button variant="soft" onClick={() => setSelectedBadge(null)}>
                Close
              </Button>
            </Flex>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}