// ============================================================================
// CHURNGUARD API SERVICE
// ============================================================================
// Handles all communication with the backend Lambda functions
// Includes proper error handling, retries, and logging

import { 
  ChatMessage, 
  RetentionOffer, 
  CancellationReason, 
  ConversationOutcome,
  Conversation 
} from '@/types/types';
import { logger } from '@/utils/logger';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_TIMEOUT = 30000; // 30 seconds

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface StartConversationRequest {
  userId: string;
  subscriptionId: string;
  reason: CancellationReason;
  reasonText: string;
}

interface SendMessageRequest {
  conversationId: string;
  message: string;
  userId: string;
}

interface OfferActionRequest {
  conversationId: string;
  offerId: string;
  action: 'accept' | 'reject';
  userId: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Generic fetch wrapper with error handling and timeout
   */
  private async fetchWithTimeout<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.error('API request timeout', { endpoint, timeout: API_TIMEOUT });
          return {
            success: false,
            error: 'Request timeout. Please try again.',
          };
        }
        
        logger.error('API request failed', { 
          endpoint, 
          error: error.message,
          stack: error.stack 
        });
        
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  /**
   * Initiate a chat conversation (alias for startConversation)
   */
  async initiateChat(request: StartConversationRequest): Promise<ApiResponse<Conversation>> {
    return this.startConversation(request);
  }

  /**
   * Start a new conversation with cancellation reason
   */
  async startConversation(request: StartConversationRequest): Promise<ApiResponse<Conversation>> {
    logger.api('Starting conversation', request);
    
    return this.fetchWithTimeout<Conversation>('/conversations/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Send a message in an existing conversation
   */
  async sendMessage(request: SendMessageRequest): Promise<ApiResponse<{ message: ChatMessage; offer?: RetentionOffer }>> {
    logger.api('Sending message', { 
      conversationId: request.conversationId,
      messageLength: request.message.length 
    });
    
    return this.fetchWithTimeout('/conversations/message', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Accept or reject a retention offer
   */
  async handleOfferAction(request: OfferActionRequest): Promise<ApiResponse<{ outcome: ConversationOutcome }>> {
    logger.api('Handling offer action', { 
      conversationId: request.conversationId,
      action: request.action 
    });
    
    return this.fetchWithTimeout('/conversations/offer-action', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get conversation history
   */
  async getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    logger.api('Fetching conversation', { conversationId });
    
    return this.fetchWithTimeout<Conversation>(`/conversations/${conversationId}`);
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.fetchWithTimeout('/health');
  }

  /**
   * Get user's conversation history
   */
  async getUserConversations(userId: string): Promise<ApiResponse<Conversation[]>> {
    logger.api('Fetching user conversations', { userId });
    
    return this.fetchWithTimeout<Conversation[]>(`/users/${userId}/conversations`);
  }
}

// Mock API service for development/demo
class MockApiService {
  private conversations: Map<string, Conversation> = new Map();
  private messageIdCounter = 1;

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initiate a chat conversation (alias for startConversation)
   */
  async initiateChat(request: StartConversationRequest): Promise<ApiResponse<Conversation>> {
    return this.startConversation(request);
  }

  async startConversation(request: StartConversationRequest): Promise<ApiResponse<Conversation>> {
    await this.delay(1000); // Simulate network delay
    
    const conversationId = this.generateId();
    const conversation: Conversation = {
      id: conversationId,
      userId: request.userId,
      subscriptionId: request.subscriptionId,
      status: 'active',
      outcome: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: (this.messageIdCounter++).toString(),
          conversationId,
          content: `I understand you're considering canceling because: ${request.reasonText}. Let me see what I can do to help address your concerns.`,
          sender: 'ai',
          timestamp: new Date().toISOString(),
        }
      ]
    };

    this.conversations.set(conversationId, conversation);
    
    logger.api('Mock: Started conversation', { conversationId });
    return { success: true, data: conversation };
  }

  async sendMessage(request: SendMessageRequest): Promise<ApiResponse<{ message: ChatMessage; offer?: RetentionOffer }>> {
    await this.delay(1500); // Simulate AI thinking time
    
    const conversation = this.conversations.get(request.conversationId);
    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: (this.messageIdCounter++).toString(),
      conversationId: request.conversationId,
      content: request.message,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    conversation.messages.push(userMessage);

    // Generate AI response
    const aiResponses = [
      "I completely understand your concern. Let me see what special offers I can provide for you.",
      "That's a valid point. I'd like to offer you something that might change your mind.",
      "I hear you, and I want to make sure we find a solution that works for you.",
      "Thank you for explaining that. I have a special offer that might address your concerns."
    ];

    const aiMessage: ChatMessage = {
      id: (this.messageIdCounter++).toString(),
      conversationId: request.conversationId,
      content: aiResponses[Math.floor(Math.random() * aiResponses.length)],
      sender: 'ai',
      timestamp: new Date().toISOString(),
    };
    conversation.messages.push(aiMessage);

    // Sometimes generate an offer
    let offer: RetentionOffer | undefined;
    if (conversation.messages.length >= 4 && Math.random() > 0.3) {
      offer = {
        id: this.generateId(),
        conversationId: request.conversationId,
        type: Math.random() > 0.5 ? 'discount' : 'pause',
        title: Math.random() > 0.5 ? '50% Off for 3 Months' : 'Pause Your Subscription',
        description: Math.random() > 0.5 
          ? 'Get 50% off your subscription for the next 3 months, then continue at the regular price.'
          : 'Pause your subscription for up to 3 months and resume whenever you\'re ready.',
        savings: {
          monthly: Math.floor(Math.random() * 20) + 10,
          total: Math.floor(Math.random() * 100) + 50,
        },
        details: {
          originalPrice: 29.99,
          newPrice: Math.random() > 0.5 ? 14.99 : undefined,
          freeMonths: Math.random() > 0.7 ? 1 : undefined,
          pauseDuration: Math.random() > 0.5 ? 3 : undefined,
        },
        terms: [
          'Offer valid for new customers only',
          'Cannot be combined with other offers',
          'Subscription will auto-renew at regular price'
        ],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        createdAt: new Date().toISOString(),
      };
    }

    conversation.updatedAt = new Date().toISOString();
    this.conversations.set(request.conversationId, conversation);

    logger.api('Mock: Sent message', { 
      conversationId: request.conversationId,
      hasOffer: !!offer 
    });

    return { 
      success: true, 
      data: { message: aiMessage, offer } 
    };
  }

  async handleOfferAction(request: OfferActionRequest): Promise<ApiResponse<{ outcome: ConversationOutcome }>> {
    await this.delay(800);
    
    const conversation = this.conversations.get(request.conversationId);
    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    const outcome: ConversationOutcome = request.action === 'accept' ? 'accepted' : 'rejected';
    conversation.outcome = outcome;
    conversation.status = 'completed';
    conversation.updatedAt = new Date().toISOString();

    // Add final message
    const finalMessage: ChatMessage = {
      id: (this.messageIdCounter++).toString(),
      conversationId: request.conversationId,
      content: request.action === 'accept' 
        ? 'Wonderful! Your new plan is now active. Thank you for staying with us!'
        : 'I understand. Your cancellation will be processed. We\'re sorry to see you go.',
      sender: 'ai',
      timestamp: new Date().toISOString(),
    };
    conversation.messages.push(finalMessage);

    this.conversations.set(request.conversationId, conversation);

    logger.api('Mock: Handled offer action', { 
      conversationId: request.conversationId,
      action: request.action,
      outcome 
    });

    return { success: true, data: { outcome } };
  }

  async getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    await this.delay(300);
    
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    return { success: true, data: conversation };
  }

  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return { 
      success: true, 
      data: { 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      } 
    };
  }

  async getUserConversations(userId: string): Promise<ApiResponse<Conversation[]>> {
    await this.delay(500);
    
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, data: userConversations };
  }
}

// Create singleton instances
export const apiService = new ApiService();
export const mockApiService = new MockApiService();

// Export the appropriate service based on environment
export const api = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' 
  ? mockApiService 
  : apiService;

// Default export for backward compatibility
export default api;