import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import 'leaflet/dist/leaflet.css';
import { Region, RegionSummary } from '@/types';
import L from 'leaflet';
import { GeoJSON as GeojsonType } from 'geojson';

// Fix for the Leaflet icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Define GeoJSON types
type FeatureProperties = {
  name: string;
  id: string;
  color: string;
};

type FeatureGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

type Feature = {
  type: "Feature";
  properties: FeatureProperties;
  geometry: FeatureGeometry;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Maharashtra GeoJSON data (simplified for this example)
// In a real implementation, this would be loaded from a separate file
const maharashtraGeoJson: FeatureCollection = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Konkan",
        "id": "Konkan",
        "color": "#c2c2c2"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.0, 18.2], [73.3, 17.8], [73.2, 17.0], [72.8, 16.5], [72.5, 16.7], [72.3, 17.3], [72.5, 18.0], [72.7, 18.8], [73.0, 18.2]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Pune",
        "id": "Pune",
        "color": "#adebad"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.8, 18.6], [74.4, 18.3], [74.5, 17.8], [74.2, 17.3], [73.8, 17.2], [73.5, 17.5], [73.3, 17.8], [73.0, 18.2], [73.2, 18.4], [73.5, 18.5], [73.8, 18.6]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Nashik",
        "id": "Nashik",
        "color": "#ffeb99"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.8, 20.1], [74.3, 20.0], [74.6, 19.8], [74.8, 19.5], [74.7, 19.2], [74.5, 19.0], [74.2, 19.0], [74.0, 19.1], [73.7, 19.4], [73.5, 19.6], [73.4, 19.9], [73.5, 20.1], [73.8, 20.1]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Chhatrapati Sambhajinagar",
        "id": "Chhatrapati Sambhajinagar",
        "color": "#ccdeff"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[75.3, 19.9], [75.8, 19.7], [76.0, 19.4], [76.0, 19.0], [75.8, 18.7], [75.5, 18.5], [75.0, 18.5], [74.8, 18.7], [74.7, 19.2], [74.8, 19.5], [75.0, 19.7], [75.3, 19.9]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Amravati",
        "id": "Amravati",
        "color": "#ffccaa"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[77.0, 21.2], [77.5, 21.0], [77.8, 20.7], [77.9, 20.3], [77.7, 20.0], [77.3, 19.8], [76.9, 19.7], [76.6, 19.8], [76.4, 20.1], [76.3, 20.5], [76.5, 20.8], [76.8, 21.0], [77.0, 21.2]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Nagpur",
        "id": "Nagpur",
        "color": "#ffd699"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[78.5, 21.2], [79.0, 21.0], [79.5, 20.7], [79.7, 20.3], [79.6, 19.9], [79.3, 19.7], [78.9, 19.6], [78.5, 19.7], [78.2, 19.9], [77.9, 20.3], [77.8, 20.7], [78.0, 21.0], [78.5, 21.2]]]
      }
    }
  ]
};

// Region pins data
const regionPins = [
  { name: "Nagpur", lat: 21.15, lng: 79.09 },
  { name: "Amravati", lat: 20.93, lng: 77.76 },
  { name: "Chhatrapati Sambhajinagar", lat: 19.88, lng: 75.34 },
  { name: "Nashik", lat: 20.00, lng: 73.79 },
  { name: "Pune", lat: 18.52, lng: 73.86 },
  { name: "Konkan", lat: 17.30, lng: 73.05 }
];

// District data
const districtData = [
  { name: "Akola", lat: 20.70, lng: 77.00, region: "Amravati" },
  { name: "Washim", lat: 20.10, lng: 77.15, region: "Amravati" },
  { name: "Yavatmal", lat: 20.00, lng: 78.10, region: "Amravati" },
  { name: "Buldhana", lat: 20.53, lng: 76.18, region: "Amravati" },
  
  { name: "Bhandara", lat: 21.17, lng: 79.65, region: "Nagpur" },
  { name: "Gondia", lat: 21.45, lng: 80.20, region: "Nagpur" },
  { name: "Wardha", lat: 20.75, lng: 78.60, region: "Nagpur" },
  { name: "Chandrapur", lat: 19.95, lng: 79.30, region: "Nagpur" },
  { name: "Gadchiroli", lat: 20.10, lng: 80.00, region: "Nagpur" },
  
  { name: "Jalna", lat: 19.85, lng: 75.88, region: "Chhatrapati Sambhajinagar" },
  { name: "Parbhani", lat: 19.27, lng: 76.78, region: "Chhatrapati Sambhajinagar" },
  { name: "Hingoli", lat: 19.72, lng: 77.15, region: "Chhatrapati Sambhajinagar" },
  { name: "Nanded", lat: 19.15, lng: 77.33, region: "Chhatrapati Sambhajinagar" },
  { name: "Beed", lat: 18.99, lng: 75.76, region: "Chhatrapati Sambhajinagar" },
  { name: "Latur", lat: 18.40, lng: 76.58, region: "Chhatrapati Sambhajinagar" },
  { name: "Dharashiv", lat: 18.23, lng: 75.93, region: "Chhatrapati Sambhajinagar" },
  
  { name: "Dhule", lat: 20.90, lng: 74.77, region: "Nashik" },
  { name: "Jalgaon", lat: 21.05, lng: 75.40, region: "Nashik" },
  { name: "Nandurbar", lat: 21.37, lng: 74.24, region: "Nashik" },
  { name: "Ahmadnagar", lat: 19.09, lng: 74.74, region: "Nashik" },
  { name: "Palghar", lat: 19.70, lng: 72.77, region: "Nashik" },
  
  { name: "Solapur", lat: 17.67, lng: 75.90, region: "Pune" },
  { name: "Sangli", lat: 16.85, lng: 74.57, region: "Pune" },
  { name: "Kolhapur", lat: 16.70, lng: 74.24, region: "Pune" },
  { name: "Satara", lat: 17.70, lng: 74.00, region: "Pune" },
  
  { name: "Mumbai", lat: 19.08, lng: 72.88, region: "Konkan" },
  { name: "Mumbai Suburban", lat: 19.15, lng: 72.85, region: "Konkan" },
  { name: "Thane", lat: 19.20, lng: 72.97, region: "Konkan" },
  { name: "Raigad", lat: 18.51, lng: 73.18, region: "Konkan" },
  { name: "Ratnagiri", lat: 17.00, lng: 73.30, region: "Konkan" },
  { name: "Sindhudurg", lat: 16.35, lng: 73.56, region: "Konkan" }
];

interface MaharashtraLeafletMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

export default function MaharashtraLeafletMap({
  regionSummary,
  regions,
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraLeafletMapProps): JSX.Element {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [geoJsonLayer, setGeoJsonLayer] = useState<L.GeoJSON | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Get region color based on metric
  const getRegionColor = (regionName: string) => {
    if (!regions) return '#cccccc'; // Default color

    const region = regions.find(r => r.region_name === regionName);
    if (!region) return '#cccccc';
    
    let percentage = 0;
    
    if (metric === 'completion') {
      percentage = region.fully_completed_schemes / region.total_schemes_integrated * 100 || 0;
    } else if (metric === 'esr') {
      percentage = region.fully_completed_esr / region.total_esr_integrated * 100 || 0;
    } else if (metric === 'villages') {
      percentage = region.fully_completed_villages / region.total_villages_integrated * 100 || 0;
    } else if (metric === 'flow_meter') {
      percentage = region.flow_meter_integrated / region.total_schemes_integrated * 100 || 0;
    }
    
    // Color based on percentage
    if (percentage >= 75) {
      return '#4ade80'; // green-400 for high completion
    } else if (percentage >= 50) {
      return '#a3e635'; // lime-400 for medium-high completion
    } else if (percentage >= 25) {
      return '#facc15'; // yellow-400 for medium-low completion
    } else {
      return '#f87171'; // red-400 for low completion
    }
  };

  // Style function for GeoJSON
  const style = (feature: any) => {
    const regionId = feature.properties.id;
    return {
      fillColor: getRegionColor(regionId),
      weight: selectedRegion === regionId || hoveredRegion === regionId ? 2 : 1,
      opacity: 1,
      color: selectedRegion === regionId || hoveredRegion === regionId ? '#2563eb' : '#666',
      fillOpacity: 0.7,
      className: `region-${regionId}`
    };
  };

  // Initialize map only once and handle updates separately
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    
    let mapRef: L.Map | null = null;
    let geoJsonLayerRef: L.GeoJSON | null = null;
    
    // Function to create and initialize the map
    const initializeMap = () => {
      // First make sure any existing map is properly removed
      if (mapInstance) {
        mapInstance.remove();
        setMapInstance(null);
        setGeoJsonLayer(null);
      }
      
      // Check if the container exists
      const container = document.getElementById('maharashtra-map');
      if (!container) {
        console.error('Map container not found');
        return;
      }
      
      // Need to clean any existing content to avoid conflicts
      container.innerHTML = '';
      
      // Create map
      const map = L.map('maharashtra-map', {
        center: [19.7515, 75.7139], // Centered on Maharashtra
        zoom: 7,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        boxZoom: false,
        doubleClickZoom: false
      });
      
      // Save reference for cleanup
      mapRef = map;
      
      // Add dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 8,
      }).addTo(map);
    
      // Add GeoJSON layer
      const geojson = L.geoJSON(maharashtraGeoJson as any, {
        style: style,
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            const regionId = feature.properties.id;
            
            // Add hover effects
            layer.on({
              mouseover: () => {
                setHoveredRegion(regionId);
                if (layer instanceof L.Path) {
                  layer.setStyle({
                    weight: 2,
                    color: '#2563eb'
                  });
                }
              },
              mouseout: () => {
                setHoveredRegion(null);
                geojson.resetStyle(layer);
              },
              click: () => {
                onRegionClick(regionId);
              }
            });
          }
        }
      }).addTo(map);
      
      // Save reference for cleanup and updates
      geoJsonLayerRef = geojson;
      
      // Add pins
      const customIcon = L.divIcon({
        className: 'custom-pin-icon',
        html: `<div style="background-color: #FF4136; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; position: relative;">
                <div style="position: absolute; width: 10px; height: 2px; background: #fff; left: 2px; top: 6px;"></div>
                <div style="position: absolute; width: 2px; height: 10px; background: #fff; left: 6px; top: 2px;"></div>
              </div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      
      regionPins.forEach(pin => {
        L.marker([pin.lat, pin.lng], { 
          icon: customIcon
        }).addTo(map);
      });
      
      // Add district labels
      districtData.forEach(district => {
        L.marker([district.lat, district.lng], {
          icon: L.divIcon({
            className: 'district-label',
            html: `<div style="color: white; font-size: 10px; white-space: nowrap; text-shadow: 0 0 2px #000;">${district.name}</div>`,
            iconSize: [100, 20],
            iconAnchor: [50, 10]
          })
        }).addTo(map);
      });
      
      // Add region labels (larger)
      regionPins.forEach(pin => {
        L.marker([pin.lat, pin.lng], {
          icon: L.divIcon({
            className: 'region-label',
            html: `<div style="color: white; font-size: 14px; font-weight: bold; white-space: nowrap; text-shadow: 0 0 3px #000; margin-top: 15px;">${pin.name}</div>`,
            iconSize: [120, 20],
            iconAnchor: [60, 0]
          })
        }).addTo(map);
      });
      
      // Create and add legend control
      const legend = new L.Control({ position: 'bottomright' });
      legend.onAdd = (map: L.Map) => {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.background = '#0a1033';
        div.style.color = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '4px';
        div.style.border = '1px solid rgba(255,255,255,0.3)';
        
        div.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px;">Regions</div>';
        
        const regions = [
          { name: 'Amravati', color: '#ffccaa' },
          { name: 'Nagpur', color: '#ffd699' },
          { name: 'Chhatrapati Sambhaji Nagar', color: '#ccdeff' },
          { name: 'Nashik', color: '#ffeb99' },
          { name: 'Pune', color: '#adebad' },
          { name: 'Konkan', color: '#c2c2c2' }
        ];
        
        regions.forEach(region => {
          div.innerHTML += `<div style="margin-top: 5px;">
            <span style="display: inline-block; width: 15px; height: 15px; background: ${region.color}; margin-right: 5px;"></span>
            <span>${region.name}</span>
          </div>`;
        });
        
        return div;
      };
      legend.addTo(map);
      
      // Create and add compass rose control
      const compass = new L.Control({ position: 'bottomleft' });
      compass.onAdd = (map: L.Map) => {
        const div = L.DomUtil.create('div', 'compass-rose');
        div.innerHTML = `
          <svg width="50" height="50" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="22" fill="none" stroke="#ffffff" stroke-width="1" />
            <path d="M25,7 L25,43 M7,25 L43,25" stroke="#ffffff" stroke-width="1" />
            <path d="M12,12 L38,38 M12,38 L38,12" stroke="#ffffff" stroke-width="1" />
            <circle cx="25" cy="25" r="3" fill="#ffffff" stroke="#ffffff" stroke-width="0.5" />
            <text x="25" y="5" text-anchor="middle" fill="#ffffff" font-size="10px">N</text>
            <text x="25" y="48" text-anchor="middle" fill="#ffffff" font-size="10px">S</text>
            <text x="3" y="27" text-anchor="middle" fill="#ffffff" font-size="10px">W</text>
            <text x="47" y="27" text-anchor="middle" fill="#ffffff" font-size="10px">E</text>
          </svg>
        `;
        return div;
      };
      compass.addTo(map);
      
      // Create and add metric legend control
      const metricLegend = new L.Control({ position: 'bottomleft' });
      metricLegend.onAdd = (map: L.Map) => {
        const div = L.DomUtil.create('div', 'metric-legend');
        div.style.background = '#0a1033';
        div.style.color = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '4px';
        div.style.border = '1px solid rgba(255,255,255,0.3)';
        div.style.marginBottom = '60px';
        
        let metricTitle = '';
        if (metric === 'completion') metricTitle = 'Scheme Completion';
        if (metric === 'esr') metricTitle = 'ESR Integration';
        if (metric === 'villages') metricTitle = 'Village Integration';
        if (metric === 'flow_meter') metricTitle = 'Flow Meter Progress';
        
        div.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">${metricTitle}</div>
          <div style="margin-top: 5px; font-size: 11px;">
            <span style="display: inline-block; width: 12px; height: 12px; background: #4ade80; margin-right: 5px;"></span>
            <span>75-100%</span>
          </div>
          <div style="margin-top: 5px; font-size: 11px;">
            <span style="display: inline-block; width: 12px; height: 12px; background: #a3e635; margin-right: 5px;"></span>
            <span>50-74%</span>
          </div>
          <div style="margin-top: 5px; font-size: 11px;">
            <span style="display: inline-block; width: 12px; height: 12px; background: #facc15; margin-right: 5px;"></span>
            <span>25-49%</span>
          </div>
          <div style="margin-top: 5px; font-size: 11px;">
            <span style="display: inline-block; width: 12px; height: 12px; background: #f87171; margin-right: 5px;"></span>
            <span>0-24%</span>
          </div>
        `;
        
        return div;
      };
      metricLegend.addTo(map);
      
      // Update state with map instances
      setMapInstance(map);
      setGeoJsonLayer(geojson);
    };
    
    // Initialize map with a small delay to ensure the DOM is ready
    const timeoutId = setTimeout(initializeMap, 300);
    
    // Cleanup on unmount or re-render
    return () => {
      clearTimeout(timeoutId);
      
      // Clean up map if it was created in this effect
      if (mapRef) {
        mapRef.remove();
      }
      
      // Also clean up from state if needed
      if (mapInstance && mapInstance !== mapRef) {
        mapInstance.remove();
      }
    };
  }, []); // Only run once on mount

  // Update map styles when selectedRegion or metric changes
  useEffect(() => {
    if (geoJsonLayer) {
      // Need to use any here because of TypeScript limitations with Leaflet
      (geoJsonLayer as any).setStyle(style);
    }
  }, [geoJsonLayer, selectedRegion, metric, regions, hoveredRegion, style]);

  return (
    <Card className={isLoading ? "opacity-50" : ""}>
      <CardContent className="p-3 sm:p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm sm:text-base font-medium text-neutral-700">
            Maharashtra Regions
          </h3>
          {selectedRegion !== "all" && (
            <div className="text-xs sm:text-sm text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-md">
              Region: {selectedRegion}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-[400px] w-full rounded-md" />
          </div>
        ) : (
          <div className="relative w-full">
            <div id="maharashtra-map" style={{ height: '500px', backgroundColor: '#0a1033' }}></div>
            
            {selectedRegion !== "all" && (
              <div className="mt-4 text-center">
                <span className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full text-sm font-medium shadow-sm">
                  {selectedRegion} Region Selected
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}