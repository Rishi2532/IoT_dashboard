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

  // District paths with realistic Maharashtra shapes and proper coordinates
  const districts = [
    // Konkan Division - Western coastal region
    { name: "Mumbai City", region: "Konkan", path: "M50,320 L90,315 L95,340 L88,355 L50,360 Z" },
    { name: "Mumbai Suburban", region: "Konkan", path: "M50,280 L95,275 L100,295 L95,315 L50,320 Z" },
    { name: "Thane", region: "Konkan", path: "M95,275 L140,270 L145,295 L140,315 L100,295 Z" },
    { name: "Palghar", region: "Konkan", path: "M95,220 L145,215 L155,240 L145,265 L95,275 Z" },
    { name: "Raigad", region: "Konkan", path: "M95,315 L140,310 L150,335 L145,365 L95,340 Z" },
    { name: "Ratnagiri", region: "Konkan", path: "M50,360 L88,355 L95,380 L85,420 L45,425 Z" },
    { name: "Sindhudurg", region: "Konkan", path: "M45,425 L85,420 L90,445 L80,475 L40,480 Z" },
    
    // Pune Division - South-central region
    { name: "Pune", region: "Pune", path: "M180,290 L240,285 L250,315 L245,340 L180,345 Z" },
    { name: "Solapur", region: "Pune", path: "M250,315 L320,310 L330,340 L325,370 L250,375 Z" },
    { name: "Satara", region: "Pune", path: "M150,345 L240,340 L250,370 L240,400 L150,405 Z" },
    { name: "Sangli", region: "Pune", path: "M150,405 L240,400 L250,430 L240,460 L150,465 Z" },
    { name: "Kolhapur", region: "Pune", path: "M150,465 L240,460 L250,490 L240,520 L150,525 Z" },
    
    // Nashik Division - North-western region  
    { name: "Nandurbar", region: "Nashik", path: "M155,80 L205,75 L215,105 L205,135 L155,140 Z" },
    { name: "Dhule", region: "Nashik", path: "M205,135 L270,130 L280,160 L270,190 L205,195 Z" },
    { name: "Jalgaon", region: "Nashik", path: "M270,130 L340,125 L350,155 L340,185 L270,190 Z" },
    { name: "Nashik", region: "Nashik", path: "M155,180 L240,175 L250,205 L240,235 L155,240 Z" },
    { name: "Ahmednagar", region: "Nashik", path: "M240,235 L320,230 L330,260 L320,290 L240,295 Z" },
    
    // Amravati Division - Central region
    { name: "Akola", region: "Amravati", path: "M350,130 L410,125 L420,155 L410,185 L350,190 Z" },
    { name: "Amravati", region: "Amravati", path: "M410,125 L470,120 L480,150 L470,180 L410,185 Z" },
    { name: "Buldhana", region: "Amravati", path: "M350,190 L410,185 L420,215 L410,245 L350,250 Z" },
    { name: "Washim", region: "Amravati", path: "M410,185 L470,180 L480,210 L470,240 L410,245 Z" },
    { name: "Yavatmal", region: "Amravati", path: "M470,180 L530,175 L540,205 L530,235 L470,240 Z" },
    
    // Nagpur Division - Eastern region
    { name: "Nagpur", region: "Nagpur", path: "M480,80 L540,75 L550,105 L540,135 L480,140 Z" },
    { name: "Bhandara", region: "Nagpur", path: "M540,75 L600,70 L610,100 L600,130 L540,135 Z" },
    { name: "Gondia", region: "Nagpur", path: "M600,70 L660,65 L670,95 L660,125 L600,130 Z" },
    { name: "Wardha", region: "Nagpur", path: "M480,140 L540,135 L550,165 L540,195 L480,200 Z" },
    { name: "Chandrapur", region: "Nagpur", path: "M540,240 L600,235 L610,265 L600,295 L540,300 Z" },
    { name: "Gadchiroli", region: "Nagpur", path: "M600,235 L670,230 L680,280 L670,330 L600,335 Z" },
    
    // Chhatrapati Sambhajinagar Division - Central-eastern region
    { name: "Chhatrapati Sambhajinagar", region: "Chhatrapati Sambhajinagar", path: "M240,175 L320,170 L330,200 L320,230 L240,235 Z" },
    { name: "Jalna", region: "Chhatrapati Sambhajinagar", path: "M320,230 L380,225 L390,255 L380,285 L320,290 Z" },
    { name: "Parbhani", region: "Chhatrapati Sambhajinagar", path: "M380,225 L440,220 L450,250 L440,280 L380,285 Z" },
    { name: "Hingoli", region: "Chhatrapati Sambhajinagar", path: "M440,220 L500,215 L510,245 L500,275 L440,280 Z" },
    { name: "Beed", region: "Chhatrapati Sambhajinagar", path: "M320,290 L380,285 L390,315 L380,345 L320,350 Z" },
    { name: "Nanded", region: "Chhatrapati Sambhajinagar", path: "M440,280 L500,275 L510,305 L500,335 L440,340 Z" },
    { name: "Latur", region: "Chhatrapati Sambhajinagar", path: "M380,345 L440,340 L450,370 L440,400 L380,405 Z" },
    { name: "Osmanabad", region: "Chhatrapati Sambhajinagar", path: "M320,350 L380,345 L390,375 L380,405 L320,410 Z" },
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
                    
                    /* Default region colors - applied when no metric-based color is set */
                    [data-region="Konkan"]:not([fill]) {
                      fill: #BFC0C0;
                    }
                    [data-region="Pune"]:not([fill]) {
                      fill: #4CAF50;
                    }
                    [data-region="Nashik"]:not([fill]) {
                      fill: #F1E476;
                    }
                    [data-region="Chhatrapati Sambhajinagar"]:not([fill]) {
                      fill: #C0D1F0;
                    }
                    [data-region="Amravati"]:not([fill]) {
                      fill: #F8BFC7;
                    }
                    [data-region="Nagpur"]:not([fill]) {
                      fill: #E8CEAD;
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
                      x={(() => {
                        const coords = district.path.split(' ')[1].split(',');
                        const x1 = parseInt(coords[0]);
                        const pathParts = district.path.split(' ');
                        const lastCoord = pathParts[pathParts.length - 2].split(',');
                        const x2 = parseInt(lastCoord[0]);
                        return (x1 + x2) / 2;
                      })()} 
                      y={(() => {
                        const coords = district.path.split(' ')[1].split(',');
                        const y1 = parseInt(coords[1]);
                        const pathParts = district.path.split(' ');
                        const lastCoord = pathParts[pathParts.length - 2].split(',');
                        const y2 = parseInt(lastCoord[1]);
                        return (y1 + y2) / 2 + 3;
                      })()} 
                      textAnchor="middle" 
                      fontSize="9" 
                      fill="#000"
                      fontWeight="500"
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