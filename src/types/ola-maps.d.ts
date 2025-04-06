export interface OlaMapsOptions {
  apiKey: string;
  mode?: '2d' | '3d';
  threedTileset?: string;
}

export interface OlaMapsInitOptions {
  style: string;
  container: string;
  center: [number, number];
  zoom: number;
}

export interface OlaMapsMarkerOptions {
  position: [number, number];
  color: string;
  title: string;
}

export interface OlaMapsMarker {
  addTo: (map: OlaMapsMap) => void;
  remove: () => void;
  on: (event: string, callback: () => void) => void;
}

export interface OlaMapsMap {
  remove: () => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  addMarker: (options: OlaMapsMarkerOptions) => OlaMapsMarker;
}

export interface OlaMaps {
  init: (options: OlaMapsInitOptions) => OlaMapsMap;
}

declare global {
  interface Window {
    OlaMaps: OlaMaps;
  }
}

// This ensures the module is treated as a module
export {}; 