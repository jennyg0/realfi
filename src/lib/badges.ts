import { db } from '@/db';
import { badges, badgeAwards, lessonProgress, xpEvents, streaks, goals, deposits } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

type BadgeCheck = {
  slug: string;
  checkFn: (profileId: number) => Promise<boolean>;
};

const BADGE_CHECKS: BadgeCheck[] = [
  {
    slug: 'first-lesson',
    checkFn: async (profileId: number) => {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(lessonProgress)
        .where(eq(lessonProgress.profileId, profileId));
      return Number(result?.count || 0) >= 1;
    },
  },
  {
    slug: 'three-lessons',
    checkFn: async (profileId: number) => {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(lessonProgress)
        .where(eq(lessonProgress.profileId, profileId));
      return Number(result?.count || 0) >= 3;
    },
  },
  {
    slug: 'all-lessons',
    checkFn: async (profileId: number) => {
      const [completedResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(lessonProgress)
        .where(eq(lessonProgress.profileId, profileId));

      // Assuming 8 total lessons from seed data
      return Number(completedResult?.count || 0) >= 8;
    },
  },
  {
    slug: 'first-goal',
    checkFn: async (profileId: number) => {
      const [goal] = await db
        .select()
        .from(goals)
        .where(eq(goals.profileId, profileId))
        .limit(1);
      return !!goal;
    },
  },
  {
    slug: 'first-deposit',
    checkFn: async (profileId: number) => {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(deposits)
        .where(eq(deposits.profileId, profileId));
      return Number(result?.count || 0) >= 1;
    },
  },
  {
    slug: 'week-streak',
    checkFn: async (profileId: number) => {
      const [streak] = await db
        .select()
        .from(streaks)
        .where(eq(streaks.profileId, profileId))
        .limit(1);
      return (streak?.current || 0) >= 7;
    },
  },
  {
    slug: 'month-streak',
    checkFn: async (profileId: number) => {
      const [streak] = await db
        .select()
        .from(streaks)
        .where(eq(streaks.profileId, profileId))
        .limit(1);
      return (streak?.current || 0) >= 30;
    },
  },
  {
    slug: 'hundred-xp',
    checkFn: async (profileId: number) => {
      const [result] = await db
        .select({ total: sql<number>`COALESCE(SUM(${xpEvents.amount}), 0)` })
        .from(xpEvents)
        .where(eq(xpEvents.profileId, profileId));
      return Number(result?.total || 0) >= 100;
    },
  },
  {
    slug: 'thousand-xp',
    checkFn: async (profileId: number) => {
      const [result] = await db
        .select({ total: sql<number>`COALESCE(SUM(${xpEvents.amount}), 0)` })
        .from(xpEvents)
        .where(eq(xpEvents.profileId, profileId));
      return Number(result?.total || 0) >= 1000;
    },
  },
];

/**
 * Check and award badges for a user
 * Returns array of newly awarded badge IDs
 */
export async function checkAndAwardBadges(profileId: number): Promise<number[]> {
  const newlyAwarded: number[] = [];

  for (const check of BADGE_CHECKS) {
    // Get badge ID
    const [badge] = await db
      .select()
      .from(badges)
      .where(eq(badges.slug, check.slug))
      .limit(1);

    if (!badge) continue;

    // Check if already awarded
    const [existingAward] = await db
      .select()
      .from(badgeAwards)
      .where(
        and(
          eq(badgeAwards.profileId, profileId),
          eq(badgeAwards.badgeId, badge.id)
        )
      )
      .limit(1);

    if (existingAward) continue;

    // Check if criteria met
    const shouldAward = await check.checkFn(profileId);

    if (shouldAward) {
      // Award the badge
      await db.insert(badgeAwards).values({
        profileId,
        badgeId: badge.id,
      });

      // Award XP if badge has XP
      if (badge.xp && badge.xp > 0) {
        await db.insert(xpEvents).values({
          profileId,
          type: 'badge_earned',
          amount: badge.xp,
          metadata: JSON.stringify({ badgeId: badge.id, badgeSlug: badge.slug }),
        });
      }

      newlyAwarded.push(badge.id);
    }
  }

  return newlyAwarded;
}
