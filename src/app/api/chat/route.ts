import { NextResponse } from "next/server";
import { getOnboardingAgent, createStartMessage, createUserMessage } from "@/lib/chat/agent";
import { getStoredState } from "@/lib/chat/store";
import { AIMessage, BaseMessage } from "@langchain/core/messages";

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

    console.log(`[${new Date().toISOString()}] Agent result messages:`, {
      totalMessages: result.messages.length,
      messageTypes: result.messages.map((m: BaseMessage) => m.constructor.name),
    });

    // Filter by message type - check constructor name and instanceof
    const aiMessages = result.messages.filter((message: BaseMessage) =>
      message instanceof AIMessage || message.constructor.name === 'AIMessage'
    );
    console.log(`[${new Date().toISOString()}] AI messages found:`, aiMessages.length);

    const latest = aiMessages.at(-1);
    if (latest) {
      console.log(`[${new Date().toISOString()}] Latest AI message content:`, {
        type: typeof latest.content,
        isArray: Array.isArray(latest.content),
        content: latest.content,
      });
    }

    const latestText = latest ? messageContentToString(latest) : "";
    const content = latestText.trim().length > 0 ? latestText : "I'm still lining everything up—could you try that again?";
    console.log(
      `[${new Date().toISOString()}] Agent response ready: ${content.substring(0, 120)}`,
    );

    // Stream the response with better UX - compatible with Vercel AI SDK's useChat()
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Stream in chunks for smoother typing effect
        const chunkSize = 10; // characters per chunk
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.slice(i, i + chunkSize);
          controller.enqueue(encoder.encode(chunk));
          // Small delay between chunks for natural typing effect
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Chat route error:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error,
    });
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
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
