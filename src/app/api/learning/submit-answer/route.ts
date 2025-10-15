import { NextResponse } from 'next/server';
import { db } from '@/db';
import { learningSessions, quizQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { privyId, sessionId, questionId, userAnswer } = await request.json();

    if (!privyId || !sessionId || !questionId || userAnswer === undefined) {
      return NextResponse.json(
        { error: 'privyId, sessionId, questionId, and userAnswer are required' },
        { status: 400 }
      );
    }

    // Get session
    const [session] = await db
      .select()
      .from(learningSessions)
      .where(eq(learningSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: 'Learning session not found' },
        { status: 404 }
      );
    }

    // Get question
    const [question] = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Parse options and check answer
    const options = JSON.parse(question.options);
    const correctAnswerIndex = question.correctAnswerIndex;

    // Check if user's answer matches (by index or by text)
    let isCorrect = false;
    let userAnswerIndex = -1;

    // Try to match by exact text first
    userAnswerIndex = options.findIndex((opt: string) =>
      opt.toLowerCase().trim() === userAnswer.toLowerCase().trim()
    );

    // If not found, try to parse as index (A, B, C, D or 0, 1, 2, 3)
    if (userAnswerIndex === -1) {
      if (['A', 'B', 'C', 'D', 'E', 'F'].includes(userAnswer.toUpperCase())) {
        userAnswerIndex = userAnswer.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      } else if (!isNaN(parseInt(userAnswer))) {
        userAnswerIndex = parseInt(userAnswer);
      }
    }

    isCorrect = userAnswerIndex === correctAnswerIndex;

    // Update session progress
    const questionsAsked = JSON.parse(session.questionsAsked);
    if (!questionsAsked.includes(questionId)) {
      questionsAsked.push(questionId);
    }

    await db
      .update(learningSessions)
      .set({
        questionsAsked: JSON.stringify(questionsAsked),
        questionsAttempted: session.questionsAttempted + 1,
        questionsCorrect: isCorrect
          ? session.questionsCorrect + 1
          : session.questionsCorrect,
        lastActivityAt: new Date(),
      })
      .where(eq(learningSessions.id, sessionId));

    return NextResponse.json({
      correct: isCorrect,
      correctAnswerIndex,
      correctAnswer: options[correctAnswerIndex],
      explanation: question.explanation,
      progress: {
        questionsCorrect: isCorrect
          ? session.questionsCorrect + 1
          : session.questionsCorrect,
        questionsAttempted: session.questionsAttempted + 1,
      },
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
