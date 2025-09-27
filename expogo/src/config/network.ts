// Network configuration for different environments
export const getApiUrl = (): string => {
  // For development, use the local IP address that the device can reach
  // This should be the IP address of your development machine
  const API_BASE_URL = 'http://192.168.31.177:8000/api';

  return API_BASE_URL;
};

export const getBaseUrl = (): string => {
  return 'http://192.168.31.177:8000';
};