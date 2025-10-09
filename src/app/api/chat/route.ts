import { NextResponse } from "next/server";
import { processChatRequest } from "@/lib/chat/service";
import { ChatRequestPayload } from "@/lib/chat/types";

function validatePayload(payload: Partial<ChatRequestPayload>): payload is ChatRequestPayload {
  return typeof payload?.userId === "string" && typeof payload?.userText === "string";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<ChatRequestPayload>;

    if (!validatePayload(payload)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = await processChatRequest(payload);

    return NextResponse.json({
      assistantText: result.assistantText,
      nextState: result.nextState,
      toolCalls: result.toolCalls,
      auditTrailLength: result.context.auditTrail.length,
      faqAnswer: result.faqAnswer,
      budgetSnapshot: result.budgetSnapshot,
      nextAction: result.nextAction,
    });
  } catch (error) {
    console.error("Error handling chat request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
