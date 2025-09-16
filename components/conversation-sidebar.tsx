/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  MessageSquareIcon,
  SearchIcon,
  PlusIcon,
  MenuIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationSidebarProps {
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  selectedConversationId?: string;
  className?: string;
}

export function ConversationSidebar({
  onConversationSelect,
  onNewConversation,
  selectedConversationId,
  className = "",
}: ConversationSidebarProps) {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    {
      conversationId: string;
      matches: { content: string; timestamp: string }[];
    }[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch conversation history
  const fetchConversations = async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Search conversations with semantic search
  const searchConversations = async (query: string) => {
    if (!session?.user || !query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch("/api/conversations/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, topK: 20 }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error("Error searching conversations:", error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [session?.user]);

  // Debounce search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchConversations(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, session?.user]);

  // Filter conversations based on search query (fallback for non-semantic search)
  const filteredConversations = conversations.filter((conv: Conversation) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Display search results or regular conversations
  const displayConversations =
    searchQuery.trim() && searchResults.length > 0
      ? searchResults.map(
          (result: {
            conversationId: string;
            matches: { content: string; timestamp: string }[];
          }) => ({
            id: result.conversationId,
            title:
              `Search Result: ${result.matches[0]?.content?.slice(0, 50)}...` ||
              "Untitled",
            model: "Search Result",
            createdAt: result.matches[0]?.timestamp || new Date().toISOString(),
            updatedAt: result.matches[0]?.timestamp || new Date().toISOString(),
          })
        )
      : filteredConversations;

  // Group conversations by date
  const groupConversationsByDate = (conversations: Conversation[]) => {
    const groups: { [key: string]: Conversation[] } = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    conversations.forEach((conv: Conversation) => {
      const convDate = new Date(conv.updatedAt);
      let group = "";

      if (convDate.toDateString() === today.toDateString()) {
        group = "Today";
      } else if (convDate.toDateString() === yesterday.toDateString()) {
        group = "Yesterday";
      } else if (convDate > weekAgo) {
        group = "This Week";
      } else {
        group = "Older";
      }

      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(conv);
    });

    return groups;
  };

  const conversationGroups = groupConversationsByDate(displayConversations);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-secondary/20 border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Conversations</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="lg:hidden"
          >
            <XIcon size={16} />
          </Button>
        </div>
        <Button
          onClick={onNewConversation}
          className="w-full justify-start"
          size="sm"
        >
          <PlusIcon size={16} className="mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <SearchIcon
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading conversations...
            </div>
          ) : Object.keys(conversationGroups).length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery
                ? searching
                  ? "Searching conversations..."
                  : searchResults.length === 0 && searchQuery.trim()
                  ? "No conversations found for your search"
                  : "No conversations found"
                : "No conversations yet. Start a new one!"}
            </div>
          ) : (
            Object.entries(conversationGroups).map(([group, convs]) => (
              <Collapsible key={group} defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                  {group}
                  <div className="text-xs bg-muted px-2 py-1 rounded-full">
                    {convs.length}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {convs.map((conversation: Conversation) => (
                    <Button
                      key={conversation.id}
                      variant={
                        selectedConversationId === conversation.id
                          ? "secondary"
                          : "ghost"
                      }
                      className="w-full justify-start p-2 h-auto text-left"
                      onClick={() => {
                        onConversationSelect(conversation.id);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start space-x-2 min-w-0 w-full">
                        <MessageSquareIcon
                          size={16}
                          className="mt-1 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">
                            {conversation.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {conversation.model.split("/").pop()}
                          </p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50"
      >
        <MenuIcon size={16} />
      </Button>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:block lg:w-80 ${className}`}>
        <SidebarContent />
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-0 top-0 h-full w-80 bg-background shadow-lg">
            <SidebarContent />
          </div>
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}
