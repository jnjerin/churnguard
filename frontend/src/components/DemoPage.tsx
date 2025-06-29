// ============================================================================
// CHURNGUARD DEMO PAGE COMPONENT
// ============================================================================
// Simulates a Netflix-like subscription page where users can cancel
// This is the main entry point that triggers the ChurnGuard chat widget

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DemoService } from '../types';
import { ChatWidget } from './ChatWidget';
import { logger, trackEvent } from '../utils/logger';

// Mock subscription data for the demo
const DEMO_SERVICES: DemoService[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    logo: '🎬',
    plan: 'Premium',
    price: 15.99,
    billingCycle: 'monthly',
    features: ['4K Ultra HD', '4 screens at once', 'Download on 6 devices'],
    color: 'bg-red-600'
  },
  {
    id: 'spotify',
    name: 'Spotify',
    logo: '🎵',
    plan: 'Premium',
    price: 9.99,
    billingCycle: 'monthly',
    features: ['Ad-free music', 'Offline downloads', 'High quality audio'],
    color: 'bg-green-600'
  },
  {
    id: 'disney',
    name: 'Disney+',
    logo: '🏰',
    plan: 'Standard',
    price: 7.99,
    billingCycle: 'monthly',
    features: ['Disney, Pixar, Marvel, Star Wars', '4K streaming', 'Download content'],
    color: 'bg-blue-600'
  }
];

export const DemoPage: React.FC = () => {
  const [selectedService, setSelectedService] = useState<DemoService>(DEMO_SERVICES[0]);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  // Mock user data for the demo
  const mockUser = {
    id: 'demo_user_123',
    email: 'demo@example.com',
    name: 'Demo User'
  };

  const mockSubscriptionId = `sub_${selectedService.id}_123`;

  /**
   * Handle the cancel button click - this is where ChurnGuard intervenes
   */
  const handleCancelClick = () => {
    logger.info('User clicked cancel subscription', { 
      service: selectedService.name,
      plan: selectedService.plan 
    });
    
    trackEvent('cancel_button_clicked', {
      userId: mockUser.id,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      plan: selectedService.plan,
      monthlyPrice: selectedService.price
    });

    // Show confirmation dialog first
    setShowCancelConfirmation(true);
  };

  /**
   * Handle confirmation of cancellation - this triggers ChurnGuard
   */
  const handleConfirmCancel = () => {
    logger.info('User confirmed cancellation intent', { service: selectedService.name });
    
    trackEvent('cancellation_confirmed', {
      userId: mockUser.id,
      serviceId: selectedService.id
    });

    setShowCancelConfirmation(false);
    setShowChatWidget(true);
  };

  /**
   * Handle conversation completion
   */
  const handleConversationComplete = (outcome: 'accepted' | 'rejected' | 'abandoned') => {
    logger.info('Conversation completed', { outcome, service: selectedService.name });
    
    trackEvent('conversation_completed', {
      userId: mockUser.id,
      serviceId: selectedService.id,
      outcome
    });

    // Close chat widget after a delay to show completion
    setTimeout(() => {
      setShowChatWidget(false);
    }, 3000);
  };

  /**
   * Handle errors from the chat system
   */
  const handleChatError = (error: string) => {
    logger.error('Chat error occurred', { error, service: selectedService.name });
    
    // You could show a toast notification here
    console.error('Chat Error:', error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-primary-600">
                ChurnGuard
              </div>
              <div className="text-sm text-gray-500 bg-yellow-100 px-2 py-1 rounded-full">
                Demo
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Logged in as {mockUser.name}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Service Selector */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select a service to demo ChurnGuard:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMO_SERVICES.map((service) => (
              <motion.button
                key={service.id}
                onClick={() => setSelectedService(service)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedService.id === service.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{service.logo}</div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{service.name}</div>
                    <div className="text-sm text-gray-600">{service.plan}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Mock Subscription Page */}
        <motion.div
          key={selectedService.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card max-w-2xl mx-auto"
        >
          {/* Service Header */}
          <div className="flex items-center space-x-4 mb-6">
            <div className={`w-16 h-16 ${selectedService.color} rounded-xl flex items-center justify-center text-2xl text-white`}>
              {selectedService.logo}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedService.name}</h1>
              <p className="text-gray-600">Manage your subscription</p>
            </div>
          </div>

          {/* Current Plan */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedService.plan} Plan
                </h3>
                <p className="text-gray-600">Active subscription</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ${selectedService.price}
                </div>
                <div className="text-sm text-gray-600">per month</div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Included features:</h4>
              <ul className="space-y-1">
                {selectedService.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Billing Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Billing Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Next billing date:</span>
                <span className="font-medium">March 15, 2024</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Payment method:</span>
                <span className="font-medium">•••• •••• •••• 4242</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Member since:</span>
                <span className="font-medium">January 2022</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="btn-secondary flex-1">
              Change Plan
            </button>
            <button className="btn-secondary flex-1">
              Update Payment
            </button>
            <motion.button
              onClick={handleCancelClick}
              className="btn-danger flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel Subscription
            </motion.button>
          </div>

          {/* Demo Notice */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="text-yellow-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-yellow-800">Demo Mode</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  This is a demonstration of ChurnGuard's AI-powered retention system. 
                  Click "Cancel Subscription" to see how our AI tries to retain customers 
                  with personalized offers.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Cancel {selectedService.name}?
              </h3>
              <p className="text-gray-600">
                Are you sure you want to cancel your {selectedService.plan} subscription? 
                You'll lose access to all features.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCancelConfirmation(false)}
                className="btn-secondary flex-1"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleConfirmCancel}
                className="btn-danger flex-1"
              >
                Yes, Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ChurnGuard Chat Widget */}
      {showChatWidget && (
        <ChatWidget
          userId={mockUser.id}
          subscriptionId={mockSubscriptionId}
          serviceName={selectedService.name}
          onConversationComplete={handleConversationComplete}
          onError={handleChatError}
        />
      )}
    </div>
  );
};