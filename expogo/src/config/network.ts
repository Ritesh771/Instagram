// Network Configuration for Development
// Update this file when switching networks

export const NETWORK_CONFIG = {
  // Current network IP address
  // Update this when you change networks or use mobile hotspot
  API_BASE_URL: 'http://192.168.0.102:8000/api',
  
  // Alternative configurations for different networks
  // Uncomment the one you're using and comment out the others
  
  // For home WiFi (current)
  // API_BASE_URL: 'http://192.168.0.101:8000/api',
  
  // For mobile hotspot (example - update with your hotspot IP)
  // API_BASE_URL: 'http://192.168.43.1:8000/api',
  
  // For office WiFi (example - update with your office IP)
  // API_BASE_URL: 'http://192.168.1.100:8000/api',
  
  // For localhost (when testing on same machine)
  // API_BASE_URL: 'http://localhost:8000/api',
};

// Helper function to get the current API URL
export const getApiUrl = () => {
  return NETWORK_CONFIG.API_BASE_URL;
};

// Helper function to get the base URL without /api
export const getBaseUrl = () => {
  return NETWORK_CONFIG.API_BASE_URL.replace('/api', '');
};
