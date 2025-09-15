"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo, useMemo } from "react";
import { Streamdown } from "streamdown";
import { ResearchPaper } from "@/types/research";
import { ExternalLinkIcon } from "lucide-react";

type ResponseWithCitationsProps = ComponentProps<typeof Streamdown> & {
  children: string;
  papers?: ResearchPaper[];
};

export const ResponseWithCitations = memo(
  ({
    className,
    children,
    papers = [],
    ...props
  }: ResponseWithCitationsProps) => {
    const processedContent = useMemo(() => {
      if (!papers.length || !children) {
        return children;
      }

      // Process the text to convert citations like [1], [2] into clickable links
      return children.replace(/\[(\d+)\]/g, (match, num) => {
        const paperIndex = parseInt(num) - 1;
        const paper = papers[paperIndex];

        if (paper) {
          const url =
            paper.url ||
            `https://www.semanticscholar.org/paper/${paper.paperId}`;
          const title =
            paper.title.length > 50
              ? `${paper.title.substring(0, 50)}...`
              : paper.title;

          return `[[${num}]](${url} "${title}")`;
        }

        return match;
      });
    }, [children, papers]);

    return (
      <div className="relative">
        <Streamdown
          className={cn(
            "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
            // Style citation links
            "[&_a[title]:not([href*='#']):not([href*='http']):not([href*='/']):has(text[content^='['])]:inline-flex [&_a[title]:not([href*='#']):not([href*='http']):not([href*='/']):has(text[content^='['])]:items-center [&_a[title]:not([href*='#']):not([href*='http']):not([href*='/']):has(text[content^='['])]:gap-1",
            "[&_a[title]]:text-blue-600 [&_a[title]]:hover:text-blue-800 [&_a[title]]:underline [&_a[title]]:decoration-dotted [&_a[title]]:underline-offset-2",
            "[&_a[title]]:hover:bg-blue-50 [&_a[title]]:rounded [&_a[title]]:px-1 [&_a[title]]:py-0.5 [&_a[title]]:transition-colors",
            "dark:[&_a[title]]:text-blue-400 dark:[&_a[title]]:hover:text-blue-300 dark:[&_a[title]]:hover:bg-blue-950/50",
            className
          )}
          components={{
            // Custom renderer for links to add external link icon for paper citations
            a: ({ href, title, children: linkChildren, ...linkProps }) => {
              const isPaperCitation =
                title &&
                href &&
                (href.includes("semanticscholar.org") ||
                  href.includes("doi.org") ||
                  (typeof linkChildren === "string" &&
                    /^\[\d+\]$/.test(linkChildren)));

              if (isPaperCitation) {
                return (
                  <a
                    href={href}
                    title={title}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/50 rounded px-1 py-0.5 transition-colors"
                    {...linkProps}
                  >
                    <span>{linkChildren}</span>
                    <ExternalLinkIcon className="h-3 w-3 opacity-70" />
                  </a>
                );
              }

              return (
                <a href={href} title={title} {...linkProps}>
                  {linkChildren}
                </a>
              );
            },
          }}
          {...props}
        >
          {processedContent}
        </Streamdown>
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.papers === nextProps.papers
);

ResponseWithCitations.displayName = "ResponseWithCitations";
