// Simple in-memory database for development
// In production, this would be replaced with a real database like PostgreSQL

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  isUser: boolean;
  type: 'chat' | 'research';
  researchData?: any;
  createdAt: Date;
}

// In-memory storage
const users: Map<string, User> = new Map();
const conversations: Map<string, Conversation> = new Map();
const messages: Map<string, Message[]> = new Map();

export const db = {
  users,
  conversations,
  messages
};

// Helper functions
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const findUserByEmail = (email: string): User | undefined => {
  return Array.from(users.values()).find(user => user.email === email);
};

export const findUserById = (id: string): User | undefined => {
  return users.get(id);
};

export const createUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
  const id = generateId();
  const now = new Date();
  const user: User = {
    ...userData,
    id,
    createdAt: now,
    updatedAt: now
  };
  users.set(id, user);
  return user;
};

export const updateUser = (id: string, updates: Partial<User>): User | null => {
  const user = users.get(id);
  if (!user) return null;
  
  const updatedUser: User = {
    ...user,
    ...updates,
    updatedAt: new Date()
  };
  users.set(id, updatedUser);
  return updatedUser;
};

export const createConversation = (conversationData: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Conversation => {
  const id = generateId();
  const now = new Date();
  const conversation: Conversation = {
    ...conversationData,
    id,
    createdAt: now,
    updatedAt: now
  };
  conversations.set(id, conversation);
  return conversation;
};

export const findConversationsByUserId = (userId: string): Conversation[] => {
  return Array.from(conversations.values()).filter(conv => conv.userId === userId);
};

export const findConversationById = (id: string): Conversation | undefined => {
  return conversations.get(id);
};

export const updateConversation = (id: string, updates: Partial<Conversation>): Conversation | null => {
  const conversation = conversations.get(id);
  if (!conversation) return null;
  
  const updatedConversation: Conversation = {
    ...conversation,
    ...updates,
    updatedAt: new Date()
  };
  conversations.set(id, updatedConversation);
  return updatedConversation;
};

export const deleteConversation = (id: string): boolean => {
  return conversations.delete(id);
};

export const addMessage = (messageData: Omit<Message, 'id' | 'createdAt'>): Message => {
  const id = generateId();
  const now = new Date();
  const message: Message = {
    ...messageData,
    id,
    createdAt: now
  };
  
  const conversationMessages = messages.get(messageData.conversationId) || [];
  conversationMessages.push(message);
  messages.set(messageData.conversationId, conversationMessages);
  
  return message;
};

export const findMessagesByConversationId = (conversationId: string): Message[] => {
  return messages.get(conversationId) || [];
};

