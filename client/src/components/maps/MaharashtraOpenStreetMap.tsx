import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MaharashtraOpenStreetMapProps {
  containerClassName?: string;
}

export default function MaharashtraOpenStreetMap({ 
  containerClassName = "h-[400px] w-full rounded-md overflow-hidden"
}: MaharashtraOpenStreetMapProps): JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Initialize the map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any existing map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Create the map instance
    const map = L.map(mapContainerRef.current, {
      center: [19.0, 76.5], // Maharashtra's center
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false, // Disable scroll zoom to match reference image
      dragging: true,
    });

    // Set bounds to focus on Maharashtra exactly like the reference image
    const bounds = L.latLngBounds(
      L.latLng(14.5, 72.0), // Southwest - Adjusted to match reference image
      L.latLng(23.0, 82.0)  // Northeast - Adjusted to match reference image
    );
    map.fitBounds(bounds);

    // Add OpenStreetMap tile layer to match the example image exactly
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '©2023 TomTom ©2023 OSM ©2023 GrabTaxi ©',
      maxZoom: 19,
    }).addTo(map);

    // Store the map instance for cleanup
    mapInstanceRef.current = map;

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className={containerClassName}
      />
      
      {/* Optional: Add GitHub-like file info as in the reference image */}
      <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-75 text-xs p-1 text-gray-700 border-t border-gray-300">
        <span>©2023 TomTom ©2023 OSM ©2023 GrabTaxi ©</span>
      </div>
    </div>
  );
}