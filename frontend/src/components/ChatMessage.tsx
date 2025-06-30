// ============================================================================
// CHURNGUARD CHAT MESSAGE COMPONENT
// ============================================================================
// Individual chat message bubble with proper styling and animations
'use client'

import React from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage as ChatMessageType, RetentionOffer } from '../types/types';

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLatest = false }) => {
  const isUser = message.sender === 'user';
  const isOffer = message.type === 'offer' && message.metadata?.offerDetails;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-start space-x-3 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isUser 
            ? 'bg-primary-500 text-white' 
            : 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
        }`}>
          {isUser ? 'You' : '🤖'}
        </div>

        {/* Message Content */}
        <div className={`${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
          {/* Regular Message */}
          {!isOffer && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}

          {/* Retention Offer */}
          {isOffer && message.metadata?.offerDetails && (
            <OfferCard offer={message.metadata.offerDetails} />
          )}

          {/* Timestamp */}
          <div className={`text-xs mt-2 ${isUser ? 'text-primary-200' : 'text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Retention Offer Card Component
 */
interface OfferCardProps {
  offer: RetentionOffer;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer }) => {
  return (
    <div className="bg-gradient-to-br from-primary-50 to-yellow-50 border border-primary-200 rounded-xl p-4 mt-2">
      {/* Offer Header */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="text-lg">🎁</div>
        <h4 className="font-semibold text-primary-700">{offer.title}</h4>
      </div>

      {/* Offer Description */}
      <p className="text-sm text-gray-700 mb-3">{offer.description}</p>

      {/* Savings Highlight */}
      <div className="bg-white rounded-lg p-3 mb-3 border border-primary-100">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Your Savings:</span>
          <div className="text-right">
            <div className="text-lg font-bold text-success">
              ${offer.savings.total}
            </div>
            <div className="text-xs text-gray-600">
              ${offer.savings.monthly}/month
            </div>
          </div>
        </div>
      </div>

      {/* Offer Details */}
      <div className="space-y-2 mb-3">
        {offer.details.discountPercentage && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Discount:</span>
            <span className="font-medium">{offer.details.discountPercentage}% off</span>
          </div>
        )}
        {offer.details.discountDuration && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">{offer.details.discountDuration} months</span>
          </div>
        )}
        {offer.details.newPlan && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">New Plan:</span>
            <span className="font-medium">{offer.details.newPlan}</span>
          </div>
        )}
        {offer.details.newPrice && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">New Price:</span>
              <span className="font-medium">${offer.details.newPrice}/month</span>
            </div>
        )}
        {offer.details.freeMonths && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Free Months:</span>
              <span className="font-medium">{offer.details.freeMonths} months</span>
            </div>
        )}
        {offer.details.pauseDuration && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pause Duration:</span>
              <span className="font-medium">{offer.details.pauseDuration} months</span>
            </div>
        )}
        </div>

        {/* Features (if any) */}
        {offer.details.features && offer.details.features.length > 0 && (
        <div className="mb-3">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Included:</h5>
            <ul className="space-y-1">
            {offer.details.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                <svg className="w-3 h-3 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
                </li>
            ))}
            </ul>
        </div>
        )}

        {/* Terms */}
        {offer.terms && offer.terms.length > 0 && (
        <div className="text-xs text-gray-500 border-t border-gray-200 pt-2">
            <p className="font-medium mb-1">Terms & Conditions:</p>
            <ul className="space-y-1">
            {offer.terms.map((term, index) => (
                <li key={index}>• {term}</li>
            ))}
            </ul>
        </div>
        )}

        {/* Expiration Notice */}
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mt-3 border border-amber-200">
        <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span>Offer expires: {new Date(offer.expiresAt).toLocaleDateString()}</span>
        </div>
        </div>
    </div>
    );
    };