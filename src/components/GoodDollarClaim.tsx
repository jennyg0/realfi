"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from "wagmi";
import { celo, fuse } from "wagmi/chains";
import { formatUnits } from "viem";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heading, Text } from "@/components/ui/typography";
import { Flex } from "@/components/ui/flex";
import { Gift, CheckCircle } from "react-feather";
import { toast } from "sonner";

type GoodDollarClaimProps = {
  privyId: string;
  onClaimSuccess?: () => void;
};

export function GoodDollarClaim({ privyId, onClaimSuccess }: GoodDollarClaimProps) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const [entitlement, setEntitlement] = useState<bigint | null>(null);
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [claimSDK, setClaimSDK] = useState<any>(null);
  const [identitySDK, setIdentitySDK] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<{ claimers: string; amount: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [fvLink, setFvLink] = useState<string | null>(null);
  const [hasCheckedWhitelist, setHasCheckedWhitelist] = useState(false);

  // Initialize SDK when wallet is connected
  useEffect(() => {
    const initSDK = async () => {
      if (!address || !publicClient || !walletClient) {
        setIsLoading(false);
        return;
      }

      // Check if on correct network (Celo or Fuse mainnet only)
      const isCelo = chainId === 42220;
      const isFuse = chainId === 122;

      if (!isCelo && !isFuse) {
        // Don't set error, just stop loading - we'll show network switch UI
        setIsLoading(false);
        return;
      }

      // Skip if we've already checked whitelist for this address
      if (hasCheckedWhitelist) {
        setIsLoading(false);
        return;
      }

      try {
        // Dynamically import the SDKs to avoid SSR issues
        const { ClaimSDK, IdentitySDK } = await import("@goodsdks/citizen-sdk");

        // Initialize Identity SDK first to check whitelisting
        const identitySdk = await IdentitySDK.init({
          publicClient: publicClient as any,
          walletClient: walletClient as any,
          env: "production",
        });

        setIdentitySDK(identitySdk);

        // Check if user is whitelisted - only do this once per session
        const { isWhitelisted: whitelisted } = await identitySdk.getWhitelistedRoot(address);
        setIsWhitelisted(whitelisted);
        setHasCheckedWhitelist(true);

        console.log("Is whitelisted:", whitelisted);

        // If not whitelisted, generate face verification link
        if (!whitelisted) {
          const callbackUrl = `${window.location.origin}/dashboard`;
          const link = await identitySdk.generateFVLink(false, callbackUrl);
          setFvLink(link);
          console.log("Face verification link:", link);
        }

        // Initialize Claim SDK
        const sdk = new ClaimSDK({
          account: address,
          publicClient: publicClient as any,
          walletClient: walletClient as any,
          env: "production",
        });

        setClaimSDK(sdk);

        // Check entitlement (SDK returns bigint)
        const ent = await sdk.checkEntitlement();
        console.log("Entitlement:", ent);
        setEntitlement(ent);

        // Get next claim time (returns bigint timestamp in seconds)
        const nextTime = await sdk.nextClaimTime();
        console.log("Next claim time (raw):", nextTime);

        // Convert bigint timestamp to Date (multiply by 1000 for milliseconds)
        if (nextTime && Number(nextTime) > 0) {
          const nextDate = new Date(Number(nextTime) * 1000);
          console.log("Next claim time (parsed):", nextDate);
          setNextClaimTime(nextDate);
        } else {
          setNextClaimTime(null);
        }

        // Get daily stats
        const stats = await sdk.getDailyStats();
        console.log("Daily stats:", stats);
        setDailyStats({
          claimers: stats.claimers.toString(),
          amount: stats.amount.toString(),
        });
      } catch (error: any) {
        console.error("Failed to initialize GoodDollar SDK:", error);
        setError(error.message || "Failed to connect to GoodDollar");
      } finally {
        setIsLoading(false);
      }
    };

    initSDK();
  }, [address, publicClient, walletClient, chainId, hasCheckedWhitelist]);

  // Reset whitelist check when address changes
  useEffect(() => {
    setHasCheckedWhitelist(false);
  }, [address]);

  const handleClaim = async () => {
    if (!claimSDK) {
      toast.error("SDK not initialized");
      return;
    }

    setIsClaiming(true);
    try {
      const receipt = await claimSDK.claim();

      // Track claim in database
      const network = chainId === 42220 ? "celo" : "fuse";
      await fetch("/api/gooddollar/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyId,
          amount: entitlement?.toString(),
          txHash: receipt.transactionHash,
          network,
        }),
      });

      toast.success("Successfully claimed your daily UBI!");

      // Refresh entitlement
      const ent = await claimSDK.checkEntitlement();
      setEntitlement(ent);

      const nextTime = await claimSDK.nextClaimTime();
      if (nextTime && Number(nextTime) > 0) {
        setNextClaimTime(new Date(Number(nextTime) * 1000));
      } else {
        setNextClaimTime(null);
      }

      onClaimSuccess?.();
    } catch (error: any) {
      console.error("Claim failed:", error);
      toast.error(error.message || "Failed to claim UBI");
    } finally {
      setIsClaiming(false);
    }
  };

  if (!address) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Flex direction="column" gap="4" align="center" className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Gift size={32} color="#10b981" />
            </div>
            <div>
              <Heading size="4" className="mb-2">GoodDollar UBI</Heading>
              <Text size="2" color="gray">
                Connect your wallet to claim free daily UBI tokens
              </Text>
            </div>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Flex direction="column" gap="4" align="center" className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Gift size={32} color="#10b981" />
            </div>
            <div>
              <Heading size="4" className="mb-2">GoodDollar UBI</Heading>
              <Text size="2" color="gray">Loading claim status...</Text>
            </div>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  // Show error state if there's an error or wrong network
  const isWrongNetwork = chainId && chainId !== 42220 && chainId !== 122;

  if (error || isWrongNetwork) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-100 border-orange-200">
        <CardContent className="pt-6">
          <Flex direction="column" gap="4">
            <Flex justify="between" align="start">
              <div>
                <Heading size="4" className="mb-1">GoodDollar UBI</Heading>
                <Text size="2" color="gray">{isWrongNetwork ? "Wrong Network" : "Unable to connect"}</Text>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Gift size={24} color="#f97316" />
              </div>
            </Flex>

            <div className="p-4 bg-white rounded-lg">
              <Text size="2" weight="bold" className="mb-2 block">
                {isWrongNetwork ? "Network Switch Required" : "Error"}
              </Text>
              <Text size="2" color="gray" className="mb-3 block">
                {isWrongNetwork
                  ? "GoodDollar is only available on Celo and Fuse mainnet networks. Please switch networks to claim your daily UBI."
                  : error
                }
              </Text>
              {chainId && (
                <div className="space-y-1 mb-3">
                  <Text size="1" color="gray" className="block">
                    Current network: {
                      chainId === 42220 ? "Celo Mainnet ✓" :
                      chainId === 122 ? "Fuse Mainnet ✓" :
                      `Chain ${chainId} ✗`
                    }
                  </Text>
                </div>
              )}

              {/* Network Switching Buttons */}
              {isWrongNetwork && switchChain && (
                <Flex gap="3" className="mt-3">
                  <Button
                    size="2"
                    onClick={() => {
                      try {
                        switchChain({ chainId: celo.id });
                        toast.info("Switching to Celo Mainnet...");
                      } catch (err) {
                        console.error("Failed to switch to Celo:", err);
                        toast.error("Failed to switch network");
                      }
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  >
                    Switch to Celo
                  </Button>
                  <Button
                    size="2"
                    onClick={() => {
                      try {
                        switchChain({ chainId: fuse.id });
                        toast.info("Switching to Fuse...");
                      } catch (err) {
                        console.error("Failed to switch to Fuse:", err);
                        toast.error("Failed to switch network");
                      }
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Switch to Fuse
                  </Button>
                </Flex>
              )}
            </div>

            <div className="p-3 bg-orange-100/50 rounded-lg">
              <Text size="1" color="gray">
                {isWrongNetwork
                  ? "Click a button above to switch to a supported network."
                  : "GoodDollar UBI claiming is temporarily unavailable. Please check back later."
                }
              </Text>
            </div>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  const canClaimNow = entitlement && entitlement > 0n && isWhitelisted;

  // Convert bigint to G$ (18 decimals) using viem's formatUnits
  const entitlementInG$ = entitlement !== null
    ? parseFloat(formatUnits(entitlement, 18)).toFixed(4)
    : "0.0000";

  console.log("Entitlement bigint:", entitlement);
  console.log("Entitlement G$:", entitlementInG$);

  // Check if already claimed (entitlement is 0)
  const alreadyClaimed = entitlement !== null && entitlement === 0n;

  // If SDK loaded but no entitlement data
  if (!claimSDK || entitlement === null) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-100 border-orange-200">
        <CardContent className="pt-6">
          <Flex direction="column" gap="4">
            <Flex justify="between" align="start">
              <div>
                <Heading size="4" className="mb-1">GoodDollar UBI</Heading>
                <Text size="2" color="gray">SDK not initialized</Text>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Gift size={24} color="#f97316" />
              </div>
            </Flex>

            <div className="p-4 bg-white rounded-lg">
              <Text size="2" weight="bold" className="mb-2 block">Status</Text>
              <div className="space-y-1">
                <Text size="1" color="gray" className="block">
                  Network: {
                    chainId === 42220 ? "Celo Mainnet ✓" :
                    chainId === 122 ? "Fuse Mainnet ✓" :
                    `${chainId} ✗`
                  }
                </Text>
                <Text size="1" color="gray" className="block">
                  SDK: {claimSDK ? "Loaded ✓" : "Not loaded ✗"}
                </Text>
                <Text size="1" color="gray" className="block">
                  Entitlement: {entitlement !== null ? "Checked ✓" : "Not available ✗"}
                </Text>
              </div>
            </div>

            <div className="p-3 bg-orange-100/50 rounded-lg">
              <Text size="1" color="gray">
                GoodDollar UBI claiming is temporarily unavailable. Please check back later.
              </Text>
            </div>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  // Show verification needed state
  if (isWhitelisted === false && fvLink) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-100 border-orange-200">
        <CardContent className="pt-6">
          <Flex direction="column" gap="4">
            <Flex justify="between" align="start">
              <div>
                <Heading size="4" className="mb-1">GoodDollar UBI</Heading>
                <Text size="2" color="gray">Verification Required</Text>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Gift size={24} color="#f97316" />
              </div>
            </Flex>

            <div className="p-4 bg-white rounded-lg">
              <Text size="2" weight="bold" className="mb-2 block">Face Verification Required</Text>
              <Text size="2" color="gray" className="mb-3 block">
                To claim GoodDollar UBI, you need to verify your identity through face verification.
                This is required for sybil-resistance (preventing multiple claims from the same person).
              </Text>
            </div>

            <Button
              size="3"
              onClick={() => window.open(fvLink, '_blank')}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Verify Your Identity
            </Button>

            <div className="p-3 bg-orange-100/50 rounded-lg">
              <Text size="1" color="gray">
                After verification, come back here to claim your daily UBI. The verification process takes a few minutes.
              </Text>
            </div>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
      <CardContent className="pt-6">
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="start">
            <div>
              <Heading size="4" className="mb-1">GoodDollar UBI</Heading>
              <Text size="2" color="gray">
                Claim your daily Universal Basic Income
              </Text>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
              <Gift size={24} color="white" />
            </div>
          </Flex>

          {/* Entitlement Display */}
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <Text size="2" color="gray" className="mb-1">Available to Claim</Text>
            <Heading size="6" style={{ color: canClaimNow ? "#10b981" : "#6b7280" }}>
              {entitlementInG$} G$
            </Heading>
            {alreadyClaimed && (
              <Text size="1" color="gray" className="mt-2">
                You've already claimed your UBI today. Come back tomorrow!
              </Text>
            )}
          </div>

          {/* Next Claim Time */}
          {nextClaimTime && nextClaimTime.getTime() > Date.now() && (
            <div className="p-3 bg-white/70 rounded-lg">
              <Text size="1" color="gray" className="mb-1">Next Claim Available</Text>
              <Text size="2" weight="medium">
                {nextClaimTime.toLocaleString()}
              </Text>
            </div>
          )}
          {canClaimNow && (
            <div className="p-3 bg-green-100 rounded-lg">
              <Text size="1" color="green" className="mb-1">✓ Ready to Claim</Text>
              <Text size="2" weight="medium">
                Your daily UBI is available now!
              </Text>
            </div>
          )}

          {/* Daily Stats */}
          {dailyStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/70 rounded-lg">
                <Text size="1" color="gray" className="mb-1">Daily Claimers</Text>
                <Text size="2" weight="medium">{dailyStats.claimers}</Text>
              </div>
              <div className="p-3 bg-white/70 rounded-lg">
                <Text size="1" color="gray" className="mb-1">Daily Pool</Text>
                <Text size="2" weight="medium">
                  {(Number(dailyStats.amount) / 1e18).toFixed(2)} G$
                </Text>
              </div>
            </div>
          )}

          {/* Claim Button */}
          <Button
            size="3"
            disabled={!canClaimNow || isClaiming}
            onClick={handleClaim}
            className={canClaimNow ? "bg-green-500 hover:bg-green-600" : ""}
          >
            {isClaiming ? (
              "Claiming..."
            ) : canClaimNow ? (
              <Flex gap="2" align="center" justify="center">
                <Gift size={18} />
                <span>Claim Daily UBI</span>
              </Flex>
            ) : alreadyClaimed ? (
              <Flex gap="2" align="center" justify="center">
                <CheckCircle size={18} />
                <span>Already Claimed Today</span>
              </Flex>
            ) : (
              <Flex gap="2" align="center" justify="center">
                <span>No UBI Available</span>
              </Flex>
            )}
          </Button>

          {/* Info */}
          <div className="p-3 bg-green-100/50 rounded-lg">
            <Text size="1" color="gray">
              GoodDollar is a UBI protocol that distributes free G$ tokens daily to verified users on Celo and Fuse networks.
            </Text>
          </div>
        </Flex>
      </CardContent>
    </Card>
  );
}
