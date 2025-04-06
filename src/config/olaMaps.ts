export const OLA_MAPS_CONFIG = {
  apiKey: import.meta.env.VITE_OLA_MAPS_API_KEY || 'n1AWiUYhgUz1qjiemAkVfMxuTOntjxrbProAtSD0', // Fallback to a default key if env is not set
  // Use reliable free map styles that don't require API keys and have CORS properly set up
  style: 'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
  defaultCenter: [88.3639, 22.5726], // Kolkata coordinates
  defaultZoom: 12,
  maxZoom: 18,
  minZoom: 3,
  attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a>, <a href="https://maptiler.com">MapTiler</a>',
  preserveDrawingBuffer: true,
  trackUserLocation: true,
  showAccuracyCircle: true,
  showUserLocation: true,
  // Default coordinates for fallback - Updated for better accuracy
  defaultLocation: {
    lat: 22.5110, // Kasba Golpark
    lng: 88.3747
  },
  // Headers to include in requests - Add CORS related headers
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': window.location.origin,
    'Access-Control-Allow-Origin': '*'
  },
  // Alternative map styles to try if the primary one fails
  alternativeStyles: [
    // These OSRM styles from Stadia Maps work well and have CORS properly set up
    'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
    'https://tiles.stadiamaps.com/styles/osm_bright.json',
    // CartoDB styles are also reliable
    'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
  ]
};

export function validateOlaMapsConfig() {
  if (!OLA_MAPS_CONFIG.apiKey) {
    console.error('OLA Maps API key is not configured. Please check your .env file.');
    return false;
  }
  return true;
}

// Get the primary map style URL, ensuring CORS is handled
export const getMapStyleUrl = (): string => {
  // Return a style that doesn't require API key and has proper CORS headers
  return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
};

// Get an alternative map style URL by index
export const getAlternativeMapStyle = (index: number): string => {
  if (index >= 0 && index < OLA_MAPS_CONFIG.alternativeStyles.length) {
    return OLA_MAPS_CONFIG.alternativeStyles[index];
  }
  // Fallback to a very reliable style
  return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
};

// Create a fallback map for when the actual map fails to load
export const createFallbackMap = (containerId: string, center: [number, number], zoom: number): any => {
  const container = document.getElementById(containerId);
  if (!container) return null;

  // Create a simple canvas-based map visualization
  const canvas = document.createElement('canvas');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Draw grid lines
  ctx.strokeStyle = '#ddd';
  for (let i = 0; i < canvas.width; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 20) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // Draw center marker (red circle)
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 8, 0, 2 * Math.PI);
  ctx.fill();

  // Return a minimal mock map instance with required methods
  return {
    on: (event: string, callback: Function) => {
      if (event === 'load') {
        // Simulate the load event
        setTimeout(callback, 100);
      }
      return { off: () => {} };
    },
    off: () => {},
    remove: () => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    },
    getCenter: () => ({ lng: center[0], lat: center[1] }),
    getZoom: () => zoom,
    // Add other required methods as needed
    addControl: () => {}
  };
}; 