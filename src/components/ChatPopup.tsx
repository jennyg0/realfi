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
import {
  IoClose,
  IoChatbubbleEllipses,
  IoRemoveOutline,
} from "react-icons/io5";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "function" | "data";
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

export function ChatPopup() {
  const { user } = usePrivy();
  const anonymousIdRef = useRef<string>(generateLocalId());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
    error,
  } = useChat({
    api: "/api/chat",
    body: useMemo(() => ({ userId }), [userId]),
    onFinish: async () => {
      await refreshState();
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onResponse: (response) => {
      console.log("Chat response received:", response.status, response.statusText);
    },
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: `Welcome to RealFi! 👋

Let's set up your financial dashboard in 2 minutes (just 5 quick questions).

You can skip anytime and just ask me questions about finance instead!

Ready to get started?`,
      },
    ],
  });

  useEffect(() => {
    if (isOpen && !hasBootstrapped) {
      refreshState();
      setHasBootstrapped(true);
    }
  }, [isOpen, hasBootstrapped, refreshState]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // Listen for lesson start events from dashboard
  useEffect(() => {
    const handleStartLesson = (event: CustomEvent) => {
      const { slug, title } = event.detail;
      setIsOpen(true);
      setIsMinimized(false);
      // Send message to start the lesson
      setTimeout(() => {
        append({
          role: "user",
          content: `I want to learn about ${title}. Start the ${slug} lesson.`
        });
      }, 300); // Small delay to ensure chat is open
    };

    window.addEventListener('startLesson' as any, handleStartLesson as any);
    return () => {
      window.removeEventListener('startLesson' as any, handleStartLesson as any);
    };
  }, [append]);

  useEffect(() => {
    console.log("Messages updated:", messages.length, messages);
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:scale-110 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open chat"
      >
        <IoChatbubbleEllipses className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 w-[400px] transition-all duration-300 ease-in-out",
        isMinimized ? "h-16" : "h-[600px]"
      )}
    >
      <Card className="flex h-full flex-col bg-white shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-blue-600 p-4 text-white">
          <div className="flex items-center gap-2">
            <IoChatbubbleEllipses className="h-5 w-5" />
            <Heading as="h2" size="4" className="text-white">
              Finance Assistant
            </Heading>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="rounded p-1 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
            >
              <IoRemoveOutline className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Close chat"
            >
              <IoClose className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
              <div className="border-b bg-blue-50 px-4 py-2">
                <Text className="text-xs text-gray-700">{calloutText}</Text>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-white p-4">
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
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                    Error: {error.message}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-4">
                <form onSubmit={onSubmit} className="flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder={
                      isLoading && input ? "Thinking..." : "Type your message"
                    }
                    disabled={isLoading && input.trim().length > 0}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || input.trim().length === 0}
                    size="sm"
                  >
                    {isLoading && input ? "..." : "Send"}
                  </Button>
                </form>
              </div>
            </CardContent>

            {chatState.budgetSnapshot?.ready && chatState.nextAction && (
              <div className="border-t bg-gray-50 p-4">
                <div className="space-y-2">
                  <Text className="text-xs font-semibold text-gray-700">
                    Budget Snapshot (50/30/20)
                  </Text>
                  <div className="flex gap-4 text-xs">
                    <Text>Needs: ${chatState.budgetSnapshot.needs}</Text>
                    <Text>Wants: ${chatState.budgetSnapshot.wants}</Text>
                    <Text>Save: ${chatState.budgetSnapshot.save}</Text>
                  </div>
                  <div className="mt-2 rounded-md bg-blue-50 p-2">
                    <Text className="text-xs font-semibold">
                      Next: {chatState.nextAction.action}
                    </Text>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
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

  // Debug logging
  if (!isUser && content.includes("*")) {
    console.log("Parsing message with bullets:", { content, lines, options, hasOptions });
  }

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
          "relative inline-block max-w-[85%]",
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
            "px-3 py-2 text-sm leading-relaxed shadow-sm",
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
              className="max-w-[85%] justify-start rounded-full border-gray-300 bg-white text-left text-xs hover:bg-gray-50"
            >
              {parseMarkdown(option)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
