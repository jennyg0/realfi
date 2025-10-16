import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dcaSchedules, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, scheduleId } = body;

    if (!privyId || !scheduleId) {
      return NextResponse.json(
        { error: 'Missing required fields: privyId, scheduleId' },
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

    // Delete the schedule (must belong to this user)
    const [deleted] = await db
      .delete(dcaSchedules)
      .where(
        and(
          eq(dcaSchedules.id, scheduleId),
          eq(dcaSchedules.profileId, profile.id)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'DCA schedule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting DCA schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
