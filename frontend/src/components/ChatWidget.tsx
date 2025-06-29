// ============================================================================
// CHURNGUARD CHAT WIDGET COMPONENT
// ============================================================================
// Main chat interface that handles the complete conversation flow

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ConfirmationScreen } from './ConfirmationScreen';
import type { CancellationReason } from '../types/types';
import { logger } from '../utils/logger';

interface ChatWidgetProps {
  userId: string;
  subscriptionId: string;
  serviceName: string;
  onConversationComplete?: (outcome: 'accepted' | 'rejected' | 'abandoned') => void;
  onError?: (error: string) => void;
}

const CANCELLATION_REASONS: { value: CancellationReason; label: string; description: string }[] = [
  {
    value: 'too_expensive',
    label: 'Too expensive',
    description: 'The subscription costs more than I want to spend'
  },
  {
    value: 'not_using_enough',
    label: 'Not using it enough',
    description: 'I don\'t use the service frequently enough to justify the cost'
  },
  {
    value: 'found_alternative',
    label: 'Found a better alternative',
    description: 'I found another service that better meets my needs'
  },
  {
    value: 'poor_content',
    label: 'Poor content quality',
    description: 'The content or service quality doesn\'t meet my expectations'
  },
  {
    value: 'technical_issues',
    label: 'Technical problems',
    description: 'I\'m experiencing technical issues with the service'
  },
  {
    value: 'moving',
    label: 'Moving/Life changes',
    description: 'My circumstances have changed and I no longer need this service'
  },
  {
    value: 'other',
    label: 'Other reason',
    description: 'My reason isn\'t listed above'
  }
];

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  userId,
  subscriptionId,
  serviceName,
  onConversationComplete,
  onError
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [showReasonForm, setShowReasonForm] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    chatState,
    openChat,
    closeChat,
    startConversation,
    sendMessage,
    acceptOffer,
    rejectOffer,
    isLoading,
    error,
    clearError
  } = useChat({
    userId,
    subscriptionId,
    onConversationComplete,
    onError
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.conversation?.messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatState.isOpen && !showReasonForm) {
      inputRef.current?.focus();
    }
  }, [chatState.isOpen, showReasonForm]);

  // Open chat automatically when component mounts
  useEffect(() => {
    openChat();
  }, [openChat]);

  /**
   * Handle starting the conversation with cancellation reason
   */
  const handleStartConversation = async () => {
    if (!selectedReason) return;

    const reasonText = selectedReason === 'other' ? customReason : 
      CANCELLATION_REASONS.find(r => r.value === selectedReason)?.description || '';

    if (selectedReason === 'other' && !customReason.trim()) {
      logger.warn('User tried to submit "other" reason without custom text');
      return;
    }

    logger.chat('Starting conversation with reason', { 
      reason: selectedReason, 
      reasonText 
    }, { userId });

    setShowReasonForm(false);
    await startConversation(selectedReason, reasonText);
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || isLoading) return;

    const message = messageInput.trim();
    setMessageInput('');
    
    await sendMessage(message);
  };

  /**
   * Handle accepting the retention offer
   */
  const handleAcceptOffer = async () => {
    logger.chat('User accepting offer', {}, { 
      userId, 
      conversationId: chatState.conversation?.id 
    });
    
    await acceptOffer();
  };

  /**
   * Handle rejecting the retention offer
   */
  const handleRejectOffer = async () => {
    logger.chat('User rejecting offer', {}, { 
      userId, 
      conversationId: chatState.conversation?.id 
    });
    
    await rejectOffer();
  };

  // Show confirmation screen when conversation is completed
  if (chatState.step === 'completed') {
    return (
      <ConfirmationScreen
        outcome={chatState.conversation?.outcome || 'abandoned'}
        serviceName={serviceName}
        offer={chatState.currentOffer}
        onClose={closeChat}
      />
    );
  }

  return (
    <AnimatePresence>
      {chatState.isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                🤖
              </div>
              <div>
                <h3 className="font-semibold">ChurnGuard Assistant</h3>
                <p className="text-xs text-primary-100">
                  Let's find a solution that works for you
                </p>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border-l-4 border-red-400 p-3 m-4 rounded"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                  <button
                    onClick={clearError}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Cancellation Reason Form */}
            {showReasonForm && (
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Before you go, help us understand why you're canceling {serviceName}:
                  </h4>
                  <p className="text-sm text-gray-600">
                    This helps us improve our service and find the best solution for you.
                  </p>
                </div>

                <div className="space-y-3 mb-4">
                  {CANCELLATION_REASONS.map((reason) => (
                    <label
                      key={reason.value}
                      className={`block p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedReason === reason.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="radio"
                          name="cancellation-reason"
                          value={reason.value}
                          checked={selectedReason === reason.value}
                          onChange={(e) => setSelectedReason(e.target.value as CancellationReason)}
                          className="mt-1 text-primary-500 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{reason.label}</div>
                          <div className="text-sm text-gray-600">{reason.description}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Custom reason input */}
                {selectedReason === 'other' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Please tell us more:
                    </label>
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="What's your main reason for canceling?"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                      rows={3}
                    />
                  </motion.div>
                )}

                <button
                  onClick={handleStartConversation}
                  disabled={!selectedReason || (selectedReason === 'other' && !customReason.trim())}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Chat Messages */}
            {!showReasonForm && chatState.conversation && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatState.conversation.messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLatest={index === chatState.conversation!.messages.length - 1}
                  />
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-sm">
                        🤖
                      </div>
                      <div className="chat-bubble-ai">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Offer Action Buttons */}
            {chatState.step === 'offer_presented' && chatState.currentOffer && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex space-x-3">
                  <button
                    onClick={handleAcceptOffer}
                    disabled={isLoading}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Accept Offer'}
                  </button>
                  <button
                    onClick={handleRejectOffer}
                    disabled={isLoading}
                    className="flex-1 btn-secondary disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'No Thanks'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  This offer expires on {new Date(chatState.currentOffer.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Message Input */}
            {!showReasonForm && chatState.step === 'chatting' && (
              <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || isLoading}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
                <p className="text-xs text-gray-500 mt-2">
                  Press Enter to send • Our AI is here to help find the right solution
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
