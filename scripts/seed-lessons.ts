// Load .env.local BEFORE importing db
import { config } from 'dotenv';
config({ path: '.env.local' });

// Now import everything else
import { db } from '../src/db';
import { lessons, quizQuestions } from '../src/db/schema';
import { LESSONS } from '../src/data/lessons-seed';
import { eq } from 'drizzle-orm';

async function seedLessons() {
  console.log('🌱 Starting lesson seed...');

  for (const lessonData of LESSONS) {
    console.log(`\n📚 Seeding lesson: ${lessonData.title}`);

    // Check if lesson already exists
    const [existing] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.slug, lessonData.slug))
      .limit(1);

    let lessonId: number;

    if (existing) {
      console.log(`  ↻ Updating existing lesson (ID: ${existing.id})`);

      // Update existing lesson
      await db
        .update(lessons)
        .set({
          title: lessonData.title,
          emoji: lessonData.emoji,
          summary: lessonData.summary,
          sections: JSON.stringify(lessonData.sections),
          order: lessonData.order,
          xpReward: lessonData.xpReward,
          updatedAt: new Date(),
        })
        .where(eq(lessons.slug, lessonData.slug));

      lessonId = existing.id;

      // Delete existing questions for this lesson
      await db
        .delete(quizQuestions)
        .where(eq(quizQuestions.lessonId, lessonId));

      console.log(`  🗑️  Deleted old quiz questions`);
    } else {
      console.log(`  ✨ Creating new lesson`);

      // Insert new lesson
      const [newLesson] = await db
        .insert(lessons)
        .values({
          slug: lessonData.slug,
          title: lessonData.title,
          emoji: lessonData.emoji,
          summary: lessonData.summary,
          sections: JSON.stringify(lessonData.sections),
          order: lessonData.order,
          xpReward: lessonData.xpReward,
        })
        .returning();

      lessonId = newLesson.id;
    }

    // Insert quiz questions
    console.log(`  ❓ Inserting ${lessonData.questions.length} quiz questions...`);

    for (const question of lessonData.questions) {
      await db.insert(quizQuestions).values({
        lessonId,
        question: question.question,
        options: JSON.stringify(question.options),
        correctAnswerIndex: question.correctAnswerIndex,
        explanation: question.explanation,
        order: question.order,
      });
    }

    console.log(`  ✅ Lesson "${lessonData.title}" seeded successfully`);
  }

  console.log('\n✨ All lessons seeded successfully!');
}

seedLessons()
  .then(() => {
    console.log('\n✅ Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });
