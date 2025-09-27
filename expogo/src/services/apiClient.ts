import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';

interface RetryConfig {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: any) => boolean;
}

export const createApiClient = (config: AxiosRequestConfig, retryConfig?: RetryConfig) => {
  const api = axios.create(config);

  // Configure retry mechanism
  axiosRetry(api, {
    retries: retryConfig?.retries || 3, // Default to 3 retries
    retryDelay: (retryCount) => {
      return retryConfig?.retryDelay || axiosRetry.exponentialDelay(retryCount);
    },
    retryCondition: (error) => {
      // Retry on network errors and 5xx errors
      if (retryConfig?.retryCondition) {
        return retryConfig.retryCondition(error);
      }
      return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
             (error.response?.status && error.response.status >= 500);
    },
    onRetry: (retryCount, error, requestConfig) => {
      console.log(`[API] Retry attempt ${retryCount} for ${requestConfig.url}:`, {
        error: error.message,
        config: requestConfig
      });
    }
  });

  return api;
};