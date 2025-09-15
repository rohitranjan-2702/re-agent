import { pineconeIndex, isPineconeAvailable } from "./pinecone";
import { prisma } from "./prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { nanoid } from "nanoid";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY as string
);

// Generate embeddings for text using Google's embedding model
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Store conversation in both Prisma and Pinecone
export async function saveConversation({
  userId,
  messages,
  model,
  conversationId,
}: {
  userId: string;
  messages: Array<{ role: string; content: string }>;
  model: string;
  conversationId?: string;
}) {
  try {
    // Save to Prisma
    const conversation = await prisma.conversation.upsert({
      where: {
        id: conversationId || nanoid(),
      },
      update: {
        messages,
        updatedAt: new Date(),
      },
      create: {
        id: conversationId || nanoid(),
        userId,
        model,
        messages,
        title: generateConversationTitle(messages),
      },
    });

    // Save each message to Pinecone for semantic search (if available)
    if (isPineconeAvailable() && pineconeIndex) {
      const vectors = [];

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const messageText = `${message.role}: ${message.content}`;

        try {
          // Generate embedding for the message
          const embedding = await generateEmbedding(messageText);

          vectors.push({
            id: `${conversation.id}-msg-${i}`,
            values: embedding,
            metadata: {
              conversationId: conversation.id,
              userId,
              role: message.role,
              content: message.content,
              messageIndex: i,
              timestamp: conversation.updatedAt.toISOString(),
              model,
            },
          });
        } catch (error) {
          console.error("Error generating embedding for message:", error);
          // Continue without this message rather than failing the entire save
        }
      }

      // Store in Pinecone
      if (vectors.length > 0) {
        try {
          await pineconeIndex.upsert(vectors);
        } catch (error) {
          console.error("Error saving to Pinecone:", error);
          // Don't throw error here - conversation is already saved in Prisma
        }
      }
    } else {
      console.log(
        "Pinecone not configured - skipping semantic search indexing"
      );
    }

    return conversation;
  } catch (error) {
    console.error("Error saving conversation:", error);
    throw error;
  }
}

// Search conversations by similarity
export async function searchConversations({
  query,
  userId,
  topK = 10,
}: {
  query: string;
  userId: string;
  topK?: number;
}) {
  try {
    // Check if Pinecone is available for semantic search
    if (!isPineconeAvailable() || !pineconeIndex) {
      console.log("Pinecone not available - falling back to basic text search");
      // Fallback to basic text search using Prisma
      const conversations = await prisma.conversation.findMany({
        where: {
          userId,
          OR: [
            {
              title: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              messages: {
                string_contains: query,
              },
            },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: topK,
        select: {
          id: true,
          title: true,
          messages: true,
          updatedAt: true,
        },
      });

      // Transform to match expected format
      return conversations.map((conv) => ({
        conversationId: conv.id,
        matches: [
          {
            score: 0.8, // Default score for text search
            role: "system",
            content: conv.title,
            messageIndex: 0,
            timestamp: conv.updatedAt.toISOString(),
          },
        ],
        maxScore: 0.8,
      }));
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Search in Pinecone
    const searchResults = await pineconeIndex.query({
      vector: queryEmbedding,
      topK,
      filter: {
        userId: { $eq: userId },
      },
      includeMetadata: true,
    });

    // Group results by conversation
    const conversationMap = new Map();

    for (const match of searchResults.matches || []) {
      const metadata = match.metadata;
      if (metadata && metadata.conversationId) {
        const convId = metadata.conversationId as string;

        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, {
            conversationId: convId,
            matches: [],
            maxScore: 0,
          });
        }

        const conv = conversationMap.get(convId);
        conv.matches.push({
          score: match.score || 0,
          role: metadata.role,
          content: metadata.content,
          messageIndex: metadata.messageIndex,
          timestamp: metadata.timestamp,
        });

        conv.maxScore = Math.max(conv.maxScore, match.score || 0);
      }
    }

    // Sort conversations by relevance
    return Array.from(conversationMap.values()).sort(
      (a, b) => b.maxScore - a.maxScore
    );
  } catch (error) {
    console.error("Error searching conversations:", error);
    throw error;
  }
}

// Generate a title for the conversation based on the first user message
function generateConversationTitle(
  messages: Array<{ role: string; content: string }>
): string {
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  if (firstUserMessage) {
    // Take first 50 characters and add ellipsis if needed
    const title = firstUserMessage.content.slice(0, 50);
    return title.length < firstUserMessage.content.length
      ? `${title}...`
      : title;
  }
  return "New Conversation";
}

// Get conversation history for a user
export async function getConversationHistory(userId: string, limit = 50) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      model: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Get a specific conversation
export async function getConversation(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
  });
}
