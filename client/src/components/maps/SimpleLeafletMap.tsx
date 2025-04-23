import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SimpleLeafletMapProps {
  containerClassName?: string;
  onRegionClick?: (region: string) => void;
}

// Define Maharashtra regions and their approximate coordinates
const regionCoordinates: Record<string, [number, number]> = {
  'Nagpur': [21.1458, 79.0882],
  'Amravati': [20.9320, 77.7523],
  'Chhatrapati Sambhajinagar': [19.8762, 75.3433],
  'Nashik': [19.9975, 73.7898],
  'Pune': [18.5204, 73.8567],
  'Konkan': [19.0760, 72.8777],
};

// Custom colors for each region
const regionColors: Record<string, string> = {
  'Nashik': '#8CB3E2',         // Light blue
  'Amravati': '#FF7300',       // Orange 
  'Nagpur': '#E2B8B8',         // Light red/pink
  'Chhatrapati Sambhajinagar': '#68A9A9', // Teal green
  'Pune': '#FFC408',           // Yellow
  'Konkan': '#4A77BB',         // Blue
};

export default function SimpleLeafletMap({ 
  containerClassName = "h-[400px] w-full rounded-md overflow-hidden",
  onRegionClick = () => {}
}: SimpleLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Fix Leaflet's icon path issues for bundled environments
  useEffect(() => {
    // Only fix this once globally
    if (typeof window !== 'undefined' && typeof L !== 'undefined') {
      // Set Leaflet's images path to a CDN to avoid webpack issues
      if (L.Icon && L.Icon.Default) {
        // Fix for Leaflet marker icons in bundled environments
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
      }
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Avoid duplicating map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    try {
      // Create map with proper initialization options
      const map = L.map(mapContainerRef.current, {
        center: [19.7515, 75.7139], // Center of Maharashtra
        zoom: 7,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
        // Add these to help with mobile
        tap: true,
        dragging: !L.Browser.mobile, 
        tapTolerance: 15
      });

      // Store the instance for later use
      mapInstanceRef.current = map;

      // Add OpenStreetMap tile layer with error handling
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Set bounds to focus on Maharashtra
      const bounds = L.latLngBounds(
        L.latLng(14.5, 72.0), // Southwest
        L.latLng(23.0, 82.0)  // Northeast
      );
      map.fitBounds(bounds);

      // Clear any existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add markers for each region
      Object.entries(regionCoordinates).forEach(([regionName, coordinates]) => {
        const color = regionColors[regionName] || '#cccccc';
        
        // Create a square marker for each region
        const squareIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${color}; width: 16px; height: 16px; border: 1px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        
        // Create marker with the square icon
        const marker = L.marker(coordinates, { icon: squareIcon })
          .addTo(map)
          .on('click', () => {
            console.log(`Region clicked: ${regionName}`);
            onRegionClick(regionName);
          });
        
        // Add a tooltip to show region name
        marker.bindTooltip(regionName, {
          permanent: false,
          direction: 'top'
        });
        
        // Save marker for cleanup
        markersRef.current.push(marker);
      });

      // Force a map refresh after rendering
      // This helps fix the "__refresh-page" error
      setTimeout(() => {
        if (map && map._container) {
          map.invalidateSize(false);
        }
      }, 250);
    } catch (error) {
      console.error('Error initializing map:', error);
      // Provide a fallback or error state if the map fails to initialize
    }

    // Clean up on unmount
    return () => {
      if (mapInstanceRef.current) {
        // Clean up markers
        markersRef.current.forEach(marker => {
          if (marker) marker.remove();
        });
        markersRef.current = [];
      
        // Remove the map
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onRegionClick, containerClassName]);

  return (
    <div className="relative">
      <div 
        ref={mapContainerRef} 
        className={containerClassName}
        id="maharashtra-leaflet-map" // Add a unique ID to help with debugging
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-75 text-xs p-1 text-gray-700 border-t border-gray-300">
        <span>©2025 OpenStreetMap contributors</span>
      </div>
      
      {/* Add styling for tooltips */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .region-tooltip {
            background-color: rgba(255, 255, 255, 0.9);
            border: 1px solid #ccc;
            border-radius: 3px;
            padding: 2px 5px;
            font-size: 12px;
            font-weight: 500;
          }
          .leaflet-container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
        `
      }} />
    </div>
  );
}