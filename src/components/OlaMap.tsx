import React, { useEffect, useRef } from 'react';
import type { OlaMapsMap, OlaMapsMarker } from '../types/ola-maps';
import { OlaMaps } from 'olamaps-web-sdk';

interface OlaMapProps {
  center: [number, number];
  zoom: number;
  markers: Array<{
    position: [number, number];
    title: string;
    color: string;
    onClick?: () => void;
  }>;
  onMapLoad?: (map: OlaMapsMap) => void;
}

export function OlaMap({ center, zoom, markers, onMapLoad }: OlaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<OlaMapsMap | null>(null);
  const markersRef = useRef<OlaMapsMarker[]>([]);
  const olaMapsInstance = useRef<OlaMaps | null>(null);

  useEffect(() => {
    // Initialize Ola Maps
    olaMapsInstance.current = new OlaMaps({
      apiKey: import.meta.env.VITE_OLA_MAPS_API_KEY,
      mode: '2d'
    });

    return () => {
      // Cleanup
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
      markersRef.current.forEach(marker => marker.remove());
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !olaMapsInstance.current) return;

    // Initialize map
    mapInstance.current = olaMapsInstance.current.init({
      style: "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
      container: mapRef.current.id,
      center,
      zoom
    });

    // Add markers
    markers.forEach(marker => {
      if (!mapInstance.current) return;
      
      const olaMarker = mapInstance.current.addMarker({
        position: marker.position,
        color: marker.color,
        title: marker.title
      });

      if (marker.onClick) {
        olaMarker.on('click', marker.onClick);
      }

      markersRef.current.push(olaMarker);
    });

    if (onMapLoad && mapInstance.current) {
      onMapLoad(mapInstance.current);
    }
  }, [center, zoom, markers, onMapLoad]);

  // Update markers when they change
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach(marker => {
      const olaMarker = mapInstance.current!.addMarker({
        position: marker.position,
        color: marker.color,
        title: marker.title
      });

      if (marker.onClick) {
        olaMarker.on('click', marker.onClick);
      }

      markersRef.current.push(olaMarker);
    });
  }, [markers]);

  // Update map center when it changes
  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.setCenter(center);
      mapInstance.current.setZoom(zoom);
    }
  }, [center, zoom]);

  return (
    <div
      id="ola-map"
      ref={mapRef}
      style={{
        width: '100%',
        height: '400px',
        borderRadius: '0.5rem'
      }}
    />
  );
} 