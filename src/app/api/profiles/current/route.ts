import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles, goals, xpEvents, streaks, badgeAwards, badges, lessonProgress, accountBalances } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

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
      return NextResponse.json(null);
    }

    // Get goal
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.profileId, profile.id))
      .limit(1);

    // Get total XP
    const xpResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${xpEvents.amount}), 0)` })
      .from(xpEvents)
      .where(eq(xpEvents.profileId, profile.id));

    const totalXp = Number(xpResult[0]?.total || 0);

    // Get streak
    const [streak] = await db
      .select()
      .from(streaks)
      .where(eq(streaks.profileId, profile.id))
      .limit(1);

    // Get badges
    const userBadges = await db
      .select({ badge: badges })
      .from(badgeAwards)
      .innerJoin(badges, eq(badgeAwards.badgeId, badges.id))
      .where(eq(badgeAwards.profileId, profile.id));

    // Get completed lessons count
    const completedLessonsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(lessonProgress)
      .where(eq(lessonProgress.profileId, profile.id));

    const completedLessons = Number(completedLessonsResult[0]?.count || 0);

    // Get total from external balances
    const externalBalancesResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${accountBalances.amount}), 0)` })
      .from(accountBalances)
      .where(eq(accountBalances.profileId, profile.id));

    const totalExternalBalances = Number(externalBalancesResult[0]?.total || 0);

    // Get total from external balances that count toward goal
    const goalBalancesResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${accountBalances.amount}), 0)` })
      .from(accountBalances)
      .where(
        sql`${accountBalances.profileId} = ${profile.id} AND ${accountBalances.countTowardGoal} = true`
      );

    const totalGoalBalances = Number(goalBalancesResult[0]?.total || 0);

    return NextResponse.json({
      profile,
      goal: goal || null,
      totalXp,
      streak: streak || { current: 0, longest: 0 },
      badges: userBadges.map(ub => ub.badge),
      completedLessons,
      totalExternalBalances,
      totalGoalBalances,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
