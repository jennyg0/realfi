import { NextResponse } from 'next/server';
import { db } from '@/db';
import { learningSessions, lessonProgress, lessons, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { privyId, sessionId } = await request.json();

    if (!privyId) {
      return NextResponse.json(
        { error: 'privyId is required' },
        { status: 400 }
      );
    }

    // Get user profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.privyId, privyId))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get the session (either by ID or find active one)
    let session;
    if (sessionId) {
      [session] = await db
        .select()
        .from(learningSessions)
        .where(eq(learningSessions.id, sessionId))
        .limit(1);
    } else {
      [session] = await db
        .select()
        .from(learningSessions)
        .where(
          and(
            eq(learningSessions.profileId, profile.id),
            eq(learningSessions.isActive, true)
          )
        )
        .limit(1);
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Learning session not found' },
        { status: 404 }
      );
    }

    // Get lesson to check if completed
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, session.lessonId))
      .limit(1);

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const sections = JSON.parse(lesson.sections);
    const totalSections = sections.length;

    // Check if lesson is completed (all sections viewed)
    const isCompleted = session.currentSection >= totalSections - 1;

    // If completed, create lesson progress record
    if (isCompleted && session.questionsAttempted > 0) {
      const score = Math.round(
        (session.questionsCorrect / session.questionsAttempted) * 100
      );

      await db.insert(lessonProgress).values({
        profileId: profile.id,
        lessonId: lesson.id,
        score,
        questionsCorrect: session.questionsCorrect,
        questionsTotal: session.questionsAttempted,
      });

      // Award XP
      // TODO: Create XP event for lesson completion
    }

    // Deactivate session
    await db
      .update(learningSessions)
      .set({
        isActive: false,
        lastActivityAt: new Date(),
      })
      .where(eq(learningSessions.id, session.id));

    return NextResponse.json({
      success: true,
      completed: isCompleted,
      progress: {
        sectionsCompleted: session.currentSection + 1,
        totalSections,
        questionsCorrect: session.questionsCorrect,
        questionsAttempted: session.questionsAttempted,
        score: session.questionsAttempted > 0
          ? Math.round((session.questionsCorrect / session.questionsAttempted) * 100)
          : 0,
      },
      message: isCompleted
        ? `Lesson completed! You got ${session.questionsCorrect} out of ${session.questionsAttempted} questions correct.`
        : 'Progress saved. You can resume this lesson later.',
    });
  } catch (error) {
    console.error('Error exiting learning mode:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
