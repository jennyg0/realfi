import { NextResponse } from "next/server";
import { LangChainStream, StreamingTextResponse } from "ai";
import { getOnboardingAgent, createStartMessage, createUserMessage } from "@/lib/chat/agent";
import { getStoredState } from "@/lib/chat/store";

type IncomingMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
};

type ChatRequestBody = {
  messages?: IncomingMessage[];
  userId?: string;
};

export async function POST(request: Request) {
  try {
    const { messages = [], userId } = (await request.json()) as ChatRequestBody;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

    const normalizedInput =
      lastUserMessage?.content === "__auto_start__" || !lastUserMessage
        ? createStartMessage()
        : createUserMessage(lastUserMessage.content);

    const agent = getOnboardingAgent();
    const { stream, handlers } = LangChainStream();

    void agent
      .invoke(
        {
          messages: [normalizedInput],
        },
        {
          callbacks: [handlers],
          configurable: {
            thread_id: userId,
            userId,
          },
        },
      )
      .catch((error) => {
        console.error("Onboarding agent invocation failed:", error);
        handlers.handleLLMError?.(error as Error);
      });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const state = getStoredState(userId);
  return NextResponse.json({
    consentGranted: state?.consentGranted ?? false,
    profile: state?.profile ?? {},
    goal: state?.goal ?? null,
    budgetSnapshot: state?.lastBudgetSnapshot ?? null,
    nextAction: state?.lastNextAction ?? null,
    updatedAt: state?.lastUpdated ?? null,
  });
}
