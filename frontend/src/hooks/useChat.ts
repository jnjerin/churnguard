// ============================================================================
// CHURNGUARD CHAT HOOK
// ============================================================================
// Custom React hook that manages chat state and interactions
// Handles the complete chat flow from initiation to completion

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ChatState, 
  ChatStep, 
  Conversation, 
  RetentionOffer, 
  CancellationReason,
  InitiateChatRequest,
  SendMessageRequest,
  AcceptOfferRequest
} from '../types';
import { apiService } from '../services/api';
import { logger, trackEvent } from '../utils/logger';

interface UseChatOptions {
  userId: string;
  subscriptionId: string;
  onConversationComplete?: (outcome: 'accepted' | 'rejected' | 'abandoned') => void;
  onError?: (error: string) => void;
}

interface UseChatReturn {
  // State
  chatState: ChatState;
  
  // Actions
  openChat: () => void;
  closeChat: () => void;
  startConversation: (reason: CancellationReason, reasonText: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  acceptOffer: () => Promise<void>;
  rejectOffer: () => Promise<void>;
  
  // Utilities
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useChat = (options: UseChatOptions): UseChatReturn => {
  const { userId, subscriptionId, onConversationComplete, onError } = options;
  
  // Chat state management
  const [chatState, setChatState] = useState<ChatState>({
    isOpen: false,
    isLoading: false,
    conversation: null,
    currentOffer: null,
    error: null,
    step: 'initial'
  });

  // Keep track of the current conversation ID for logging
  const conversationIdRef = useRef<string | null>(null);

  // Update conversation ID ref when conversation changes
  useEffect(() => {
    conversationIdRef.current = chatState.conversation?.id || null;
  }, [chatState.conversation?.id]);

  /**
   * Open the chat widget
   */
  const openChat = useCallback(() => {
    logger.chat('Chat widget opened', {}, { userId });
    trackEvent('chat_opened', { userId, subscriptionId });
    
    setChatState(prev => ({
      ...prev,
      isOpen: true,
      step: 'initial'
    }));
  }, [userId, subscriptionId]);

  /**
   * Close the chat widget
   */
  const closeChat = useCallback(() => {
    const conversationId = conversationIdRef.current;
    
    logger.chat('Chat widget closed', {}, { userId, conversationId });
    
    // Track abandonment if conversation was active
    if (chatState.conversation && chatState.step !== 'completed') {
      trackEvent('conversation_abandoned', {
        userId,
        conversationId,
        step: chatState.step,
        messageCount: chatState.conversation.messages.length
      });
      
      onConversationComplete?.('abandoned');
    }
    
    setChatState(prev => ({
      ...prev,
      isOpen: false,
      step: 'initial',
      conversation: null,
      currentOffer: null,
      error: null
    }));
  }, [userId, chatState.conversation, chatState.step, onConversationComplete]);

  /**
   * Start a new conversation with cancellation reason
   */
  const startConversation = useCallback(async (
    reason: CancellationReason, 
    reasonText: string
  ) => {
    try {
      logger.chat('Starting conversation', { reason, reasonText }, { userId });
      
      setChatState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        step: 'chatting'
      }));

      const request: InitiateChatRequest = {
        userId,
        subscriptionId,
        cancellationReason: reason,
        reasonText
      };

      const response = await apiService.initiateChat(request);
      
      // Create initial conversation object
      const conversation: Conversation = {
        id: response.conversationId,
        userId,
        serviceType: response.userContext.subscription.serviceType,
        status: 'active',
        messages: [
          {
            id: `msg_${Date.now()}`,
            conversationId: response.conversationId,
            content: response.initialMessage,
            sender: 'ai',
            timestamp: new Date().toISOString(),
            type: 'text'
          }
        ],
        startedAt: new Date().toISOString(),
        cancellationReason: reason
      };

      setChatState(prev => ({
        ...prev,
        isLoading: false,
        conversation,
        step: 'chatting'
      }));

      trackEvent('conversation_started', {
        userId,
        conversationId: response.conversationId,
        reason,
        serviceType: response.userContext.subscription.serviceType
      });

      logger.chat('Conversation started successfully', {
        conversationId: response.conversationId
      }, { userId, conversationId: response.conversationId });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      
      logger.error('Failed to start conversation', error, { userId });
      
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        step: 'error'
      }));

      onError?.(errorMessage);
    }
  }, [userId, subscriptionId, onError]);

  /**
   * Send a message in the current conversation
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!chatState.conversation) {
      logger.error('Attempted to send message without active conversation', {}, { userId });
      return;
    }

    const conversationId = chatState.conversation.id;

    try {
      logger.chat('Sending user message', { message }, { userId, conversationId });

      setChatState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      // Add user message to conversation immediately for better UX
      const userMessage = {
        id: `msg_${Date.now()}_user`,
        conversationId,
        content: message,
        sender: 'user' as const,
        timestamp: new Date().toISOString(),
        type: 'text' as const
      };

      setChatState(prev => ({
        ...prev,
        conversation: prev.conversation ? {
          ...prev.conversation,
          messages: [...prev.conversation.messages, userMessage]
        } : null
      }));

      const request: SendMessageRequest = {
        conversationId,
        message,
        messageType: 'response'
      };

      const response = await apiService.sendMessage(request);

      // Add AI response to conversation
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        conversation: prev.conversation ? {
          ...prev.conversation,
          messages: [...prev.conversation.messages, response.message]
        } : null,
        currentOffer: response.retentionOffer || prev.currentOffer,
        step: response.retentionOffer ? 'offer_presented' : 'chatting'
      }));

      // Track offer presentation
      if (response.retentionOffer) {
        trackEvent('offer_presented', {
          userId,
          conversationId,
          offerType: response.retentionOffer.type,
          offerValue: response.retentionOffer.savings.total
        });
      }

      logger.chat('Message sent successfully', {
        hasOffer: !!response.retentionOffer
      }, { userId, conversationId });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      
      logger.error('Failed to send message', error, { userId, conversationId });
      
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      onError?.(errorMessage);
    }
  }, [chatState.conversation, userId, onError]);

  /**
   * Accept the current retention offer
   */
  const acceptOffer = useCallback(async () => {
    if (!chatState.conversation || !chatState.currentOffer) {
      logger.error('Attempted to accept offer without active conversation or offer', {}, { userId });
      return;
    }

    const conversationId = chatState.conversation.id;
    const offerId = chatState.currentOffer.id;

    try {
      logger.chat('Accepting offer', { offerId }, { userId, conversationId });

      setChatState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      const request: AcceptOfferRequest = {
        conversationId,
        offerId,
        accepted: true
      };

      const response = await apiService.respondToOffer(request);

      setChatState(prev => ({
        ...prev,
        isLoading: false,
        conversation: prev.conversation ? {
          ...prev.conversation,
          status: 'completed',
          outcome: 'accepted',
          completedAt: new Date().toISOString()
        } : null,
        step: 'completed'
      }));

      trackEvent('offer_accepted', {
        userId,
        conversationId,
        offerId,
        offerType: chatState.currentOffer.type,
        savings: chatState.currentOffer.savings.total
      });

      logger.chat('Offer accepted successfully', { outcome: 'accepted' }, { userId, conversationId });

      onConversationComplete?.('accepted');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept offer';
      
      logger.error('Failed to accept offer', error, { userId, conversationId });
      
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      onError?.(errorMessage);
    }
  }, [chatState.conversation, chatState.currentOffer, userId, onConversationComplete, onError]);

  /**
   * Reject the current retention offer
   */
  const rejectOffer = useCallback(async () => {
    if (!chatState.conversation || !chatState.currentOffer) {
      logger.error('Attempted to reject offer without active conversation or offer', {}, { userId });
      return;
    }

    const conversationId = chatState.conversation.id;
    const offerId = chatState.currentOffer.id;

    try {
      logger.chat('Rejecting offer', { offerId }, { userId, conversationId });

      setChatState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      const request: AcceptOfferRequest = {
        conversationId,
        offerId,
        accepted: false
      };

      const response = await apiService.respondToOffer(request);

      setChatState(prev => ({
        ...prev,
        isLoading: false,
        conversation: prev.conversation ? {
          ...prev.conversation,
          status: 'completed',
          outcome: 'rejected',
          completedAt: new Date().toISOString()
        } : null,
        step: 'completed'
      }));

      trackEvent('offer_rejected', {
        userId,
        conversationId,
        offerId,
        offerType: chatState.currentOffer.type,
        savings: chatState.currentOffer.savings.total
      });

      logger.chat('Offer rejected', { outcome: 'rejected' }, { userId, conversationId });

      onConversationComplete?.('rejected');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject offer';
      
      logger.error('Failed to reject offer', error, { userId, conversationId });
      
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      onError?.(errorMessage);
    }
  }, [chatState.conversation, chatState.currentOffer, userId, onConversationComplete, onError]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    // State
    chatState,
    
    // Actions
    openChat,
    closeChat,
    startConversation,
    sendMessage,
    acceptOffer,
    rejectOffer,
    
    // Utilities
    isLoading: chatState.isLoading,
    error: chatState.error,
    clearError
  };
};
