"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type BudgetSnapshot = {
  rule?: string;
  needs?: number;
  wants?: number;
  save?: number;
  ready?: boolean;
};

type NextAction = {
  action: string;
  rationale: string;
};

function generateLocalId() {
  return Math.random().toString(36).slice(2);
}

export default function ChatPage() {
  const { user } = usePrivy();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingText, setPendingText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<BudgetSnapshot>();
  const [nextAction, setNextAction] = useState<NextAction>();
  const anonymousIdRef = useRef<string>(generateLocalId());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const userId = user?.id ?? anonymousIdRef.current;

  useEffect(() => {
    if (user?.id) {
      anonymousIdRef.current = user.id;
    }
  }, [user?.id]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const appendMessage = useCallback((role: ChatRole, content: string) => {
    setMessages((prev) => [...prev, { id: `${role}-${Date.now()}-${prev.length}`, role, content }]);
  }, []);

  const sendPayload = useCallback(
    async (content: string) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            userText: content,
          }),
        });

        if (!response.ok) {
          appendMessage("assistant", "Something went wrong on my end. Try again in a moment.");
          return;
        }

        const data = await response.json();
        if (typeof data.assistantText === "string") {
          appendMessage("assistant", data.assistantText);
        }
        if (data.budgetSnapshot) {
          setSnapshot(data.budgetSnapshot);
        }
        if (data.nextAction) {
          setNextAction(data.nextAction);
        }
      } catch (error) {
        console.error("Chat request failed", error);
        appendMessage("assistant", "I couldn't reach the chat service just now. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [appendMessage, userId],
  );

  const initializeConversation = useCallback(async () => {
    if (messages.length > 0) {
      return;
    }
    await sendPayload("");
  }, [messages.length, sendPayload]);

  useEffect(() => {
    initializeConversation();
  }, [initializeConversation]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!pendingText.trim() || isLoading) {
        return;
      }
      const content = pendingText.trim();
      setPendingText("");
      appendMessage("user", content);
      await sendPayload(content);
    },
    [appendMessage, isLoading, pendingText, sendPayload],
  );

  const calloutText = useMemo(() => {
    if (!snapshot?.ready) {
      return "Share your approximate income and savings so I can build your 50/30/20 snapshot.";
    }
    if (nextAction) {
      return `Next Step: ${nextAction.action}`;
    }
    return "I'll suggest your next best action once I have your profile details.";
  }, [snapshot?.ready, nextAction]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="space-y-2 text-center">
        <Heading as="h1" size="7">
          Finance Onboarding Assistant
        </Heading>
        <Text className="text-muted-foreground">
          Share a few quick details and I&apos;ll craft a tailored budget snapshot with one actionable next step.
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
            {messages.map((message) => (
              <ChatBubble key={message.id} role={message.role} content={message.content} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
            <Input
              value={pendingText}
              onChange={(event) => setPendingText(event.target.value)}
              placeholder={isLoading ? "Thinking..." : "Type your message"}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !pendingText.trim()}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {snapshot?.ready && nextAction ? (
        <Card>
          <CardHeader>
            <Heading as="h2" size="5">
              Budget Snapshot (50/30/20)
            </Heading>
            <Text className="text-sm text-muted-foreground">Based on the info you shared</Text>
          </CardHeader>
          <CardContent className="space-y-2">
            <Text>Needs (50%): ${snapshot.needs}</Text>
            <Text>Wants (30%): ${snapshot.wants}</Text>
            <Text>Savings (20%): ${snapshot.save}</Text>
            <div className="mt-4 rounded-md bg-primary/5 p-3">
              <Text className="font-semibold">Next step</Text>
              <Text>{nextAction.action}</Text>
              <Text className="text-sm text-muted-foreground">{nextAction.rationale}</Text>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function ChatBubble({ role, content }: { role: ChatRole; content: string }) {
  return (
    <div className={cn("flex w-full", role === "assistant" ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow",
          role === "assistant"
            ? "bg-white text-foreground ring-1 ring-border"
            : "bg-primary text-primary-foreground",
        )}
      >
        {content.split("\n").map((line, idx) => (
          <p key={idx} className="whitespace-pre-wrap">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
