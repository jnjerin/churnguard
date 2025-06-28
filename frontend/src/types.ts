// ============================================================================
// CHURNGUARD FRONTEND TYPES
// ============================================================================
// This file contains all TypeScript interfaces and types used across the frontend
// Keeping them in one place makes it easy to maintain and share between components

// ============================================================================
// USER & SUBSCRIPTION TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Subscription {
  id: string;
  userId: string;
  serviceType: 'netflix' | 'spotify' | 'hulu' | 'disney' | 'amazon-prime';
  serviceName: string;
  plan: string;
  monthlyPrice: number;
  durationMonths: number;
  startDate: string;
  status: 'active' | 'cancelled' | 'paused';
  paymentHistory: PaymentRecord[];
}

export interface PaymentRecord {
  date: string;
  amount: number;
  status: 'paid' | 'failed' | 'pending';
}

// ============================================================================
// CHAT & CONVERSATION TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  type: 'text' | 'offer' | 'system';
  metadata?: {
    offerDetails?: RetentionOffer;
    confidence?: number;
  };
}

export interface Conversation {
  id: string;
  userId: string;
  serviceType: string;
  status: 'active' | 'completed' | 'abandoned';
  outcome?: 'accepted' | 'rejected' | 'abandoned';
  messages: ChatMessage[];
  startedAt: string;
  completedAt?: string;
  cancellationReason?: CancellationReason;
  retentionOffer?: RetentionOffer;
}

// ============================================================================
// CANCELLATION & RETENTION TYPES
// ============================================================================

export type CancellationReason = 
  | 'too_expensive'
  | 'not_using_enough'
  | 'found_alternative'
  | 'poor_content'
  | 'technical_issues'
  | 'moving'
  | 'other';

export interface CancellationContext {
  reason: CancellationReason;
  reasonText: string;
  subscription: Subscription;
  userSentiment: 'frustrated' | 'neutral' | 'apologetic';
}

export interface RetentionOffer {
  id: string;
  type: 'discount' | 'plan_downgrade' | 'free_months' | 'feature_unlock' | 'pause_subscription';
  title: string;
  description: string;
  details: {
    discountPercentage?: number;
    discountDuration?: number; // months
    newPlan?: string;
    newPrice?: number;
    freeMonths?: number;
    features?: string[];
    pauseDuration?: number; // months
  };
  savings: {
    monthly: number;
    total: number;
    currency: string;
  };
  expiresAt: string;
  terms: string[];
}

// ============================================================================
// API REQUEST & RESPONSE TYPES
// ============================================================================

export interface InitiateChatRequest {
  userId: string;
  subscriptionId: string;
  cancellationReason: CancellationReason;
  reasonText: string;
}

export interface InitiateChatResponse {
  conversationId: string;
  userContext: {
    subscription: Subscription;
    user: User;
  };
  initialMessage: string;
  success: boolean;
  error?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
  messageType: 'cancellation_reason' | 'response' | 'question';
}

export interface SendMessageResponse {
  message: ChatMessage;
  retentionOffer?: RetentionOffer;
  conversationStatus: 'active' | 'awaiting_decision' | 'completed';
  success: boolean;
  error?: string;
}

export interface AcceptOfferRequest {
  conversationId: string;
  offerId: string;
  accepted: boolean;
}

export interface AcceptOfferResponse {
  success: boolean;
  outcome: 'accepted' | 'rejected';
  confirmationMessage: string;
  nextSteps?: string[];
  error?: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface ChatState {
  isOpen: boolean;
  isLoading: boolean;
  conversation: Conversation | null;
  currentOffer: RetentionOffer | null;
  error: string | null;
  step: ChatStep;
}

export type ChatStep = 
  | 'initial'           // Show cancellation form
  | 'chatting'         // Active conversation
  | 'offer_presented'  // AI made an offer
  | 'decision_made'    // User accepted/rejected
  | 'completed'        // Conversation finished
  | 'error';           // Something went wrong

export interface UINotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // milliseconds
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// DEMO PAGE TYPES
// ============================================================================

export interface DemoService {
  id: string;
  name: string;
  logo: string;
  plan: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  color: string; // Tailwind color class
}

// ============================================================================
// ANALYTICS & LOGGING TYPES
// ============================================================================

export interface LogEvent {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'ui' | 'api' | 'chat' | 'error';
  message: string;
  data?: Record<string, any>;
  userId?: string;
  conversationId?: string;
}

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated?: string;
}

// Type guards for runtime type checking
export const isRetentionOffer = (obj: any): obj is RetentionOffer => {
  return obj && typeof obj.id === 'string' && typeof obj.type === 'string';
};

export const isChatMessage = (obj: any): obj is ChatMessage => {
  return obj && typeof obj.id === 'string' && typeof obj.content === 'string';
};