import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lessonProgress, xpEvents, profiles, lessons, streaks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkAndAwardBadges } from '@/lib/badges';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, lessonId, score } = body;

    if (!privyId || !lessonId) {
      return NextResponse.json(
        { error: 'Missing required fields: privyId, lessonId' },
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

    // Get lesson details
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId));

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check if already completed
    const [existing] = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.profileId, profile.id),
          eq(lessonProgress.lessonId, lessonId)
        )
      );

    if (existing) {
      return NextResponse.json(
        { error: 'Lesson already completed' },
        { status: 400 }
      );
    }

    // Record lesson completion
    await db.insert(lessonProgress).values({
      profileId: profile.id,
      lessonId,
      score: score || null,
    });

    // Award XP
    await db.insert(xpEvents).values({
      profileId: profile.id,
      type: 'lesson_complete',
      amount: lesson.xpReward,
      metadata: JSON.stringify({ lessonId, lessonTitle: lesson.title }),
    });

    // Update streak
    const [userStreak] = await db
      .select()
      .from(streaks)
      .where(eq(streaks.profileId, profile.id));

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (!userStreak) {
      // Create new streak
      await db.insert(streaks).values({
        profileId: profile.id,
        current: 1,
        longest: 1,
        lastCheckedAt: now,
      });
    } else {
      const lastChecked = new Date(userStreak.lastCheckedAt);
      const isSameDay = lastChecked.toDateString() === now.toDateString();
      const isConsecutive = lastChecked >= oneDayAgo;

      if (!isSameDay) {
        const newCurrent = isConsecutive ? userStreak.current + 1 : 1;
        const newLongest = Math.max(newCurrent, userStreak.longest);

        await db
          .update(streaks)
          .set({
            current: newCurrent,
            longest: newLongest,
            lastCheckedAt: now,
          })
          .where(eq(streaks.id, userStreak.id));
      }
    }

    // Check and award badges
    const newBadgeIds = await checkAndAwardBadges(profile.id);

    return NextResponse.json({
      success: true,
      xpAwarded: lesson.xpReward,
      newBadgesAwarded: newBadgeIds.length,
    });
  } catch (error) {
    console.error('Error completing lesson:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
