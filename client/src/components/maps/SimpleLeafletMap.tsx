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

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fix for Leaflet marker icons in bundled environments
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    } catch (e) {
      console.warn('Failed to setup Leaflet defaults:', e);
    }

    // Clean up any existing map instance to avoid duplicates
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Create a new map
    const map = L.map(mapContainerRef.current, {
      center: [19.7515, 75.7139], // Center of Maharashtra
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false
    });

    // Add OpenStreetMap tile layer
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
    });

    // Store the map instance for cleanup
    mapInstanceRef.current = map;

    // Force a map refresh after rendering
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
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
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-75 text-xs p-1 text-gray-700 border-t border-gray-300">
        <span>©2023 TomTom ©2023 OSM ©2023 GrabTaxi ©</span>
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