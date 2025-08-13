// Environment configuration with validation
export const ENV_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  DEV: import.meta.env.DEV || false,
  PROD: import.meta.env.PROD || false,
} as const;

// Validate critical environment variables
export function validateEnvironment() {
  const errors: string[] = [];
  
  // Check if API base URL is accessible
  if (!ENV_CONFIG.API_BASE_URL) {
    errors.push('VITE_API_BASE_URL is not configured');
  }
  
  if (errors.length > 0) {
    console.warn('Environment validation warnings:', errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Initialize environment validation
validateEnvironment();

export default ENV_CONFIG;