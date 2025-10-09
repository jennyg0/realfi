"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Flex } from "@/components/ui/flex";
import { Heading, Text } from "@/components/ui/typography";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, BookOpen, Target, TrendingUp, X } from "react-feather";

type WelcomeFlowProps = {
  onComplete: () => void;
};

const STEPS = [
  {
    title: "Welcome to RealFi! 👋",
    description: "Learn DeFi concepts through interactive lessons and earn real yield",
    icon: <BookOpen size={48} />,
    features: [
      "Complete bite-sized lessons to earn XP",
      "Unlock achievements and badges",
      "Track your learning streak"
    ]
  },
  {
    title: "Set Your Goals 🎯",
    description: "Define your savings target and we'll recommend the best strategies",
    icon: <Target size={48} />,
    features: [
      "Personalized strategy recommendations",
      "Track progress toward your goal",
      "Adjust anytime as your needs change"
    ]
  },
  {
    title: "Earn Yield, No Gas Fees ⚡",
    description: "Deploy funds to vetted DeFi protocols on Base without worrying about transaction costs",
    icon: <TrendingUp size={48} />,
    features: [
      "Gasless deposits via smart wallet",
      "Battle-tested protocols (Aave, Compound)",
      "Earn up to 90x more than traditional banks"
    ]
  }
];

export function WelcomeFlow({ onComplete }: WelcomeFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-[600px] w-full relative bg-white shadow-2xl">
        <CardContent className="p-8 md:p-10">
          {/* Close/Skip Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
          >
            <X size={18} color="#6b7280" />
          </button>

          {/* Progress Bar */}
          <div className="mb-8">
            <Flex justify="between" align="center" className="mb-2">
              <Text size="1" color="gray">
                Step {currentStep + 1} of {STEPS.length}
              </Text>
              <Button variant="ghost" size="1" onClick={handleSkip}>
                Skip tour
              </Button>
            </Flex>
            <Progress value={progress} />
          </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-gradient-to-br from-purple-500 to-purple-700 text-white">
            {step.icon}
          </div>

          <Heading size="7" className="mb-3">
            {step.title}
          </Heading>
          <Text size="4" color="gray" className="mb-6 block">
            {step.description}
          </Text>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {step.features.map((feature, idx) => (
              <Flex
                key={idx}
                gap="3"
                align="center"
                className="p-3 bg-blue-50 rounded-lg text-left"
              >
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white text-xs">
                  ✓
                </div>
                <Text size="2">{feature}</Text>
              </Flex>
            ))}
          </div>
        </div>

          {/* Navigation */}
          <Flex gap="3" justify="center">
            {currentStep > 0 && (
              <Button
                variant="soft"
                size="3"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="min-w-[120px]"
              >
                Back
              </Button>
            )}
            <Button
              size="3"
              onClick={handleNext}
              className="min-w-[120px] bg-gradient-to-r from-blue-500 to-purple-600 border-none"
            >
              {currentStep === STEPS.length - 1 ? "Get Started" : "Next"}
              <ArrowRight size={18} />
            </Button>
          </Flex>

          {/* Step Indicators */}
          <Flex gap="2" justify="center" className="mt-6">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'bg-blue-500 w-6'
                    : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </Flex>
        </CardContent>
      </Card>
    </div>
  );
}
