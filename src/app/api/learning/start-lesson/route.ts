import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessons, learningSessions, profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { privyId, lessonSlug } = await request.json();

    if (!privyId || !lessonSlug) {
      return NextResponse.json(
        { error: "privyId and lessonSlug are required" },
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
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get lesson
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.slug, lessonSlug))
      .limit(1);

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Check for existing active session
    const [existingSession] = await db
      .select()
      .from(learningSessions)
      .where(
        and(
          eq(learningSessions.profileId, profile.id),
          eq(learningSessions.lessonId, lesson.id),
          eq(learningSessions.isActive, true)
        )
      )
      .limit(1);

    let session;
    if (existingSession) {
      // Resume existing session
      session = existingSession;
    } else {
      // Create new session
      const [newSession] = await db
        .insert(learningSessions)
        .values({
          profileId: profile.id,
          lessonId: lesson.id,
          currentSection: 0,
          currentQuestion: 0,
          questionsAsked: "[]",
          questionsCorrect: 0,
          questionsAttempted: 0,
          isActive: true,
        })
        .returning();

      session = newSession;
    }

    // Parse lesson sections
    const sections = JSON.parse(lesson.sections);
    const firstSection = sections[session.currentSection];

    return NextResponse.json({
      sessionId: session.id,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        emoji: lesson.emoji,
        summary: lesson.summary,
        totalSections: sections.length,
      },
      firstSection: {
        index: session.currentSection,
        title: firstSection.title,
        content: firstSection.content,
      },
      progress: {
        currentSection: session.currentSection,
        totalSections: sections.length,
        questionsCorrect: session.questionsCorrect,
        questionsAttempted: session.questionsAttempted,
      },
    });
  } catch (error) {
    console.error("Error starting lesson:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
