import { ResearchPaper, PaperSearchParams } from "@/types/research";
import { semanticScholarRateLimiter } from "./rate-limiter";

const SEMANTIC_SCHOLAR_API_BASE = "https://api.semanticscholar.org/graph/v1";

// Search for research papers using Semantic Scholar API
export async function searchResearchPapers({
  query,
  limit = 10,
  offset = 0,
  year,
  fieldsOfStudy,
  venue,
  minCitationCount,
}: PaperSearchParams): Promise<{
  papers: ResearchPaper[];
  total: number;
  next?: number;
}> {
  try {
    // Apply rate limiting before making the API call
    await semanticScholarRateLimiter.waitIfNeeded();

    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      offset: offset.toString(),
      fields: [
        "paperId",
        "title",
        "abstract",
        "year",
        "authors",
        "venue",
        "citationCount",
        "url",
        "externalIds",
        "s2FieldsOfStudy",
      ].join(","),
    });

    // Add optional filters
    if (year) params.append("year", year);
    if (fieldsOfStudy) {
      fieldsOfStudy.forEach((field) => params.append("fieldsOfStudy", field));
    }
    if (venue) params.append("venue", venue);
    if (minCitationCount)
      params.append("minCitationCount", minCitationCount.toString());

    console.log(`🔍 Searching Semantic Scholar for: "${query}"`);
    const response = await fetch(
      `${SEMANTIC_SCHOLAR_API_BASE}/paper/search?${params}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("Rate limit exceeded, API returned 429");
        // The rate limiter should have prevented this, but handle it just in case
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      throw new Error(
        `Semantic Scholar API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    const papers: ResearchPaper[] = (data.data || []).map(
      (paper: {
        paperId: string;
        title: string;
        abstract: string;
        year: number;
        authors: { authorId: string; name: string }[];
        venue: string;
        citationCount: number;
        url: string;
        externalIds: { DOI: string };
        s2FieldsOfStudy: { category: string }[];
      }) => ({
        paperId: paper.paperId,
        title: paper.title,
        abstract: paper.abstract,
        year: paper.year,
        authors: (paper.authors || []).map(
          (author: { authorId: string; name: string }) => ({
            authorId: author.authorId,
            name: author.name,
          })
        ),
        venue: paper.venue,
        citationCount: paper.citationCount || 0,
        url: paper.url || generateSemanticScholarUrl(paper.paperId),
        doi: paper.externalIds?.DOI || null,
        s2FieldsOfStudy:
          paper.s2FieldsOfStudy?.map(
            (field: { category: string }) => field.category
          ) || null,
      })
    );

    return {
      papers,
      total: data.total || 0,
      next: data.next || undefined,
    };
  } catch (error) {
    console.error("Error searching research papers:", error);
    throw error;
  }
}

// Get detailed information about a specific paper
export async function getPaperDetails(
  paperId: string
): Promise<ResearchPaper | null> {
  try {
    // Apply rate limiting before making the API call
    await semanticScholarRateLimiter.waitIfNeeded();

    console.log(`📄 Fetching paper details for: ${paperId}`);
    const response = await fetch(
      `${SEMANTIC_SCHOLAR_API_BASE}/paper/${paperId}?fields=paperId,title,abstract,year,authors,venue,citationCount,url,externalIds,s2FieldsOfStudy`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 429) {
        console.warn("Rate limit exceeded, API returned 429");
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      throw new Error(
        `Semantic Scholar API error: ${response.status} ${response.statusText}`
      );
    }

    const paper = await response.json();

    return {
      paperId: paper.paperId,
      title: paper.title,
      abstract: paper.abstract,
      year: paper.year,
      authors: (paper.authors || []).map(
        (author: { authorId: string; name: string }) => ({
          authorId: author.authorId,
          name: author.name,
        })
      ),
      venue: paper.venue,
      citationCount: paper.citationCount || 0,
      url: paper.url || generateSemanticScholarUrl(paper.paperId),
      doi: paper.externalIds?.DOI || null,
      s2FieldsOfStudy:
        paper.s2FieldsOfStudy?.map(
          (field: { category: string }) => field.category
        ) || null,
    };
  } catch (error) {
    console.error("Error getting paper details:", error);
    return null;
  }
}

// Generate Semantic Scholar URL for a paper
function generateSemanticScholarUrl(paperId: string): string {
  return `https://www.semanticscholar.org/paper/${paperId}`;
}

// Format authors for citation
export function formatAuthors(
  authors: ResearchPaper["authors"],
  maxAuthors = 3
): string {
  if (!authors || authors.length === 0) return "Unknown Authors";

  if (authors.length <= maxAuthors) {
    return authors.map((author: { name: string }) => author.name).join(", ");
  }

  const firstAuthors = authors.slice(0, maxAuthors);
  return `${firstAuthors
    .map((author: { name: string }) => author.name)
    .join(", ")} et al.`;
}

// Generate APA citation format
export function generateAPACitation(paper: ResearchPaper): string {
  const authors = formatAuthors(paper.authors);
  const year = paper.year ? `(${paper.year})` : "(n.d.)";
  const title = paper.title;
  const venue = paper.venue ? `*${paper.venue}*` : "";
  const doi = paper.doi ? `https://doi.org/${paper.doi}` : paper.url;

  let citation = `${authors} ${year}. ${title}.`;
  if (venue) citation += ` ${venue}.`;
  if (doi) citation += ` ${doi}`;

  return citation;
}

// Rank papers by relevance and quality metrics
export function rankPapersByRelevance(
  papers: ResearchPaper[],
  query: string
): ResearchPaper[] {
  const queryTerms = query.toLowerCase().split(/\s+/);

  return papers
    .map((paper: ResearchPaper) => {
      let relevanceScore = 0;
      const titleLower = paper.title.toLowerCase();
      const abstractLower = (paper.abstract || "").toLowerCase();

      // Title relevance (higher weight)
      queryTerms.forEach((term: string) => {
        if (titleLower.includes(term)) relevanceScore += 3;
        if (abstractLower.includes(term)) relevanceScore += 1;
      });

      // Citation count boost (logarithmic)
      relevanceScore += Math.log(paper.citationCount + 1) * 0.5;

      // Recent papers get slight boost
      if (paper.year && paper.year >= 2020) relevanceScore += 1;
      if (paper.year && paper.year >= 2022) relevanceScore += 0.5;

      return { ...paper, relevanceScore };
    })
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

// Batch fetch multiple paper details with rate limiting
export async function batchGetPaperDetails(
  paperIds: string[]
): Promise<(ResearchPaper | null)[]> {
  const results: (ResearchPaper | null)[] = [];

  console.log(`📚 Batch fetching ${paperIds.length} paper details...`);

  for (const paperId of paperIds) {
    try {
      const paper = await getPaperDetails(paperId);
      results.push(paper);
    } catch (error) {
      console.error(`Error fetching paper ${paperId}:`, error);
      results.push(null);
    }
  }

  return results;
}

// Extract key information from papers for AI context
export function extractPaperContext(papers: ResearchPaper[]): string {
  return papers
    .map((paper, index) => {
      const authors = formatAuthors(paper.authors, 2);
      const year = paper.year || "n.d.";
      const abstract = paper.abstract
        ? paper.abstract.substring(0, 300) +
          (paper.abstract.length > 300 ? "..." : "")
        : "No abstract available.";

      return `[${index + 1}] ${paper.title} (${authors}, ${year})
Citation count: ${paper.citationCount}
Abstract: ${abstract}
URL: ${paper.url || "N/A"}`;
    })
    .join("\n\n");
}
