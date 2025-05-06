import { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMapEvents,
  ZoomControl,
  Marker,
  Tooltip
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './map-tooltip.css';
import L from 'leaflet';
import { useGeoFilter } from '@/contexts/GeoFilterContext';
import { getMaharashtraGeoJson } from '@/lib/maharashtra-geojson';

// Define custom icon for markers using SVG
const customIcon = L.divIcon({
  className: 'custom-marker-icon',
  html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <circle cx="12" cy="10" r="4" fill="#2563eb" />
           <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
             fill="#2563eb" fill-opacity="0.7" stroke="#fff" stroke-width="1" />
         </svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Type for locations that can be marked on the map
export interface MapLocation {
  name: string;
  latitude: number;
  longitude: number;
  type: 'scheme' | 'village' | 'esr' | 'wtp' | 'location';
  details?: Record<string, any>;
}

// Available zoom levels and their corresponding filter levels
export type GeoFilterLevel = 'region' | 'division' | 'subdivision' | 'circle' | 'block' | 'village';

interface ZoomListener {
  isInitialLoad: boolean;
}

// Map events component to update filter based on zoom level
const MapEvents: React.FC<{ onZoomChange: (zoom: number) => void }> = ({ onZoomChange }) => {
  const zoomRef = useRef<ZoomListener>({ isInitialLoad: true });
  
  const mapEvents = useMapEvents({
    zoomend: () => {
      const newZoom = mapEvents.getZoom();
      
      // Skip the initial zoom event when map first loads
      if (zoomRef.current.isInitialLoad) {
        zoomRef.current.isInitialLoad = false;
        return;
      }
      
      onZoomChange(newZoom);
    },
  });
  
  return null;
};

interface EnhancedGeoFilterMapProps {
  locations?: MapLocation[];
  onRegionClick?: (regionName: string) => void;
  onDivisionClick?: (divisionName: string) => void;
  onSubdivisionClick?: (subdivisionName: string) => void;
  onCircleClick?: (circleName: string) => void;
  onBlockClick?: (blockName: string) => void;
  mapHeight?: string;
  className?: string;
}

const EnhancedGeoFilterMap: React.FC<EnhancedGeoFilterMapProps> = ({
  locations = [],
  onRegionClick,
  onDivisionClick,
  onSubdivisionClick,
  onCircleClick,
  onBlockClick,
  mapHeight = '500px',
  className = '',
}) => {
  const { filter, setFilter, clearFilter } = useGeoFilter();
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  
  // Initialize the map data
  useEffect(() => {
    const maharashtraGeoJson = getMaharashtraGeoJson();
    setGeoJsonData(maharashtraGeoJson);
  }, []);

  // Function to determine filter level based on zoom
  const determineFilterLevelFromZoom = (zoom: number): GeoFilterLevel => {
    if (zoom <= 7) return 'region';
    if (zoom === 8) return 'division';
    if (zoom === 9) return 'subdivision';
    if (zoom === 10) return 'circle';
    if (zoom === 11) return 'block';
    return 'village';
  };

  // Handle map zoom change
  const handleZoomChange = (zoom: number) => {
    const newFilterLevel = determineFilterLevelFromZoom(zoom);
    
    // Update the filter level
    setFilter(prevFilter => ({
      ...prevFilter,
      level: newFilterLevel
    }));
  };

  // Style function for GeoJSON regions
  const regionStyle = (feature: any) => {
    const regionName = feature.properties.name;
    const isSelected = regionName === filter.region;
    
    return {
      fillColor: isSelected ? '#3b82f6' : '#64748b',
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? '#1d4ed8' : '#475569',
      fillOpacity: isSelected ? 0.6 : 0.3,
    };
  };

  // Handle region click events
  const onEachFeature = (feature: any, layer: any) => {
    const regionName = feature.properties.name;
    
    layer.on({
      click: () => {
        // Update the filter based on current level
        if (filter.level === 'region') {
          setFilter(prev => ({ ...prev, region: regionName }));
          onRegionClick?.(regionName);
        } else if (filter.level === 'division') {
          setFilter(prev => ({ ...prev, division: regionName }));
          onDivisionClick?.(regionName);
        } else if (filter.level === 'subdivision') {
          setFilter(prev => ({ ...prev, subdivision: regionName }));
          onSubdivisionClick?.(regionName);
        } else if (filter.level === 'circle') {
          setFilter(prev => ({ ...prev, circle: regionName }));
          onCircleClick?.(regionName);
        } else if (filter.level === 'block') {
          setFilter(prev => ({ ...prev, block: regionName }));
          onBlockClick?.(regionName);
        }
      },
      mouseover: (e: any) => {
        const layer = e.target;
        layer.setStyle({
          fillOpacity: 0.7,
          weight: 3
        });
      },
      mouseout: (e: any) => {
        const layer = e.target;
        layer.setStyle(regionStyle(feature));
      }
    });

    // Add tooltips to show region names
    layer.bindTooltip(regionName, {
      permanent: false,
      direction: 'center',
      className: 'geo-filter-tooltip',
    });
  };

  return (
    <div className={`relative ${className}`} style={{ height: mapHeight }}>
      {/* Filter indicator and reset button */}
      {filter.region && (
        <div className="absolute top-3 right-3 z-10 bg-white dark:bg-gray-800 p-2 rounded shadow-md">
          <div className="text-sm font-medium mb-1">
            {filter.level === 'region' && `Region: ${filter.region}`}
            {filter.level === 'division' && `Division: ${filter.division}`}
            {filter.level === 'subdivision' && `Subdivision: ${filter.subdivision}`}
            {filter.level === 'circle' && `Circle: ${filter.circle}`}
            {filter.level === 'block' && `Block: ${filter.block}`}
            {filter.level === 'village' && `Village: ${filter.village}`}
          </div>
          <button 
            onClick={() => clearFilter()}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Reset filter
          </button>
        </div>
      )}
      
      <MapContainer
        center={[19.5, 76.5]} // Center of Maharashtra
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={true}
        className="z-0"
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Map zoom event handler */}
        <MapEvents onZoomChange={handleZoomChange} />
        
        {/* Maharashtra GeoJSON */}
        {geoJsonData && (
          <GeoJSON
            data={geoJsonData}
            style={regionStyle}
            onEachFeature={onEachFeature}
          />
        )}
        
        {/* Location markers */}
        {locations.map((location, index) => (
          <Marker
            key={`${location.name}-${index}`}
            position={[location.latitude, location.longitude]}
            icon={customIcon}
          >
            <Tooltip direction="top" offset={[0, -32]} opacity={1} permanent>
              <div className="text-sm font-medium">{location.name}</div>
              {location.details && (
                <div className="text-xs mt-1">
                  {Object.entries(location.details).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-semibold">{key}: </span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default EnhancedGeoFilterMap;