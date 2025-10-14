"use client";

import { useState } from 'react';
import { useYieldDeposit } from '@/hooks/useYieldDeposit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DepositButtonProps {
  protocolKey: string;
  protocolName: string;
  asset: string;
  apy: number;
  defaultAmount?: number;
}

/**
 * Example component showing how to integrate yield deposits
 * Usage:
 *   <DepositButton
 *     protocolKey="aave-v3-usdc"
 *     protocolName="Aave V3"
 *     asset="USDC"
 *     apy={5.2}
 *   />
 */
export function DepositButton({
  protocolKey,
  protocolName,
  asset,
  apy,
  defaultAmount = 100,
}: DepositButtonProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const { executeDeposit, status, error, isLoading, isSuccess } = useYieldDeposit();

  const handleDeposit = async () => {
    try {
      const result = await executeDeposit(protocolKey, amount);

      if (result.success) {
        toast.success(
          `Successfully deposited $${amount} into ${protocolName} ${asset}!`,
          {
            description: `You'll earn ${apy}% APY. Transaction: ${result.txHash.slice(0, 10)}...`,
          }
        );
      }
    } catch (err) {
      toast.error('Deposit failed', {
        description: error || 'Please try again',
      });
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'approving':
        return 'Approving...';
      case 'depositing':
        return 'Depositing...';
      case 'updating':
        return 'Confirming...';
      case 'success':
        return 'Deposited!';
      default:
        return `Deposit $${amount}`;
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">
          Amount (USD)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          min={10}
          max={100000}
          step={10}
          disabled={isLoading}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Button
        onClick={handleDeposit}
        disabled={isLoading || isSuccess}
        className="w-full"
      >
        {getButtonText()}
      </Button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>Protocol: {protocolName}</p>
        <p>Asset: {asset}</p>
        <p>APY: {apy}%</p>
        <p className="mt-1">
          Estimated yearly earnings: ${((amount * apy) / 100).toFixed(2)}
        </p>
      </div>
    </div>
  );
}
