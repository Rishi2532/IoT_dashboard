import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Region, RegionSummary } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as d3 from 'd3';

interface MaharashtraMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

// Define region boundaries (GeoJSON-like structure for Maharashtra regions)
const regionBoundaries = {
  "Nagpur": {
    color: "#E8CEAD", // Light brown/beige
    path: "M580,70 L780,70 L780,250 L580,250 Z",
    center: [670, 100],
    districts: [
      { name: "Bhandara", position: [725, 100] },
      { name: "Gondia", position: [760, 80] },
      { name: "Wardha", position: [595, 140] },
      { name: "Chandrapur", position: [675, 180] },
      { name: "Gadchiroli", position: [720, 250] }
    ]
  },
  "Amravati": {
    color: "#F8BFC7", // Light pink
    path: "M390,90 L580,90 L580,210 L500,230 L390,210 Z",
    center: [515, 115],
    districts: [
      { name: "Akola", position: [460, 140] },
      { name: "Washim", position: [455, 180] },
      { name: "Yavatmal", position: [505, 195] },
      { name: "Buldhana", position: [390, 165] }
    ]
  },
  "Chhatrapati Sambhajinagar": {
    color: "#C0D1F0", // Light blue
    path: "M320,210 L500,210 L520,290 L420,340 L320,360 Z",
    center: [318, 218],
    districts: [
      { name: "Jalna", position: [400, 218] },
      { name: "Parbhani", position: [430, 245] },
      { name: "Hingoli", position: [465, 255] },
      { name: "Nanded", position: [500, 265] },
      { name: "Beed", position: [350, 280] },
      { name: "Latur", position: [425, 300] },
      { name: "Dharashiv", position: [380, 340] }
    ]
  },
  "Nashik": {
    color: "#F1E476", // Yellow
    path: "M120,125 L340,125 L340,210 L270,260 L120,275 Z",
    center: [180, 185],
    districts: [
      { name: "Dhule", position: [215, 140] },
      { name: "Jalgaon", position: [300, 125] },
      { name: "Nandurbar", position: [160, 100] },
      { name: "Ahmadnagar", position: [270, 260] },
      { name: "Palghar", position: [120, 170] }
    ]
  },
  "Pune": {
    color: "#ADEBAD", // Light green
    path: "M150,280 L320,280 L380,340 L380,480 L150,480 Z",
    center: [230, 340],
    districts: [
      { name: "Solapur", position: [320, 380] },
      { name: "Sangli", position: [230, 420] },
      { name: "Kolhapur", position: [190, 460] },
      { name: "Satara", position: [230, 380] }
    ]
  },
  "Konkan": {
    color: "#BFC0C0", // Gray
    path: "M50,280 L150,280 L150,500 L50,500 Z",
    center: [100, 420],
    districts: [
      { name: "Mumbai", position: [60, 320] },
      { name: "Mumbai Suburban", position: [60, 300] },
      { name: "Thane", position: [100, 280] },
      { name: "Raigad", position: [120, 330] },
      { name: "Ratnagiri", position: [140, 390] },
      { name: "Sindhudurg", position: [120, 460] }
    ]
  }
};

export default function MaharashtraMap({
  regionSummary,
  regions,
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraMapProps): JSX.Element {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  
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
      percentage = region.flow_meter_integrated / region.total_schemes_integrated * 100 || 0;
    }
    
    return Math.round(percentage);
  };

  // Initialize the map with SVG rendering
  useEffect(() => {
    if (isLoading || !mapRef.current) return;

    const mapContainer = mapRef.current;
    
    // Clean any previous map instances
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    
    // Create a Leaflet map without tile layers (we'll use our custom SVG)
    const map = L.map(mapContainer, {
      center: [330, 290],
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      maxBounds: L.latLngBounds(L.latLng(0, 0), L.latLng(600, 800)),
      maxZoom: 10,
      minZoom: 6,
      crs: L.CRS.Simple
    });
    
    // Set custom bounds
    const bounds = L.latLngBounds(L.latLng(0, 0), L.latLng(600, 800));
    map.fitBounds(bounds);
    
    // Create an SVG overlay for the map
    const svgOverlay = L.svg().addTo(map);
    // Cast the SVG overlay to access its container
    const svgContainer = (svgOverlay as any)._container;
    const svg = d3.select(svgContainer);
    
    // Set the map background
    mapContainer.style.backgroundColor = '#0a1033';
    
    // Add region polygons
    Object.entries(regionBoundaries).forEach(([regionName, regionData]) => {
      // Create the region path
      const pathElement = svg.append('path')
        .attr('d', regionData.path)
        .attr('fill', regionData.color)
        .attr('opacity', regionName === selectedRegion ? 0.9 : 0.7)
        .attr('stroke', regionName === selectedRegion ? '#ffffff' : 'rgba(255,255,255,0.2)')
        .attr('stroke-width', regionName === selectedRegion ? 2 : 1)
        .style('cursor', 'pointer');
      
      // Add event listeners
      pathElement.on('mouseover', () => {
        setHoveredRegion(regionName);
        pathElement.attr('opacity', 0.9)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);
      });
      
      pathElement.on('mouseout', () => {
        if (regionName !== selectedRegion) {
          pathElement.attr('opacity', 0.7)
            .attr('stroke', 'rgba(255,255,255,0.2)')
            .attr('stroke-width', 1);
        }
        setHoveredRegion(null);
      });
      
      pathElement.on('click', () => {
        onRegionClick(regionName);
      });
      
      // Add district boundaries
      regionData.districts.forEach(district => {
        // Create a simple circle for each district
        svg.append('circle')
          .attr('cx', district.position[0])
          .attr('cy', district.position[1])
          .attr('r', 2)
          .attr('fill', '#ffffff')
          .attr('opacity', 0.5);
          
        // Add district name
        svg.append('text')
          .attr('x', district.position[0])
          .attr('y', district.position[1])
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('fill', '#ffffff')
          .attr('filter', 'drop-shadow(0px 1px 2px rgba(0,0,0,0.6))')
          .text(district.name);
          
        // Add outline for better readability
        svg.append('text')
          .attr('x', district.position[0])
          .attr('y', district.position[1])
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('stroke', '#0a1033')
          .attr('stroke-width', 3)
          .attr('fill', 'none')
          .attr('opacity', 0.4)
          .attr('paint-order', 'stroke')
          .text(district.name);
      });
      
      // Add region markers
      svg.append('circle')
        .attr('cx', regionData.center[0])
        .attr('cy', regionData.center[1])
        .attr('r', 8)
        .attr('fill', '#FF4136')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5)
        .attr('filter', 'drop-shadow(0px 2px 3px rgba(0,0,0,0.5))');
        
      svg.append('circle')
        .attr('cx', regionData.center[0])
        .attr('cy', regionData.center[1])
        .attr('r', 3)
        .attr('fill', '#ff6b63')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 0.5);
        
      // Add region name
      svg.append('text')
        .attr('x', regionData.center[0])
        .attr('y', regionData.center[1] - 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .attr('filter', 'drop-shadow(0px 1px 3px rgba(0,0,0,0.8))')
        .text(regionName);
        
      svg.append('text')
        .attr('x', regionData.center[0])
        .attr('y', regionData.center[1] - 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('stroke', '#0a1033')
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .attr('opacity', 0.5)
        .text(regionName);
    });
    
    // Add compass rose
    const compass = svg.append('g').attr('transform', 'translate(50, 500)');
    compass.append('circle')
      .attr('cx', 25)
      .attr('cy', 25)
      .attr('r', 24)
      .attr('fill', '#0a1033')
      .attr('stroke', 'rgba(255,255,255,0.5)')
      .attr('stroke-width', 1)
      .attr('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))');
      
    compass.append('circle')
      .attr('cx', 25)
      .attr('cy', 25)
      .attr('r', 22)
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);
      
    compass.append('circle')
      .attr('cx', 25)
      .attr('cy', 25)
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.3)')
      .attr('stroke-width', 1);
      
    compass.append('path')
      .attr('d', 'M25,3 L25,47 M3,25 L47,25')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);
      
    compass.append('path')
      .attr('d', 'M10,10 L40,40 M10,40 L40,10')
      .attr('stroke', 'rgba(255,255,255,0.5)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,1');
      
    compass.append('circle')
      .attr('cx', 25)
      .attr('cy', 25)
      .attr('r', 4)
      .attr('fill', '#0a1033')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);
      
    compass.append('circle')
      .attr('cx', 25)
      .attr('cy', 25)
      .attr('r', 2)
      .attr('fill', '#ffffff');
      
    // Add compass labels
    ['N', 'E', 'S', 'W'].forEach((dir, i) => {
      const position = [
        [25, 8],
        [45, 27],
        [25, 45],
        [5, 27]
      ];
      
      compass.append('text')
        .attr('x', position[i][0])
        .attr('y', position[i][1])
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .attr('filter', 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))')
        .text(dir);
    });
    
    // Add region legend
    const legend = svg.append('g').attr('transform', 'translate(620, 400)');
    legend.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 150)
      .attr('height', 175)
      .attr('fill', '#0a1033')
      .attr('opacity', 0.8)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('stroke', 'rgba(255,255,255,0.3)')
      .attr('stroke-width', 1)
      .attr('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))');
      
    legend.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .attr('fill', '#ffffff')
      .attr('font-size', 12)
      .attr('font-weight', 'bold')
      .attr('filter', 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))')
      .text('Regions');
      
    // Add legend items
    const legendItems = [
      { name: 'Amaravati', color: '#F8BFC7', y: 45 },
      { name: 'Nagpur', color: '#E8CEAD', y: 65 },
      { name: 'C.S. Nagar', color: '#C0D1F0', y: 85 },
      { name: 'Nashik', color: '#F1E476', y: 105 },
      { name: 'Pune', color: '#ADEBAD', y: 125 },
      { name: 'Konkan', color: '#BFC0C0', y: 145 }
    ];
    
    legendItems.forEach((item, idx) => {
      legend.append('rect')
        .attr('x', 10)
        .attr('y', item.y - 10)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 0.5)
        .attr('rx', 2)
        .attr('ry', 2);
        
      legend.append('text')
        .attr('x', 32)
        .attr('y', item.y)
        .attr('fill', '#ffffff')
        .attr('font-size', 10)
        .attr('filter', 'drop-shadow(0px 1px 1px rgba(0,0,0,0.3))')
        .text(item.name);
    });
    
    // Store the map reference
    leafletMapRef.current = map;
    
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isLoading, regions, selectedRegion, metric]);

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
              id="maharashtra-map" 
              className="h-full w-full bg-[#0a1033]"
            ></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}