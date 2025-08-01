import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Region } from '@/types';

interface MaharashtraMapProps {
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

export default function MaharashtraMap({
  regions = [],
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraMapProps) {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // District to region mapping as specified
  const districtToRegion: { [key: string]: string } = {
    // Konkan
    "Mumbai City": "Konkan",
    "Mumbai Suburban": "Konkan", 
    "Thane": "Konkan",
    "Palghar": "Konkan",
    "Raigad": "Konkan",
    "Ratnagiri": "Konkan",
    "Sindhudurg": "Konkan",
    
    // Pune
    "Pune": "Pune",
    "Satara": "Pune",
    "Sangli": "Pune",
    "Kolhapur": "Pune",
    "Solapur": "Pune",
    
    // Nashik
    "Nashik": "Nashik",
    "Nandurbar": "Nashik",
    "Dhule": "Nashik", 
    "Jalgaon": "Nashik",
    "Ahmednagar": "Nashik",
    
    // Chhatrapati Sambhajinagar
    "Chhatrapati Sambhajinagar": "Chhatrapati Sambhajinagar",
    "Jalna": "Chhatrapati Sambhajinagar",
    "Beed": "Chhatrapati Sambhajinagar",
    "Parbhani": "Chhatrapati Sambhajinagar",
    "Hingoli": "Chhatrapati Sambhajinagar",
    "Latur": "Chhatrapati Sambhajinagar",
    "Osmanabad": "Chhatrapati Sambhajinagar",
    "Nanded": "Chhatrapati Sambhajinagar",
    
    // Amravati
    "Akola": "Amravati",
    "Amravati": "Amravati",
    "Buldhana": "Amravati",
    "Washim": "Amravati",
    "Yavatmal": "Amravati",
    
    // Nagpur
    "Nagpur": "Nagpur",
    "Wardha": "Nagpur",
    "Chandrapur": "Nagpur",
    "Gadchiroli": "Nagpur",
    "Gondia": "Nagpur",
    "Bhandara": "Nagpur"
  };

  // Get base color for region based on metric
  const getBaseRegionColor = (regionName: string) => {
    const regionData = regions.find(r => r.region_name === regionName);
    if (!regionData) {
      return '#E5E7EB'; // gray-200 if region not found
    }

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

  // Utility function to darken a hex color
  const darkenColor = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  // Get color for district with highlighting logic
  const getDistrictColor = (districtName: string) => {
    const regionName = districtToRegion[districtName];
    const baseColor = getBaseRegionColor(regionName);
    
    // Check if this district should be highlighted
    const shouldHighlight = hoveredDistrict && districtToRegion[hoveredDistrict] === regionName;
    
    if (shouldHighlight) {
      return darkenColor(baseColor, 0.4); // Darker for highlighting
    }
    
    return baseColor;
  };

  const handleDistrictHover = (districtName: string | null) => {
    setHoveredDistrict(districtName);
  };

  // District paths with proper SVG coordinates
  const districts = [
    // Konkan Division
    { name: "Mumbai City", region: "Konkan", path: "M80,280 L120,280 L120,320 L80,320 Z" },
    { name: "Mumbai Suburban", region: "Konkan", path: "M80,240 L120,240 L120,280 L80,280 Z" },
    { name: "Thane", region: "Konkan", path: "M120,240 L160,240 L160,280 L120,280 Z" },
    { name: "Palghar", region: "Konkan", path: "M120,200 L160,200 L160,240 L120,240 Z" },
    { name: "Raigad", region: "Konkan", path: "M120,280 L160,280 L160,320 L120,320 Z" },
    { name: "Ratnagiri", region: "Konkan", path: "M80,320 L120,320 L120,360 L80,360 Z" },
    { name: "Sindhudurg", region: "Konkan", path: "M80,360 L120,360 L120,400 L80,400 Z" },
    
    // Pune Division
    { name: "Pune", region: "Pune", path: "M200,280 L260,280 L260,320 L200,320 Z" },
    { name: "Solapur", region: "Pune", path: "M260,280 L320,280 L320,320 L260,320 Z" },
    { name: "Satara", region: "Pune", path: "M200,320 L260,320 L260,360 L200,360 Z" },
    { name: "Sangli", region: "Pune", path: "M200,360 L260,360 L260,400 L200,400 Z" },
    { name: "Kolhapur", region: "Pune", path: "M200,400 L260,400 L260,440 L200,440 Z" },
    
    // Nashik Division
    { name: "Nandurbar", region: "Nashik", path: "M160,80 L200,80 L200,120 L160,120 Z" },
    { name: "Dhule", region: "Nashik", path: "M160,120 L220,120 L220,160 L160,160 Z" },
    { name: "Jalgaon", region: "Nashik", path: "M220,120 L280,120 L280,160 L220,160 Z" },
    { name: "Nashik", region: "Nashik", path: "M160,160 L220,160 L220,200 L160,200 Z" },
    { name: "Ahmednagar", region: "Nashik", path: "M220,200 L280,200 L280,240 L220,240 Z" },
    
    // Amravati Division
    { name: "Akola", region: "Amravati", path: "M320,120 L380,120 L380,160 L320,160 Z" },
    { name: "Amravati", region: "Amravati", path: "M380,120 L440,120 L440,160 L380,160 Z" },
    { name: "Buldhana", region: "Amravati", path: "M320,160 L380,160 L380,200 L320,200 Z" },
    { name: "Washim", region: "Amravati", path: "M380,160 L440,160 L440,200 L380,200 Z" },
    { name: "Yavatmal", region: "Amravati", path: "M440,160 L500,160 L500,200 L440,200 Z" },
    
    // Nagpur Division
    { name: "Nagpur", region: "Nagpur", path: "M440,80 L500,80 L500,120 L440,120 Z" },
    { name: "Bhandara", region: "Nagpur", path: "M500,80 L560,80 L560,120 L500,120 Z" },
    { name: "Gondia", region: "Nagpur", path: "M560,80 L620,80 L620,120 L560,120 Z" },
    { name: "Wardha", region: "Nagpur", path: "M440,120 L500,120 L500,160 L440,160 Z" },
    { name: "Chandrapur", region: "Nagpur", path: "M500,200 L560,200 L560,240 L500,240 Z" },
    { name: "Gadchiroli", region: "Nagpur", path: "M560,200 L620,200 L620,280 L560,280 Z" },
    
    // Chhatrapati Sambhajinagar Division
    { name: "Chhatrapati Sambhajinagar", region: "Chhatrapati Sambhajinagar", path: "M220,160 L280,160 L280,200 L220,200 Z" },
    { name: "Jalna", region: "Chhatrapati Sambhajinagar", path: "M280,200 L340,200 L340,240 L280,240 Z" },
    { name: "Parbhani", region: "Chhatrapati Sambhajinagar", path: "M340,200 L400,200 L400,240 L340,240 Z" },
    { name: "Hingoli", region: "Chhatrapati Sambhajinagar", path: "M400,200 L460,200 L460,240 L400,240 Z" },
    { name: "Beed", region: "Chhatrapati Sambhajinagar", path: "M280,240 L340,240 L340,280 L280,280 Z" },
    { name: "Nanded", region: "Chhatrapati Sambhajinagar", path: "M400,240 L460,240 L460,280 L400,280 Z" },
    { name: "Latur", region: "Chhatrapati Sambhajinagar", path: "M340,280 L400,280 L400,320 L340,320 Z" },
    { name: "Osmanabad", region: "Chhatrapati Sambhajinagar", path: "M280,280 L340,280 L340,320 L280,320 Z" },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-3 sm:p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm sm:text-base font-medium text-neutral-700">
            Maharashtra Districts - Interactive Map
          </h3>
          {selectedRegion !== "all" && (
            <div className="text-xs sm:text-sm text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-md">
              Region: {selectedRegion}
            </div>
          )}
        </div>

        <div className="relative w-full" style={{ height: '500px', overflow: 'hidden' }}>
          <div className="relative w-full h-full bg-white rounded-lg overflow-hidden border">
            <svg 
              viewBox="0 0 700 500" 
              className="w-full h-full"
              style={{ minHeight: '400px' }}
            >
              {/* Background */}
              <rect width="700" height="500" fill="#f0f9ff"/>
              
              {/* CSS for hover effects */}
              <defs>
                <style>
                  {`
                    .district-path {
                      pointer-events: all;
                      fill-opacity: 1;
                      stroke: #fff;
                      stroke-width: 1;
                      transition: fill 0.2s ease, stroke 0.2s ease;
                      cursor: pointer;
                    }
                    .district-path:hover {
                      stroke-width: 2;
                    }
                    .district-highlighted {
                      stroke-width: 2;
                      stroke: #1f2937;
                    }
                    
                    /* Region-based default colors */
                    [data-region="Konkan"] {
                      fill: var(--konkan-color, #BFC0C0);
                    }
                    [data-region="Pune"] {
                      fill: var(--pune-color, #ADEBAD);
                    }
                    [data-region="Nashik"] {
                      fill: var(--nashik-color, #F1E476);
                    }
                    [data-region="Chhatrapati Sambhajinagar"] {
                      fill: var(--sambhajinagar-color, #C0D1F0);
                    }
                    [data-region="Amravati"] {
                      fill: var(--amravati-color, #F8BFC7);
                    }
                    [data-region="Nagpur"] {
                      fill: var(--nagpur-color, #E8CEAD);
                    }
                  `}
                </style>
              </defs>

              {/* Render all districts */}
              {districts.map((district) => {
                const isHighlighted = hoveredDistrict && 
                  districtToRegion[hoveredDistrict] === district.region;
                
                return (
                  <g key={district.name}>
                    <path
                      d={district.path}
                      data-district={district.name}
                      data-region={district.region}
                      fill={getDistrictColor(district.name)}
                      className={`district-path ${isHighlighted ? 'district-highlighted' : ''}`}
                      onMouseEnter={() => handleDistrictHover(district.name)}
                      onMouseLeave={() => handleDistrictHover(null)}
                      onClick={() => onRegionClick(district.region)}
                    />
                    <text 
                      x={parseInt(district.path.split(' ')[1].split(',')[0]) + 30} 
                      y={parseInt(district.path.split(' ')[1].split(',')[1]) + 25} 
                      textAnchor="middle" 
                      fontSize="9" 
                      fill="#000"
                      style={{ pointerEvents: 'none' }}
                    >
                      {district.name === "Mumbai Suburban" ? "Mumbai Sub." : 
                       district.name === "Chhatrapati Sambhajinagar" ? "C. Sambhajinagar" : 
                       district.name}
                    </text>
                  </g>
                );
              })}

              {/* Arabian Sea */}
              <rect x="0" y="0" width="80" height="500" fill="#e0f2fe"/>
              <text x="40" y="250" textAnchor="middle" fontSize="12" fill="#0369a1" transform="rotate(-90 40 250)">Arabian Sea</text>

              {/* Legend */}
              <g transform="translate(500, 320)">
                <rect x="0" y="0" width="190" height="170" fill="rgba(255,255,255,0.95)" stroke="#ccc" rx="5"/>
                <text x="10" y="18" fill="#000" fontSize="12" fontWeight="bold">Maharashtra Districts</text>
                <text x="10" y="35" fill="#666" fontSize="10">Hover over any district to</text>
                <text x="10" y="47" fill="#666" fontSize="10">highlight its entire region</text>
                
                {/* Color coding legend */}
                <text x="10" y="65" fill="#000" fontSize="10" fontWeight="bold">Completion Levels:</text>
                <rect x="10" y="75" width="12" height="12" fill="#4ade80"/>
                <text x="28" y="85" fill="#000" fontSize="9">≥75% (High)</text>
                <rect x="10" y="90" width="12" height="12" fill="#a3e635"/>
                <text x="28" y="100" fill="#000" fontSize="9">50-74% (Good)</text>
                <rect x="10" y="105" width="12" height="12" fill="#facc15"/>
                <text x="28" y="115" fill="#000" fontSize="9">25-49% (Medium)</text>
                <rect x="10" y="120" width="12" height="12" fill="#f87171"/>
                <text x="28" y="130" fill="#000" fontSize="9">&lt;25% (Low)</text>
                
                {hoveredDistrict && (
                  <text x="10" y="155" fill="#1f2937" fontSize="11" fontWeight="bold">
                    Hovering: {hoveredDistrict}
                  </text>
                )}
              </g>
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}