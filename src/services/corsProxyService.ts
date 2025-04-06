import axios from 'axios';

/**
 * A service to help handle CORS issues by proxying requests
 * Uses a publicly available CORS proxy if needed
 */

// List of known CORS proxies
const CORS_PROXIES = [
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
  'https://crossorigin.me/'
];

// Check if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development';

/**
 * Makes a request through a CORS proxy if needed
 * @param url The URL to fetch
 * @param options Axios request options
 * @returns Promise with the response data
 */
export async function fetchWithCorsProxy(url: string, options: any = {}): Promise<any> {
  // First try making the request directly
  try {
    if (!isDevelopment) {
      // In production, try direct request first as CORS should be configured
      const response = await axios(url, options);
      return response.data;
    }
  } catch (error) {
    // If not in development or direct request failed, continue to proxy
    console.log('Direct request failed, trying CORS proxy...');
  }

  // Try each proxy until one works
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await axios(proxyUrl, {
        ...options,
        headers: {
          ...options.headers,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      return response.data;
    } catch (error) {
      console.warn(`Proxy ${proxy} failed, trying next...`);
    }
  }

  // If all proxies fail, throw error
  throw new Error('All CORS proxies failed');
}

/**
 * Creates a proxied URL
 * Useful for image or resource URLs that need CORS handling
 */
export function getProxiedUrl(url: string): string {
  if (!isDevelopment) {
    return url; // In production, return the original URL
  }
  
  // In development, use the first proxy
  return `${CORS_PROXIES[0]}${encodeURIComponent(url)}`;
} 