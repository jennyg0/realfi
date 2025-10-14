"use client";

import { useState, useEffect } from 'react';
import { useYieldDeposit } from '@/hooks/useYieldDeposit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';
import { Flex } from '@/components/ui/flex';
import { Clock, CheckCircle, XCircle } from 'react-feather';
import { toast } from 'sonner';

type PendingDeposit = {
  id: number;
  strategyKey: string;
  amount: number;
  createdAt: string;
  status: 'pending' | 'completed' | 'failed';
};

interface PendingDepositsProps {
  privyId: string;
}

/**
 * Component to show and execute pending DCA deposits
 * Users can review and sign all pending deposits in one session
 */
export function PendingDeposits({ privyId }: PendingDepositsProps) {
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentlyProcessing, setCurrentlyProcessing] = useState<number | null>(null);
  const { executeDeposit, status, error } = useYieldDeposit();

  // Fetch pending deposits
  useEffect(() => {
    fetchPendingDeposits();
  }, [privyId]);

  const fetchPendingDeposits = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/deposits/update-status?privyId=${privyId}&status=pending`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pending deposits');
      }

      const data = await response.json();
      setDeposits(data.deposits || []);
    } catch (err) {
      console.error('Error fetching deposits:', err);
      toast.error('Failed to load pending deposits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignDeposit = async (deposit: PendingDeposit) => {
    try {
      setCurrentlyProcessing(deposit.id);

      const result = await executeDeposit(
        deposit.strategyKey,
        deposit.amount / 100 // Convert cents to dollars
      );

      if (result.success) {
        toast.success('Deposit executed successfully!');
        // Refresh the list
        await fetchPendingDeposits();
      }
    } catch (err) {
      toast.error('Failed to execute deposit');
    } finally {
      setCurrentlyProcessing(null);
    }
  };

  const handleSignAll = async () => {
    for (const deposit of deposits) {
      if (deposit.status === 'pending') {
        await handleSignDeposit(deposit);
        // Small delay between deposits to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Flex direction="column" gap="4" align="center">
            <Text>Loading pending deposits...</Text>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  if (deposits.length === 0) {
    return null; // Don't show anything if no pending deposits
  }

  const totalAmount = deposits.reduce((sum, d) => sum + d.amount, 0) / 100;

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-yellow-100 border-orange-200">
      <CardContent className="pt-6">
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="start">
            <div>
              <Heading size="4" className="mb-1">
                Pending DCA Deposits
              </Heading>
              <Text size="2" color="gray">
                {deposits.length} deposit{deposits.length > 1 ? 's' : ''} waiting for signature
              </Text>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
              <Clock size={24} color="white" />
            </div>
          </Flex>

          {/* Total */}
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <Text size="2" color="gray" className="mb-1">
              Total Amount
            </Text>
            <Heading size="6" className="text-orange-600">
              ${totalAmount.toFixed(2)}
            </Heading>
          </div>

          {/* Deposit List */}
          <div className="space-y-2">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="p-3 bg-white/70 rounded-lg hover:bg-white transition"
              >
                <Flex justify="between" align="center">
                  <div>
                    <Text size="2" weight="bold" className="block">
                      {deposit.strategyKey}
                    </Text>
                    <Text size="1" color="gray">
                      ${(deposit.amount / 100).toFixed(2)}
                    </Text>
                  </div>
                  <Button
                    size="2"
                    onClick={() => handleSignDeposit(deposit)}
                    disabled={currentlyProcessing !== null}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {currentlyProcessing === deposit.id ? (
                      'Signing...'
                    ) : (
                      'Sign Now'
                    )}
                  </Button>
                </Flex>
              </div>
            ))}
          </div>

          {/* Sign All Button */}
          {deposits.length > 1 && (
            <Button
              size="3"
              onClick={handleSignAll}
              disabled={currentlyProcessing !== null}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {currentlyProcessing !== null ? (
                'Processing...'
              ) : (
                `Sign All ${deposits.length} Deposits`
              )}
            </Button>
          )}

          {/* Info */}
          <div className="p-3 bg-orange-100/50 rounded-lg">
            <Text size="1" color="gray">
              These deposits were created by your DCA schedules. Sign them to complete the transactions on-chain.
            </Text>
          </div>
        </Flex>
      </CardContent>
    </Card>
  );
}
