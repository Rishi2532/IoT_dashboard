import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Region, RegionSummary } from '@/types';

interface MaharashtraOfficialMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

// Map the SVG names to our database region names
const SVG_TO_DB_REGION_MAP: Record<string, string> = {
  'Amaravati Division': 'Amravati',
  'Aurangabad Division': 'Chhatrapati Sambhajinagar',
  'Konkan Division': 'Konkan',
  'Nagpur Division': 'Nagpur',
  'Nashik Division': 'Nashik',
  'Pune Division': 'Pune'
};

// Map our database region names to SVG ids
const DB_TO_SVG_REGION_MAP: Record<string, string> = {
  'Amravati': 'Amaravati Division',
  'Chhatrapati Sambhajinagar': 'Aurangabad Division',
  'Konkan': 'Konkan Division',
  'Nagpur': 'Nagpur Division',
  'Nashik': 'Nashik Division',
  'Pune': 'Pune Division'
};

export default function MaharashtraOfficialMap({
  regionSummary,
  regions = [],
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraOfficialMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the SVG content
  useEffect(() => {
    const fetchSvg = async () => {
      try {
        const response = await fetch('/maharashtra-divisions.svg');
        if (!response.ok) {
          throw new Error('Failed to load Maharashtra map SVG');
        }
        const svgText = await response.text();
        setSvgContent(svgText);
      } catch (err) {
        setError('Could not load the Maharashtra map');
        console.error(err);
      }
    };

    fetchSvg();
  }, []);

  // Get color based on metric value if available
  const getRegionColor = (regionName: string) => {
    const dbRegionName = SVG_TO_DB_REGION_MAP[regionName] || regionName;
    
    if (selectedRegion === dbRegionName || hoveredRegion === dbRegionName) {
      return '#3b82f6'; // blue-500 for selected or hovered
    }

    // Find the region in the regions data
    const regionData = regions.find(r => r.region_name === dbRegionName);
    if (!regionData) {
      return '#E5E7EB'; // gray-200 if region not found
    }

    // Calculate color based on metric
    let percentage = 0;
    
    switch (metric) {
      case 'completion':
        if (regionData.total_schemes_integrated > 0) {
          percentage = (Number(regionData.fully_completed_schemes) / Number(regionData.total_schemes_integrated)) * 100;
        }
        break;
      case 'esr':
        if (regionData.total_esr_integrated > 0) {
          percentage = (Number(regionData.fully_completed_esr) / Number(regionData.total_esr_integrated)) * 100;
        }
        break;
      case 'villages':
        if (regionData.total_villages_integrated > 0) {
          percentage = (Number(regionData.fully_completed_villages) / Number(regionData.total_villages_integrated)) * 100;
        }
        break;
      case 'flow_meter':
        if (regionData.total_esr_integrated > 0) {
          percentage = (Number(regionData.flow_meter_integrated) / Number(regionData.total_esr_integrated)) * 100;
        }
        break;
    }

    // Color scale based on percentage
    if (percentage >= 75) {
      return '#4ade80'; // green-400 for high completion
    } else if (percentage >= 50) {
      return '#a3e635'; // lime-400 for good completion
    } else if (percentage >= 25) {
      return '#facc15'; // yellow-400 for medium completion
    } else {
      return '#f87171'; // red-400 for low completion
    }
  };

  // Create a more accurate Maharashtra map with proper region coordinates
  const processedSvg = React.useMemo(() => {
    // These are more accurate coordinates for Maharashtra regions based on geographical boundaries
    return `
      <svg 
        viewBox="0 0 600 500" 
        xmlns="http://www.w3.org/2000/svg"
        class="w-full h-auto"
        style="background-color: transparent;"
      >
        <!-- Maharashtra state outline -->
        <path 
          d="M110,240 L120,120 L230,80 L360,60 L490,90 L540,160 L550,280 L480,370 L300,420 L180,380 L110,240 Z" 
          fill="none" 
          stroke="#333" 
          stroke-width="1"
        />
        
        <!-- Konkan Region -->
        <path 
          d="M120,230 L145,290 L130,340 L110,380 L90,320 L100,270 Z" 
          fill="${getRegionColor('Konkan')}"
          stroke="${selectedRegion === 'Konkan' || hoveredRegion === 'Konkan' ? '#2563eb' : '#666'}"
          stroke-width="${selectedRegion === 'Konkan' || hoveredRegion === 'Konkan' ? 2 : 1}"
          data-region-id="Konkan"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />
        <text x="115" y="330" text-anchor="middle" style="fill: #333; font-size: 12px; font-weight: bold; pointer-events: none;">Konkan</text>

        <!-- Nashik Region -->
        <path 
          d="M120,230 L145,290 L190,310 L220,260 L260,220 L260,160 L230,120 L170,120 L140,180 Z" 
          fill="${getRegionColor('Nashik')}"
          stroke="${selectedRegion === 'Nashik' || hoveredRegion === 'Nashik' ? '#2563eb' : '#666'}"
          stroke-width="${selectedRegion === 'Nashik' || hoveredRegion === 'Nashik' ? 2 : 1}"
          data-region-id="Nashik"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />
        <text x="180" y="200" text-anchor="middle" style="fill: #333; font-size: 12px; font-weight: bold; pointer-events: none;">Nashik</text>

        <!-- Pune Region -->
        <path 
          d="M145,290 L130,340 L170,380 L230,380 L290,350 L300,280 L260,240 L220,260 L190,310 Z" 
          fill="${getRegionColor('Pune')}"
          stroke="${selectedRegion === 'Pune' || hoveredRegion === 'Pune' ? '#2563eb' : '#666'}"
          stroke-width="${selectedRegion === 'Pune' || hoveredRegion === 'Pune' ? 2 : 1}"
          data-region-id="Pune"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />
        <text x="230" y="330" text-anchor="middle" style="fill: #333; font-size: 12px; font-weight: bold; pointer-events: none;">Pune</text>

        <!-- Chhatrapati Sambhajinagar Region -->
        <path 
          d="M260,240 L300,280 L380,280 L410,250 L400,200 L360,170 L320,170 L280,190 L260,220 L220,260 Z" 
          fill="${getRegionColor('Chhatrapati Sambhajinagar')}"
          stroke="${selectedRegion === 'Chhatrapati Sambhajinagar' || hoveredRegion === 'Chhatrapati Sambhajinagar' ? '#2563eb' : '#666'}"
          stroke-width="${selectedRegion === 'Chhatrapati Sambhajinagar' || hoveredRegion === 'Chhatrapati Sambhajinagar' ? 2 : 1}"
          data-region-id="Chhatrapati Sambhajinagar"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />
        <text x="330" y="240" text-anchor="middle" style="fill: #333; font-size: 12px; font-weight: bold; pointer-events: none;">Chhatrapati Sambhajinagar</text>

        <!-- Amravati Region -->
        <path 
          d="M320,170 L360,170 L400,200 L430,170 L440,130 L400,100 L360,100 L320,120 L290,150 L280,190 Z" 
          fill="${getRegionColor('Amravati')}"
          stroke="${selectedRegion === 'Amravati' || hoveredRegion === 'Amravati' ? '#2563eb' : '#666'}"
          stroke-width="${selectedRegion === 'Amravati' || hoveredRegion === 'Amravati' ? 2 : 1}"
          data-region-id="Amravati"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />
        <text x="360" y="150" text-anchor="middle" style="fill: #333; font-size: 12px; font-weight: bold; pointer-events: none;">Amravati</text>

        <!-- Nagpur Region -->
        <path 
          d="M400,100 L440,130 L430,170 L400,200 L410,250 L460,260 L500,230 L530,180 L510,120 L470,90 L430,90 Z" 
          fill="${getRegionColor('Nagpur')}"
          stroke="${selectedRegion === 'Nagpur' || hoveredRegion === 'Nagpur' ? '#2563eb' : '#666'}"
          stroke-width="${selectedRegion === 'Nagpur' || hoveredRegion === 'Nagpur' ? 2 : 1}"
          data-region-id="Nagpur"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />
        <text x="470" y="170" text-anchor="middle" style="fill: #333; font-size: 12px; font-weight: bold; pointer-events: none;">Nagpur</text>

        <!-- Legend - at bottom right -->
        <g transform="translate(450, 370)">
          <text x="0" y="0" class="text-sm font-semibold" style="fill: #333; font-size: 14px;">
            ${metric === 'completion' ? 'Scheme Completion' : ''}
            ${metric === 'esr' ? 'ESR Integration' : ''}
            ${metric === 'villages' ? 'Village Integration' : ''}
            ${metric === 'flow_meter' ? 'Flow Meter Progress' : ''}
          </text>
          <g transform="translate(0, 20)">
            <rect width="15" height="15" fill="#4ade80" />
            <text x="25" y="12" style="fill: #333; font-size: 12px;">75-100%</text>
          </g>
          <g transform="translate(0, 40)">
            <rect width="15" height="15" fill="#a3e635" />
            <text x="25" y="12" style="fill: #333; font-size: 12px;">50-74%</text>
          </g>
          <g transform="translate(0, 60)">
            <rect width="15" height="15" fill="#facc15" />
            <text x="25" y="12" style="fill: #333; font-size: 12px;">25-49%</text>
          </g>
          <g transform="translate(0, 80)">
            <rect width="15" height="15" fill="#f87171" />
            <text x="25" y="12" style="fill: #333; font-size: 12px;">0-24%</text>
          </g>
        </g>
        
        <!-- Decorative elements -->
        <g transform="translate(60, 440)">
          <!-- Compass Rose -->
          <circle cx="25" cy="25" r="20" fill="white" stroke="#666" />
          <path d="M25,5 L25,45 M5,25 L45,25 M15,15 L35,35 M15,35 L35,15" stroke="#666" stroke-width="1" />
          <text x="25" y="15" text-anchor="middle" style="fill: #333; font-size: 10px;">N</text>
          <text x="25" y="40" text-anchor="middle" style="fill: #333; font-size: 10px;">S</text>
          <text x="10" y="25" text-anchor="middle" style="fill: #333; font-size: 10px;">W</text>
          <text x="40" y="25" text-anchor="middle" style="fill: #333; font-size: 10px;">E</text>
        </g>
        
        <!-- Title -->
        <text x="300" y="40" text-anchor="middle" style="fill: #333; font-size: 18px; font-weight: bold;">Maharashtra Water Infrastructure Management</text>
      </svg>
    `;
  }, [selectedRegion, hoveredRegion, metric, getRegionColor]);

  // Handle mouseover for region hover effect
  const handleMouseOver = (regionName: string) => {
    setHoveredRegion(regionName);
  };

  // Handle mouseout to clear hover effect
  const handleMouseOut = () => {
    setHoveredRegion(null);
  };

  // Handle region click using the data-region-id attribute on SVG paths
  const handleSvgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;
    
    // Find the region this element belongs to
    const regionElement = target.closest('[data-region-id]') as SVGElement | null;
    if (regionElement) {
      const regionId = regionElement.getAttribute('data-region-id');
      if (regionId) {
        onRegionClick(regionId);
      }
    }
  };

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
        ) : error ? (
          <div className="p-4 text-red-600 bg-red-50 rounded-md">
            {error}. Using fallback map instead.
          </div>
        ) : !processedSvg ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-gray-500">Loading Maharashtra map...</p>
          </div>
        ) : (
          <div className="relative w-full" style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div 
              className="relative" 
              onClick={handleSvgClick}
              onMouseOver={(e) => {
                const target = e.target as SVGElement;
                const regionElement = target.closest('[data-region-id]') as SVGElement | null;
                if (regionElement) {
                  const regionId = regionElement.getAttribute('data-region-id');
                  if (regionId) {
                    handleMouseOver(regionId);
                  }
                }
              }}
              onMouseOut={handleMouseOut}
              dangerouslySetInnerHTML={{ __html: processedSvg }}
            />
            
            {/* Map Legend - Colors */}
            <div className="absolute bottom-5 right-5 bg-white bg-opacity-80 p-2 rounded-md shadow-sm">
              <p className="text-xs font-semibold mb-1">
                {metric === 'completion' && 'Scheme Completion'}
                {metric === 'esr' && 'ESR Integration'}
                {metric === 'villages' && 'Village Integration'}
                {metric === 'flow_meter' && 'Flow Meter Progress'}
              </p>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-[#4ade80]"></div>
                <span className="text-xs ml-1">75-100%</span>
              </div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-[#a3e635]"></div>
                <span className="text-xs ml-1">50-74%</span>
              </div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-[#facc15]"></div>
                <span className="text-xs ml-1">25-49%</span>
              </div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-[#f87171]"></div>
                <span className="text-xs ml-1">0-24%</span>
              </div>
            </div>
            
            {/* Selected region indicator */}
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