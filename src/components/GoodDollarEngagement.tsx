"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  useEngagementRewards,
  REWARDS_CONTRACT,
} from "@goodsdks/engagement-sdk";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heading, Text } from "@/components/ui/typography";
import { Flex } from "@/components/ui/flex";
import { Award, CheckCircle, AlertCircle } from "react-feather";
import { toast } from "sonner";

type GoodDollarEngagementProps = {
  privyId: string;
  appAddress: `0x${string}`;
  inviterAddress?: `0x${string}`;
  onClaimSuccess?: () => void;
};

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

export function GoodDollarEngagement({
  privyId,
  appAddress,
  inviterAddress = ZERO_ADDRESS,
  onClaimSuccess,
}: GoodDollarEngagementProps) {
  const { address } = useAccount();
  const engagementRewards = useEngagementRewards(REWARDS_CONTRACT);

  const [isClaiming, setIsClaiming] = useState(false);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Auto-check registration status on mount
  useEffect(() => {
    const checkRegistration = async () => {
      if (!engagementRewards || !address) return;

      try {
        const registered = await engagementRewards.isUserRegistered(
          appAddress,
          address
        );
        setIsRegistered(registered);
      } catch (error) {
        console.error("Error checking registration:", error);
      }
    };

    checkRegistration();
  }, [engagementRewards, address, appAddress]);

  // Check eligibility
  const checkEligibility = async () => {
    if (!engagementRewards || !address) return;

    setIsChecking(true);
    try {
      const eligible = await engagementRewards
        .canClaim(appAddress, address)
        .catch(() => false);
      setIsEligible(eligible);

      const registered = await engagementRewards.isUserRegistered(
        appAddress,
        address
      );
      setIsRegistered(registered);

      if (eligible) {
        toast.success("You're eligible to claim engagement rewards!");
      } else {
        toast.info("You're not eligible to claim yet. Keep engaging!");
      }
    } catch (error) {
      console.error("Error checking eligibility:", error);
      toast.error("Failed to check eligibility");
    } finally {
      setIsChecking(false);
    }
  };

  // Handle claim
  const handleClaim = async () => {
    if (!engagementRewards || !address) {
      toast.error("SDK not initialized or wallet not connected");
      return;
    }

    setIsClaiming(true);
    try {
      // Check eligibility first
      const eligible = await engagementRewards
        .canClaim(appAddress, address)
        .catch(() => false);

      if (!eligible) {
        toast.error("You're not eligible to claim at this time");
        setIsClaiming(false);
        return;
      }

      // Get current block and set validity
      const currentBlock = await engagementRewards.getCurrentBlockNumber();
      const validUntilBlock = currentBlock + 10n; // Valid for 10 blocks (~50 seconds on Celo)

      // Check if user needs to register
      let userSignature: `0x${string}` = "0x";
      const registered = await engagementRewards.isUserRegistered(
        appAddress,
        address
      );

      if (!registered) {
        // Show a clear message about what they're signing
        toast.info(
          "Please sign the message in your wallet to verify your account",
          {
            description:
              "This is required only once for GoodDollar registration",
            duration: 5000,
          }
        );

        try {
          userSignature = await engagementRewards.signClaim(
            appAddress,
            inviterAddress,
            validUntilBlock
          );
        } catch {
          // User rejected signature
          throw new Error(
            "You must sign the message to register for GoodDollar rewards"
          );
        }
      }

      // Get app signature from backend
      toast.info("Getting app signature from backend...");
      const response = await fetch("/api/gooddollar/sign-engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyId,
          user: address,
          validUntilBlock: validUntilBlock.toString(),
          inviter: inviterAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get app signature");
      }

      const { signature: appSignature } = await response.json();

      // Submit claim
      toast.info("Submitting claim transaction...");
      const receipt = await engagementRewards.nonContractAppClaim(
        appAddress,
        inviterAddress,
        validUntilBlock,
        userSignature,
        appSignature as `0x${string}`
      );

      toast.success("Successfully claimed engagement rewards!");
      console.log("Claim receipt:", receipt);

      // Reset state
      setIsEligible(false);
      setIsRegistered(true);

      onClaimSuccess?.();
    } catch (error) {
      console.error("Claim failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to claim engagement rewards"
      );
    } finally {
      setIsClaiming(false);
    }
  };

  if (!address) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Flex
            direction="column"
            gap="4"
            align="center"
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
              <Award size={32} color="#9333ea" />
            </div>
            <div>
              <Heading size="4" className="mb-2">
                Engagement Rewards
              </Heading>
              <Text size="2" color="gray">
                Connect your wallet to claim rewards for engaging with RealFi
              </Text>
            </div>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  if (!engagementRewards) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Flex
            direction="column"
            gap="4"
            align="center"
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
              <Award size={32} color="#9333ea" />
            </div>
            <div>
              <Heading size="4" className="mb-2">
                Engagement Rewards
              </Heading>
              <Text size="2" color="gray">
                Loading rewards SDK...
              </Text>
            </div>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-100 border-purple-200">
      <CardContent className="pt-6">
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="start">
            <div>
              <Heading size="4" className="mb-1">
                Engagement Rewards
              </Heading>
              <Text size="2" color="gray">
                Earn G$ tokens for engaging with RealFi
              </Text>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
              <Award size={24} color="white" />
            </div>
          </Flex>

          {/* Status Display */}
          {isRegistered !== null && (
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <Flex gap="2" align="center" className="mb-2">
                {isRegistered ? (
                  <CheckCircle size={16} color="#10b981" />
                ) : (
                  <AlertCircle size={16} color="#f97316" />
                )}
                <Text size="2" weight="bold">
                  {isRegistered ? "Registered User" : "First-Time Claim"}
                </Text>
              </Flex>
              <Text size="1" color="gray">
                {isRegistered
                  ? "You're registered for engagement rewards"
                  : "Your first claim will register you for future rewards"}
              </Text>
            </div>
          )}

          {/* Eligibility Status */}
          {isEligible !== null && (
            <div
              className={`p-4 rounded-lg ${
                isEligible ? "bg-green-100" : "bg-orange-100"
              }`}
            >
              <Text size="2" weight="bold" className="mb-1">
                {isEligible ? "✓ Eligible to Claim" : "Not Eligible Yet"}
              </Text>
              <Text size="1" color="gray">
                {isEligible
                  ? "You can claim your engagement rewards now!"
                  : "Complete more actions to become eligible for rewards"}
              </Text>
            </div>
          )}

          {/* Action Buttons */}
          <Flex gap="3">
            <Button
              size="3"
              variant="outline"
              onClick={checkEligibility}
              disabled={isChecking}
              className="flex-1"
            >
              {isChecking ? "Checking..." : "Check Eligibility"}
            </Button>

            <Button
              size="3"
              onClick={handleClaim}
              disabled={!isEligible || isClaiming}
              className={`flex-1 ${
                isEligible ? "bg-purple-500 hover:bg-purple-600" : "bg-gray-400"
              }`}
            >
              {isClaiming ? (
                "Claiming..."
              ) : isEligible ? (
                <Flex gap="2" align="center" justify="center">
                  <Award size={18} />
                  <span>
                    {isRegistered ? "Claim Rewards" : "Register & Claim"}
                  </span>
                </Flex>
              ) : (
                "Check Eligibility First"
              )}
            </Button>
          </Flex>

          {/* Info */}
          <div className="p-3 bg-purple-100/50 rounded-lg">
            <Text size="1" color="gray">
              {!isRegistered && isEligible ? (
                <>
                  <strong>First-time claim:</strong> You'll need to sign a
                  verification message once to register your account with
                  GoodDollar.
                </>
              ) : (
                <>
                  Engagement rewards are G$ tokens earned by completing actions
                  in RealFi. Check your eligibility to see if you can claim!
                </>
              )}
            </Text>
          </div>
        </Flex>
      </CardContent>
    </Card>
  );
}
