import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons } from '@/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const allLessons = await db
      .select()
      .from(lessons)
      .orderBy(asc(lessons.order));

    return NextResponse.json(allLessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
