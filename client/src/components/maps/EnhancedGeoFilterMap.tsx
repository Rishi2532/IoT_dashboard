import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import { useGeoFilter, GeoFilterLevel } from '@/contexts/GeoFilterContext';

// Import custom map tooltip styles
import './map-tooltip.css';

interface EnhancedGeoFilterMapProps {
  geoJsonData: FeatureCollection;
  width?: string;
  height?: string;
  onFeatureClick?: (properties: any) => void;
  showLabels?: boolean;
  showTooltips?: boolean;
  initialZoom?: number;
}

// Map zoom level to geographic level mapping
const zoomToGeoLevel: Record<number, GeoFilterLevel> = {
  7: 'region',
  8: 'division',
  9: 'subdivision',
  10: 'circle',
  11: 'block',
  12: 'village'
};

// Helper component to handle map events
const MapEvents: React.FC = () => {
  const map = useMap();
  const { setFilter } = useGeoFilter();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());

  // Function to determine geographic level based on zoom level
  const getGeoLevelFromZoom = (zoom: number): GeoFilterLevel => {
    if (zoom <= 7) return 'region';
    if (zoom >= 12) return 'village';
    return zoomToGeoLevel[zoom] || 'none';
  };

  useEffect(() => {
    const handleZoomEnd = () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
      
      const geoLevel = getGeoLevelFromZoom(newZoom);
      console.log(`Zoom level changed to ${newZoom}, geographic level: ${geoLevel}`);
      
      // Update the filter with the new geographic level
      setFilter(prev => ({
        ...prev,
        level: geoLevel
      }));
    };

    map.on('zoomend', handleZoomEnd);

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, setFilter]);

  return null;
};

// Main map component
const EnhancedGeoFilterMap: React.FC<EnhancedGeoFilterMapProps> = ({
  geoJsonData,
  width = '100%',
  height = '400px',
  onFeatureClick,
  showLabels = true,
  showTooltips = true,
  initialZoom = 7,
}) => {
  const geojsonRef = useRef<L.GeoJSON>(null);
  const { filter, setFilter } = useGeoFilter();
  
  // Style function for GeoJSON features
  const featureStyle = (feature: Feature<Geometry, any>) => {
    // Default style
    const defaultStyle = {
      fillColor: '#3388ff',
      weight: 2,
      opacity: 1,
      color: '#3388ff',
      fillOpacity: 0.2,
    };

    // Check if this feature matches our current geographic filter
    let isHighlighted = false;

    if (filter.level !== 'none') {
      switch (filter.level) {
        case 'region':
          isHighlighted = feature.properties?.region === filter.region;
          break;
        case 'division':
          isHighlighted = feature.properties?.division === filter.division;
          break;
        case 'subdivision':
          isHighlighted = feature.properties?.subdivision === filter.subdivision;
          break;
        case 'circle':
          isHighlighted = feature.properties?.circle === filter.circle;
          break;
        case 'block':
          isHighlighted = feature.properties?.block === filter.block;
          break;
        case 'village':
          isHighlighted = feature.properties?.village === filter.village;
          break;
      }
    }

    // Return highlighted style if this feature matches current filter
    if (isHighlighted) {
      return {
        ...defaultStyle,
        fillColor: '#ff7800',
        color: '#ff7800',
        fillOpacity: 0.5,
        weight: 3,
      };
    }

    return defaultStyle;
  };

  // Event handlers for GeoJSON features
  const onEachFeature = (feature: Feature<Geometry, any>, layer: L.Layer) => {
    if (showTooltips && feature.properties) {
      // Determine the name to show based on the geographic level
      let displayName = '';
      if (feature.properties.village) {
        displayName = `Village: ${feature.properties.village}`;
      } else if (feature.properties.block) {
        displayName = `Block: ${feature.properties.block}`;
      } else if (feature.properties.circle) {
        displayName = `Circle: ${feature.properties.circle}`;
      } else if (feature.properties.subdivision) {
        displayName = `Sub-Division: ${feature.properties.subdivision}`;
      } else if (feature.properties.division) {
        displayName = `Division: ${feature.properties.division}`;
      } else if (feature.properties.region) {
        displayName = `Region: ${feature.properties.region}`;
      }

      if (displayName) {
        layer.bindTooltip(displayName, {
          permanent: false,
          direction: 'auto',
          className: 'custom-map-tooltip',
        });
      }
    }

    // Add click handler
    layer.on({
      click: (e) => {
        // Prevent the click from propagating to the map
        L.DomEvent.stopPropagation(e);
        
        if (feature.properties) {
          // Determine the geographic level based on available properties
          let geoLevel: GeoFilterLevel = 'none';
          const clickedFeature = { ...filter }; // Start with current filter
          
          if (feature.properties.village) {
            geoLevel = 'village';
            clickedFeature.village = feature.properties.village;
            clickedFeature.block = feature.properties.block;
            clickedFeature.circle = feature.properties.circle;
            clickedFeature.subdivision = feature.properties.subdivision;
            clickedFeature.division = feature.properties.division;
            clickedFeature.region = feature.properties.region;
          } else if (feature.properties.block) {
            geoLevel = 'block';
            clickedFeature.block = feature.properties.block;
            clickedFeature.circle = feature.properties.circle;
            clickedFeature.subdivision = feature.properties.subdivision;
            clickedFeature.division = feature.properties.division;
            clickedFeature.region = feature.properties.region;
          } else if (feature.properties.circle) {
            geoLevel = 'circle';
            clickedFeature.circle = feature.properties.circle;
            clickedFeature.subdivision = feature.properties.subdivision;
            clickedFeature.division = feature.properties.division;
            clickedFeature.region = feature.properties.region;
          } else if (feature.properties.subdivision) {
            geoLevel = 'subdivision';
            clickedFeature.subdivision = feature.properties.subdivision;
            clickedFeature.division = feature.properties.division;
            clickedFeature.region = feature.properties.region;
          } else if (feature.properties.division) {
            geoLevel = 'division';
            clickedFeature.division = feature.properties.division;
            clickedFeature.region = feature.properties.region;
          } else if (feature.properties.region) {
            geoLevel = 'region';
            clickedFeature.region = feature.properties.region;
          }
          
          // Update the filter with the clicked feature's geographic info
          clickedFeature.level = geoLevel;
          setFilter(clickedFeature);
          
          // Call the optional click handler
          if (onFeatureClick) {
            onFeatureClick(feature.properties);
          }
        }
      },
    });
  };

  return (
    <div style={{ width, height }}>
      <MapContainer
        center={[19.7515, 75.7139]} // Center of Maharashtra
        zoom={initialZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false} // Disable default zoom control
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          ref={geojsonRef}
          data={geoJsonData}
          style={featureStyle}
          onEachFeature={onEachFeature}
        />
        <MapEvents />
      </MapContainer>
    </div>
  );
};

export default EnhancedGeoFilterMap;