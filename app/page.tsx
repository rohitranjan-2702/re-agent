"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Actions, Action } from "@/components/ai-elements/actions";
import { Fragment, useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { useSession } from "next-auth/react";
import { Response } from "@/components/ai-elements/response";
import { ResponseWithCitations } from "@/components/ai-elements/response-with-citations";
import {
  CopyIcon,
  GlobeIcon,
  BookOpenIcon,
  FlaskConicalIcon,
} from "lucide-react";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { ReasoningContentWithCitations } from "@/components/ai-elements/reasoning-with-citations";
import { Citations, CitationSummary } from "@/components/ai-elements/citations";
import { Loader } from "@/components/ai-elements/loader";
import { AuthButton } from "@/components/auth-button";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { Button } from "@/components/ui/button";
import { ResearchPaper } from "@/types/research";
import { nanoid } from "nanoid";

const models = [
  {
    name: "Gemini 1.5 Flash",
    value: "gemini-1.5-flash-latest",
  },
  {
    name: "Gemini 1.5 Pro",
    value: "gemini-1.5-pro-latest",
  },
];

const ChatBotDemo = () => {
  const { data: session, status: sessionStatus } = useSession();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [currentConversationId, setCurrentConversationId] = useState<string>();
  const [enableResearch, setEnableResearch] = useState<boolean>(false);
  const [numPapers, setNumPapers] = useState<number>(5);
  const [researchPapers, setResearchPapers] = useState<ResearchPaper[]>([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState<boolean>(false);
  const { messages, sendMessage, status, setMessages } = useChat();

  console.log(session);

  // Load a conversation when selected from sidebar
  const handleConversationSelect = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        const conversation = data.conversation;

        if (conversation && conversation.messages) {
          // Convert stored messages to UI format
          const uiMessages = conversation.messages.map(
            (msg: any, index: number) => ({
              id: `${conversationId}-${index}`,
              role: msg.role,
              parts: [{ type: "text", text: msg.content }],
            })
          );

          setMessages(uiMessages);
          setCurrentConversationId(conversationId);
          setModel(conversation.model);
        }
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  // Start a new conversation
  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(nanoid());
    setInput("");
    setResearchPapers([]);
    setIsLoadingResearch(false);
  };

  // Initialize with a new conversation ID on first load
  useEffect(() => {
    if (!currentConversationId) {
      setCurrentConversationId(nanoid());
    }
  }, [currentConversationId]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    // Clear input immediately to provide instant feedback
    setInput("");

    // Clear previous research papers and set loading state
    setResearchPapers([]);
    setIsLoadingResearch(false);

    // Send the message to the chat immediately
    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: {
          model: model,
          conversationId: currentConversationId,
          enableResearch,
          numPapers,
        },
      }
    );

    // If research mode is enabled and we have text, fetch research papers
    if (enableResearch && message.text) {
      setIsLoadingResearch(true);
      try {
        const researchResponse = await fetch("/api/research", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: message.text,
            numPapers,
          }),
        });

        if (researchResponse.ok) {
          const researchData = await researchResponse.json();
          setResearchPapers(researchData.papers || []);
        } else if (researchResponse.status === 429) {
          // Handle rate limiting
          console.warn("Research service rate limited");
          // Could add a toast notification here
        } else {
          console.error("Research API error:", researchResponse.status);
        }
      } catch (error) {
        console.error("Error fetching research papers:", error);
        // Could add user-facing error notification here
      } finally {
        setIsLoadingResearch(false);
      }
    }
  };

  // Show loading while checking authentication
  if (sessionStatus === "loading") {
    return (
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col">
          {/* Header with Authentication */}
          <div className="flex justify-between items-center p-6 border-b">
            <h1 className="text-2xl font-semibold">Re Agent</h1>
            <AuthButton />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader />
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!session) {
    return (
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col">
          {/* Header with Authentication */}
          <div className="flex justify-between items-center p-6 border-b">
            <h1 className="text-2xl font-semibold">Re Agent</h1>
            <AuthButton />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md flex flex-col items-center">
              <h2 className="text-xl font-medium">Welcome to Re Agent</h2>
              <p className="text-muted-foreground">
                Please sign in to start chatting with our AI assistant. You'll
                have access to advanced AI models, web search capabilities, and
                conversation history.
              </p>
              <AuthButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <ConversationSidebar
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
        selectedConversationId={currentConversationId}
        className="flex-shrink-0"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Authentication */}
        <div className="flex justify-between items-center p-6 border-b">
          <h1 className="text-2xl font-semibold">Re Agent</h1>
          <AuthButton />
        </div>

        <div className="flex-1 flex flex-col p-6">
          <Conversation className="h-full">
            <ConversationContent>
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === "assistant" &&
                    message.parts.filter((part) => part.type === "source-url")
                      .length > 0 && (
                      <Sources>
                        <SourcesTrigger
                          count={
                            message.parts.filter(
                              (part) => part.type === "source-url"
                            ).length
                          }
                        />
                        {message.parts
                          .filter((part) => part.type === "source-url")
                          .map((part, i) => (
                            <SourcesContent key={`${message.id}-${i}`}>
                              <Source
                                key={`${message.id}-${i}`}
                                href={part.url}
                                title={part.url}
                              />
                            </SourcesContent>
                          ))}
                      </Sources>
                    )}
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <Fragment key={`${message.id}-${i}`}>
                            <Message from={message.role}>
                              <MessageContent>
                                {message.role === "assistant" ? (
                                  <ResponseWithCitations
                                    papers={researchPapers}
                                  >
                                    {part.text}
                                  </ResponseWithCitations>
                                ) : (
                                  <Response>{part.text}</Response>
                                )}
                              </MessageContent>
                            </Message>
                            {message.role === "assistant" &&
                              i === messages.length - 1 && (
                                <Actions className="mt-2">
                                  {/* <Action
                                    // onClick={() => regenerate()}
                                    label="Retry"
                                  >
                                    <RefreshCcwIcon className="size-3" />
                                  </Action> */}
                                  <Action
                                    onClick={() =>
                                      navigator.clipboard.writeText(part.text)
                                    }
                                    label="Copy"
                                    className="cursor-pointer"
                                  >
                                    <CopyIcon className="size-3" />
                                  </Action>
                                </Actions>
                              )}
                          </Fragment>
                        );
                      case "reasoning":
                        return (
                          <Reasoning
                            key={`${message.id}-${i}`}
                            className="w-full"
                            isStreaming={
                              status === "streaming" &&
                              i === message.parts.length - 1 &&
                              message.id === messages.at(-1)?.id
                            }
                          >
                            <ReasoningTrigger />
                            <ReasoningContentWithCitations
                              papers={researchPapers}
                            >
                              {part.text}
                            </ReasoningContentWithCitations>
                          </Reasoning>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              ))}

              {/* Display Research Citations */}
              {(isLoadingResearch || researchPapers.length > 0) && (
                <div className="mt-6 space-y-4">
                  {isLoadingResearch ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border">
                      <Loader />
                      <span>Searching research papers...</span>
                    </div>
                  ) : (
                    <>
                      <CitationSummary papers={researchPapers} />
                      <Citations papers={researchPapers} />
                    </>
                  )}
                </div>
              )}

              {status === "submitted" && <Loader />}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <PromptInput
            onSubmit={handleSubmit}
            className="mt-4"
            globalDrop
            multiple
          >
            <PromptInputBody>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
                disabled={status === "streaming" || status === "submitted"}
                placeholder={
                  status === "streaming" || status === "submitted"
                    ? "Processing your message..."
                    : enableResearch
                    ? "Ask a question to get research-backed answers..."
                    : "Type your message..."
                }
              />
            </PromptInputBody>
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputModelSelect
                  onValueChange={(value) => {
                    setModel(value);
                  }}
                  value={model}
                  disabled={status === "streaming" || status === "submitted"}
                >
                  <PromptInputModelSelectTrigger>
                    <PromptInputModelSelectValue />
                  </PromptInputModelSelectTrigger>
                  <PromptInputModelSelectContent>
                    {models.map((model) => (
                      <PromptInputModelSelectItem
                        key={model.value}
                        value={model.value}
                      >
                        {model.name}
                      </PromptInputModelSelectItem>
                    ))}
                  </PromptInputModelSelectContent>
                </PromptInputModelSelect>

                {/* Research Mode Toggle */}
                <Button
                  variant={enableResearch ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEnableResearch(!enableResearch)}
                  disabled={status === "streaming" || status === "submitted"}
                  className="flex items-center gap-1"
                >
                  <FlaskConicalIcon className="h-3 w-3" />
                  Research
                </Button>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={
                  !input || status === "streaming" || status === "submitted"
                }
                status={status}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default ChatBotDemo;
