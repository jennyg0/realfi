import { NextResponse } from "next/server";
import { StreamingTextResponse } from "ai";
import { getOnboardingAgent, createUserMessage } from "@/lib/chat/agent";
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
  console.log(
    `[${new Date().toISOString()}] POST /api/chat - Request received`
  );
  try {
    const { messages = [], userId } = (await request.json()) as ChatRequestBody;
    console.log(
      `[${new Date().toISOString()}] userId: ${userId}, messages count: ${
        messages.length
      }`
    );

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const agent = getOnboardingAgent();

    // Don't filter out the welcome message - we need it for context
    console.log(
      `[${new Date().toISOString()}] Incoming messages:`,
      messages.length
    );

    // Convert incoming messages to LangChain format
    const history: BaseMessage[] = [];
    for (const msg of messages) {
      if (msg.role === "user") {
        history.push(createUserMessage(msg.content));
      } else if (msg.role === "assistant") {
        // Include assistant messages in history so agent knows what it already said
        history.push(new AIMessage(msg.content));
      }
    }

    console.log(
      `[${new Date().toISOString()}] Invoking onboarding agent with ${
        history.length
      } messages (${messages.filter((m) => m.role === "user").length} user, ${
        messages.filter((m) => m.role === "assistant").length
      } assistant)`
    );
    console.log(
      `[${new Date().toISOString()}] History preview:`,
      history.map((m) => ({
        type: m.constructor.name,
        content:
          typeof m.content === "string"
            ? m.content.substring(0, 100)
            : "complex",
      }))
    );

    const result = await agent.invoke(
      { messages: history },
      { configurable: { userId, thread_id: userId } }
    );

    console.log(`[${new Date().toISOString()}] Agent result messages:`, {
      totalMessages: result.messages.length,
      messageTypes: result.messages.map((m: BaseMessage) => m.constructor.name),
    });
    console.log(
      `[${new Date().toISOString()}] All result messages:`,
      result.messages.map((m: BaseMessage, i: number) => ({
        index: i,
        type: m.constructor.name,
        content:
          typeof m.content === "string"
            ? m.content.substring(0, 150)
            : "complex",
      }))
    );

    // The agent returns ALL messages in conversation state, including what we sent
    // We need to find NEW messages that weren't in our input
    // Skip the first N messages that match our input history length
    const newMessages = result.messages.slice(history.length);

    console.log(
      `[${new Date().toISOString()}] New messages generated:`,
      newMessages.length
    );
    console.log(
      `[${new Date().toISOString()}] New messages details:`,
      newMessages.map((m: BaseMessage, i: number) => ({
        index: i,
        type: m.constructor.name,
        content:
          typeof m.content === "string"
            ? m.content.substring(0, 150)
            : "complex",
      }))
    );

    // Find AI messages in the new messages only
    const newAIMessages = newMessages.filter(
      (message: BaseMessage) =>
        message instanceof AIMessage || message.constructor.name === "AIMessage"
    );

    console.log(
      `[${new Date().toISOString()}] New AI messages:`,
      newAIMessages.length
    );

    const latest = newAIMessages.at(-1);
    if (latest) {
      console.log(`[${new Date().toISOString()}] Latest AI message content:`, {
        type: typeof latest.content,
        isArray: Array.isArray(latest.content),
        content: latest.content,
      });
    }

    const latestText = latest ? messageContentToString(latest) : "";
    const content =
      latestText.trim().length > 0
        ? latestText
        : "I'm still lining everything up—could you try that again?";
    console.log(
      `[${new Date().toISOString()}] Agent response ready: ${content.substring(
        0,
        120
      )}`
    );

    // Create a streaming response compatible with Vercel AI SDK
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Format: "0:" followed by the content in JSON format, then newline
        const formattedData = `0:${JSON.stringify(content)}\n`;
        controller.enqueue(encoder.encode(formattedData));
        controller.close();
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Chat route error:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
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
