import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { accountBalances, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, id, category, label, amount, countTowardGoal } = body;

    if (!privyId || !category || !label || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: privyId, category, label, amount' },
        { status: 400 }
      );
    }

    // Get profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.privyId, privyId))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // If ID provided, update existing
    if (id) {
      const [updated] = await db
        .update(accountBalances)
        .set({
          category,
          label,
          amount,
          countTowardGoal: countTowardGoal ?? false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(accountBalances.id, id),
            eq(accountBalances.profileId, profile.id)
          )
        )
        .returning();

      return NextResponse.json(updated);
    }

    // Create new balance
    const [created] = await db
      .insert(accountBalances)
      .values({
        profileId: profile.id,
        category,
        label,
        amount,
        countTowardGoal: countTowardGoal ?? false,
      })
      .returning();

    return NextResponse.json(created);
  } catch (error) {
    console.error('Error upserting balance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
