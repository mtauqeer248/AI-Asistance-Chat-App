/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { ChatInterface } from "@/components/ChatInterface";
import { ContentCards } from "@/components/ContentCards";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { useEffect, useState } from "react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [tempConversation, setTempConversation] = useState<{
    id: string;
    messages: Message[];
  } | null>(null);

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );
  const messages =
    tempConversation && tempConversation.id === currentConversationId
      ? tempConversation.messages
      : currentConversation?.messages || [];

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const addMessage = (
    message: Omit<Message, "id" | "timestamp">,
    targetConversationId?: string
  ) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    let conversationIdToUse = targetConversationId || currentConversationId;

    if (!conversationIdToUse) {
      const newConversationId = crypto.randomUUID();
      conversationIdToUse = newConversationId;
      setCurrentConversationId(newConversationId);

      if (message.role === "user") {
        setTempConversation({
          id: newConversationId,
          messages: [newMessage],
        });
      } else {
        const newConversation: Conversation = {
          id: newConversationId,
          title: "New Conversation",
          messages: [newMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setConversations((prev) => [newConversation, ...prev]);
      }

      return { messageId: newMessage.id, conversationId: conversationIdToUse };
    }

    if (tempConversation && conversationIdToUse === tempConversation.id) {
      const updatedMessages = [...tempConversation.messages, newMessage];

      if (message.role === "assistant") {
        // Find the first user message to generate title from
        const firstUserMessage = updatedMessages.find(m => m.role === "user");
        const titleContent = firstUserMessage ? firstUserMessage.content : "New Conversation";
        
        const newConversation: Conversation = {
          id: tempConversation.id,
          title: generateConversationTitle(titleContent),
          messages: updatedMessages,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setConversations((prev) => [newConversation, ...prev]);
        setTempConversation(null);
      } else {
        setTempConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: updatedMessages,
              }
            : null
        );
      }

      return { messageId: newMessage.id, conversationId: conversationIdToUse };
    }

    // Add to existing conversation
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationIdToUse
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              updatedAt: new Date(),
            }
          : conv
      )
    );

    // Update title for existing conversations if it's still the default
    if (message.role === "assistant") {
      const conversation = conversations.find(c => c.id === conversationIdToUse);
      if (conversation && conversation.title === "New Conversation") {
        const firstUserMessage = conversation.messages.find(m => m.role === "user");
        if (firstUserMessage) {
          updateConversationTitle(conversationIdToUse, firstUserMessage.content);
        }
      }
    }

    return { messageId: newMessage.id, conversationId: conversationIdToUse };
  };

  const updateConversationTitle = (
    conversationId: string,
    userMessage: string
  ) => {
    setTimeout(() => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId && conv.title === "New Conversation"
            ? { ...conv, title: generateConversationTitle(userMessage) }
            : conv
        )
      );
    }, 100); // Reduced timeout for faster title update
  };

  const createNewConversation = (initialMessages: Message[] = []) => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: "New Conversation",
      messages: initialMessages,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    setTempConversation(null);
  };

  const generateConversationTitle = (content: string): string => {
    const cleanContent = content.replace(/[\r\n\t]/g, " ").trim();
    if (!cleanContent) return "New Conversation";

    const words = cleanContent.split(" ").filter((word) => word.length > 0);
    let title = words.slice(0, 6).join(" ");

    if (title.length > 40) {
      title = cleanContent.substring(0, 40);
    }

    return title.length < cleanContent.length ? title + "..." : title;
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) => {
      const newConversations = prev.filter((c) => c.id !== conversationId);

      if (currentConversationId === conversationId) {
        setCurrentConversationId(
          newConversations.length > 0 ? newConversations[0].id : null
        );
        setTempConversation(null);
      }

      return newConversations;
    });
  };

  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setTempConversation(null);
  };

  const createCard = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message || message.role !== "assistant") return;

    const existingCard = cards.find((card) => card.content === message.content);
    if (existingCard) return;

    const newCard: ContentCard = {
      id: crypto.randomUUID(),
      content: message.content,
      title:
        message.content.substring(0, 50) +
        (message.content.length > 50 ? "..." : ""),
      createdAt: new Date(),
    };

    setCards((prev) => [newCard, ...prev]);
  };

  const deleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((card) => card.id !== cardId));
  };

  const reorderCards = (newCards: ContentCard[]) => {
    setCards(newCards);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background text-foreground flex">
        <ConversationSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onSelectConversation={selectConversation}
          onNewConversation={() => createNewConversation()}
          onDeleteConversation={deleteConversation}
        />

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
                  onUpdateTitle={updateConversationTitle}
                  conversationTitle={
                    currentConversation?.title ||
                    (tempConversation ? "New Conversation" : "New Conversation")
                  }
                  hasActiveConversation={!!currentConversationId}
                  disabled={!currentConversationId}
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
    </DndProvider>
  );
}