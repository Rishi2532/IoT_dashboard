import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { FeatureCollection, Feature, Geometry } from 'geojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map-tooltip.css';
import { useGeoFilter } from '@/contexts/GeoFilterContext';

// Make sure Leaflet's default icon images are properly handled
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Define the zoom level to geographic filter level mapping
export type GeoFilterLevel = 'region' | 'division' | 'subdivision' | 'circle' | 'block' | 'village' | 'none';

interface EnhancedGeoFilterMapProps {
  geoJsonData: FeatureCollection;
  width?: string;
  height?: string;
  onFeatureClick?: (properties: any) => void;
  showLabels?: boolean;
  showTooltips?: boolean;
  initialZoom?: number;
}

// Component to dynamically update filters based on map zoom level
const MapZoomHandler: React.FC = () => {
  const map = useMap();
  const { filter, setFilter } = useGeoFilter();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  
  // Helper function to determine the appropriate filter level based on zoom
  const getGeoLevelFromZoom = (zoom: number): GeoFilterLevel => {
    if (zoom <= 7) return 'region';
    if (zoom === 8) return 'division';
    if (zoom === 9) return 'subdivision';
    if (zoom === 10) return 'circle';
    if (zoom === 11) return 'block';
    if (zoom >= 12) return 'village';
    return 'none';
  };
  
  useEffect(() => {
    const handleZoomEnd = () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
      
      // Update the geographic filter level based on zoom
      const geoLevel = getGeoLevelFromZoom(newZoom);
      
      // Only update if level has changed
      if (geoLevel !== filter.level) {
        setFilter(prev => ({ ...prev, level: geoLevel }));
      }
    };
    
    map.on('zoomend', handleZoomEnd);
    
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, filter.level, setFilter]);
  
  return null;
};

const EnhancedGeoFilterMap: React.FC<EnhancedGeoFilterMapProps> = ({
  geoJsonData,
  width = '100%',
  height = '400px',
  onFeatureClick,
  showTooltips = true,
  showLabels = true,
  initialZoom = 7
}) => {
  const geoJsonRef = useRef<L.GeoJSON>(null);
  const { filter, setFilter } = useGeoFilter();
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  
  // Define style based on feature properties
  const getFeatureStyle = (feature: Feature<Geometry, any>) => {
    const isHovered = hoveredFeature === feature.properties.name;
    const isSelected = feature.properties.name === filter.region 
      || feature.properties.name === filter.division
      || feature.properties.name === filter.subdivision
      || feature.properties.name === filter.circle
      || feature.properties.name === filter.block;
    
    // Determine the color based on the feature's completion status if available
    const defaultColor = '#3182CE'; // Blue color by default
    
    return {
      fillColor: isSelected ? '#38A169' : isHovered ? '#4299E1' : defaultColor,
      weight: isSelected || isHovered ? 2 : 1,
      opacity: 1,
      color: isSelected ? '#38A169' : '#2B6CB0',
      fillOpacity: isSelected ? 0.7 : isHovered ? 0.5 : 0.3
    };
  };
  
  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    if (showTooltips && feature.properties) {
      layer.bindTooltip(`<div class="custom-tooltip">
        <div class="tooltip-title">${feature.properties.name}</div>
      </div>`, { 
        permanent: false, 
        direction: 'top',
        className: 'custom-leaflet-tooltip'
      });
    }
    
    // Add hover effect
    layer.on({
      mouseover: (e) => {
        setHoveredFeature(feature.properties?.name || null);
        if (geoJsonRef.current) {
          geoJsonRef.current.setStyle(getFeatureStyle);
        }
      },
      mouseout: (e) => {
        setHoveredFeature(null);
        if (geoJsonRef.current) {
          geoJsonRef.current.setStyle(getFeatureStyle);
        }
      },
      click: (e) => {
        // Update filter based on the clicked feature and current filter level
        const props = feature.properties;
        const level = filter.level;
        
        if (!props) return;
        
        // Update the appropriate filter level property based on current zoom/level
        if (level === 'region') {
          setFilter(prev => ({ ...prev, region: props.name }));
        } else if (level === 'division') {
          setFilter(prev => ({ ...prev, division: props.name }));
        } else if (level === 'subdivision') {
          setFilter(prev => ({ ...prev, subdivision: props.name }));
        } else if (level === 'circle') {
          setFilter(prev => ({ ...prev, circle: props.name }));
        } else if (level === 'block') {
          setFilter(prev => ({ ...prev, block: props.name }));
        } else if (level === 'village') {
          setFilter(prev => ({ ...prev, village: props.name }));
        }
        
        // Call the optional click handler with feature properties
        if (onFeatureClick) {
          onFeatureClick(props);
        }
      }
    });
  };
  
  return (
    <div style={{ width, height }}>
      <MapContainer
        center={[19.7515, 75.7139]} // Center of Maharashtra
        zoom={initialZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          data={geoJsonData}
          style={getFeatureStyle}
          onEachFeature={onEachFeature}
          ref={geoJsonRef}
        />
        <MapZoomHandler />
      </MapContainer>
    </div>
  );
};

export default EnhancedGeoFilterMap;