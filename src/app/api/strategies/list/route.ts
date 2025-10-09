import { NextResponse } from 'next/server';

// Mock strategies for now - these will be hardcoded until we add a strategies table
const STRATEGIES = [
  {
    key: "usdc-aave-base",
    title: "USDC on Aave Base",
    protocol: "Aave",
    chain: "Base",
    estApr: 4.5,
    summary: "Lend USDC on Aave's Base deployment for steady yields backed by battle-tested protocols.",
    risk: "Conservative"
  },
  {
    key: "usdc-compound-base",
    title: "USDC on Compound Base",
    protocol: "Compound",
    chain: "Base",
    estApr: 3.8,
    summary: "Supply USDC to Compound v3 on Base for algorithmically determined interest rates.",
    risk: "Conservative"
  },
  {
    key: "usdc-stargate-multichain",
    title: "USDC Stargate Multichain",
    protocol: "Stargate",
    chain: "Base",
    estApr: 6.8,
    summary: "Bridge USDC across chains with Stargate while earning yield from cross-chain liquidity.",
    risk: "Balanced"
  }
];

export async function GET() {
  return NextResponse.json(STRATEGIES);
}
