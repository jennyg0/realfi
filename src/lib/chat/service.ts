import { ConversationContext, ChatRequestPayload, ChatTurnResult } from "./types";
import { runOnboardingTurn, createInitialContext } from "./stateMachine";

const conversations = new Map<string, ConversationContext>();

export async function processChatRequest(payload: ChatRequestPayload): Promise<ChatTurnResult> {
  if (!payload.userId) {
    throw new Error("userId is required");
  }

  if (!conversations.has(payload.userId)) {
    conversations.set(payload.userId, createInitialContext(payload.userId));
  }

  const result = runOnboardingTurn(conversations, payload);
  conversations.set(payload.userId, result.context);
  return result;
}

export function getConversationContext(userId: string): ConversationContext | undefined {
  return conversations.get(userId);
}

export function resetConversation(userId: string) {
  conversations.delete(userId);
}
