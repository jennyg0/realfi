import { NextResponse } from "next/server";
import { getOnboardingAgent, createStartMessage, createUserMessage } from "@/lib/chat/agent";
import { getStoredState } from "@/lib/chat/store";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { StreamingTextResponse, LangChainStream } from "ai";

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequestBody = {
  messages?: IncomingMessage[];
  userId?: string;
};

function messageContentToString(message: AIMessage) {
  const content = message.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part?.type === "text" && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("");
  }
  return "";
}

export async function POST(request: Request) {
  console.log(`[${new Date().toISOString()}] POST /api/chat - Request received`);
  try {
    const { messages = [], userId } = (await request.json()) as ChatRequestBody;
    console.log(`[${new Date().toISOString()}] userId: ${userId}, messages count: ${messages.length}`);

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const agent = getOnboardingAgent();
    const filteredMessages = messages.filter((msg) => {
      if ((msg as any).id === "welcome") return false;
      if (msg.role === "assistant" && msg.content.includes("Welcome to BYOB!")) return false;
      return true;
    });

    const hasAssistantMessages = filteredMessages.some((msg) => msg.role === "assistant");
    const history: BaseMessage[] = [];
    if (!hasAssistantMessages) {
      history.push(createStartMessage());
    }
    const latestMessage = filteredMessages.at(-1);
    if (latestMessage) {
      if (latestMessage.role === "user") {
        history.push(createUserMessage(latestMessage.content));
      } else if (latestMessage.role === "assistant") {
        history.push(new AIMessage(latestMessage.content));
      }
    }

    console.log(
      `[${new Date().toISOString()}] Invoking onboarding agent with ${history.length} messages`,
    );

    const result = await agent.invoke(
      { messages: history },
      { configurable: { userId, thread_id: userId } },
    );

    const aiMessages = result.messages.filter((message) => message instanceof AIMessage) as AIMessage[];
    const latest = aiMessages.at(-1);
    const latestText = latest ? messageContentToString(latest) : "";
    const content = latestText.trim().length > 0 ? latestText : "I'm still lining everything up—could you try that again?";
    console.log(
      `[${new Date().toISOString()}] Agent response ready: ${content.substring(0, 120)}`,
    );

    const { stream, handlers } = LangChainStream();
    void (async () => {
      await handlers.handleLLMNewToken(content);
      handlers.handleLLMEnd?.();
    })();

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
    userId,
    consentGranted: state?.consentGranted ?? false,
    profile: state?.profile ?? {},
    nillionRecordId: state?.nillionRecordId ?? null,
    goal: state?.goal ?? null,
    budgetSnapshot: state?.lastBudgetSnapshot ?? null,
    nextAction: state?.lastNextAction ?? null,
    updatedAt: state?.lastUpdated ?? null,
  });
}
