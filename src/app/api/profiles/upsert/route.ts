import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles, goals } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, wallet, displayName, riskPreference, savingsTarget } = body;

    if (!privyId || !wallet) {
      return NextResponse.json({ error: 'privyId and wallet required' }, { status: 400 });
    }

    // Check if profile exists
    const [existing] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.privyId, privyId))
      .limit(1);

    if (existing) {
      // Update existing profile
      await db
        .update(profiles)
        .set({
          displayName: displayName ?? existing.displayName,
          riskPreference,
          savingsTarget,
          wallet,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, existing.id));

      // Update or create goal
      if (savingsTarget) {
        const [existingGoal] = await db
          .select()
          .from(goals)
          .where(eq(goals.profileId, existing.id))
          .limit(1);

        if (existingGoal) {
          await db
            .update(goals)
            .set({
              targetAmount: savingsTarget,
              updatedAt: new Date(),
            })
            .where(eq(goals.id, existingGoal.id));
        } else {
          await db.insert(goals).values({
            profileId: existing.id,
            targetAmount: savingsTarget,
            depositedAmount: 0,
          });
        }
      }

      return NextResponse.json({ id: existing.id });
    }

    // Create new profile
    const [newProfile] = await db
      .insert(profiles)
      .values({
        privyId,
        wallet,
        displayName,
        riskPreference,
        savingsTarget,
      })
      .returning();

    // Create goal if savingsTarget provided
    if (savingsTarget) {
      await db.insert(goals).values({
        profileId: newProfile.id,
        targetAmount: savingsTarget,
        depositedAmount: 0,
      });
    }

    return NextResponse.json({ id: newProfile.id });
  } catch (error) {
    console.error('Error upserting profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
