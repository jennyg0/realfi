"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { BudgetSnapshot, NextActionRecommendation, UserProfile } from "@/lib/chat/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
};

type ChatStatePayload = {
  consentGranted: boolean;
  profile: UserProfile;
  goal: string | null;
  budgetSnapshot: BudgetSnapshot | null;
  nextAction: NextActionRecommendation | null;
  updatedAt: number | null;
};

const AUTO_START_TOKEN = "__auto_start__";

function generateLocalId() {
  return Math.random().toString(36).slice(2);
}

export default function ChatPage() {
  const { user } = usePrivy();
  const anonymousIdRef = useRef<string>(generateLocalId());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [chatState, setChatState] = useState<ChatStatePayload>({
    consentGranted: false,
    profile: {},
    goal: null,
    budgetSnapshot: null,
    nextAction: null,
    updatedAt: null,
  });

  const userId = user?.id ?? anonymousIdRef.current;

  useEffect(() => {
    if (user?.id) {
      anonymousIdRef.current = user.id;
    }
  }, [user?.id]);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?userId=${userId}`);
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as ChatStatePayload;
      setChatState(data);
    } catch (error) {
      console.error("Failed to refresh chat state", error);
    }
  }, [userId]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: "/api/chat",
    body: useMemo(() => ({ userId }), [userId]),
    onFinish: async () => {
      await refreshState();
    },
  });

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (!hasBootstrapped && userId) {
      append({
        role: "user",
        content: AUTO_START_TOKEN,
      });
      setHasBootstrapped(true);
    }
  }, [append, hasBootstrapped, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredMessages = useMemo(
    () => messages.filter((message) => !(message.role === "user" && message.content === AUTO_START_TOKEN)),
    [messages],
  );

  const calloutText = useMemo(() => {
    if (!chatState.budgetSnapshot?.ready) {
      return "Share your approximate income and savings so I can build your 50/30/20 snapshot.";
    }
    if (chatState.nextAction) {
      return `Next Step: ${chatState.nextAction.action}`;
    }
    return "I'll suggest your next best action once I know more about your finances.";
  }, [chatState.budgetSnapshot?.ready, chatState.nextAction]);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!input.trim()) {
        return;
      }
      void handleSubmit(event);
    },
    [handleSubmit, input],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="space-y-2 text-center">
        <Heading as="h1" size="7">
          Finance Onboarding Assistant
        </Heading>
        <Text className="text-muted-foreground">
          Share a few details and I&apos;ll craft a tailored budget snapshot with one actionable next step.
        </Text>
      </div>

      <Card>
        <CardHeader>
          <Heading as="h2" size="5">
            Conversation
          </Heading>
          <Text className="text-sm text-muted-foreground">{calloutText}</Text>
        </CardHeader>
        <CardContent>
          <div className="flex h-[420px] flex-col gap-4 overflow-y-auto rounded-md bg-muted/30 p-4">
            {filteredMessages.map((message) => (
              <ChatBubble key={message.id} role={message.role} content={message.content} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={onSubmit} className="mt-4 flex items-center gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder={isLoading ? "Thinking..." : "Type your message"}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {chatState.budgetSnapshot?.ready && chatState.nextAction ? (
        <Card>
          <CardHeader>
            <Heading as="h2" size="5">
              Budget Snapshot (50/30/20)
            </Heading>
            <Text className="text-sm text-muted-foreground">Based on the info you shared</Text>
          </CardHeader>
          <CardContent className="space-y-2">
            <Text>Needs (50%): ${chatState.budgetSnapshot.needs}</Text>
            <Text>Wants (30%): ${chatState.budgetSnapshot.wants}</Text>
            <Text>Savings (20%): ${chatState.budgetSnapshot.save}</Text>
            <div className="mt-4 rounded-md bg-primary/5 p-3">
              <Text className="font-semibold">Next step</Text>
              <Text>{chatState.nextAction.action}</Text>
              <Text className="text-sm text-muted-foreground">{chatState.nextAction.rationale}</Text>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function ChatBubble({ role, content }: { role: ChatMessage["role"]; content: string }) {
  const alignment = role === "assistant" ? "justify-start" : "justify-end";
  const bubbleStyles =
    role === "assistant" ? "bg-white text-foreground ring-1 ring-border" : "bg-primary text-primary-foreground";

  return (
    <div className={cn("flex w-full", alignment)}>
      <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow", bubbleStyles)}>
        {content.split("\n").map((line, idx) => (
          <p key={idx} className="whitespace-pre-wrap">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
