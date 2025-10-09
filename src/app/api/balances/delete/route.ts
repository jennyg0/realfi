import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { accountBalances, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const privyId = searchParams.get('privyId');
    const id = searchParams.get('id');

    if (!privyId || !id) {
      return NextResponse.json(
        { error: 'privyId and id required' },
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

    // Delete the balance (only if it belongs to this user)
    await db
      .delete(accountBalances)
      .where(
        and(
          eq(accountBalances.id, Number(id)),
          eq(accountBalances.profileId, profile.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting balance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
