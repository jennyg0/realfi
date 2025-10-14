import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deposits, goals, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkAndAwardBadges } from '@/lib/badges';

/**
 * Update deposit status after wallet transaction
 * Called by frontend after user signs transaction and it's confirmed on-chain
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, depositId, status, txHash } = body;

    if (!privyId || !depositId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: privyId, depositId, status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status must be one of: pending, completed, failed' },
        { status: 400 }
      );
    }

    // Get user profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.privyId, privyId));

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the deposit and verify ownership
    const [deposit] = await db
      .select()
      .from(deposits)
      .where(
        and(
          eq(deposits.id, depositId),
          eq(deposits.profileId, profile.id)
        )
      );

    if (!deposit) {
      return NextResponse.json(
        { error: 'Deposit not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update deposit status
    const [updatedDeposit] = await db
      .update(deposits)
      .set({
        status,
        txHash: txHash || deposit.txHash,
      })
      .where(eq(deposits.id, depositId))
      .returning();

    // If completed, update goal progress
    let updatedGoal = null;
    if (status === 'completed') {
      const [goal] = await db
        .select()
        .from(goals)
        .where(eq(goals.profileId, profile.id));

      if (goal) {
        const newDepositedAmount = goal.depositedAmount + deposit.amount;

        await db
          .update(goals)
          .set({
            depositedAmount: newDepositedAmount,
            updatedAt: new Date(),
          })
          .where(eq(goals.id, goal.id));

        updatedGoal = {
          ...goal,
          depositedAmount: newDepositedAmount,
        };
      }

      // Check and award badges
      await checkAndAwardBadges(profile.id);
    }

    return NextResponse.json({
      success: true,
      deposit: updatedDeposit,
      updatedGoal,
      message: status === 'completed'
        ? 'Deposit completed successfully!'
        : status === 'failed'
        ? 'Deposit failed. Please try again.'
        : 'Deposit status updated.',
    });
  } catch (error) {
    console.error('Error updating deposit status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET endpoint to fetch pending deposits for a user
 * Useful for frontend to check which deposits need wallet signatures
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const privyId = searchParams.get('privyId');
    const status = searchParams.get('status') || 'pending';

    if (!privyId) {
      return NextResponse.json({ error: 'privyId is required' }, { status: 400 });
    }

    // Get user profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.privyId, privyId));

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get deposits by status
    const userDeposits = await db
      .select()
      .from(deposits)
      .where(
        and(
          eq(deposits.profileId, profile.id),
          eq(deposits.status, status)
        )
      );

    return NextResponse.json({
      success: true,
      deposits: userDeposits,
      count: userDeposits.length,
    });
  } catch (error) {
    console.error('Error fetching deposits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
