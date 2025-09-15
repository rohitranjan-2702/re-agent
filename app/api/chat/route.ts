import { streamText, UIMessage, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { auth } from "@/lib/auth";
import {
  saveConversation,
  getConversationContext,
  formatContextForPrompt,
} from "@/lib/conversations";
import {
  searchResearchPapers,
  rankPapersByRelevance,
  extractPaperContext,
} from "@/lib/research-papers";
import { ResearchPaper } from "@/types/research";
import { nanoid } from "nanoid";

export const maxDuration = 30;

// Detect if a query needs research papers
function detectResearchNeed(query: string): boolean {
  const researchKeywords = [
    "research",
    "study",
    "studies",
    "paper",
    "papers",
    "literature",
    "evidence",
    "findings",
    "methodology",
    "experiment",
    "analysis",
    "survey",
    "meta-analysis",
    "systematic review",
    "publication",
    "journal",
    "academic",
    "scholar",
    "citation",
    "cite",
    "reference",
    "what does research say",
    "scientific evidence",
    "peer reviewed",
    "recent studies",
    "latest research",
  ];

  const queryLower = query.toLowerCase();
  return (
    researchKeywords.some((keyword) => queryLower.includes(keyword)) ||
    queryLower.includes("research") ||
    Boolean(
      queryLower.match(
        /\b(how|what|why|when|where).*(evidence|study|research|findings)\b/
      )
    )
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    messages,
    model,
    conversationId,
    enableResearch = false,
    numPapers = 5,
  }: {
    messages: UIMessage[];
    model: string;
    conversationId?: string;
    enableResearch?: boolean;
    numPapers?: number;
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

  // Get the latest user message for research
  const latestUserMessage = messageHistory
    .filter((msg) => msg.role === "user")
    .pop();

  // Automatically detect if research is needed or use explicit flag
  const shouldUseResearch =
    enableResearch ||
    (latestUserMessage?.content
      ? detectResearchNeed(latestUserMessage.content)
      : false);

  // Retrieve research papers if needed
  let researchPapers: ResearchPaper[] = [];
  let researchContext = "";

  if (shouldUseResearch && latestUserMessage?.content) {
    try {
      console.log(
        `🔬 Research mode enabled for query: "${latestUserMessage.content}"`
      );

      const searchResults = await searchResearchPapers({
        query: latestUserMessage.content,
        limit: Math.min(numPapers * 2, 15), // Get more to filter the best
        minCitationCount: 1,
      });

      if (searchResults.papers.length > 0) {
        researchPapers = rankPapersByRelevance(
          searchResults.papers,
          latestUserMessage.content
        ).slice(0, numPapers);
        researchContext = extractPaperContext(researchPapers);
        console.log(
          `📚 Found ${researchPapers.length} relevant research papers`
        );
      }
    } catch (error) {
      console.error("Error retrieving research papers:", error);
      // Continue without research if there's an error
    }
  }

  // Build system prompt with context and research
  let systemPrompt =
    "You are a helpful assistant that can answer questions and help with tasks.";

  if (researchContext) {
    systemPrompt += `\n\n## RESEARCH PAPERS CONTEXT\nThe following research papers are relevant to the user's query. Use them to provide accurate, evidence-based responses. Cite papers using [1], [2], etc. format when referencing specific findings:\n\n${researchContext}`;
  }

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
