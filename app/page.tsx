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
import { CopyIcon, GlobeIcon } from "lucide-react";
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
import { Loader } from "@/components/ai-elements/loader";
import { AuthButton } from "@/components/auth-button";
import { ConversationSidebar } from "@/components/conversation-sidebar";
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
  };

  // Initialize with a new conversation ID on first load
  useEffect(() => {
    if (!currentConversationId) {
      setCurrentConversationId(nanoid());
    }
  }, [currentConversationId]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: {
          model: model,
          conversationId: currentConversationId,
        },
      }
    );
    setInput("");
  };

  // Show loading while checking authentication
  if (sessionStatus === "loading") {
    return (
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col">
          {/* Header with Authentication */}
          <div className="flex justify-between items-center p-6 border-b">
            <h1 className="text-2xl font-semibold">AI Chatbot</h1>
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
            <h1 className="text-2xl font-semibold">AI Chatbot</h1>
            <AuthButton />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md flex flex-col items-center">
              <h2 className="text-xl font-medium">Welcome to AI Chatbot</h2>
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
          <h1 className="text-2xl font-semibold">AI Chatbot</h1>
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
                                <Response>{part.text}</Response>
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
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              ))}
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
              />
            </PromptInputBody>
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputModelSelect
                  onValueChange={(value) => {
                    setModel(value);
                  }}
                  value={model}
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
              </PromptInputTools>
              <PromptInputSubmit disabled={!input && !status} status={status} />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default ChatBotDemo;
