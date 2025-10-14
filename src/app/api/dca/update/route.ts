import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dcaSchedules, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, scheduleId, isActive } = body;

    if (!privyId || !scheduleId || isActive === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: privyId, scheduleId, isActive' },
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

    // Update DCA schedule
    const [schedule] = await db
      .update(dcaSchedules)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dcaSchedules.id, scheduleId),
          eq(dcaSchedules.profileId, profile.id)
        )
      )
      .returning();

    if (!schedule) {
      return NextResponse.json(
        { error: 'DCA schedule not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      schedule,
      message: isActive ? 'DCA schedule resumed' : 'DCA schedule paused',
    });
  } catch (error) {
    console.error('Error updating DCA schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
