// Must load env vars BEFORE importing db
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { lessons, badges } from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log('🌱 Seeding database...');

  // Seed lessons
  const lessonData = [
    {
      slug: 'defi-basics',
      title: 'DeFi Basics',
      summary: 'Learn the fundamentals of Decentralized Finance',
      content: 'Introduction to DeFi concepts and how they differ from traditional finance.',
      order: 1,
      xpReward: 100,
    },
    {
      slug: 'what-is-yield',
      title: 'What is Yield?',
      summary: 'Understand how to earn passive income with crypto',
      content: 'Learn about yield farming, staking, and lending in DeFi.',
      order: 2,
      xpReward: 100,
    },
    {
      slug: 'understanding-apy',
      title: 'Understanding APY',
      summary: 'Learn how Annual Percentage Yield works',
      content: 'Deep dive into APY calculations and compound interest.',
      order: 3,
      xpReward: 150,
    },
    {
      slug: 'smart-contract-basics',
      title: 'Smart Contract Basics',
      summary: 'Introduction to self-executing contracts',
      content: 'Learn how smart contracts power DeFi applications.',
      order: 4,
      xpReward: 150,
    },
    {
      slug: 'stablecoin-strategies',
      title: 'Stablecoin Strategies',
      summary: 'Earn yield with stable assets',
      content: 'Explore low-risk strategies using USDC, DAI, and other stablecoins.',
      order: 5,
      xpReward: 200,
    },
    {
      slug: 'liquidity-pools',
      title: 'Liquidity Pools 101',
      summary: 'How liquidity provision works',
      content: 'Learn about AMMs, liquidity pools, and impermanent loss.',
      order: 6,
      xpReward: 200,
    },
    {
      slug: 'risk-management',
      title: 'Risk Management',
      summary: 'Protect your DeFi investments',
      content: 'Learn to assess and mitigate risks in DeFi protocols.',
      order: 7,
      xpReward: 250,
    },
    {
      slug: 'protocol-security',
      title: 'Protocol Security',
      summary: 'Evaluate DeFi protocol safety',
      content: 'Understand audits, TVL, and security best practices.',
      order: 8,
      xpReward: 250,
    },
  ];

  console.log('📚 Inserting lessons...');
  for (const lesson of lessonData) {
    await db.insert(lessons).values(lesson).onConflictDoNothing();
  }
  console.log(`✅ Inserted ${lessonData.length} lessons`);

  // Seed badges
  const badgeData = [
    {
      slug: 'first-lesson',
      title: 'Scholar',
      description: 'Complete your first DeFi lesson',
      icon: 'book-open',
      xp: 50,
    },
    {
      slug: 'three-lessons',
      title: 'Knowledge Seeker',
      description: 'Complete 3 lessons',
      icon: 'award',
      xp: 100,
    },
    {
      slug: 'all-lessons',
      title: 'DeFi Expert',
      description: 'Complete all available lessons',
      icon: 'star',
      xp: 500,
    },
    {
      slug: 'first-goal',
      title: 'Goal Setter',
      description: 'Set your first savings goal',
      icon: 'target',
      xp: 50,
    },
    {
      slug: 'first-deposit',
      title: 'Investor',
      description: 'Make your first DeFi deposit',
      icon: 'trending-up',
      xp: 100,
    },
    {
      slug: 'week-streak',
      title: 'Consistent Learner',
      description: 'Maintain a 7-day learning streak',
      icon: 'zap',
      xp: 200,
    },
    {
      slug: 'month-streak',
      title: 'Dedicated Student',
      description: 'Maintain a 30-day learning streak',
      icon: 'activity',
      xp: 500,
    },
    {
      slug: 'hundred-xp',
      title: 'Rising Star',
      description: 'Earn 100 total XP',
      icon: 'star',
      xp: 0,
    },
    {
      slug: 'thousand-xp',
      title: 'DeFi Master',
      description: 'Earn 1000 total XP',
      icon: 'award',
      xp: 0,
    },
  ];

  console.log('🏅 Inserting badges...');
  for (const badge of badgeData) {
    await db.insert(badges).values(badge).onConflictDoNothing();
  }
  console.log(`✅ Inserted ${badgeData.length} badges`);

  console.log('🎉 Seeding complete!');
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
