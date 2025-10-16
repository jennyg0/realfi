"use client";

import { useState } from "react";
import { Target, MapPin, Home, Umbrella, BookOpen, Heart } from "react-feather";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type DbGoal = {
  id: number;
  profileId: number;
  targetAmount: number;
  depositedAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

type GoalTemplate = {
  id: string;
  category:
    | "emergency"
    | "travel"
    | "house"
    | "education"
    | "retirement"
    | "other";
  title: string;
  targetAmount: number;
  timeframe: string;
  icon: React.ReactNode;
  description: string;
  riskRecommendation: "Conservative" | "Balanced" | "Aggressive";
};

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "emergency-fund",
    category: "emergency",
    title: "Emergency Fund",
    targetAmount: 5000,
    timeframe: "6 months",
    icon: <Umbrella size={24} />,
    description: "Build a safety net for unexpected expenses",
    riskRecommendation: "Conservative",
  },
  {
    id: "vacation",
    category: "travel",
    title: "Dream Vacation",
    targetAmount: 3000,
    timeframe: "1 year",
    icon: <MapPin size={24} />,
    description: "Save for that perfect getaway",
    riskRecommendation: "Balanced",
  },
  {
    id: "house-down-payment",
    category: "house",
    title: "House Down Payment",
    targetAmount: 50000,
    timeframe: "3 years",
    icon: <Home size={24} />,
    description: "Save for your first home purchase",
    riskRecommendation: "Balanced",
  },
  {
    id: "education",
    category: "education",
    title: "Education Fund",
    targetAmount: 20000,
    timeframe: "2 years",
    icon: <BookOpen size={24} />,
    description: "Invest in learning and skills development",
    riskRecommendation: "Conservative",
  },
  {
    id: "retirement",
    category: "retirement",
    title: "Retirement Savings",
    targetAmount: 100000,
    timeframe: "10 years",
    icon: <Target size={24} />,
    description: "Build wealth for your future",
    riskRecommendation: "Aggressive",
  },
  {
    id: "wedding",
    category: "other",
    title: "Wedding Fund",
    targetAmount: 15000,
    timeframe: "18 months",
    icon: <Heart size={24} />,
    description: "Save for your special day",
    riskRecommendation: "Balanced",
  },
];

type GoalsManagerProps = {
  currentGoal?: DbGoal | null;
  totalGoalBalances?: number;
  onCreateGoal: (goal: {
    targetAmount: number;
    category: string;
    title: string;
  }) => Promise<void>;
  onOpenProjection?: () => void;
};

export function GoalsManager({
  currentGoal,
  totalGoalBalances = 0,
  onCreateGoal,
  onOpenProjection,
}: GoalsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(
    null
  );
  const [customAmount, setCustomAmount] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGoal = async () => {
    if (!selectedTemplate) return;

    setIsCreating(true);
    try {
      await onCreateGoal({
        targetAmount: customAmount || selectedTemplate.targetAmount,
        category: selectedTemplate.category,
        title: selectedTemplate.title,
      });
      // Celebrate with confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ED6A9F", "#B185DB", "#F5CF5D"],
      });

      toast.success("🎯 Goal created!", {
        description: `Your ${selectedTemplate.title} goal has been set to $${(
          customAmount || selectedTemplate.targetAmount
        ).toLocaleString()}`,
      });
      setIsOpen(false);
      setSelectedTemplate(null);
      setCustomAmount(null);
    } catch (error) {
      console.error("Failed to create goal:", error);
      toast.error("Failed to create goal", {
        description: "Please try again",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Conservative":
        return "default";
      case "Balanced":
        return "secondary";
      case "Aggressive":
        return "destructive";
      default:
        return "outline";
    }
  };
  const totalSaved = currentGoal
    ? currentGoal.depositedAmount + totalGoalBalances
    : 0;

  const progress = currentGoal
    ? Math.min(Math.round((totalSaved / currentGoal.targetAmount) * 100), 100)
    : 0;
  const remaining = currentGoal
    ? Math.max(currentGoal.targetAmount - totalSaved, 0)
    : 0;

  return (
    <>
      {currentGoal ? (
        <Card className="hover-lift animate-bounce-in shadow-bubble">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Target className="text-primary" size={24} />
                Your Savings Goal
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
              >
                Change Goal
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-4xl font-bold bg-gradient-bubblegum bg-clip-text text-transparent">
                  ${totalSaved.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">
                  of ${currentGoal.targetAmount.toLocaleString()}
                </span>
              </div>

              <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progress >= 100
                      ? "bg-gradient-sunset glow-accent"
                      : "bg-gradient-bubblegum glow"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <Badge
                  variant={progress >= 100 ? "default" : "secondary"}
                  className="font-semibold"
                >
                  {progress}% Complete
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ${remaining.toLocaleString()} remaining
                </span>
              </div>
            </div>

            {totalGoalBalances > 0 && (
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">DeFi Deposits</span>
                  <span className="font-medium">
                    ${currentGoal.depositedAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    External Accounts
                  </span>
                  <span className="font-medium">
                    ${totalGoalBalances.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Growth Projection Preview */}
            <div className="pt-4 border-t">
              <button
                onClick={onOpenProjection}
                className="w-full text-left space-y-2 hover:bg-muted/50 transition-colors p-3 rounded-lg -m-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Growth Projection</span>
                  <span className="text-xs text-muted-foreground">
                    Click to expand →
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  DeFi vs Bank savings over 5 years
                </div>
                {/* Simple mini chart */}
                <div className="relative h-20 bg-gradient-to-b from-gray-50 to-white rounded border">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 400 80"
                    preserveAspectRatio="none"
                  >
                    {/* Grid line */}
                    <line
                      x1="0"
                      y1="40"
                      x2="400"
                      y2="40"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />

                    {/* DeFi line (curved upward) */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      points="0,60 100,55 200,45 300,30 400,10"
                    />

                    {/* Bank line (nearly flat) */}
                    <polyline
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="3,3"
                      points="0,60 100,58 200,56 300,54 400,52"
                    />
                  </svg>

                  {/* Mini legend */}
                  <div className="absolute bottom-1 right-1 flex gap-2 text-[10px]">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-0.5 bg-green-500"></div>
                      DeFi
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-0.5 bg-red-500"></div>
                      Bank
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="text-center hover-lift animate-bounce-in">
          <CardContent className="py-10 space-y-4">
            <Target size={48} className="mx-auto text-primary" />
            <CardTitle>Set Your First Savings Goal</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              Choose a savings target to unlock personalized yield strategies
              and track your progress.
            </CardDescription>
            <Button
              onClick={() => setIsOpen(true)}
              className="bg-gradient-bubblegum glow"
            >
              Create Savings Goal
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setSelectedTemplate(null);
            setCustomAmount(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentGoal
                ? "Change Your Savings Goal"
                : "Create Your Savings Goal"}
            </DialogTitle>
            <DialogDescription>
              Choose a goal template or customize your own savings target.
            </DialogDescription>
          </DialogHeader>

          {!selectedTemplate ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {GOAL_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover-lift transition-all"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="pt-6 space-y-3 text-center">
                    <div className="text-primary mx-auto">{template.icon}</div>
                    <h3 className="font-bold">{template.title}</h3>
                    <p className="text-sm text-muted-foreground h-10">
                      {template.description}
                    </p>
                    <div className="pt-2 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-medium">
                          ${template.targetAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Timeframe:
                        </span>
                        <span className="font-medium">
                          {template.timeframe}
                        </span>
                      </div>
                      <Badge
                        variant={getRiskColor(template.riskRecommendation)}
                        className="w-full"
                      >
                        {template.riskRecommendation} Risk
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mt-4">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-primary">{selectedTemplate.icon}</div>
                  <h3 className="text-xl font-bold">
                    {selectedTemplate.title}
                  </h3>
                </div>

                <p className="text-muted-foreground">
                  {selectedTemplate.description}
                </p>

                <div className="space-y-3">
                  <label className="font-medium">
                    Customize Your Target Amount
                  </label>
                  <div className="flex gap-2 items-center">
                    <span className="text-2xl">$</span>
                    <Input
                      type="number"
                      placeholder={selectedTemplate.targetAmount.toString()}
                      value={customAmount || ""}
                      onChange={(e) =>
                        setCustomAmount(Number(e.target.value) || null)
                      }
                      min={100}
                      step={100}
                      className="text-lg"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Suggested: ${selectedTemplate.targetAmount.toLocaleString()}{" "}
                    over {selectedTemplate.timeframe}
                  </p>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-2">
                    <p className="font-medium">Risk Profile Match</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getRiskColor(
                          selectedTemplate.riskRecommendation
                        )}
                      >
                        {selectedTemplate.riskRecommendation}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        This goal works best with{" "}
                        {selectedTemplate.riskRecommendation.toLowerCase()}{" "}
                        yield strategies
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateGoal}
                    disabled={isCreating}
                    className="bg-gradient-bubblegum glow"
                  >
                    {isCreating
                      ? currentGoal
                        ? "Updating..."
                        : "Creating..."
                      : currentGoal
                      ? "Update Goal"
                      : "Create Goal"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
