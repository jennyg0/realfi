import { pgTable, text, integer, timestamp, boolean, serial } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  privyId: text('privy_id').notNull().unique(),
  wallet: text('wallet').notNull(),
  displayName: text('display_name'),
  riskPreference: text('risk_preference'),
  savingsTarget: integer('savings_target'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const goals = pgTable('goals', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  targetAmount: integer('target_amount').notNull(),
  depositedAmount: integer('deposited_amount').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  content: text('content').notNull(),
  order: integer('order').notNull(),
  xpReward: integer('xp_reward').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const lessonProgress = pgTable('lesson_progress', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id),
  score: integer('score'),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});

export const xpEvents = pgTable('xp_events', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  type: text('type').notNull(),
  amount: integer('amount').notNull(),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const streaks = pgTable('streaks', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id).unique(),
  current: integer('current').notNull().default(0),
  longest: integer('longest').notNull().default(0),
  lastCheckedAt: timestamp('last_checked_at').defaultNow().notNull(),
});

export const badges = pgTable('badges', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  xp: integer('xp'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const badgeAwards = pgTable('badge_awards', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  badgeId: integer('badge_id').notNull().references(() => badges.id),
  awardedAt: timestamp('awarded_at').defaultNow().notNull(),
});

export const strategyRecommendations = pgTable('strategy_recommendations', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  risk: text('risk').notNull(),
  strategyKey: text('strategy_key').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const deposits = pgTable('deposits', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  strategyKey: text('strategy_key').notNull(),
  amount: integer('amount').notNull(),
  txHash: text('tx_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accountBalances = pgTable('account_balances', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  category: text('category').notNull(),
  label: text('label').notNull(),
  amount: integer('amount').notNull(),
  countTowardGoal: boolean('count_toward_goal').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
