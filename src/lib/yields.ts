// DeFi yield aggregation and filtering

export type YieldPool = {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number;
  apyReward: number;
  apy: number;
  rewardTokens: string[];
  underlyingTokens: string[];
  poolMeta?: string;
  il7d?: number;
  apyMean30d?: number;
  volumeUsd1d?: number;
  volumeUsd7d?: number;
  apyBaseInception?: number;
  stablecoin?: boolean;
  ilRisk?: string;
  exposure?: string;
  predictions?: {
    predictedClass: string;
    predictedProbability: number;
    binnedConfidence: number;
  };
};

export type FilteredYield = {
  key: string;
  title: string;
  protocol: string;
  chain: string;
  asset: string;
  estApr: number;
  tvl: number;
  risk: 'Conservative' | 'Balanced' | 'Aggressive';
  summary: string;
  poolId: string;
  rewardTokens?: string[];
  isStablecoin: boolean;
  canDeposit: boolean; // Whether we have integration for deposits
};

const SUPPORTED_PROTOCOLS = ['aave-v3', 'moonwell', 'compound-v3'];
const MIN_TVL = 1000000; // $1M minimum TVL for safety
const BASE_CHAIN = 'Base';
const MAX_APY = 50; // Filter out unrealistic APYs (likely scams)

// Stablecoins we trust
const STABLECOINS = ['USDC', 'USDT', 'DAI', 'USDC.e', 'USDbC'];

// Well-known safe protocols
const SAFE_PROTOCOLS = [
  'aave-v3',
  'moonwell',
  'compound-v3',
  'aerodrome',
  'velodrome',
  'beefy',
  'yearn-finance',
  'seamless-protocol',
  'extra-finance'
];

// Risk categorization based on protocol audits and TVL
function categorizeRisk(pool: YieldPool): 'Conservative' | 'Balanced' | 'Aggressive' {
  const { project, tvlUsd, stablecoin, ilRisk } = pool;

  // Conservative: audited protocols, high TVL, stablecoins
  if (
    SUPPORTED_PROTOCOLS.includes(project.toLowerCase()) &&
    tvlUsd > 10000000 &&
    stablecoin
  ) {
    return 'Conservative';
  }

  // Aggressive: low TVL, impermanent loss risk, or newer protocols
  if (tvlUsd < 1000000 || ilRisk === 'yes') {
    return 'Aggressive';
  }

  return 'Balanced';
}

// Check if pool contains stablecoins
function isStablecoinPool(pool: YieldPool): boolean {
  const symbol = pool.symbol.toUpperCase();
  return STABLECOINS.some(stable => symbol.includes(stable));
}

// Check if protocol is trusted
function isSafeProtocol(protocol: string): boolean {
  return SAFE_PROTOCOLS.some(safe =>
    protocol.toLowerCase().includes(safe.toLowerCase())
  );
}

// Fetch yields from DefiLlama
export async function fetchBaseYields(): Promise<FilteredYield[]> {
  try {
    const response = await fetch('https://yields.llama.fi/pools', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error('Failed to fetch yields');
    }

    const data = await response.json();
    const pools = data.data as YieldPool[];

    // Filter for Base chain with safety requirements
    const basePools = pools.filter(pool =>
      pool.chain === BASE_CHAIN &&
      pool.tvlUsd > MIN_TVL &&
      pool.apy > 0 &&
      pool.apy < MAX_APY && // Realistic APY range
      isStablecoinPool(pool) && // Only stablecoins
      isSafeProtocol(pool.project) && // Only trusted protocols
      pool.ilRisk !== 'yes' // No impermanent loss risk
    );

    // Transform and sort by APY
    const filtered = basePools
      .map(pool => transformPool(pool))
      .sort((a, b) => b.estApr - a.estApr);

    return filtered;
  } catch (error) {
    console.error('Error fetching yields:', error);
    return [];
  }
}

// Transform DefiLlama pool to our format
function transformPool(pool: YieldPool): FilteredYield {
  const protocol = pool.project;
  const asset = pool.symbol;
  const canDeposit = SUPPORTED_PROTOCOLS.includes(protocol.toLowerCase());
  const risk = categorizeRisk(pool);

  return {
    key: `${protocol}-${pool.pool}`,
    title: `${asset} on ${protocol}`,
    protocol,
    chain: pool.chain,
    asset,
    estApr: parseFloat(pool.apy.toFixed(2)),
    tvl: pool.tvlUsd,
    risk,
    summary: generateSummary(pool),
    poolId: pool.pool,
    rewardTokens: pool.rewardTokens,
    isStablecoin: pool.stablecoin || false,
    canDeposit,
  };
}

// Generate human-readable summary
function generateSummary(pool: YieldPool): string {
  const parts: string[] = [];

  if (pool.apyBase > 0) {
    parts.push(`${pool.apyBase.toFixed(2)}% base APY`);
  }

  if (pool.apyReward && pool.apyReward > 0) {
    parts.push(`${pool.apyReward.toFixed(2)}% rewards`);
  }

  if (pool.stablecoin) {
    parts.push('stablecoin');
  }

  if (pool.tvlUsd > 10000000) {
    parts.push(`$${(pool.tvlUsd / 1000000).toFixed(1)}M TVL`);
  }

  return parts.join(' · ') || 'Earn yield on your assets';
}

// Get top yields by category
export async function getTopYields(limit = 10): Promise<FilteredYield[]> {
  const yields = await fetchBaseYields();
  return yields.slice(0, limit);
}

// Get yields by risk profile
export async function getYieldsByRisk(
  riskProfile: 'Conservative' | 'Balanced' | 'Aggressive'
): Promise<FilteredYield[]> {
  const yields = await fetchBaseYields();
  return yields.filter(y => y.risk === riskProfile);
}

// Get yields for specific asset (e.g., USDC, ETH)
export async function getYieldsForAsset(asset: string): Promise<FilteredYield[]> {
  const yields = await fetchBaseYields();
  return yields.filter(y =>
    y.asset.toLowerCase().includes(asset.toLowerCase())
  );
}

// Get only yields we can actually deposit to
export async function getDepositableYields(): Promise<FilteredYield[]> {
  const yields = await fetchBaseYields();
  return yields.filter(y => y.canDeposit);
}
