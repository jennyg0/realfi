import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deposits, goals, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkAndAwardBadges } from '@/lib/badges';
import { getDepositableYields } from '@/lib/yields';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, protocolKey, amount, txHash } = body;

    if (!privyId || !protocolKey || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: privyId, protocolKey, amount' },
        { status: 400 }
      );
    }

    // Validate amount (minimum $10, maximum $1M)
    if (amount < 1000 || amount > 100000000) {
      return NextResponse.json(
        { error: 'Amount must be between $10 and $1,000,000' },
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

    // Verify protocol is supported
    const yields = await getDepositableYields();
    const targetYield = yields.find(y => y.key === protocolKey);

    if (!targetYield) {
      return NextResponse.json(
        { error: 'Protocol not supported or unavailable' },
        { status: 400 }
      );
    }

    // Create deposit record
    const [deposit] = await db
      .insert(deposits)
      .values({
        profileId: profile.id,
        strategyKey: protocolKey,
        amount,
        txHash: txHash || null,
        status: txHash ? 'completed' : 'pending',
      })
      .returning();

    // Update goal if exists
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.profileId, profile.id));

    let updatedGoal = null;
    if (goal && txHash) {
      const newDepositedAmount = goal.depositedAmount + amount;

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
    if (txHash) {
      await checkAndAwardBadges(profile.id);
    }

    return NextResponse.json({
      success: true,
      deposit,
      protocol: {
        name: targetYield.protocol,
        asset: targetYield.asset,
        apy: targetYield.estApr,
        risk: targetYield.risk,
      },
      updatedGoal,
    });
  } catch (error) {
    console.error('Error creating yield deposit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
