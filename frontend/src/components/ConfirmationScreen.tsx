// ============================================================================
// CHURNGUARD CONFIRMATION SCREEN COMPONENT
// ============================================================================
// Shows the final outcome after a conversation completes

import React from 'react';
import { motion } from 'framer-motion';
import type { RetentionOffer } from '../types/types';

interface ConfirmationScreenProps {
  outcome: 'accepted' | 'rejected' | 'abandoned';
  serviceName: string;
  offer?: RetentionOffer | null;
  onClose: () => void;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  outcome,
  serviceName,
  offer,
  onClose
}) => {
  const getOutcomeConfig = () => {
    switch (outcome) {
      case 'accepted':
        return {
          icon: '🎉',
          title: 'Great Choice!',
          message: `Your new ${serviceName} plan is now active. You're saving money while keeping the service you love.`,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          buttonText: 'Continue Using Service'
        };
      case 'rejected':
        return {
          icon: '😔',
          title: 'We\'re Sorry to See You Go',
          message: `We understand our offer wasn't right for you. Your ${serviceName} subscription will be canceled as requested.`,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          buttonText: 'Complete Cancellation'
        };
      default:
        return {
          icon: '👋',
          title: 'Thanks for Your Time',
          message: `We hope we were able to help. Feel free to reach out if you change your mind about ${serviceName}.`,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          buttonText: 'Close'
        };
    }
  };

  const config = getOutcomeConfig();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-4 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            🤖
          </div>
          <div>
            <h3 className="font-semibold">ChurnGuard Assistant</h3>
            <p className="text-xs text-primary-100">Conversation Complete</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={`${config.bgColor} ${config.borderColor} border rounded-2xl p-6 text-center`}
        >
          {/* Icon */}
          <div className="text-4xl mb-4">{config.icon}</div>

          {/* Title */}
          <h3 className={`text-xl font-bold ${config.textColor} mb-3`}>
            {config.title}
          </h3>

          {/* Message */}
          <p className={`${config.textColor} mb-4 leading-relaxed`}>
            {config.message}
          </p>

          {/* Offer Summary (if accepted) */}
          {outcome === 'accepted' && offer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl p-4 mb-4 border border-green-200"
            >
              <h4 className="font-semibold text-green-800 mb-2">Your New Plan:</h4>
              <div className="text-sm text-green-700 space-y-1">
                <div className="flex justify-between">
                  <span>Monthly Savings:</span>
                  <span className="font-medium">${offer.savings.monthly}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Savings:</span>
                  <span className="font-medium">${offer.savings.total}</span>
                </div>
                {offer.details.newPrice && (
                  <div className="flex justify-between">
                    <span>New Price:</span>
                    <span className="font-medium">${offer.details.newPrice}/month</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Action Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={onClose}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
              outcome === 'accepted'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : outcome === 'rejected'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {config.buttonText}
          </motion.button>
        </motion.div>

        {/* Feedback Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 text-center"
        >
          <p className="text-sm text-gray-600 mb-3">
            How was your experience with ChurnGuard?
          </p>
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                className="text-2xl hover:scale-110 transition-transform"
                onClick={() => {
                  // In a real app, you'd send this feedback to your analytics
                  console.log(`User rated experience: ${rating}/5`);
                }}
              >
                ⭐
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Your feedback helps us improve our service
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};