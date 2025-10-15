export interface LessonSection {
  title: string;
  content: string;
}

export interface QuizQuestion {
  id?: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  order: number;
}

export interface Lesson {
  id?: number;
  slug: string;
  title: string;
  emoji?: string;
  summary: string;
  sections: LessonSection[];
  questions: QuizQuestion[];
  order: number;
  xpReward: number;
}

export interface LearningSession {
  id?: number;
  profileId: number;
  lessonId: number;
  currentSection: number;
  currentQuestion: number;
  questionsAsked: number[];
  questionsCorrect: number;
  questionsAttempted: number;
  isActive: boolean;
  startedAt?: Date;
  lastActivityAt?: Date;
}

export interface LessonProgress {
  id?: number;
  profileId: number;
  lessonId: number;
  score?: number;
  questionsCorrect: number;
  questionsTotal: number;
  completedAt?: Date;
}
