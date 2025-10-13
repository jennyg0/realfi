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
  emoji: text('emoji'),
  summary: text('summary').notNull(),
  sections: text('sections').notNull(), // JSON array of {title, content}
  order: integer('order').notNull(),
  xpReward: integer('xp_reward').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id),
  question: text('question').notNull(),
  options: text('options').notNull(), // JSON array of strings
  correctAnswerIndex: integer('correct_answer_index').notNull(),
  explanation: text('explanation'), // Optional explanation for the correct answer
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const learningSessions = pgTable('learning_sessions', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id),
  currentSection: integer('current_section').notNull().default(0),
  currentQuestion: integer('current_question').notNull().default(0),
  questionsAsked: text('questions_asked').notNull().default('[]'), // JSON array of question IDs already asked
  questionsCorrect: integer('questions_correct').notNull().default(0),
  questionsAttempted: integer('questions_attempted').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
});

export const lessonProgress = pgTable('lesson_progress', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id),
  score: integer('score'), // Percentage score (0-100)
  questionsCorrect: integer('questions_correct').notNull().default(0),
  questionsTotal: integer('questions_total').notNull().default(0),
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
  status: text('status').notNull().default('pending'), // pending, completed, failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dcaSchedules = pgTable('dca_schedules', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  protocolKey: text('protocol_key').notNull(), // e.g., 'aave-v3-usdc'
  amount: integer('amount').notNull(), // Amount per execution in cents/smallest unit
  frequency: text('frequency').notNull(), // daily, weekly, biweekly, monthly
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'), // null = indefinite
  isActive: boolean('is_active').notNull().default(true),
  lastExecutedAt: timestamp('last_executed_at'),
  nextExecutionAt: timestamp('next_execution_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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

export const goodDollarClaims = pgTable('gooddollar_claims', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  amount: text('amount').notNull(), // bigint as string
  txHash: text('tx_hash'),
  network: text('network').notNull(), // 'celo' or 'fuse'
  claimedAt: timestamp('claimed_at').defaultNow().notNull(),
});
