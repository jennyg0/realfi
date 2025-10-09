import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { accountBalances, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const privyId = searchParams.get('privyId');

    if (!privyId) {
      return NextResponse.json({ error: 'privyId required' }, { status: 400 });
    }

    // Get profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.privyId, privyId))
      .limit(1);

    if (!profile) {
      return NextResponse.json([]);
    }

    // Get all balances for this profile
    const balances = await db
      .select()
      .from(accountBalances)
      .where(eq(accountBalances.profileId, profile.id));

    return NextResponse.json(balances);
  } catch (error) {
    console.error('Error fetching balances:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
