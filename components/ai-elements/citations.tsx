import React from "react";
import { ResearchPaper } from "@/types/research";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLinkIcon,
  ChevronDownIcon,
  BookOpenIcon,
  CalendarIcon,
  UsersIcon,
  QuoteIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAuthors, generateAPACitation } from "@/lib/research-papers";

interface CitationsProps {
  papers: ResearchPaper[];
  className?: string;
}

interface CitationProps {
  paper: ResearchPaper;
  index: number;
  className?: string;
}

export function Citations({ papers, className }: CitationsProps) {
  if (!papers || papers.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <BookOpenIcon className="h-4 w-4" />
        <span>Research Citations ({papers.length})</span>
      </div>
      {papers.map((paper, index) => (
        <Citation key={paper.paperId} paper={paper} index={index} />
      ))}
    </div>
  );
}

export function Citation({ paper, index, className }: CitationProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("border rounded-lg bg-card", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto text-left hover:bg-muted/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5 shrink-0">
                  [{index + 1}]
                </Badge>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium leading-tight mb-1 text-sm">
                    {paper.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UsersIcon className="h-3 w-3" />
                      {formatAuthors(paper.authors, 2)}
                    </span>
                    {paper.year && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {paper.year}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <QuoteIcon className="h-3 w-3" />
                      {paper.citationCount} citations
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-3 pt-2 border-t">
            {/* Abstract */}
            {paper.abstract && (
              <div>
                <h5 className="text-sm font-medium mb-1">Abstract</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {paper.abstract}
                </p>
              </div>
            )}

            {/* Additional metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {paper.venue && (
                <div>
                  <span className="font-medium">Venue: </span>
                  <span className="text-muted-foreground">{paper.venue}</span>
                </div>
              )}

              {paper.s2FieldsOfStudy && paper.s2FieldsOfStudy.length > 0 && (
                <div>
                  <span className="font-medium">Fields: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {paper.s2FieldsOfStudy.slice(0, 3).map((field) => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* APA Citation */}
            <div>
              <h5 className="text-sm font-medium mb-1">APA Citation</h5>
              <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded border">
                {generateAPACitation(paper)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {paper.url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(paper.url!, "_blank")}
                  className="flex items-center gap-1"
                >
                  <ExternalLinkIcon className="h-3 w-3" />
                  View Paper
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const citation = generateAPACitation(paper);
                  navigator.clipboard.writeText(citation);
                }}
                className="flex items-center gap-1"
              >
                Copy Citation
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Summary component for showing citation overview
export function CitationSummary({ papers }: { papers: ResearchPaper[] }) {
  if (!papers || papers.length === 0) return null;

  const totalCitations = papers.reduce(
    (sum, paper) => sum + paper.citationCount,
    0
  );
  const yearRange = papers.reduce((range, paper) => {
    if (!paper.year) return range;
    return {
      min: Math.min(range.min || paper.year, paper.year),
      max: Math.max(range.max || paper.year, paper.year),
    };
  }, {} as { min?: number; max?: number });

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-1">
        <BookOpenIcon className="h-4 w-4" />
        <span>{papers.length} papers</span>
      </div>
      <div className="flex items-center gap-1">
        <QuoteIcon className="h-4 w-4" />
        <span>{totalCitations.toLocaleString()} total citations</span>
      </div>
      {yearRange.min && yearRange.max && (
        <div className="flex items-center gap-1">
          <CalendarIcon className="h-4 w-4" />
          <span>
            {yearRange.min === yearRange.max
              ? yearRange.min
              : `${yearRange.min}-${yearRange.max}`}
          </span>
        </div>
      )}
    </div>
  );
}
