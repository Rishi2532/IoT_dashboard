import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Region, RegionSummary } from '@/types';
import L, { PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  maharashtraGeoJson, 
  regionColors, 
  regionNames, 
  getFeatureCenter,
  getFeaturesByRegion,
  MaharashtraFeatureProperties 
} from '@/data/maharashtra-geojson';

interface GISMaharashtraMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages';
  isLoading?: boolean;
}

export default function GISMaharashtraMap({
  regionSummary,
  regions,
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: GISMaharashtraMapProps): JSX.Element {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Get percentage for metric display
  const getPercentage = (regionName: string) => {
    if (!regions) return 0;
    
    const region = regions.find(r => r.region_name === regionName);
    if (!region) return 0;
    
    let percentage = 0;
    
    if (metric === 'completion') {
      percentage = region.fully_completed_schemes / region.total_schemes_integrated * 100 || 0;
    } else if (metric === 'esr') {
      percentage = region.fully_completed_esr / region.total_esr_integrated * 100 || 0;
    } else if (metric === 'villages') {
      percentage = region.fully_completed_villages / region.total_villages_integrated * 100 || 0;
    }
    
    return Math.min(Math.round(percentage), 100);
  };
  
  // Get metric value for tooltip
  const getMetricValue = (regionName: string) => {
    if (!regions) return '';
    
    const region = regions.find(r => r.region_name === regionName);
    if (!region) return '';
    
    if (metric === 'completion') {
      return `${region.fully_completed_schemes}/${region.total_schemes_integrated}`;
    } else if (metric === 'esr') {
      return `${region.fully_completed_esr}/${region.total_esr_integrated}`;
    } else if (metric === 'villages') {
      return `${region.fully_completed_villages}/${region.total_villages_integrated}`;
    }
    
    return '';
  };
  
  // Get color based on region name to match reference image
  const getColor = (regionName: string): string => {
    // Custom vibrant colors matching the reference image
    const regionColorMap: Record<string, string> = {
      'Nashik': '#8CB3E2',         // Light blue
      'Amravati': '#ff7300',       // Orange 
      'Nagpur': '#E2B8B8',         // Light red/pink
      'Chhatrapati Sambhajinagar': '#68A9A9', // Teal green
      'Pune': '#FFC408',           // Yellow
      'Konkan': '#4A77BB'          // Blue
    };
    
    return regionColorMap[regionName] || '#cccccc';
  };
  
  // Initialize map
  useEffect(() => {
    if (isLoading || !mapRef.current) return;
    
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
    }
    
    // Create the map centered on Maharashtra
    const map = L.map(mapRef.current, {
      center: [18.5, 76], // Maharashtra's approximate center
      zoom: 7,
      minZoom: 6,   // Allow slightly more zoom out for better context
      maxZoom: 10,  // Allow more zoom in for detailed view
      zoomControl: false, // We'll add custom zoom controls
      attributionControl: false,
      scrollWheelZoom: true, // Explicitly enable scroll wheel zoom
      wheelDebounceTime: 50, // Make wheel zooming more responsive
      wheelPxPerZoomLevel: 60, // Adjust scroll sensitivity
      maxBounds: L.latLngBounds(
        L.latLng(14.5, 72.5),  // Southwest coordinates
        L.latLng(22.5, 82.5)   // Northeast coordinates
      ),  // Set bounds to Maharashtra state area only
    });
    
    // Set light blue tile layer for better visual appeal
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    
    // Add white background outline (larger)
    L.geoJSON(maharashtraGeoJson, {
      style: {
        fillOpacity: 0,
        weight: 10,             // Thicker white border first
        color: '#ffffff',       // Pure white for contrast
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }
    }).addTo(map);
    
    // Add a shadow outline for depth effect
    L.geoJSON(maharashtraGeoJson, {
      style: {
        fillOpacity: 0,
        weight: 8,
        color: 'rgba(0,0,0,0.3)', // Shadow color
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }
    }).addTo(map);
    
    // Add main black outline (like the example image)
    L.geoJSON(maharashtraGeoJson, {
      style: {
        fillOpacity: 0,
        weight: 3,              // Solid black border
        color: '#000000',
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }
    }).addTo(map);
    
    // Add GeoJSON data
    const geoJsonLayer = L.geoJSON(maharashtraGeoJson, {
      style: (feature) => {
        if (!feature || !feature.properties) return {};
        
        const regionName = feature.properties.region;
        const isSelected = regionName === selectedRegion;
        
        return {
          fillColor: getColor(regionName),
          weight: 2,  // Thicker borders for all regions like in the reference image
          opacity: 1,
          color: '#000000',  // Black borders for all regions
          fillOpacity: 0.9  // Solid fill colors for all regions
        };
      },
      onEachFeature: (feature, layer) => {
        if (!feature.properties) return;
        
        const regionName = feature.properties.region;
        const districtName = feature.properties.name;
        
        // Add tooltip
        layer.bindTooltip(`
          <div style="text-align: center;">
            <strong>${districtName}</strong><br>
            Region: ${regionName}<br>
            ${metric === 'esr' ? 'ESR Integration' : 
              metric === 'villages' ? 'Village Completion' : 
              'Scheme Completion'}: ${getMetricValue(regionName)}
          </div>
        `, {
          permanent: false,
          direction: 'top',
          className: 'custom-tooltip'
        });
        
        // Add click event 
        const polygonLayer = layer as unknown as L.Polygon;
        
        polygonLayer.on({
          click: () => {
            onRegionClick(regionName);
          },
          mouseover: () => {
            polygonLayer.setStyle({
              weight: 2,
              color: '#2563eb',
              fillOpacity: 0.9
            });
          },
          mouseout: () => {
            if (regionName !== selectedRegion) {
              geoJsonLayer.resetStyle(polygonLayer);
            }
          }
        });
      }
    }).addTo(map);
    
    geojsonLayerRef.current = geoJsonLayer;
    
    // Add a layer group for markers
    const markersLayer = L.layerGroup().addTo(map);
    
    // Add region markers (pins)
    regionNames.forEach(regionName => {
      const features = getFeaturesByRegion(regionName);
      if (features.length > 0) {
        const feature = features[0];
        const center = getFeatureCenter(feature);
        
        // Create custom marker icon (without ESR water tank per requirement)
        const markerIcon = L.divIcon({
          className: 'custom-marker-icon',
          html: `
            <div class="marker-pin" style="background-color: #2563eb; border: 1.5px solid white; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.3);">
              <div style="background-color: #3b82f6; width: 6px; height: 6px; border-radius: 50%; position: absolute; top: 5px; left: 5px; border: 0.5px solid white;"></div>
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        
        // Add marker
        const marker = L.marker([center[1], center[0]], { icon: markerIcon }).addTo(markersLayer);
        
        // Add label with positioning adjustments to prevent overlaps
        let labelAnchorX = 60;
        let labelAnchorY = 25;
        
        // Custom positioning for specific regions to prevent overlapping
        // Based on the reference image positioning
        if (regionName === 'Chhatrapati Sambhajinagar') {
          labelAnchorX = 120; // Move C.S. Nagar label more to the right
          labelAnchorY = 30;  // Position below marker
        } else if (regionName === 'Pune') {
          labelAnchorX = 60;
          labelAnchorY = 35;  // Position below marker
        } else if (regionName === 'Nagpur') {
          labelAnchorX = 60;
          labelAnchorY = 35;  // Position below marker
        } 
        // Position Nashik, Amravati, and Konkan with more spacing
        else if (regionName === 'Nashik') {
          labelAnchorX = 30;
          labelAnchorY = -15;  // Position further above marker
        } else if (regionName === 'Amravati') {
          labelAnchorX = 60;
          labelAnchorY = -15;  // Position further above marker
        } else if (regionName === 'Konkan') {
          labelAnchorX = 50;
          labelAnchorY = 15;  // Position slightly above and to the left
        }
        
        const labelIcon = L.divIcon({
          className: 'region-label',
          html: `<div style="color: #333; font-weight: bold; text-shadow: 0 1px 3px rgba(255,255,255,0.8); font-size: 14px; white-space: nowrap;">${regionName}</div>`,
          iconSize: [120, 20],
          iconAnchor: [labelAnchorX, labelAnchorY]
        });
        
        L.marker([center[1], center[0]], { icon: labelIcon, interactive: false }).addTo(markersLayer);
        
        // Add marker click event
        marker.on('click', () => {
          onRegionClick(regionName);
        });
        
        // Add pulse effect for selected region
        if (regionName === selectedRegion) {
          // Create a pulse effect with CSS
          const pulseIcon = L.divIcon({
            className: 'custom-pulse-icon',
            html: `
              <div class="pulse-circle" style="position: absolute; top: -12px; left: -12px; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #2563eb; opacity: 0.7; background: transparent; animation: pulse 1.5s infinite;">
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          
          L.marker([center[1], center[0]], { icon: pulseIcon, interactive: false }).addTo(markersLayer);
          
          // Add CSS for pulse animation
          const style = document.createElement('style');
          style.innerHTML = `
            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.7; }
              70% { transform: scale(3); opacity: 0; }
              100% { transform: scale(1); opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }
      }
    });
    
    markersLayerRef.current = markersLayer;
    
    // Add scale bar
    new L.Control.Scale({
      position: 'bottomleft',
      imperial: false,
      maxWidth: 200
    }).addTo(map);
    
    // Add custom zoom controls
    const zoomControl = new L.Control({ position: 'topright' });
    zoomControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'custom-zoom-control');
      div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      div.style.padding = '6px';
      div.style.borderRadius = '4px';
      div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
      div.style.margin = '10px';
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      div.style.gap = '6px';
      
      const zoomInButton = document.createElement('button');
      zoomInButton.innerHTML = `
        <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">+</div>
      `;
      zoomInButton.style.backgroundColor = 'white';
      zoomInButton.style.border = '1px solid rgba(0,0,0,0.2)';
      zoomInButton.style.borderRadius = '4px';
      zoomInButton.style.cursor = 'pointer';
      zoomInButton.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      zoomInButton.title = 'Zoom in';
      
      const zoomOutButton = document.createElement('button');
      zoomOutButton.innerHTML = `
        <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">−</div>
      `;
      zoomOutButton.style.backgroundColor = 'white';
      zoomOutButton.style.border = '1px solid rgba(0,0,0,0.2)';
      zoomOutButton.style.borderRadius = '4px';
      zoomOutButton.style.cursor = 'pointer';
      zoomOutButton.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      zoomOutButton.title = 'Zoom out';
      
      const resetButton = document.createElement('button');
      resetButton.innerHTML = `
        <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
        </div>
      `;
      resetButton.style.backgroundColor = 'white';
      resetButton.style.border = '1px solid rgba(0,0,0,0.2)';
      resetButton.style.borderRadius = '4px';
      resetButton.style.cursor = 'pointer';
      resetButton.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      resetButton.title = 'Reset view';
      
      div.appendChild(zoomInButton);
      div.appendChild(zoomOutButton);
      div.appendChild(resetButton);
      
      // Add event listeners
      L.DomEvent.on(zoomInButton, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        map.zoomIn();
      });
      
      L.DomEvent.on(zoomOutButton, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        map.zoomOut();
      });
      
      L.DomEvent.on(resetButton, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        map.setView([18.5, 76], 7); // Reset to initial view
      });
      
      // Prevent clicks from propagating to the map (which would cause additional map actions)
      L.DomEvent.disableClickPropagation(div);
      
      return div;
    };
    zoomControl.addTo(map);
    
    // Add legend
    const legendControl = new L.Control({ position: 'bottomright' });
    legendControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      div.style.padding = '10px';
      div.style.borderRadius = '6px';
      div.style.color = '#333333';
      div.style.minWidth = '180px';
      div.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
      
      // Legend title
      div.innerHTML = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">Maharashtra Regions</h4>';
      
      // Metric type
      const metricTitle = metric === 'esr' ? 'ESR Integration' : 
                        metric === 'villages' ? 'Village Completion' : 
                        'Scheme Completion';
      
      div.innerHTML += `<div style="font-size: 10px; margin-bottom: 15px; color: rgba(0,0,0,0.6);">Showing: ${metricTitle}</div>`;
      
      // Region items
      const regionItems = [
        { name: 'Amravati', color: getColor('Amravati') },
        { name: 'Nagpur', color: getColor('Nagpur') },
        { name: 'C.S. Nagar', color: getColor('Chhatrapati Sambhajinagar') },
        { name: 'Nashik', color: getColor('Nashik') },
        { name: 'Pune', color: getColor('Pune') },
        { name: 'Konkan', color: getColor('Konkan') }
      ];
      
      regionItems.forEach(item => {
        const isSelected = item.name === selectedRegion;
        const displayName = item.name === 'C.S. Nagar' ? 'Chhatrapati Sambhajinagar' : item.name;
        
        div.innerHTML += `
          <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 5px; cursor: pointer;"
            onclick="document.dispatchEvent(new CustomEvent('region-legend-click', {detail: '${displayName}'}))">
            <div style="width: 15px; height: 15px; background-color: ${item.color}; border-radius: 2px; 
              margin-right: 8px; border: ${isSelected ? '1.5px' : '0.5px'} solid ${isSelected ? '#2563eb' : 'rgba(0,0,0,0.2)'};">
            </div>
            <span style="font-size: 11px; ${isSelected ? 'font-weight: bold;' : ''}">${item.name}</span>
            <span style="font-size: 10px; margin-left: auto; font-family: monospace;">${getMetricValue(displayName)}</span>
          </div>
        `;
      });
      
      div.innerHTML += `<div style="font-size: 8px; margin-top: 10px; color: rgba(0,0,0,0.5);">Click on a region to filter data</div>`;
      
      return div;
    };
    legendControl.addTo(map);
    
    // Custom event handler for legend clicks
    document.addEventListener('region-legend-click', ((e: CustomEvent) => {
      onRegionClick(e.detail);
    }) as EventListener);
    
    // Add compass
    const compassControl = new L.Control({ position: 'bottomleft' });
    compassControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'compass');
      div.style.width = '50px';
      div.style.height = '50px';
      div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      div.style.borderRadius = '50%';
      div.style.border = '1px solid rgba(0,0,0,0.2)';
      div.style.position = 'relative';
      div.style.marginBottom = '20px';
      div.style.marginLeft = '10px';
      div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
      
      div.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.4);"></div>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.2);"></div>
        <div style="position: absolute; top: 6%; left: 50%; transform: translateX(-50%); color: #333; font-weight: bold; font-size: 10px;">N</div>
        <div style="position: absolute; top: 50%; right: 6%; transform: translateY(-50%); color: #333; font-weight: bold; font-size: 10px;">E</div>
        <div style="position: absolute; bottom: 6%; left: 50%; transform: translateX(-50%); color: #333; font-weight: bold; font-size: 10px;">S</div>
        <div style="position: absolute; top: 50%; left: 6%; transform: translateY(-50%); color: #333; font-weight: bold; font-size: 10px;">W</div>
        <div style="position: absolute; top: 50%; left: 50%; width: 44px; height: 1px; background-color: rgba(0,0,0,0.5); transform: translate(-50%, -50%);"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 1px; height: 44px; background-color: rgba(0,0,0,0.5); transform: translate(-50%, -50%);"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; border-radius: 50%; background-color: rgba(255, 255, 255, 0.9); border: 1px solid rgba(0,0,0,0.3); transform: translate(-50%, -50%);"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 4px; height: 4px; border-radius: 50%; background-color: #2563eb; transform: translate(-50%, -50%);"></div>
      `;
      
      return div;
    };
    compassControl.addTo(map);
    
    leafletMapRef.current = map;
    
    return () => {
      // Remove event listener
      document.removeEventListener('region-legend-click', (() => {}) as EventListener);
      
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isLoading, regions, selectedRegion, metric, onRegionClick]);

  return (
    <div className={`h-full ${isLoading ? "opacity-50" : ""}`}>
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
        <div className="space-y-2 flex-1">
          <Skeleton className="h-full w-full rounded-md" style={{ minHeight: '650px' }} />
        </div>
      ) : (
        <div className="relative w-full h-full flex-1" style={{ overflow: 'hidden', minHeight: '650px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div 
            ref={mapRef}
            id="maharashtra-gis-map" 
            className="h-full w-full bg-[#f0f8ff]"
          ></div>
        </div>
      )}
    </div>
  );
}