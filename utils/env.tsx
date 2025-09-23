/* Environment variable utilities */

// Get environment variable with fallbacks for different naming conventions
export function getEnvVar(key: string): string | undefined {
  // Check various sources for environment variables
  if (typeof window !== 'undefined') {
    // Browser environment - check window.process if available
    const windowProcess = (window as any).process;
    if (windowProcess?.env?.[key]) {
      return windowProcess.env[key];
    }
    
  }
  
  // Node.js environment or build time
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  
  // Deno support removed (not needed for this project)
  
  return undefined;
}

// Google Maps API Key with multiple fallbacks
export function getGoogleMapsApiKey(): string | undefined {
  // Vite environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (key) return key;
  }
  
  // Legacy fallback
  const apiKey = getEnvVar('GOOGLE_MAPS_API_KEY') || getEnvVar('VITE_GOOGLE_MAPS_API_KEY');
  
  if (typeof window !== 'undefined') {
    console.log('Google Maps API Key search:', {
      VITE_GOOGLE_MAPS_API_KEY: import.meta.env?.VITE_GOOGLE_MAPS_API_KEY,
      GOOGLE_MAPS_API_KEY: getEnvVar('GOOGLE_MAPS_API_KEY'),
      found: !!apiKey
    });
  }
  return apiKey;
}