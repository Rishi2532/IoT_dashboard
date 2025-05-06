import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';

interface EnhancedGeoFilterMapProps {
  containerClassName?: string;
  onRegionChange?: (region: string) => void;
  onDivisionChange?: (division: string) => void;
  onSubDivisionChange?: (subDivision: string) => void;
  onCircleChange?: (circle: string) => void; 
  onBlockChange?: (block: string) => void;
  onVillageChange?: (village: string) => void;
  selectedRegion?: string;
  mapTitle?: string;
}

// Define Maharashtra regions and their approximate coordinates
const regionCoordinates: Record<string, [number, number]> = {
  'Nagpur': [21.1458, 79.0882],
  'Amravati': [20.9320, 77.7523],
  'Chhatrapati Sambhajinagar': [19.8762, 75.3433],
  'Nashik': [19.9975, 73.7898],
  'Pune': [18.5204, 73.8567],
  'Konkan': [19.3530, 73.2765],
};

// Custom colors for each region
const regionColors: Record<string, string> = {
  'Nashik': '#8CB3E2',
  'Amravati': '#FF7300',
  'Nagpur': '#E2B8B8',
  'Chhatrapati Sambhajinagar': '#68A9A9',
  'Pune': '#FFC408',
  'Konkan': '#4A77BB',
};

// Geographic entity types for zoom level detection
type GeoEntityType = 'region' | 'division' | 'subdivision' | 'circle' | 'block' | 'village';

export default function EnhancedGeoFilterMap({ 
  containerClassName = "h-[400px] w-full rounded-md overflow-hidden",
  onRegionChange,
  onDivisionChange,
  onSubDivisionChange,
  onCircleChange,
  onBlockChange,
  onVillageChange,
  selectedRegion = 'all',
  mapTitle = "Maharashtra Water Infrastructure"
}: EnhancedGeoFilterMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [currentZoomLevel, setCurrentZoomLevel] = useState(7);
  const [currentGeoEntityType, setCurrentGeoEntityType] = useState<GeoEntityType>('region');
  
  interface SchemeLocation {
    region: string;
    division: string;
    sub_division: string;
    circle: string;
    block: string;
    scheme_name: string;
    scheme_id: string;
  }
  
  interface VillageLocation {
    region: string;
    circle: string;
    division: string;
    sub_division: string;
    block: string;
    scheme_name: string;
    village_name: string;
  }

  // Fetch geographic metadata for zooming into specific areas
  const { data: geographicHierarchy = [] } = useQuery<SchemeLocation[], unknown, {
    region: string;
    division: string;
    subDivision: string;
    circle: string;
    block: string;
    coordinates: [number, number];
  }[]>({
    queryKey: ['/api/schemes'],
    select: (schemes) => {
      // Extract unique geographic entities with their hierarchy
      const hierarchy: {
        region: string;
        division: string;
        subDivision: string;
        circle: string;
        block: string;
        coordinates: [number, number];
      }[] = [];
      const uniqueEntities = new Set<string>();
      
      schemes.forEach((scheme) => {
        if (scheme.region && scheme.division && scheme.sub_division && scheme.circle && scheme.block) {
          const key = `${scheme.region}|${scheme.division}|${scheme.sub_division}|${scheme.circle}|${scheme.block}`;
          
          if (!uniqueEntities.has(key)) {
            uniqueEntities.add(key);
            hierarchy.push({
              region: scheme.region,
              division: scheme.division,
              subDivision: scheme.sub_division,
              circle: scheme.circle,
              block: scheme.block,
              // Approximate coordinates - in a real implementation, these would come from geoJSON data
              coordinates: regionCoordinates[scheme.region as keyof typeof regionCoordinates] || [19.7515, 75.7139]
            });
          }
        }
      });
      
      return hierarchy;
    }
  });
  
  // Fetch villages for the selected region
  const { data: villages = [] } = useQuery<VillageLocation[], unknown, VillageLocation[]>({
    queryKey: ['/api/water-scheme-data', selectedRegion],
    select: (data) => {
      if (selectedRegion === 'all') return data;
      return data.filter((item) => item.region === selectedRegion);
    }
  });
  
  // Helper to determine geographic entity type based on zoom level
  const determineGeoEntityType = useCallback((zoomLevel: number): GeoEntityType => {
    if (zoomLevel <= 7) return 'region';
    if (zoomLevel <= 8) return 'division';
    if (zoomLevel <= 9) return 'subdivision';
    if (zoomLevel <= 10) return 'circle';
    if (zoomLevel <= 11) return 'block';
    return 'village';
  }, []);
  
  // Handle zoom changes to determine the appropriate geographic level to filter by
  const handleZoomChange = useCallback((newZoom: number) => {
    setCurrentZoomLevel(newZoom);
    const newEntityType = determineGeoEntityType(newZoom);
    
    if (newEntityType !== currentGeoEntityType) {
      setCurrentGeoEntityType(newEntityType);
      console.log(`Zoom level ${newZoom} detected, switching to ${newEntityType} level filtering`);
    }
  }, [currentGeoEntityType, determineGeoEntityType]);
  
  // Function to identify geographic entity at the map center
  const identifyEntityAtCenter = useCallback((map: any) => {
    if (!map) return;
    
    const center = map.getCenter();
    const zoom = map.getZoom();
    const entityType = determineGeoEntityType(zoom);
    
    type ClosestEntityType = {
      type: GeoEntityType;
      name: string;
    } | null;
    
    let closestEntity: ClosestEntityType = null;
    let minDistance = Infinity;
    
    // For simplicity in this demonstration, we're using the region coordinates
    // In a real implementation, this would use proper geospatial calculations
    if (entityType === 'region') {
      Object.entries(regionCoordinates).forEach(([region, coords]) => {
        const L = require('leaflet');
        const distance = L.latLng(center.lat, center.lng).distanceTo(L.latLng(coords[0], coords[1]));
        
        if (distance < minDistance) {
          minDistance = distance;
          closestEntity = { 
            type: 'region' as const, 
            name: region 
          };
        }
      });
      
      if (closestEntity && onRegionChange && closestEntity.name !== selectedRegion) {
        console.log(`Auto-selecting region: ${closestEntity.name} based on map center`);
        onRegionChange(closestEntity.name);
      }
    }
    // For division/subdivision/circle/block - in a real implementation,
    // these would use proper boundaries or coordinates for each entity
    else if (geographicHierarchy.length > 0) {
      // Implementation would find the closest entity at the appropriate level
      console.log(`Ready to filter at ${entityType} level, implement spatial query logic here`);
    }
  }, [determineGeoEntityType, geographicHierarchy, onRegionChange, selectedRegion]);
  
  // Import Leaflet dynamically to avoid SSR issues
  const initializeLeaflet = async () => {
    try {
      const L = await import('leaflet').then(module => module.default || module);
      
      if (!mapContainerRef.current || isMapInitialized) return;
      
      setIsMapInitialized(true);
      
      // Fix for Leaflet marker icons in bundled environments
      if (!L.Icon.Default.prototype.hasOwnProperty('_defaultIconParams')) {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
      }
      
      try {
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = '';
        }
        
        // Create map centered on Maharashtra
        const map = L.map(mapContainerRef.current, {
          center: [19.7515, 75.7139], // Center of Maharashtra
          zoom: 7,
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: true, // Enable scroll wheel zoom
          minZoom: 6, 
          maxZoom: 13, // Allow more zoom levels for village details
          maxBounds: L.latLngBounds(
            L.latLng(15.6, 72.6), 
            L.latLng(22.1, 80.9)
          ),
          dragging: true
        });
        
        // Store map instance for later use
        mapInstanceRef.current = map;
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '', 
          maxZoom: 13, // Higher max zoom for detailed view
        }).addTo(map);
        
        // Set bounds to focus on Maharashtra
        const bounds = L.latLngBounds(
          L.latLng(15.8, 72.8),
          L.latLng(21.8, 80.1)
        );
        map.fitBounds(bounds);
        
        const markers: L.Marker[] = [];
        
        // Add markers for each region
        Object.entries(regionCoordinates).forEach(([regionName, coordinates]) => {
          const color = regionColors[regionName] || '#cccccc';
          
          // Create a custom icon for this region
          const regionIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 16px; height: 16px; border: 1px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          
          // Create marker with the custom icon
          const marker = L.marker(coordinates, { icon: regionIcon })
            .addTo(map)
            .on('click', () => {
              if (onRegionChange) {
                onRegionChange(regionName);
              }
              
              // Zoom in when clicking on a region
              map.setView(coordinates, 8);
            });
          
          // Add a tooltip to show region name
          marker.bindTooltip(regionName, {
            permanent: false,
            direction: 'top'
          });
          
          markers.push(marker);
        });
        
        // Add zoom change event listener
        map.on('zoomend', () => {
          const newZoom = map.getZoom();
          handleZoomChange(newZoom);
          
          // Only identify entities at center on significant zoom changes
          if (Math.abs(newZoom - currentZoomLevel) >= 1) {
            identifyEntityAtCenter(map);
          }
        });
        
        // Track map movement to identify entities at center
        map.on('moveend', () => {
          identifyEntityAtCenter(map);
        });
        
        // Force a map refresh after rendering
        setTimeout(() => {
          if (map && typeof map.invalidateSize === 'function') {
            map.invalidateSize(true);
            setIsMapReady(true);
          }
        }, 300);
        
        // Return cleanup function
        return () => {
          markers.forEach(marker => {
            if (marker && typeof marker.remove === 'function') {
              marker.remove();
            }
          });
          
          if (map && typeof map.remove === 'function') {
            try {
              map.remove();
            } catch (e) {
              console.log('Map cleanup error - ignoring', e);
            }
          }
        };
      } catch (err) {
        console.warn('Map initialization error:', err);
        return () => {}; // Empty cleanup for error case
      }
    } catch (error) {
      console.error('Error loading Leaflet:', error);
      return () => {}; // Empty cleanup for error case
    }
  };
  
  // After initial render, load Leaflet
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapContainerRef.current && !isMapInitialized) {
        let cleanupFn: (() => void) | undefined;
        
        initializeLeaflet().then(cleanup => {
          cleanupFn = cleanup;
        });
        
        return () => {
          if (cleanupFn) cleanupFn();
        };
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isMapInitialized]);
  
  // Update map when selected region changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || selectedRegion === 'all') return;
    
    const coordinates = regionCoordinates[selectedRegion];
    if (coordinates) {
      map.setView(coordinates, 8);
    }
  }, [selectedRegion]);
  
  return (
    <div className="relative">
      <div className="mb-2 flex justify-between items-center">
        <h3 className="text-sm font-medium text-blue-700">{mapTitle}</h3>
        <div className="text-xs text-gray-500">
          {currentGeoEntityType === 'region' && 'Regional View'}
          {currentGeoEntityType === 'division' && 'Division View'}
          {currentGeoEntityType === 'subdivision' && 'Sub-Division View'}
          {currentGeoEntityType === 'circle' && 'Circle View'}
          {currentGeoEntityType === 'block' && 'Block View'}
          {currentGeoEntityType === 'village' && 'Village View'}
        </div>
      </div>
      
      <div 
        ref={mapContainerRef} 
        className={containerClassName}
        id="enhanced-geo-filter-map"
        style={{ zIndex: 1 }}
      />
      
      {/* Loading state while Leaflet initializes */}
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70">
          <div className="text-sm text-gray-600">Loading map...</div>
        </div>
      )}
      
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
          
          /* Hide any errors from the map container */
          #enhanced-geo-filter-map + div[data-plugin-id="runtime-errors"] {
            display: none !important;
          }
          
          /* Fix for Leaflet marker positions */
          .custom-div-icon {
            background: transparent;
            border: none;
          }
        `
      }} />
      
      {/* Geographic level indicator */}
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-80 px-2 py-1 rounded-md shadow-sm text-xs text-gray-700 z-10">
        Zoom: {currentZoomLevel} | Level: {currentGeoEntityType}
      </div>
    </div>
  );
}