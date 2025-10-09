"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flex } from "@/components/ui/flex";
import { Heading, Text } from "@/components/ui/typography";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { CheckCircle, Award, ArrowRight } from "react-feather";
type DbLesson = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  order: number;
  xpReward: number;
};

type LessonModalProps = {
  lesson: DbLesson;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (score: number) => Promise<void>;
};

const LESSON_CONTENT = {
  "defi-basics": {
    slides: [
      {
        title: "What is DeFi?",
        content: "Decentralized Finance (DeFi) removes traditional financial intermediaries like banks, using smart contracts on blockchain networks instead.",
        question: "What makes DeFi different from traditional finance?",
        options: [
          "It uses banks and intermediaries",
          "It operates without central authorities",
          "It requires government permission",
          "It only works with physical money"
        ],
        correct: 1
      },
      {
        title: "Yield Farming Basics",
        content: "Yield farming means lending your crypto to earn interest. Think of it like putting money in a savings account, but with potentially higher returns.",
        question: "What is yield farming?",
        options: [
          "Growing plants with cryptocurrency",
          "Lending crypto to earn interest",
          "Mining new cryptocurrencies",
          "Trading crypto frequently"
        ],
        correct: 1
      },
      {
        title: "Stablecoins",
        content: "Stablecoins like USDC maintain their value close to $1 USD, making them perfect for earning steady yields without price volatility.",
        question: "Why are stablecoins useful for yield farming?",
        options: [
          "They fluctuate in price wildly",
          "They maintain stable value near $1",
          "They always increase in value",
          "They can only be used once"
        ],
        correct: 1
      }
    ]
  },
  "risk-management": {
    slides: [
      {
        title: "Understanding Risk",
        content: "In DeFi, higher yields often come with higher risks. Smart contracts can have bugs, protocols can fail, and market conditions change rapidly.",
        question: "What should you consider when choosing DeFi investments?",
        options: [
          "Only the highest possible yields",
          "The balance between risk and reward",
          "The most popular protocols only",
          "Whatever others are doing"
        ],
        correct: 1
      },
      {
        title: "Diversification",
        content: "Don't put all your funds in one protocol. Spreading investments across different strategies reduces your overall risk.",
        question: "What is diversification?",
        options: [
          "Putting all money in one investment",
          "Spreading investments across different options",
          "Only investing in risky protocols",
          "Avoiding all investments"
        ],
        correct: 1
      }
    ]
  }
};

export function LessonModal({ lesson, isOpen, onClose, onComplete }: LessonModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const lessonContent = LESSON_CONTENT[lesson.slug as keyof typeof LESSON_CONTENT];
  
  if (!lessonContent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[600px]">
          <DialogTitle>Lesson Not Found</DialogTitle>
          <Text>This lesson content is not available yet.</Text>
          <Flex gap="3" className="mt-4" justify="end">
            <Button variant="soft" onClick={onClose}>
              Close
            </Button>
          </Flex>
        </DialogContent>
      </Dialog>
    );
  }

  const slides = lessonContent.slides;
  const currentSlideData = slides[currentSlide];
  const progress = ((currentSlide + 1) / slides.length) * 100;

  const handleAnswer = (selectedOption: number) => {
    const newAnswers = [...answers];
    newAnswers[currentSlide] = selectedOption;
    setAnswers(newAnswers);

    if (currentSlide < slides.length - 1) {
      setTimeout(() => {
        setCurrentSlide(currentSlide + 1);
      }, 1000);
    } else {
      setTimeout(() => {
        setShowResult(true);
      }, 1000);
    }
  };

  const calculateScore = () => {
    const correct = answers.filter((answer, index) => answer === slides[index].correct).length;
    return Math.round((correct / slides.length) * 100);
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const score = calculateScore();
      await onComplete(score);
      onClose();
    } catch (error) {
      console.error("Failed to complete lesson:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  const reset = () => {
    setCurrentSlide(0);
    setAnswers([]);
    setShowResult(false);
  };

  if (showResult) {
    const score = calculateScore();
    const earnedXP = Math.round((score / 100) * lesson.xpReward);

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[600px]">
          <Flex direction="column" gap="4" align="center" className="text-center">
            <CheckCircle size={48} color="#10b981" />
            <Heading size="6">Lesson Complete!</Heading>
            <Text size="4">You scored {score}% and earned {earnedXP} XP</Text>

            <Card className="w-full">
              <CardContent className="pt-6">
                <Flex direction="column" gap="3">
                  <Heading size="4">Your Performance</Heading>
                  <Flex justify="between">
                    <Text>Correct Answers:</Text>
                    <Text weight="bold">{answers.filter((answer, index) => answer === slides[index].correct).length} / {slides.length}</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text>XP Earned:</Text>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{earnedXP} XP</Badge>
                  </Flex>
                </Flex>
              </CardContent>
            </Card>

            {score >= 80 && (
              <Callout.Root color="green">
                <Callout.Icon>
                  <Award size={16} />
                </Callout.Icon>
                <Callout.Text>
                  Excellent work! You&apos;ve unlocked new yield strategies.
                </Callout.Text>
              </Callout.Root>
            )}

            <Flex gap="3" className="w-full" justify="center">
              <Button variant="soft" onClick={reset}>
                Retake Lesson
              </Button>
              <Button onClick={handleComplete} disabled={isCompleting}>
                {isCompleting ? "Saving..." : "Continue"}
              </Button>
            </Flex>
          </Flex>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <DialogTitle>{lesson.title}</DialogTitle>
            <Text size="2" color="gray">
              {currentSlide + 1} / {slides.length}
            </Text>
          </Flex>

          <Progress value={progress} />

          <Card>
            <CardContent className="pt-6">
              <Flex direction="column" gap="3">
                <Heading size="3">{currentSlideData.title}</Heading>
                <Text size="2" className="leading-relaxed">
                  {currentSlideData.content}
                </Text>
              </Flex>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Flex direction="column" gap="3">
                <Text weight="medium" size="2">
                  {currentSlideData.question}
                </Text>
                <Flex direction="column" gap="2">
                  {currentSlideData.options.map((option, index) => {
                    const isSelected = answers[currentSlide] === index;
                    const isCorrect = index === currentSlideData.correct;
                    const showAnswer = answers[currentSlide] !== undefined;

                    let buttonVariant: "default" | "soft" | "destructive" = "soft";
                    let buttonClassName = "";

                    if (showAnswer) {
                      if (isCorrect) {
                        buttonVariant = isSelected ? "default" : "soft";
                        buttonClassName = "bg-green-500 hover:bg-green-600 text-white";
                      } else if (isSelected && !isCorrect) {
                        buttonVariant = "destructive";
                      }
                    } else if (isSelected) {
                      buttonVariant = "default";
                    }

                    return (
                      <Button
                        key={`${currentSlide}-${index}`}
                        variant={buttonVariant}
                        onClick={() => handleAnswer(index)}
                        disabled={answers[currentSlide] !== undefined}
                        size="2"
                        className={`justify-start text-left ${buttonClassName}`}
                      >
                        <Text size="2">{option}</Text>
                        {showAnswer && isCorrect && <CheckCircle size={14} className="ml-auto" />}
                      </Button>
                    );
                  })}
                </Flex>
              </Flex>
            </CardContent>
          </Card>

          <Flex gap="3" justify="end">
            <Button variant="soft" onClick={onClose}>
              Close
            </Button>
            {currentSlide > 0 && (
              <Button variant="soft" onClick={() => setCurrentSlide(currentSlide - 1)}>
                Previous
              </Button>
            )}
            {currentSlide < slides.length - 1 && answers[currentSlide] !== undefined && (
              <Button onClick={() => setCurrentSlide(currentSlide + 1)}>
                Next <ArrowRight size={16} />
              </Button>
            )}
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
}