import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons, learningSessions, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const privyId = searchParams.get('privyId');

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

    // Get active learning session
    const [session] = await db
      .select()
      .from(learningSessions)
      .where(
        and(
          eq(learningSessions.profileId, profile.id),
          eq(learningSessions.isActive, true)
        )
      )
      .limit(1);

    if (!session) {
      return NextResponse.json({
        session: null,
        message: 'No active learning session',
      });
    }

    // Get lesson details
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
    const currentSection = sections[session.currentSection];

    return NextResponse.json({
      session: {
        id: session.id,
        isActive: session.isActive,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt,
      },
      lesson: {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        emoji: lesson.emoji,
        summary: lesson.summary,
        totalSections: sections.length,
      },
      currentSection: {
        index: session.currentSection,
        title: currentSection?.title,
        content: currentSection?.content,
      },
      progress: {
        currentSection: session.currentSection,
        totalSections: sections.length,
        questionsCorrect: session.questionsCorrect,
        questionsAttempted: session.questionsAttempted,
        questionsAsked: JSON.parse(session.questionsAsked),
      },
    });
  } catch (error) {
    console.error('Error getting learning state:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
