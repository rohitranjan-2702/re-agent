import { auth } from "@/lib/auth";
import {
  searchResearchPapers,
  rankPapersByRelevance,
  extractPaperContext,
} from "@/lib/research-papers";
import { CitationRequest, CitationResponse } from "@/types/research";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { query, numPapers = 5, fields }: CitationRequest = await req.json();

    if (!query || query.trim().length === 0) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    // Search for research papers
    console.log(`🔍 Searching for ${numPapers} papers on: "${query}"`);

    const searchResults = await searchResearchPapers({
      query,
      limit: Math.min(numPapers * 2, 20), // Get more results to filter the best ones
      minCitationCount: 1, // Filter out papers with no citations
    });

    if (searchResults.papers.length === 0) {
      return Response.json({
        papers: [],
        totalResults: 0,
        query,
        generatedAnswer:
          "I couldn't find any relevant research papers for your query. Please try rephrasing your question or using different keywords.",
      });
    }

    // Rank and select the best papers
    const rankedPapers = rankPapersByRelevance(searchResults.papers, query);
    const selectedPapers = rankedPapers.slice(0, numPapers);

    console.log(`📚 Found ${selectedPapers.length} relevant papers`);

    // Generate AI response based on the papers
    const paperContext = extractPaperContext(selectedPapers);

    const systemPrompt = `You are a research assistant. Based on the provided research papers, give a comprehensive answer to the user's question. 

Guidelines:
1. Synthesize information from multiple papers when possible
2. Cite papers using [1], [2], etc. format corresponding to the paper numbers provided
3. Highlight key findings, methodologies, and conclusions
4. Mention limitations or conflicting findings if they exist
5. Keep the response informative but accessible
6. Always reference specific papers when making claims

Research Papers Context:
${paperContext}

User Question: ${query}`;

    const result = await generateText({
      model: google("gemini-1.5-flash-latest"),
      system: systemPrompt,
      prompt: `Please provide a comprehensive answer to: "${query}" based on the research papers provided. Make sure to cite relevant papers using the [1], [2], etc. format.`,
    });

    const response: CitationResponse = {
      papers: selectedPapers,
      totalResults: searchResults.total,
      query,
      generatedAnswer: result.text,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error in research API:", error);
    return Response.json(
      { error: "Failed to search research papers" },
      { status: 500 }
    );
  }
}
