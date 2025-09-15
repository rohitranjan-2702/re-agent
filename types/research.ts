export interface ResearchPaper {
  paperId: string;
  title: string;
  abstract: string | null;
  year: number | null;
  authors: Author[];
  venue: string | null;
  citationCount: number;
  url: string | null;
  doi: string | null;
  s2FieldsOfStudy: string[] | null;
  relevanceScore?: number;
}

export interface Author {
  authorId: string | null;
  name: string;
}

export interface CitationRequest {
  query: string;
  numPapers: number;
  fields?: string[];
}

export interface CitationResponse {
  papers: ResearchPaper[];
  totalResults: number;
  query: string;
  generatedAnswer: string;
}

export interface PaperSearchParams {
  query: string;
  limit?: number;
  offset?: number;
  year?: string;
  fieldsOfStudy?: string[];
  venue?: string;
  minCitationCount?: number;
}
