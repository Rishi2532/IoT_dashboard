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

// We'll load the GeoJSON data from the file we created

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
  const [districtGeoJson, setDistrictGeoJson] = useState<any>(null);
  
  // Fetch the GeoJSON data when the component mounts
  useEffect(() => {
    fetch('/maharashtra_districts.json')
      .then(response => response.json())
      .then(data => {
        console.log('Loaded GeoJSON data:', data);
        setDistrictGeoJson(data);
      })
      .catch(error => {
        console.error('Error loading GeoJSON data:', error);
      });
  }, []);

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
    if (!feature || !feature.properties) {
      return {
        fillColor: '#cccccc',
        weight: 1,
        opacity: 1,
        color: '#666',
        fillOpacity: 0.7
      };
    }
    
    // For district GeoJSON, use the region property
    const regionId = feature.properties.region || feature.properties.id || '';
    
    return {
      fillColor: getRegionColor(regionId),
      weight: selectedRegion === regionId || hoveredRegion === regionId ? 2 : 1,
      opacity: 1,
      color: selectedRegion === regionId || hoveredRegion === regionId ? '#2563eb' : '#666',
      fillOpacity: 0.7,
      className: `region-${regionId.replace ? regionId.replace(/\s+/g, '-').toLowerCase() : ''}`
    };
  };

  // Initialize map only once and handle updates separately
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!districtGeoJson) return undefined; // Wait for GeoJSON data to be loaded
    
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
      
      console.log('Initializing Leaflet map...');
      // Create map
      const map = L.map('maharashtra-map', {
        center: [19.7515, 75.7139], // Centered on Maharashtra
        zoom: 7,
        zoomControl: true, // Enable controls for debugging
        attributionControl: true,
        scrollWheelZoom: true, // Allow interaction for debugging
        dragging: true,
        boxZoom: true,
        doubleClickZoom: true
      });
      
      console.log('Map created:', map);
      // Save reference for cleanup
      mapRef = map;
      
      // Use a lighter OpenStreetMap tile layer more similar to the reference image
      console.log('Adding tile layer...');
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 5,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      tileLayer.addTo(map);
      console.log('Tile layer added');
    
      // Add simpler GeoJSON layer with minimal styling to match the reference image
      console.log('Adding GeoJSON layer...', districtGeoJson);
      const geojson = L.geoJSON(districtGeoJson, {
        style: (feature) => {
          if (!feature || !feature.properties) {
            return {
              fillColor: 'transparent',
              weight: 0.5,
              opacity: 0.5,
              color: '#aaa',
              fillOpacity: 0
            };
          }
          
          // Get the region for this district
          const region = feature.properties.region || '';
          
          // Use very light styling for the geojson shapes to focus on the pin markers
          return {
            fillColor: 'transparent',
            weight: selectedRegion === region || hoveredRegion === region ? 1.5 : 0.7,
            opacity: 0.7,
            color: selectedRegion === region || hoveredRegion === region ? '#2563eb' : '#aaa',
            fillOpacity: 0,
            dashArray: '2,2',
            className: `region-${region.replace ? region.replace(/\s+/g, '-').toLowerCase() : ''}`
          };
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            const regionId = feature.properties.region;
            
            // Add hover effects but with minimal styling
            layer.on({
              mouseover: () => {
                setHoveredRegion(regionId);
                if (layer instanceof L.Path) {
                  layer.setStyle({
                    weight: 1.5,
                    color: '#2563eb',
                    dashArray: null
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
      console.log('GeoJSON layer added');
      
      // Save reference for cleanup and updates
      geoJsonLayerRef = geojson;
      
      // Create a location pin marker icon
      const locationMarkerIcon = L.divIcon({
        className: 'location-marker-icon',
        html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.383 0 0 5.383 0 12C0 18.249 11.217 32 12 32C12.783 32 24 18.249 24 12C24 5.383 18.617 0 12 0Z" fill="#2563EB"/>
                <circle cx="12" cy="12" r="6" fill="white"/>
               </svg>`,
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -32]
      });
      
      // Add location markers for each region
      regionPins.forEach(pin => {
        const marker = L.marker([pin.lat, pin.lng], { 
          icon: locationMarkerIcon
        });
        
        // Add click handler to select the region
        marker.on('click', () => {
          onRegionClick(pin.name);
        });
        
        // Add popup with region name and any available stats
        const region = regions?.find(r => r.region_name === pin.name);
        let popupContent = `<div style="font-weight: bold; color: #2563EB;">${pin.name}</div>`;
        
        if (region) {
          let statText = '';
          if (metric === 'completion') {
            statText = `${region.fully_completed_schemes}/${region.total_schemes_integrated} schemes complete`;
          } else if (metric === 'esr') {
            statText = `${region.fully_completed_esr}/${region.total_esr_integrated} ESRs complete`;
          } else if (metric === 'villages') {
            statText = `${region.fully_completed_villages}/${region.total_villages_integrated} villages complete`;
          } else if (metric === 'flow_meter') {
            statText = `${region.flow_meter_integrated} flow meters installed`;
          }
          
          if (statText) {
            popupContent += `<div style="margin-top: 5px; font-size: 12px;">${statText}</div>`;
          }
        }
        
        marker.bindPopup(popupContent);
        marker.addTo(map);
      });
      
      // Add district labels
      districtData.forEach(district => {
        L.marker([district.lat, district.lng], {
          icon: L.divIcon({
            className: 'district-label',
            html: `<div style="color: #333; font-size: 10px; white-space: nowrap; text-shadow: 0 0 2px #fff; font-weight: bold;">${district.name}</div>`,
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
            html: `<div style="color: #1e40af; font-size: 14px; font-weight: bold; white-space: nowrap; text-shadow: 0 0 3px #ffffff; margin-top: 15px;">${pin.name}</div>`,
            iconSize: [120, 20],
            iconAnchor: [60, 0]
          })
        }).addTo(map);
      });
      
      // Create and add scheme completion legend in the right side similar to the reference design
      const schemeCompletionLegend = new L.Control({ position: 'topright' });
      schemeCompletionLegend.onAdd = (map: L.Map) => {
        const div = L.DomUtil.create('div', 'scheme-completion-legend');
        div.style.background = '#ffffff';
        div.style.color = '#333333';
        div.style.padding = '15px';
        div.style.width = '220px';
        div.style.borderRadius = '6px';
        div.style.border = '1px solid rgba(0,0,0,0.1)';
        div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
        div.style.marginTop = '10px';
        div.style.marginRight = '10px';
        
        // Get region stats based on the current data
        const regionStats = [];
        if (regions) {
          regions.forEach(region => {
            let completed = 0;
            let total = 0;
            
            if (metric === 'completion') {
              completed = region.fully_completed_schemes;
              total = region.total_schemes_integrated;
            } else if (metric === 'esr') {
              completed = region.fully_completed_esr;
              total = region.total_esr_integrated;
            } else if (metric === 'villages') {
              completed = region.fully_completed_villages;
              total = region.total_villages_integrated;
            }
            
            regionStats.push({
              name: region.region_name,
              completed,
              total
            });
          });
        }
        
        // Home icon and title
        div.innerHTML = `
          <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
            <div style="width: 18px; height: 18px; margin-right: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div style="font-weight: bold; font-size: 14px;">Maharashtra Regions</div>
          </div>
        `;
        
        // Scheme Completion title
        div.innerHTML += `
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <div style="font-size: 12px; margin-left: 5px; color: #666;">Scheme Completion</div>
          </div>
        `;
        
        // Region completion stats
        regionStats.forEach(stat => {
          const color = '#2563EB'; // Blue color for all regions
          div.innerHTML += `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
              <div style="display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background-color: ${color}; margin-right: 8px;"></div>
                <div style="font-size: 13px;">${stat.name}</div>
              </div>
              <div style="font-size: 13px; font-weight: 500;">${stat.completed}/${stat.total}</div>
            </div>
          `;
        });
        
        // Note text
        div.innerHTML += `
          <div style="margin-top: 15px; font-size: 11px; color: #666; display: flex; align-items: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span style="margin-left: 5px;">Click on a region to filter dashboard data</span>
          </div>
        `;
        
        return div;
      };
      schemeCompletionLegend.addTo(map);
      
      // Create and add compass rose control
      const compass = new L.Control({ position: 'bottomleft' });
      compass.onAdd = (map: L.Map) => {
        const div = L.DomUtil.create('div', 'compass-rose');
        div.innerHTML = `
          <svg width="50" height="50" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="22" fill="white" stroke="#2563eb" stroke-width="1.5" />
            <path d="M25,7 L25,43 M7,25 L43,25" stroke="#2563eb" stroke-width="1" />
            <path d="M12,12 L38,38 M12,38 L38,12" stroke="#2563eb" stroke-width="1" />
            <circle cx="25" cy="25" r="3" fill="#2563eb" stroke="#2563eb" stroke-width="0.5" />
            <text x="25" y="5" text-anchor="middle" fill="#2563eb" font-size="10px" font-weight="bold">N</text>
            <text x="25" y="48" text-anchor="middle" fill="#2563eb" font-size="10px" font-weight="bold">S</text>
            <text x="3" y="27" text-anchor="middle" fill="#2563eb" font-size="10px" font-weight="bold">W</text>
            <text x="47" y="27" text-anchor="middle" fill="#2563eb" font-size="10px" font-weight="bold">E</text>
          </svg>
        `;
        return div;
      };
      compass.addTo(map);
      
      // Create and add metric legend control
      const metricLegend = new L.Control({ position: 'bottomleft' });
      metricLegend.onAdd = (map: L.Map) => {
        const div = L.DomUtil.create('div', 'metric-legend');
        div.style.background = '#ffffff';
        div.style.color = '#333333';
        div.style.padding = '10px';
        div.style.borderRadius = '4px';
        div.style.border = '1px solid rgba(0,0,0,0.1)';
        div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
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
  }, [districtGeoJson, mapInstance, setMapInstance, setGeoJsonLayer, style, selectedRegion, hoveredRegion, onRegionClick, getRegionColor, metric]); // Run when district data is loaded

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
            <div id="maharashtra-map" style={{ height: '500px', backgroundColor: '#f0f8ff' }}></div>
            
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