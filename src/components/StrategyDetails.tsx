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
import { Callout } from "@/components/ui/callout";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info
} from "react-feather";

type Strategy = {
  key: string;
  title: string;
  protocol: string;
  chain: string;
  estApr: number;
  summary: string;
  risk: string;
};

type StrategyDetailsProps = {
  strategy: Strategy;
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number) => Promise<void>;
  userRiskProfile: string;
};

const STRATEGY_DETAILS = {
  "usdc-aave-base": {
    description: "Lend USDC on Aave's Base deployment for steady, low-risk yields backed by one of DeFi's most battle-tested protocols.",
    mechanism: "Supply USDC to Aave's lending pool where borrowers pay interest. Your deposits are secured by overcollateralized loans.",
    risks: [
      "Smart contract risk (very low - Aave is battle-tested)",
      "Liquidation risk (none for lenders)",
      "Base network risk (low - backed by Coinbase)"
    ],
    benefits: [
      "Instant liquidity - withdraw anytime",
      "Compound interest - earnings auto-compound",
      "Insurance coverage through Aave's safety module"
    ],
    minDeposit: 10,
    maxDeposit: 10000,
    lockupPeriod: "None",
    historical: {
      "30d": 4.2,
      "90d": 4.5,
      "1y": 5.1
    }
  },
  "usdc-compound-base": {
    description: "Supply USDC to Compound v3 on Base for algorithmically determined interest rates with institutional-grade security.",
    mechanism: "Deposit USDC into Compound's autonomous money market where rates adjust based on supply and demand.",
    risks: [
      "Smart contract risk (low - extensively audited)",
      "Interest rate volatility (medium)",
      "Base network risk (low)"
    ],
    benefits: [
      "Dynamic rates that adjust to market conditions",
      "Full liquidity - no lock-up periods",
      "Governance token rewards (COMP)"
    ],
    minDeposit: 25,
    maxDeposit: 25000,
    lockupPeriod: "None",
    historical: {
      "30d": 3.8,
      "90d": 4.1,
      "1y": 4.9
    }
  },
  "usdc-stargate-multichain": {
    description: "Bridge USDC across chains with Stargate Finance while earning yield from cross-chain liquidity provision.",
    mechanism: "Provide liquidity for cross-chain transfers between Base, Ethereum, and other networks via Stargate's unified pools.",
    risks: [
      "Bridge risk (medium - cross-chain complexity)",
      "Impermanent loss risk (low with stablecoins)",
      "Multi-chain smart contract risk (medium)"
    ],
    benefits: [
      "Higher yields from cross-chain demand",
      "STG token rewards",
      "Exposure to growing cross-chain ecosystem"
    ],
    minDeposit: 100,
    maxDeposit: 50000,
    lockupPeriod: "None",
    historical: {
      "30d": 6.8,
      "90d": 7.2,
      "1y": 8.5
    }
  }
};

export function StrategyDetails({ 
  strategy, 
  isOpen, 
  onClose, 
  onDeposit,
  userRiskProfile 
}: StrategyDetailsProps) {
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);

  const details = STRATEGY_DETAILS[strategy.key as keyof typeof STRATEGY_DETAILS];
  
  if (!details) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[600px]">
          <DialogTitle>Strategy Details</DialogTitle>
          <Text>Details for this strategy are not available yet.</Text>
          <Flex gap="3" className="mt-4" justify="end">
            <Button variant="soft" onClick={onClose}>Close</Button>
          </Flex>
        </DialogContent>
      </Dialog>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "conservative": return "bg-green-100 text-green-800 hover:bg-green-200";
      case "balanced": return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "aggressive": return "bg-red-100 text-red-800 hover:bg-red-200";
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const isRiskMatch = strategy.risk.toLowerCase() === userRiskProfile.toLowerCase();

  const handleDeposit = async () => {
    if (!depositAmount || depositAmount < details.minDeposit) return;
    
    setIsDepositing(true);
    try {
      await onDeposit(depositAmount);
      onClose();
    } catch (error) {
      console.error("Deposit failed:", error);
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-auto">
        <DialogTitle>{strategy.title}</DialogTitle>

        <Flex direction="column" gap="4" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                  <Flex align="center" gap="2">
                    <TrendingUp size={20} color="#10b981" />
                    <Text weight="medium">Current APR</Text>
                  </Flex>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                    {strategy.estApr}%
                  </Badge>
                </Flex>

                <Flex justify="between" align="center">
                  <Flex align="center" gap="2">
                    <Shield size={20} />
                    <Text weight="medium">Risk Level</Text>
                  </Flex>
                  <Badge className={getRiskColor(strategy.risk)}>
                    {strategy.risk}
                  </Badge>
                </Flex>

                <Flex justify="between" align="center">
                  <Flex align="center" gap="2">
                    <Clock size={20} />
                    <Text weight="medium">Lockup Period</Text>
                  </Flex>
                  <Text weight="medium">{details.lockupPeriod}</Text>
                </Flex>
              </Flex>
            </CardContent>
          </Card>

          {!isRiskMatch && (
            <Callout.Root color="yellow">
              <Callout.Icon>
                <AlertTriangle size={16} />
              </Callout.Icon>
              <Callout.Text>
                This {strategy.risk.toLowerCase()} risk strategy doesn&apos;t match your {userRiskProfile.toLowerCase()} risk profile.
                Consider strategies that align with your preferences for better portfolio balance.
              </Callout.Text>
            </Callout.Root>
          )}

          <Card>
            <CardContent className="pt-6">
              <Flex direction="column" gap="3">
                <Heading size="4">How it works</Heading>
                <Text className="leading-relaxed">{details.description}</Text>

                <Separator />

                <Text size="3" weight="medium">Mechanism</Text>
                <Text color="gray" className="leading-relaxed">{details.mechanism}</Text>
              </Flex>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Flex direction="column" gap="3">
                <Heading size="4">Historical Performance</Heading>
                <Grid columns="3" gap="3">
                  <Flex direction="column" gap="1" align="center">
                    <Text size="2" color="gray">30 days</Text>
                    <Text weight="bold">{details.historical["30d"]}%</Text>
                  </Flex>
                  <Flex direction="column" gap="1" align="center">
                    <Text size="2" color="gray">90 days</Text>
                    <Text weight="bold">{details.historical["90d"]}%</Text>
                  </Flex>
                  <Flex direction="column" gap="1" align="center">
                    <Text size="2" color="gray">1 year</Text>
                    <Text weight="bold">{details.historical["1y"]}%</Text>
                  </Flex>
                </Grid>
              </Flex>
            </CardContent>
          </Card>

          <Flex gap="3">
            <Card className="flex-1">
              <CardContent className="pt-6">
                <Flex direction="column" gap="2">
                  <Text size="3" weight="medium" color="green">Benefits</Text>
                  {details.benefits.map((benefit) => (
                    <Flex key={benefit} align="center" gap="2">
                      <CheckCircle size={14} color="#10b981" />
                      <Text size="2">{benefit}</Text>
                    </Flex>
                  ))}
                </Flex>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardContent className="pt-6">
                <Flex direction="column" gap="2">
                  <Text size="3" weight="medium" color="red">Risks</Text>
                  {details.risks.map((risk) => (
                    <Flex key={risk} align="center" gap="2">
                      <AlertTriangle size={14} color="#ef4444" />
                      <Text size="2">{risk}</Text>
                    </Flex>
                  ))}
                </Flex>
              </CardContent>
            </Card>
          </Flex>

          <Card>
            <CardContent className="pt-6">
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Heading size="4">Queue Deposit</Heading>
                  <Flex align="center" gap="2">
                    <Info size={16} color="#6b7280" />
                    <Text size="2" color="gray">Gasless via smart wallet</Text>
                  </Flex>
                </Flex>

                <Flex direction="column" gap="2">
                  <Text weight="medium">Amount (USDC)</Text>
                  <input
                    type="number"
                    className="rounded-md border px-3 py-2"
                    placeholder={`Min: ${details.minDeposit} USDC`}
                    value={depositAmount || ""}
                    onChange={(e) => setDepositAmount(Number(e.target.value) || null)}
                    min={details.minDeposit}
                    max={details.maxDeposit}
                    step={1}
                  />
                  <Flex justify="between">
                    <Text size="2" color="gray">
                      Min: ${details.minDeposit} • Max: ${details.maxDeposit.toLocaleString()}
                    </Text>
                    {depositAmount && (
                      <Text size="2" color="gray">
                        Est. yearly: ${Math.round(depositAmount * strategy.estApr / 100)}
                      </Text>
                    )}
                  </Flex>
                </Flex>

                {depositAmount && depositAmount >= details.minDeposit && (
                  <Card className="bg-blue-50">
                    <CardContent className="pt-6">
                      <Flex direction="column" gap="2">
                        <Text size="3" weight="medium">Deposit Summary</Text>
                        <Flex justify="between">
                          <Text size="2" color="gray">Amount:</Text>
                          <Text size="2" weight="medium">${depositAmount} USDC</Text>
                        </Flex>
                        <Flex justify="between">
                          <Text size="2" color="gray">Estimated APR:</Text>
                          <Text size="2" weight="medium">{strategy.estApr}%</Text>
                        </Flex>
                        <Flex justify="between">
                          <Text size="2" color="gray">Monthly yield:</Text>
                          <Text size="2" weight="medium">~${(depositAmount * strategy.estApr / 100 / 12).toFixed(2)}</Text>
                        </Flex>
                      </Flex>
                    </CardContent>
                  </Card>
                )}
              </Flex>
            </CardContent>
          </Card>

          <Flex gap="3" justify="end">
            <Button variant="soft" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={!depositAmount || depositAmount < details.minDeposit || isDepositing}
            >
              {isDepositing ? "Processing..." : "Queue Deposit"}
            </Button>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
}