import { streamText, UIMessage, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { auth } from "@/lib/auth";
import { saveConversation } from "@/lib/conversations";
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

  const result = streamText({
    model: google(model),
    messages: convertToModelMessages(messages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks",
    onFinish: async (response) => {
      try {
        // Convert UI messages to a format for storage
        const conversationMessages = messages.map((msg) => ({
          role: msg.role,
          content:
            msg.parts
              ?.filter((part: any) => part.type === "text")
              .map((part: any) => part.text)
              .join("") || "",
        }));

        // Add the assistant's response
        conversationMessages.push({
          role: "assistant",
          content: response.text,
        });

        // Save the conversation to Prisma and Pinecone
        await saveConversation({
          userId: session.user!.id!, // Use the actual user ID from the database
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
