"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { CollapsibleContent } from "@/components/ui/collapsible";
import { ResponseWithCitations } from "./response-with-citations";
import { ResearchPaper } from "@/types/research";

export type ReasoningContentWithCitationsProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string;
  papers?: ResearchPaper[];
};

export const ReasoningContentWithCitations = memo(
  ({
    className,
    children,
    papers = [],
    ...props
  }: ReasoningContentWithCitationsProps) => (
    <CollapsibleContent
      className={cn(
        "mt-4 text-sm",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        className
      )}
      {...props}
    >
      <ResponseWithCitations className="grid gap-2" papers={papers}>
        {children}
      </ResponseWithCitations>
    </CollapsibleContent>
  )
);

ReasoningContentWithCitations.displayName = "ReasoningContentWithCitations";
