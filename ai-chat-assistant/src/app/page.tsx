/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ChatInterface } from "@/components/ChatInterface";
import { ContentCards } from "@/components/ContentCards";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { useEffect, useState } from "react";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export interface ContentCard {
  id: string;
  content: string;
  title: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [cards, setCards] = useState<ContentCard[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Get current conversation
  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );
  const messages = currentConversation?.messages || [];

  // Load data from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem(
      "ai-assistant-conversations"
    );
    const savedCurrentId = localStorage.getItem(
      "ai-assistant-current-conversation"
    );
    const savedCards = localStorage.getItem("ai-assistant-cards");
    const savedSidebar = localStorage.getItem("ai-assistant-sidebar");

    if (savedConversations) {
      const parsedConversations = JSON.parse(savedConversations).map(
        (conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        })
      );
      setConversations(parsedConversations);

      if (
        savedCurrentId &&
        parsedConversations.some((c: Conversation) => c.id === savedCurrentId)
      ) {
        setCurrentConversationId(savedCurrentId);
      } else if (parsedConversations.length > 0) {
        setCurrentConversationId(parsedConversations[0].id);
      }
    }

    if (savedCards) {
      const parsedCards = JSON.parse(savedCards).map((card: any) => ({
        ...card,
        createdAt: new Date(card.createdAt),
      }));
      setCards(parsedCards);
    }

    if (savedSidebar === "false") {
      setSidebarOpen(false);
    }
  }, []);

  // Persist conversations to localStorage
  useEffect(() => {
    localStorage.setItem(
      "ai-assistant-conversations",
      JSON.stringify(conversations)
    );
  }, [conversations]);

  // Persist current conversation ID
  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem(
        "ai-assistant-current-conversation",
        currentConversationId
      );
    }
  }, [currentConversationId]);

  // Persist cards to localStorage
  useEffect(() => {
    localStorage.setItem("ai-assistant-cards", JSON.stringify(cards));
  }, [cards]);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("ai-assistant-sidebar", sidebarOpen.toString());
  }, [sidebarOpen]);

 const addMessage = (message: Omit<Message, "id" | "timestamp">) => {
  const newMessage: Message = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: new Date(),
  };

  if (!currentConversationId) {
    // Create new conversation but DON'T add message yet
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: "New Conversation", // Temporary title
      messages: [], // Start with empty messages
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    
    // Now add the message to the new conversation
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === newConversation.id
          ? {
              ...conv,
              messages: [newMessage], // Add first message
              title: generateConversationTitle(newMessage.content),
            }
          : conv
      )
    );
  } else {
    // Add to existing conversation
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              updatedAt: new Date(),
            }
          : conv
      )
    );
  }
};
  const createNewConversation = (initialMessages: Message[] = []) => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title:
        initialMessages.length > 0
          ? generateConversationTitle(initialMessages[0].content)
          : "New Conversation",
      messages: initialMessages,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
  };

  const generateConversationTitle = (content: string): string => {
  // Use first 6 words or 30 characters
  const cleanContent = content.replace(/[\r\n]/g, ' ');
  return cleanContent.length > 30 
    ? cleanContent.substring(0, 30) + "..." 
    : cleanContent;
};

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));

    if (currentConversationId === conversationId) {
      const remaining = conversations.filter((c) => c.id !== conversationId);
      setCurrentConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const createCard = (messageId: string) => {
    // Find the message in the current conversation
    const message = messages.find((m) => m.id === messageId);
    if (!message || message.role !== "assistant") return;

    // Check if card already exists for this message
    const existingCard = cards.find((card) => card.content === message.content);
    if (existingCard) return; // Don't create duplicate cards

    const newCard: ContentCard = {
      id: crypto.randomUUID(),
      content: message.content,
      title:
        message.content.substring(0, 50) +
        (message.content.length > 50 ? "..." : ""),
      createdAt: new Date(),
    };

    setCards((prev) => [newCard, ...prev]); // Add to beginning for most recent first
  };

  const deleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((card) => card.id !== cardId));
  };

  const reorderCards = (newCards: ContentCard[]) => {
    setCards(newCards);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectConversation={selectConversation}
        onNewConversation={() => createNewConversation()}
        onDeleteConversation={deleteConversation}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">
              AI Content Assistant
            </h1>
          </div>
        </header>

        <main className="flex-1 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            <div className="flex flex-col">
              <ChatInterface
                messages={messages}
                onAddMessage={addMessage}
                onCreateCard={createCard}
                conversationTitle={
                  currentConversation?.title || "New Conversation"
                }
                hasActiveConversation={!!currentConversationId}
              />
            </div>

            <div className="h-[calc(110vh-200px)] flex flex-col">
              <ContentCards
                cards={cards}
                onDeleteCard={deleteCard}
                onReorderCards={reorderCards}
                onCreateCardFromDrop={createCard}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}