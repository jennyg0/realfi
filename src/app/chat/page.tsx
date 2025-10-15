"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import {
  BudgetSnapshot,
  NextActionRecommendation,
  UserProfile,
} from "@/lib/chat/types";

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

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: useMemo(() => ({ userId }), [userId]),
    onFinish: async () => {
      await refreshState();
    },
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: `Welcome to realfi! 👋

Quick 2-minute setup to personalize your financial journey. Your answers are stored privately using Nillion—not even we can see them.

Ready to get started?`,
      },
    ],
  });

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredMessages = messages;

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
      if (!input.trim() || input.trim().length < 2) {
        return;
      }
      void handleSubmit(event);
    },
    [handleSubmit, input]
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="space-y-2 text-center">
        <Heading as="h1" size="7">
          Finance Onboarding Assistant
        </Heading>
        <Text className="text-muted-foreground">
          Share a few details and I&apos;ll craft a tailored budget snapshot
          with one actionable next step.
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
              <ChatBubble
                key={message.id}
                role={message.role}
                content={message.content}
                onQuickReply={(text) => {
                  append({ role: "user", content: text });
                }}
              />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={onSubmit} className="mt-4 flex items-center gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder={
                isLoading && input ? "Thinking..." : "Type your message"
              }
              disabled={isLoading && input.trim().length > 0}
            />
            <Button
              type="submit"
              disabled={isLoading || input.trim().length === 0}
            >
              {isLoading && input ? "Sending..." : "Send"}
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
            <Text className="text-sm text-muted-foreground">
              Based on the info you shared
            </Text>
          </CardHeader>
          <CardContent className="space-y-2">
            <Text>Needs (50%): ${chatState.budgetSnapshot.needs}</Text>
            <Text>Wants (30%): ${chatState.budgetSnapshot.wants}</Text>
            <Text>Savings (20%): ${chatState.budgetSnapshot.save}</Text>
            <div className="mt-4 rounded-md bg-primary/5 p-3">
              <Text className="font-semibold">Next step</Text>
              <Text>{chatState.nextAction.action}</Text>
              <Text className="text-sm text-muted-foreground">
                {chatState.nextAction.rationale}
              </Text>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function TypingIndicator() {
  return (
    <div className="flex w-full justify-start">
      <div className="relative inline-block max-w-[75%] mr-auto">
        <div className="absolute -left-1 bottom-0 h-4 w-4 overflow-hidden">
          <div className="absolute bottom-0 left-0 h-3 w-3 rotate-45 bg-gray-200" />
        </div>
        <div className="bg-gray-200 text-gray-900 rounded-[18px] px-4 py-3 shadow-sm">
          <div className="flex gap-1">
            <div
              className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  role,
  content,
  onQuickReply,
}: {
  role: ChatMessage["role"];
  content: string;
  onQuickReply?: (text: string) => void;
}) {
  const isUser = role === "user";
  const alignment = isUser ? "justify-end" : "justify-start";
  const bubbleStyles = isUser
    ? "bg-blue-500 text-white rounded-[18px]"
    : "bg-gray-200 text-gray-900 rounded-[18px]";

  // Extract multiple choice options from bullet lists
  const lines = content.split("\n");
  const options: string[] = [];
  const textLines: string[] = [];
  let inOptionsList = false;

  for (const line of lines) {
    const bulletMatch = line.match(/^\s*[*-]\s+(.+)$/);
    if (bulletMatch) {
      options.push(bulletMatch[1].trim());
      inOptionsList = true;
    } else {
      if (inOptionsList && line.trim() === "") {
        continue; // Skip empty lines after options
      }
      textLines.push(line);
      inOptionsList = false;
    }
  }

  const hasOptions = options.length > 0 && !isUser;

  // Parse simple markdown: **bold** and *italic*
  const parseMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Match **bold** or *italic*
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add formatted text
      if (match[2]) {
        // **bold**
        parts.push(<strong key={match.index}>{match[2]}</strong>);
      } else if (match[3]) {
        // *italic*
        parts.push(<em key={match.index}>{match[3]}</em>);
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={cn("flex w-full flex-col gap-2", alignment)}>
      <div
        className={cn(
          "relative inline-block max-w-[75%]",
          isUser ? "ml-auto" : "mr-auto"
        )}
      >
        {/* Chat bubble tail */}
        {isUser ? (
          <div className="absolute -right-1 bottom-0 h-4 w-4 overflow-hidden">
            <div className="absolute bottom-0 right-0 h-3 w-3 rotate-45 bg-blue-500" />
          </div>
        ) : (
          <div className="absolute -left-1 bottom-0 h-4 w-4 overflow-hidden">
            <div className="absolute bottom-0 left-0 h-3 w-3 rotate-45 bg-gray-200" />
          </div>
        )}

        <div
          className={cn(
            "px-4 py-2 text-[15px] leading-relaxed shadow-sm",
            bubbleStyles
          )}
        >
          {textLines.map((line, idx) => (
            <p key={idx} className="whitespace-pre-wrap">
              {parseMarkdown(line)}
            </p>
          ))}
        </div>
      </div>

      {hasOptions && onQuickReply && (
        <div
          className={cn(
            "flex flex-col gap-2",
            isUser ? "items-end" : "items-start"
          )}
        >
          {options.map((option, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => onQuickReply(option)}
              className="max-w-[75%] justify-start rounded-full border-gray-300 bg-white text-left text-sm hover:bg-gray-50"
            >
              {parseMarkdown(option)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
