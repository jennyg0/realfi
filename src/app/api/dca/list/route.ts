import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dcaSchedules, profiles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const privyId = searchParams.get('privyId');

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

    // Get all DCA schedules for user
    const schedules = await db
      .select()
      .from(dcaSchedules)
      .where(eq(dcaSchedules.profileId, profile.id))
      .orderBy(desc(dcaSchedules.createdAt));

    return NextResponse.json({
      success: true,
      schedules,
    });
  } catch (error) {
    console.error('Error fetching DCA schedules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
