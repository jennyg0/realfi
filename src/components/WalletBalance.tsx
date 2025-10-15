"use client";

import { useEffect, useState } from "react";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { base, celo } from "wagmi/chains";
import { Card, CardContent } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { Flex } from "@/components/ui/flex";
import { DollarSign, RefreshCw } from "react-feather";

// Common Base tokens
const BASE_TOKENS = [
  {
    symbol: "ETH",
    name: "Ethereum",
    address: null, // Native token
    decimals: 18,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    decimals: 6,
  },
  {
    symbol: "USDbC",
    name: "Bridged USDC",
    address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as `0x${string}`,
    decimals: 6,
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`,
    decimals: 18,
  },
];

// Common Celo tokens
const CELO_TOKENS = [
  {
    symbol: "CELO",
    name: "Celo",
    address: null, // Native token
    decimals: 18,
  },
  {
    symbol: "cUSD",
    name: "Celo Dollar",
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
    decimals: 18,
  },
  {
    symbol: "cEUR",
    name: "Celo Euro",
    address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73" as `0x${string}`,
    decimals: 18,
  },
  {
    symbol: "cREAL",
    name: "Celo Real",
    address: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787" as `0x${string}`,
    decimals: 18,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
    decimals: 6,
  },
];

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

type TokenBalance = {
  symbol: string;
  name: string;
  balance: string;
  balanceUSD: number;
  decimals: number;
};

export function WalletBalance() {
  const { address, chainId } = useAccount();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [totalUSD, setTotalUSD] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});

  // Determine which network and tokens to use
  const isBase = chainId === base.id;
  const isCelo = chainId === celo.id;
  const currentChainId = isBase ? base.id : isCelo ? celo.id : null;
  const currentTokens = isBase ? BASE_TOKENS : isCelo ? CELO_TOKENS : [];
  const nativeSymbol = isBase ? "ETH" : isCelo ? "CELO" : "ETH";

  // Fetch native token balance
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address,
    chainId: currentChainId || undefined,
  });

  // Fetch ERC20 token balances
  const { data: tokenData, refetch: refetchTokens } = useReadContracts({
    contracts: currentTokens.filter((t) => t.address).map((token) => ({
      address: token.address!,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address!],
      chainId: currentChainId!,
    })),
    query: {
      enabled: !!address && !!currentChainId,
    },
  });

  // Fetch token prices (simplified - using CoinGecko API)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,dai,celo,celo-dollar,celo-euro,celo-brazilian-real&vs_currencies=usd"
        );
        const data = await response.json();
        setPrices({
          ETH: data.ethereum?.usd || 0,
          USDC: data["usd-coin"]?.usd || 1,
          USDbC: data["usd-coin"]?.usd || 1,
          DAI: data.dai?.usd || 1,
          CELO: data.celo?.usd || 0,
          cUSD: data["celo-dollar"]?.usd || 1,
          cEUR: data["celo-euro"]?.usd || 1,
          cREAL: data["celo-brazilian-real"]?.usd || 1,
        });
      } catch (error) {
        console.error("Error fetching prices:", error);
        // Fallback prices
        setPrices({
          ETH: 2500,
          USDC: 1,
          USDbC: 1,
          DAI: 1,
          CELO: 0.5,
          cUSD: 1,
          cEUR: 1.1,
          cREAL: 0.2,
        });
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Process balances
  useEffect(() => {
    if (!address || !currentChainId) return;

    const balances: TokenBalance[] = [];
    let total = 0;

    // Add native token balance (ETH on Base, CELO on Celo)
    if (nativeBalance) {
      const balance = formatUnits(nativeBalance.value, 18);
      const balanceUSD = parseFloat(balance) * (prices[nativeSymbol] || 0);
      balances.push({
        symbol: nativeSymbol,
        name: nativeBalance.symbol,
        balance,
        balanceUSD,
        decimals: 18,
      });
      total += balanceUSD;
    }

    // Add ERC20 token balances
    if (tokenData) {
      tokenData.forEach((result, index) => {
        if (result.status === "success" && result.result) {
          const token = currentTokens.filter((t) => t.address)[index];
          const balance = formatUnits(
            result.result as bigint,
            token.decimals
          );
          const balanceUSD = parseFloat(balance) * (prices[token.symbol] || 0);

          // Only show tokens with balance > $0.01
          if (balanceUSD > 0.01) {
            balances.push({
              symbol: token.symbol,
              name: token.name,
              balance,
              balanceUSD,
              decimals: token.decimals,
            });
            total += balanceUSD;
          }
        }
      });
    }

    setTokenBalances(balances);
    setTotalUSD(total);
  }, [nativeBalance, tokenData, prices, address, chainId, currentChainId, currentTokens, nativeSymbol]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchNative(), refetchTokens()]);
    setTimeout(() => setIsRefreshing(false), 500);
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
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign size={32} color="#3b82f6" />
            </div>
            <div>
              <Heading size="4" className="mb-2">
                Wallet Balance
              </Heading>
              <Text size="2" color="gray">
                Connect your wallet to see your balance
              </Text>
            </div>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  if (!isBase && !isCelo) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Flex
            direction="column"
            gap="4"
            align="center"
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
              <DollarSign size={32} color="#f97316" />
            </div>
            <div>
              <Heading size="4" className="mb-2">
                Wallet Balance
              </Heading>
              <Text size="2" color="gray">
                Switch to Base or Celo network to see your balance
              </Text>
            </div>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  const networkName = isBase ? "Base" : "Celo";
  const gradientClass = isBase
    ? "bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200"
    : "bg-gradient-to-br from-green-50 to-emerald-100 border-green-200";
  const buttonClass = isBase
    ? "bg-blue-500 hover:bg-blue-600"
    : "bg-green-500 hover:bg-green-600";
  const textColor = isBase ? "#3b82f6" : "#10b981";

  return (
    <Card className={gradientClass}>
      <CardContent className="pt-6">
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="center">
            <div>
              <Heading size="4" className="mb-1">
                Wallet Balance
              </Heading>
              <Text size="2" color="gray">
                Your tokens on {networkName}
              </Text>
            </div>
            <Flex gap="2" align="center">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${buttonClass} ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              >
                <RefreshCw size={18} color="white" />
              </button>
            </Flex>
          </Flex>

          {/* Total Balance */}
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <Text size="2" color="gray" className="mb-1">
              Total Balance
            </Text>
            <Heading size="6" style={{ color: textColor }}>
              ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Heading>
          </div>

          {/* Token List */}
          <div className="space-y-2">
            {tokenBalances.length === 0 ? (
              <div className="p-4 bg-white/70 rounded-lg text-center">
                <Text size="2" color="gray">
                  No tokens found in your wallet
                </Text>
              </div>
            ) : (
              tokenBalances.map((token) => (
                <div
                  key={token.symbol}
                  className="p-3 bg-white/70 rounded-lg hover:bg-white transition"
                >
                  <Flex justify="between" align="center">
                    <div>
                      <Text size="2" weight="bold" className="block">
                        {token.symbol}
                      </Text>
                      <Text size="1" color="gray">
                        {token.name}
                      </Text>
                    </div>
                    <div className="text-right">
                      <Text size="2" weight="bold" className="block">
                        {parseFloat(token.balance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: token.decimals === 18 ? 4 : 2,
                        })}
                      </Text>
                      <Text size="1" color="gray">
                        ${token.balanceUSD.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </div>
                  </Flex>
                </div>
              ))
            )}
          </div>

          {/* Info */}
          <div className={isBase ? "p-3 bg-blue-100/50 rounded-lg" : "p-3 bg-green-100/50 rounded-lg"}>
            <Text size="1" color="gray">
              Showing your token balances on {networkName} network. Refresh to update.
            </Text>
          </div>
        </Flex>
      </CardContent>
    </Card>
  );
}
