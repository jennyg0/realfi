import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { base } from 'wagmi/chains';
import { usePrivy } from '@privy-io/react-auth';

// ERC20 approve ABI
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
] as const;

// Aave V3 Pool ABI (supply function)
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
  // Add other protocols as needed
};

type DepositStatus = 'idle' | 'approving' | 'depositing' | 'confirming' | 'updating' | 'success' | 'error';

export function useYieldDeposit() {
  const { address, chainId } = useAccount();
  const { user } = usePrivy();
  const [status, setStatus] = useState<DepositStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<number | null>(null);

  const { writeContractAsync } = useWriteContract();

  /**
   * Execute a yield deposit
   * @param protocolKey - Protocol identifier (e.g., 'aave-v3-usdc')
   * @param amount - Amount in USD (e.g., 100 for $100)
   */
  const executeDeposit = async (protocolKey: string, amount: number) => {
    try {
      setStatus('idle');
      setError(null);

      // Validation
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (chainId !== base.id) {
        throw new Error('Please switch to Base network');
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Parse protocol key (e.g., 'aave-v3-usdc' -> protocol: 'aave-v3', token: 'USDC')
      const parts = protocolKey.split('-');
      const tokenSymbol = parts[parts.length - 1].toUpperCase();
      const protocol = parts.slice(0, -1).join('-');

      // Get protocol config
      const config = PROTOCOL_CONFIG[protocol as keyof typeof PROTOCOL_CONFIG];
      if (!config) {
        throw new Error(`Protocol ${protocol} not supported`);
      }

      const tokenAddress = config.tokens[tokenSymbol as keyof typeof config.tokens];
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} not supported on ${protocol}`);
      }

      // Determine decimals (USDC = 6, others = 18)
      const decimals = tokenSymbol === 'USDC' || tokenSymbol === 'USDBC' ? 6 : 18;
      const amountWei = parseUnits(amount.toString(), decimals);

      // Step 1: Create pending deposit in database
      setStatus('approving');
      const createResponse = await fetch('/api/yields/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          protocolKey,
          amount: amount * 100, // Convert to cents
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create deposit');
      }

      const { deposit } = await createResponse.json();
      setDepositId(deposit.id);

      // Step 2: Approve token spending
      console.log('Approving token spend...');
      const approveTxHash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [config.poolAddress, amountWei],
        chainId: base.id,
      });

      console.log('Approve transaction:', approveTxHash);

      // Step 3: Deposit to protocol
      setStatus('depositing');
      console.log('Depositing to protocol...');
      const depositTxHash = await writeContractAsync({
        address: config.poolAddress,
        abi: AAVE_V3_POOL_ABI,
        functionName: 'supply',
        args: [tokenAddress, amountWei, address, 0],
        chainId: base.id,
      });

      console.log('Deposit transaction:', depositTxHash);

      // Step 4: Update deposit status in database
      setStatus('updating');
      const updateResponse = await fetch('/api/deposits/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          depositId: deposit.id,
          status: 'completed',
          txHash: depositTxHash,
        }),
      });

      if (!updateResponse.ok) {
        console.error('Failed to update deposit status, but transaction succeeded');
      }

      setStatus('success');
      return {
        success: true,
        txHash: depositTxHash,
        depositId: deposit.id,
      };
    } catch (err) {
      console.error('Deposit error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');

      // Update deposit status to failed
      if (depositId && user?.id) {
        try {
          await fetch('/api/deposits/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              privyId: user.id,
              depositId,
              status: 'failed',
            }),
          });
        } catch (updateErr) {
          console.error('Failed to update deposit status to failed:', updateErr);
        }
      }

      throw err;
    }
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
    setDepositId(null);
  };

  return {
    executeDeposit,
    status,
    error,
    depositId,
    isLoading: ['approving', 'depositing', 'confirming', 'updating'].includes(status),
    isSuccess: status === 'success',
    isError: status === 'error',
    reset,
  };
}
