import { streamText, UIMessage, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { auth } from "@/lib/auth";
import {
  saveConversation,
  getConversationContext,
  formatContextForPrompt,
} from "@/lib/conversations";
import { nanoid } from "nanoid";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    messages,
    model,
    conversationId,
  }: {
    messages: UIMessage[];
    model: string;
    conversationId?: string;
  } = await req.json();

  // Convert UI messages to a format for context retrieval
  const messageHistory = messages.map((msg) => ({
    role: msg.role,
    content:
      msg.parts
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("") || "",
  }));

  // Check if context should be enabled (default: true)
  const enableContext = process.env.ENABLE_CONVERSATION_CONTEXT !== "false";

  // Retrieve relevant conversation context (if enabled)
  let context = null;
  if (enableContext && messageHistory.length > 0) {
    try {
      context = await getConversationContext({
        currentMessages: messageHistory,
        userId: session.user!.id!,
        currentConversationId: conversationId,
        maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || "1500"),
      });
    } catch (error) {
      console.error("Error retrieving context:", error);
      // Continue without context if there's an error
    }
  }

  // Build system prompt with context
  let systemPrompt =
    "You are a helpful assistant that can answer questions and help with tasks.";

  if (context) {
    const contextPrompt = formatContextForPrompt(context);
    systemPrompt += contextPrompt;
    console.log(
      `📚 Context retrieved: ${context.conversations.length} conversations, ~${context.totalEstimatedTokens} tokens`
    );
  } else if (enableContext) {
    console.log("🔍 No relevant context found for this conversation");
  }

  const result = streamText({
    model: google(model),
    messages: convertToModelMessages(messages),
    system: systemPrompt,
    onFinish: async (response) => {
      try {
        // Add the assistant's response to the message history
        const conversationMessages = [
          ...messageHistory,
          {
            role: "assistant",
            content: response.text,
          },
        ];

        // Save the conversation to Prisma and Pinecone
        await saveConversation({
          userId: session.user!.id!,
          messages: conversationMessages,
          model,
          conversationId: conversationId || nanoid(),
        });
      } catch (error) {
        console.error("Error saving conversation:", error);
        // Don't fail the response if saving fails
      }
    },
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
