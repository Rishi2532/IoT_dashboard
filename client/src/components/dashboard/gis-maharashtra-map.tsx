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
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
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
    } else if (metric === 'flow_meter') {
      // Just a simple presence percentage since there's no "completion" concept for flow meters
      percentage = (region.flow_meter_integrated > 0) ? 100 : 0;
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
    } else if (metric === 'flow_meter') {
      return `${region.flow_meter_integrated}`;
    }
    
    return '';
  };
  
  // Get color based on percentage
  const getColor = (regionName: string): string => {
    const defaultColor = regionColors[regionName] || '#cccccc';
    return defaultColor;
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
      minZoom: 6,
      maxZoom: 10,
      zoomControl: true,
      attributionControl: false,
    });
    
    // Set dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    
    // Add GeoJSON data
    const geoJsonLayer = L.geoJSON(maharashtraGeoJson, {
      style: (feature) => {
        if (!feature || !feature.properties) return {};
        
        const regionName = feature.properties.region;
        const isSelected = regionName === selectedRegion;
        
        return {
          fillColor: getColor(regionName),
          weight: isSelected ? 2 : 1,
          opacity: 1,
          color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)',
          fillOpacity: isSelected ? 0.9 : 0.7
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
              metric === 'flow_meter' ? 'Flow Meter Integration' : 
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
              color: '#ffffff',
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
        
        // Create custom marker icon
        const markerIcon = L.divIcon({
          className: 'custom-marker-icon',
          html: `
            <div class="marker-pin" style="background-color: #FF4136; border: 1.5px solid white; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
              <div style="background-color: #ff6b63; width: 6px; height: 6px; border-radius: 50%; position: absolute; top: 5px; left: 5px; border: 0.5px solid white;"></div>
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        
        // Add marker
        const marker = L.marker([center[1], center[0]], { icon: markerIcon }).addTo(markersLayer);
        
        // Add label
        const labelIcon = L.divIcon({
          className: 'region-label',
          html: `<div style="color: white; font-weight: bold; text-shadow: 0 1px 3px rgba(0,0,0,0.8); font-size: 14px;">${regionName}</div>`,
          iconSize: [120, 20],
          iconAnchor: [60, 25]
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
              <div class="pulse-circle" style="position: absolute; top: -12px; left: -12px; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; opacity: 0.7; background: transparent; animation: pulse 1.5s infinite;">
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
    
    // Add legend
    const legendControl = new L.Control({ position: 'bottomright' });
    legendControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.backgroundColor = 'rgba(10, 16, 51, 0.9)';
      div.style.padding = '10px';
      div.style.borderRadius = '6px';
      div.style.color = 'white';
      div.style.minWidth = '180px';
      div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.7)';
      
      // Legend title
      div.innerHTML = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">Maharashtra Regions</h4>';
      
      // Metric type
      const metricTitle = metric === 'esr' ? 'ESR Integration' : 
                        metric === 'villages' ? 'Village Completion' :
                        metric === 'flow_meter' ? 'Flow Meter Integration' : 
                        'Scheme Completion';
      
      div.innerHTML += `<div style="font-size: 10px; margin-bottom: 15px; color: rgba(255,255,255,0.7);">Showing: ${metricTitle}</div>`;
      
      // Region items
      const regionItems = [
        { name: 'Amaravati', color: regionColors['Amravati'] },
        { name: 'Nagpur', color: regionColors['Nagpur'] },
        { name: 'C.S. Nagar', color: regionColors['Chhatrapati Sambhajinagar'] },
        { name: 'Nashik', color: regionColors['Nashik'] },
        { name: 'Pune', color: regionColors['Pune'] },
        { name: 'Konkan', color: regionColors['Konkan'] }
      ];
      
      regionItems.forEach(item => {
        const isSelected = item.name === selectedRegion;
        const displayName = item.name === 'C.S. Nagar' ? 'Chhatrapati Sambhajinagar' : item.name;
        
        div.innerHTML += `
          <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 5px; cursor: pointer;"
            onclick="document.dispatchEvent(new CustomEvent('region-legend-click', {detail: '${displayName}'}))">
            <div style="width: 15px; height: 15px; background-color: ${item.color}; border-radius: 2px; 
              margin-right: 8px; border: ${isSelected ? '1.5px' : '0.5px'} solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)'};">
            </div>
            <span style="font-size: 11px; ${isSelected ? 'font-weight: bold;' : ''}">${item.name}</span>
            <span style="font-size: 10px; margin-left: auto; font-family: monospace;">${getMetricValue(displayName)}</span>
          </div>
        `;
      });
      
      div.innerHTML += `<div style="font-size: 8px; margin-top: 10px; color: rgba(255,255,255,0.6);">Click on a region to filter data</div>`;
      
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
      div.style.backgroundColor = 'rgba(10, 16, 51, 1)';
      div.style.borderRadius = '50%';
      div.style.border = '1px solid rgba(255,255,255,0.5)';
      div.style.position = 'relative';
      div.style.marginBottom = '20px';
      div.style.marginLeft = '10px';
      div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      
      div.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 44px; height: 44px; border-radius: 50%; border: 1px solid white;"></div>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3);"></div>
        <div style="position: absolute; top: 6%; left: 50%; transform: translateX(-50%); color: white; font-weight: bold; font-size: 10px;">N</div>
        <div style="position: absolute; top: 50%; right: 6%; transform: translateY(-50%); color: white; font-weight: bold; font-size: 10px;">E</div>
        <div style="position: absolute; bottom: 6%; left: 50%; transform: translateX(-50%); color: white; font-weight: bold; font-size: 10px;">S</div>
        <div style="position: absolute; top: 50%; left: 6%; transform: translateY(-50%); color: white; font-weight: bold; font-size: 10px;">W</div>
        <div style="position: absolute; top: 50%; left: 50%; width: 44px; height: 1px; background-color: white; transform: translate(-50%, -50%);"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 1px; height: 44px; background-color: white; transform: translate(-50%, -50%);"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; border-radius: 50%; background-color: rgba(10, 16, 51, 1); border: 1px solid white; transform: translate(-50%, -50%);"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 4px; height: 4px; border-radius: 50%; background-color: white; transform: translate(-50%, -50%);"></div>
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
          <div className="relative w-full" style={{ height: '500px', overflow: 'hidden' }}>
            <div 
              ref={mapRef}
              id="maharashtra-gis-map" 
              className="h-full w-full bg-[#0a1033]"
            ></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}