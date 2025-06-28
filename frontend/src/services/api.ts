// ============================================================================
// CHURNGUARD API SERVICE
// ============================================================================
// Handles all communication with the backend Lambda functions
// Includes proper error handling, retries, and logging

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { 
  InitiateChatRequest, 
  InitiateChatResponse,
  SendMessageRequest,
  SendMessageResponse,
  AcceptOfferRequest,
  AcceptOfferResponse,
  ApiResponse 
} from '../types';
import { logger } from '../utils/logger';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // In development, we'll use a mock API or local backend
    // In production, this will be your deployed API Gateway URL
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    
    logger.info('API Service initialized', { baseURL: this.baseURL });
  }

  /**
   * Set up request and response interceptors for logging and error handling
   */
  private setupInterceptors() {
    // Request interceptor - log outgoing requests
    this.client.interceptors.request.use(
      (config) => {
        const startTime = Date.now();
        config.metadata = { startTime };
        
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params
        });
        
        return config;
      },
      (error) => {
        logger.error('API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - log responses and handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        
        logger.api(
          response.config.method?.toUpperCase() || 'GET',
          response.config.url || '',
          response.status,
          duration,
          response.data
        );
        
        return response;
      },
      (error: AxiosError) => {
        const duration = Date.now() - (error.config?.metadata?.startTime || 0);
        
        logger.api(
          error.config?.method?.toUpperCase() || 'GET',
          error.config?.url || '',
          error.response?.status || 0,
          duration,
          error.response?.data
        );
        
        logger.error('API Response Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
        
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Handle and normalize API errors
   */
  private handleApiError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;
      
      switch (status) {
        case 400:
          return new Error(data?.message || 'Invalid request. Please check your input.');
        case 401:
          return new Error('Authentication required. Please refresh the page.');
        case 403:
          return new Error('Access denied. You don\'t have permission for this action.');
        case 404:
          return new Error('Service not found. Please try again later.');
        case 429:
          return new Error('Too many requests. Please wait a moment and try again.');
        case 500:
          return new Error('Server error. Our team has been notified.');
        case 503:
          return new Error('Service temporarily unavailable. Please try again in a few minutes.');
        default:
          return new Error(data?.message || `Request failed with status ${status}`);
      }
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your internet connection and try again.');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred.');
    }
  }

  /**
   * Initiate a new chat session when user wants to cancel
   */
  async initiateChat(request: InitiateChatRequest): Promise<InitiateChatResponse> {
    try {
      logger.chat('Initiating chat session', { 
        userId: request.userId,
        reason: request.cancellationReason 
      });

      const response = await this.client.post<ApiResponse<InitiateChatResponse>>(
        '/chat/initiate',
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to initiate chat');
      }

      logger.chat('Chat session initiated successfully', {
        conversationId: response.data.data?.conversationId
      });

      return response.data.data!;
    } catch (error) {
      logger.error('Failed to initiate chat', error, { userId: request.userId });
      throw error;
    }
  }

  /**
   * Send a message in an active chat conversation
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      logger.chat('Sending message', { 
        conversationId: request.conversationId,
        messageType: request.messageType 
      });

      const response = await this.client.post<ApiResponse<SendMessageResponse>>(
        '/chat/message',
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to send message');
      }

      logger.chat('Message sent successfully', {
        conversationId: request.conversationId,
        hasOffer: !!response.data.data?.retentionOffer
      });

      return response.data.data!;
    } catch (error) {
      logger.error('Failed to send message', error, { 
        conversationId: request.conversationId 
      });
      throw error;
    }
  }

  /**
   * Accept or reject a retention offer
   */
  async respondToOffer(request: AcceptOfferRequest): Promise<AcceptOfferResponse> {
    try {
      logger.chat('Responding to offer', { 
        conversationId: request.conversationId,
        accepted: request.accepted 
      });

      const response = await this.client.post<ApiResponse<AcceptOfferResponse>>(
        '/chat/offer-response',
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to process offer response');
      }

      logger.chat('Offer response processed', {
        conversationId: request.conversationId,
        outcome: response.data.data?.outcome
      });

      return response.data.data!;
    } catch (error) {
      logger.error('Failed to process offer response', error, { 
        conversationId: request.conversationId 
      });
      throw error;
    }
  }

  /**
   * Health check endpoint to verify backend connectivity
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error('Health check failed', error);
      throw new Error('Backend service is not available');
    }
  }

  /**
   * Get the current API base URL (useful for debugging)
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export individual methods for easier importing
export const initiateChat = apiService.initiateChat.bind(apiService);
export const sendMessage = apiService.sendMessage.bind(apiService);
export const respondToOffer = apiService.respondToOffer.bind(apiService);
export const healthCheck = apiService.healthCheck.bind(apiService);
