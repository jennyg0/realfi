import { NextResponse } from 'next/server';
import { db } from '@/db';
import { badges } from '@/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const allBadges = await db
      .select()
      .from(badges)
      .orderBy(asc(badges.id));

    return NextResponse.json(allBadges);
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
