import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { goals, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkAndAwardBadges } from '@/lib/badges';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, targetAmount } = body;

    if (!privyId || !targetAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: privyId, targetAmount' },
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

    // Check if user already has a goal
    const [existingGoal] = await db
      .select()
      .from(goals)
      .where(eq(goals.profileId, profile.id));

    let goal;

    if (existingGoal) {
      // Update existing goal
      const [updated] = await db
        .update(goals)
        .set({
          targetAmount,
          updatedAt: new Date(),
        })
        .where(eq(goals.id, existingGoal.id))
        .returning();

      goal = updated;
    } else {
      // Create new goal
      const [created] = await db
        .insert(goals)
        .values({
          profileId: profile.id,
          targetAmount,
          depositedAmount: 0,
        })
        .returning();

      goal = created;

      // Check and award badges (will award first-goal badge)
      await checkAndAwardBadges(profile.id);
    }

    return NextResponse.json({
      success: true,
      goal,
      isNew: !existingGoal,
    });
  } catch (error) {
    console.error('Error creating/updating goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
