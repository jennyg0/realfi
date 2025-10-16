import {
  BaseChatModel,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import type { Runnable } from "@langchain/core/runnables";
import { NilaiOpenAIClient, NilAuthInstance } from "@nillion/nilai-ts";
import type { StructuredToolInterface } from "@langchain/core/tools";

export interface NillionChatModelParams extends BaseChatModelParams {
  apiKey: string;
  model?: string;
  temperature?: number;
  baseURL?: string;
  maxRetries?: number;
}

export class NillionChatModel extends BaseChatModel {
  apiKey: string;
  baseURL: string;
  modelName: string;
  temperature: number;
  private readonly maxRetries: number;
  private client: NilaiOpenAIClient;

  constructor(params: NillionChatModelParams) {
    super(params);

    this.apiKey = params.apiKey;
    this.baseURL = params.baseURL ?? "https://nilai-a779.nillion.network/v1/";
    this.modelName = params.model ?? "google/gemma-3-27b-it";
    this.temperature = params.temperature ?? 0.2;
    this.maxRetries = params.maxRetries ?? 5;

    console.log(`[${new Date().toISOString()}] NillionChatModel initialized:`, {
      baseURL: this.baseURL,
      modelName: this.modelName,
      temperature: this.temperature,
      maxRetries: this.maxRetries,
      hasApiKey: !!this.apiKey,
      apiKeyPrefix: this.apiKey.substring(0, 10) + "...",
    });

    this.client = new NilaiOpenAIClient({
      baseURL: this.baseURL,
      apiKey: this.apiKey,
      nilauthInstance: NilAuthInstance.SANDBOX,
    });
  }

  _llmType(): string {
    return "nillion-chat";
  }

  bindTools(
    _tools: StructuredToolInterface[],
    _kwargs?: Record<string, unknown>
  ): Runnable {
    // Return a new instance with tools - Nillion's API doesn't support native tool calling
    // so we let LangGraph handle tool orchestration
    return this as unknown as Runnable;
  }

  async _generate(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    // Gemini doesn't support system messages and requires alternating user/assistant
    // Separate system messages from conversation messages
    const systemMessages: string[] = [];
    const conversationMessages: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [];

    for (const msg of messages) {
      const msgType = msg._getType();
      if (msgType === "system") {
        // Collect system messages separately
        systemMessages.push(msg.content as string);
      } else {
        // Add conversation messages
        const role =
          msgType === "human" ? ("user" as const) : ("assistant" as const);
        conversationMessages.push({
          role,
          content: msg.content as string,
        });
      }
    }

    // Prepend system context to first user message only (Gemini doesn't support system role)
    const formattedMessages = [...conversationMessages];
    if (
      systemMessages.length > 0 &&
      formattedMessages.length > 0 &&
      formattedMessages[0].role === "user"
    ) {
      formattedMessages[0] = {
        ...formattedMessages[0],
        content:
          systemMessages.join("\n\n") + "\n\n" + formattedMessages[0].content,
      };
    }

    let response;
    try {
      response = await this.callWithRetry(async () => {
        console.log(`[${new Date().toISOString()}] Calling Nillion API with:`, {
          model: this.modelName,
          messageCount: formattedMessages.length,
          messages: formattedMessages,
        });

        return await this.client.chat.completions.create({
          model: this.modelName,
          messages: formattedMessages,
          temperature: this.temperature,
        });
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] _generate error:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fullError: error,
      });
      const fallback =
        "Hi there! I'm still warming up the NilAI service. Give me a moment and feel free to try again in a few seconds.";
      return {
        generations: [
          {
            text: fallback,
            message: new AIMessageChunk({ content: fallback }),
          },
        ],
      };
    }

    const content = response?.choices?.[0]?.message?.content ?? "";

    console.log(`[${new Date().toISOString()}] Nillion API response:`, {
      hasResponse: !!response,
      hasChoices: !!response?.choices,
      contentLength: content.length,
      content: content.substring(0, 200), // Show more content for debugging
      fullContent: content, // Log full content to check for truncation
    });

    // Call the streaming callback so the AI SDK can stream the response
    if (runManager) {
      await runManager.handleLLMNewToken(content);
    }

    return {
      generations: [
        {
          text: content,
          message: new AIMessageChunk({ content }),
        },
      ],
    };
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    console.log(`[${new Date().toISOString()}] _streamResponseChunks called`);
    // Gemini doesn't support system messages and requires alternating user/assistant
    // Separate system messages from conversation messages
    const systemMessages: string[] = [];
    const conversationMessages: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [];

    for (const msg of messages) {
      const msgType = msg._getType();
      if (msgType === "system") {
        // Collect system messages separately
        systemMessages.push(msg.content as string);
      } else {
        // Add conversation messages
        const role =
          msgType === "human" ? ("user" as const) : ("assistant" as const);
        conversationMessages.push({
          role,
          content: msg.content as string,
        });
      }
    }

    // Prepend system context to first user message only (Gemini doesn't support system role)
    const formattedMessages = [...conversationMessages];
    if (
      systemMessages.length > 0 &&
      formattedMessages.length > 0 &&
      formattedMessages[0].role === "user"
    ) {
      formattedMessages[0] = {
        ...formattedMessages[0],
        content:
          systemMessages.join("\n\n") + "\n\n" + formattedMessages[0].content,
      };
    }

    let stream: AsyncIterable<{
      choices: Array<{ delta?: { content?: string } }>;
    }>;
    try {
      console.log(
        `[${new Date().toISOString()}] Creating stream with Nillion API...`
      );
      stream = (await this.callWithRetry(async () => {
        return this.client.chat.completions.create({
          model: this.modelName,
          messages: formattedMessages,
          temperature: this.temperature,
          stream: true,
        });
      })) as AsyncIterable<{
        choices: Array<{ delta?: { content?: string } }>;
      }>;
      console.log(`[${new Date().toISOString()}] Stream created successfully`);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Stream creation failed:`,
        error
      );
      const fallback =
        "NilAI is temporarily unavailable. I'll keep listening—please try your message again shortly.";
      yield new ChatGenerationChunk({
        text: fallback,
        message: new AIMessageChunk({ content: fallback }),
      });
      await runManager?.handleLLMNewToken(fallback);
      return;
    }

    console.log(`[${new Date().toISOString()}] Starting to consume stream...`);
    let chunkCount = 0;
    for await (const chunk of stream) {
      chunkCount++;
      const content = chunk.choices[0]?.delta?.content ?? "";
      if (content) {
        console.log(
          `[${new Date().toISOString()}] Chunk ${chunkCount}: ${content.substring(
            0,
            50
          )}`
        );
        yield new ChatGenerationChunk({
          text: content,
          message: new AIMessageChunk({ content }),
        });
        await runManager?.handleLLMNewToken(content);
      }
    }
    console.log(
      `[${new Date().toISOString()}] Stream complete. Total chunks: ${chunkCount}`
    );
  }

  private async callWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    const maxAttempts = Math.max(1, this.maxRetries);

    while (attempt < maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        const status =
          (error as { status?: number; response?: { status?: number } })
            ?.status ??
          (error as { status?: number; response?: { status?: number } })
            ?.response?.status;
        if (status === 429 && attempt < maxAttempts - 1) {
          const backoffMs = 1000 * Math.pow(2, attempt);
          console.warn(
            `Nillion API rate limited (attempt ${
              attempt + 1
            }/${maxAttempts}). Retrying in ${backoffMs}ms.`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          attempt += 1;
          continue;
        }

        if (status === 429) {
          throw new Error(
            "Nillion rate limit reached. Please wait a few seconds and try again."
          );
        }

        throw new Error(
          `NilAI service is having trouble right now (status ${
            status ?? "unknown"
          }). Please try again in a moment.`
        );
      }
    }

    throw new Error(
      "Nillion rate limit reached after multiple retries. Please wait and try again."
    );
  }
}
