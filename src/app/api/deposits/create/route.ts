import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deposits, goals, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkAndAwardBadges } from '@/lib/badges';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, strategyKey, amount, txHash } = body;

    if (!privyId || !strategyKey || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: privyId, strategyKey, amount' },
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

    // Create deposit record
    const [deposit] = await db
      .insert(deposits)
      .values({
        profileId: profile.id,
        strategyKey,
        amount,
        txHash: txHash || null,
      })
      .returning();

    // Update goal if exists
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.profileId, profile.id));

    if (goal) {
      const newDepositedAmount = goal.depositedAmount + amount;

      await db
        .update(goals)
        .set({
          depositedAmount: newDepositedAmount,
          updatedAt: new Date(),
        })
        .where(eq(goals.id, goal.id));
    }

    // Check and award badges (will award first-deposit if applicable)
    await checkAndAwardBadges(profile.id);

    return NextResponse.json({
      success: true,
      deposit,
      updatedGoal: goal
        ? {
            ...goal,
            depositedAmount: goal.depositedAmount + amount,
          }
        : null,
    });
  } catch (error) {
    console.error('Error creating deposit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
