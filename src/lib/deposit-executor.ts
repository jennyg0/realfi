/**
 * Deposit Executor Service
 *
 * Handles execution of pending deposits on-chain.
 * This can be triggered by:
 * 1. User manually signing pending deposits in UI
 * 2. Automated wallet (if user grants permission)
 * 3. Smart account with session keys (future)
 */

import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ERC20 ABI
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// Aave V3 Pool ABI
const AAVE_V3_POOL_ABI = [
  {
    name: 'supply',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
    ],
    outputs: [],
  },
] as const;

// Protocol configurations (Base network)
const PROTOCOL_CONFIG = {
  'aave-v3': {
    poolAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as `0x${string}`,
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' as `0x${string}`,
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as `0x${string}`,
    },
  },
  'moonwell': {
    // Moonwell uses their own pool contract
    poolAddress: '0x...' as `0x${string}`, // TODO: Add Moonwell pool address
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
    },
  },
};

export type DepositExecutionResult = {
  success: boolean;
  txHash?: `0x${string}`;
  error?: string;
};

/**
 * Execute a deposit on-chain using a custodial wallet
 * WARNING: This requires a private key and should only be used if:
 * 1. User has explicitly granted permission for automated deposits
 * 2. Private key is securely managed (e.g., AWS KMS, Vault)
 * 3. You have proper security measures in place
 *
 * For production, consider:
 * - Smart accounts with session keys
 * - User signs all transactions manually
 * - Account abstraction with spending limits
 */
export async function executeDepositCustodial(
  userAddress: `0x${string}`,
  protocolKey: string,
  amountUSD: number,
  custodialPrivateKey: `0x${string}`
): Promise<DepositExecutionResult> {
  try {
    // Parse protocol key
    const parts = protocolKey.split('-');
    const tokenSymbol = parts[parts.length - 1].toUpperCase();
    const protocol = parts.slice(0, -1).join('-');

    // Get protocol config
    const config = PROTOCOL_CONFIG[protocol as keyof typeof PROTOCOL_CONFIG];
    if (!config) {
      return { success: false, error: `Protocol ${protocol} not supported` };
    }

    const tokenAddress = config.tokens[tokenSymbol as keyof typeof config.tokens];
    if (!tokenAddress) {
      return { success: false, error: `Token ${tokenSymbol} not supported` };
    }

    // Setup clients
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    const account = privateKeyToAccount(custodialPrivateKey);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    // Determine decimals and convert amount
    const decimals = tokenSymbol === 'USDC' || tokenSymbol === 'USDBC' ? 6 : 18;
    const amountWei = parseUnits(amountUSD.toString(), decimals);

    // Check allowance
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, config.poolAddress],
    });

    // Approve if needed
    if (allowance < amountWei) {
      console.log('Approving token spend...');
      const approveTxHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [config.poolAddress, amountWei],
      });

      await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      console.log('Approval confirmed:', approveTxHash);
    }

    // Execute deposit
    console.log('Executing deposit...');
    const depositTxHash = await walletClient.writeContract({
      address: config.poolAddress,
      abi: AAVE_V3_POOL_ABI,
      functionName: 'supply',
      args: [tokenAddress, amountWei, userAddress, 0],
    });

    await publicClient.waitForTransactionReceipt({ hash: depositTxHash });
    console.log('Deposit confirmed:', depositTxHash);

    return {
      success: true,
      txHash: depositTxHash,
    };
  } catch (error) {
    console.error('Deposit execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get pending deposits that need user signatures
 * These will be shown in the UI for users to manually sign
 */
export function getPendingDepositsForUI() {
  // This would query the database for pending deposits
  // and return them formatted for the UI to prompt signatures
  return {
    message: 'Pending deposits require user wallet signatures',
    approach: 'user-initiated',
  };
}

/**
 * Recommended approach for production:
 *
 * 1. USER-INITIATED (Recommended for DCA):
 *    - Cron creates pending deposits
 *    - UI shows "You have X pending deposits"
 *    - User clicks "Sign All" button
 *    - Batch all signatures in one session
 *    - Update deposit status after confirmation
 *
 * 2. SMART ACCOUNT with SESSION KEYS:
 *    - User grants session key with spending limits
 *    - Backend can execute up to limit without signatures
 *    - Session expires after time period
 *    - More UX friendly but requires smart account setup
 *
 * 3. CUSTODIAL (Use with caution):
 *    - Only if user explicitly opts in
 *    - Store private key in secure vault (AWS KMS, HashiCorp Vault)
 *    - Implement spending limits and fraud detection
 *    - Provide audit trail
 */

export const RECOMMENDED_APPROACH = `
For DCA, we recommend:

1. Create pending deposits via cron (already implemented)
2. Show notification in UI: "You have pending DCA deposits"
3. User clicks "Review & Sign" button
4. Batch approve + deposit transactions
5. Show success confirmation

This keeps user in control while still automating the scheduling.
`;
