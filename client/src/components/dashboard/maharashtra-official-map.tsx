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

  // Create enhanced interactive Maharashtra map with proper region grouping
  const createInteractiveMap = () => {
    return (
      <div className="relative w-full h-full bg-[#0a1033] rounded-lg overflow-hidden">
        <svg 
          viewBox="0 0 800 700" 
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        >
          {/* Region Groups with hover effects */}
          
          {/* KONKAN REGION GROUP */}
          <g 
            id="konkan-region" 
            className="region-group cursor-pointer transition-all duration-300 hover:brightness-110"
            onMouseEnter={() => setHoveredRegion('Konkan')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Konkan')}
          >
            <path 
              d="M145,277 L153,261 L157,238 L167,218 L184,212 L195,233 L195,258 L180,273 L174,299 L166,322 L158,341 L141,356 L131,378 L119,402 L102,431 L93,463 L88,498 L88,524 L97,559 L113,598 L126,615 L133,624 L159,629 L173,630 L155,599 L139,572 L124,536 L114,497 L114,458 L124,425 L140,389 L152,361 L165,341 L182,318 Z" 
              fill={selectedRegion === 'Konkan' ? '#22c55e' : hoveredRegion === 'Konkan' ? '#16a34a' : getRegionColor('Konkan')}
              stroke={selectedRegion === 'Konkan' ? '#ffffff' : '#e5e7eb'}
              strokeWidth={selectedRegion === 'Konkan' ? 3 : hoveredRegion === 'Konkan' ? 2 : 1}
              className="transition-all duration-300"
            />
            {hoveredRegion === 'Konkan' && (
              <text x="120" y="400" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">
                Konkan
              </text>
            )}
          </g>
          
          {/* PUNE REGION GROUP */}
          <g 
            id="pune-region" 
            className="region-group cursor-pointer transition-all duration-300 hover:brightness-110"
            onMouseEnter={() => setHoveredRegion('Pune')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Pune')}
          >
            <path 
              d="M195,258 L216,251 L238,258 L266,278 L275,313 L286,348 L310,363 L330,385 L348,406 L369,424 L388,443 L402,469 L414,498 L423,526 L426,552 L417,574 L389,578 L365,582 L336,584 L315,583 L294,580 L269,576 L245,569 L225,562 L202,556 L183,550 L167,544 L159,534 L151,515 L148,494 L144,468 L135,435 L125,407 L120,389 L133,377 L147,366 L157,344 L165,321 L173,299 L180,273 L195,258 Z" 
              fill={selectedRegion === 'Pune' ? '#9ACD32' : hoveredRegion === 'Pune' ? '#9ACD32' : getRegionColor('Pune')}
              stroke={selectedRegion === 'Pune' ? '#ffffff' : '#e5e7eb'}
              strokeWidth={selectedRegion === 'Pune' ? 3 : hoveredRegion === 'Pune' ? 2 : 1}
              className="transition-all duration-300"
            />
            {hoveredRegion === 'Pune' && (
              <text x="300" y="420" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">
                Pune
              </text>
            )}
          </g>

          {/* NASHIK REGION GROUP */}
          <g 
            id="nashik-region" 
            className="region-group cursor-pointer transition-all duration-300 hover:brightness-110"
            onMouseEnter={() => setHoveredRegion('Nashik')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Nashik')}
          >
            <path 
              d="M145,277 L153,261 L157,238 L167,218 L184,212 L204,209 L224,206 L242,211 L256,222 L272,232 L286,240 L300,246 L313,262 L321,278 L328,294 L340,308 L350,318 L372,321 L392,317 L413,310 L426,298 L438,280 L446,260 L450,238 L454,219 L452,200 L441,186 L427,174 L411,167 L392,161 L372,158 L350,156 L329,153 L310,149 L294,141 L282,128 L274,113 L274,96 L286,79 L305,67 L321,58 L336,50 L348,46 L325,64 L300,78 L278,94 L265,111 L256,130 L249,150 L240,170 L226,188 L211,199 L196,210 L184,212 Z" 
              fill={selectedRegion === 'Nashik' ? '#facc15' : hoveredRegion === 'Nashik' ? '#fbbf24' : getRegionColor('Nashik')}
              stroke={selectedRegion === 'Nashik' ? '#ffffff' : '#e5e7eb'}
              strokeWidth={selectedRegion === 'Nashik' ? 3 : hoveredRegion === 'Nashik' ? 2 : 1}
              className="transition-all duration-300"
            />
            {hoveredRegion === 'Nashik' && (
              <text x="300" y="200" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">
                Nashik
              </text>
            )}
          </g>

          {/* CHHATRAPATI SAMBHAJINAGAR REGION GROUP */}
          <g 
            id="aurangabad-region" 
            className="region-group cursor-pointer transition-all duration-300 hover:brightness-110"
            onMouseEnter={() => setHoveredRegion('Chhatrapati Sambhajinagar')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Chhatrapati Sambhajinagar')}
          >
            <path 
              d="M313,262 L321,278 L328,294 L340,308 L350,318 L372,321 L392,317 L413,310 L426,298 L438,280 L446,260 L450,238 L454,219 L455,205 L464,198 L478,196 L494,202 L509,214 L519,230 L524,248 L525,267 L524,289 L520,308 L513,326 L500,341 L485,352 L470,358 L455,362 L440,365 L425,367 L410,370 L393,376 L377,387 L364,401 L351,416 L338,426 L367,420 L396,414 L426,408 L455,405 L480,403 L500,398 L510,385 L510,365 L506,345 L496,328 L480,317 L461,313 L442,316 L425,323 L407,332 L390,344 L372,359 L351,374 L334,388 L330,385 L310,363 L286,348 L275,313 L266,278 L238,258 L216,251 L195,258 L210,241 L229,227 L250,216 L267,210 L282,210 L296,212 L309,225 L313,262 Z" 
              fill={selectedRegion === 'Chhatrapati Sambhajinagar' ? '#38bdf8' : hoveredRegion === 'Chhatrapati Sambhajinagar' ? '#0ea5e9' : getRegionColor('Chhatrapati Sambhajinagar')}
              stroke={selectedRegion === 'Chhatrapati Sambhajinagar' ? '#ffffff' : '#e5e7eb'}
              strokeWidth={selectedRegion === 'Chhatrapati Sambhajinagar' ? 3 : hoveredRegion === 'Chhatrapati Sambhajinagar' ? 2 : 1}
              className="transition-all duration-300"
            />
            {hoveredRegion === 'Chhatrapati Sambhajinagar' && (
              <text x="430" y="320" fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">
                Aurangabad
              </text>
            )}
          </g>

          {/* AMRAVATI REGION GROUP */}
          <g 
            id="amravati-region" 
            className="region-group cursor-pointer transition-all duration-300 hover:brightness-110"
            onMouseEnter={() => setHoveredRegion('Amravati')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Amravati')}
          >
            <path 
              d="M455,205 L464,198 L478,196 L494,202 L509,214 L519,230 L524,248 L525,267 L524,289 L520,308 L513,326 L500,341 L485,352 L470,358 L455,362 L440,365 L425,367 L410,370 L393,376 L377,387 L364,401 L351,416 L338,426 L347,440 L360,451 L374,457 L390,457 L407,452 L425,445 L444,440 L462,442 L479,450 L494,460 L507,468 L517,471 L535,461 L549,446 L558,431 L560,414 L556,398 L546,384 L530,374 L512,367 L495,358 L481,348 L473,334 L472,317 L478,298 L494,284 L510,268 L526,250 L538,229 L542,208 L537,188 L528,171 L515,159 L500,148 L484,139 L469,132 L455,126 L444,120 L436,114 L428,109 L420,108 L411,114 L400,124 L390,138 L386,155 L392,161 L411,167 L427,174 L441,186 L452,200 L455,205 Z" 
              fill={selectedRegion === 'Amravati' ? '#FFB6C1' : hoveredRegion === 'Amravati' ? '#ff91a4' : getRegionColor('Amravati')}
              stroke={selectedRegion === 'Amravati' ? '#ffffff' : '#e5e7eb'}
              strokeWidth={selectedRegion === 'Amravati' ? 3 : hoveredRegion === 'Amravati' ? 2 : 1}
              className="transition-all duration-300"
            />
            {hoveredRegion === 'Amravati' && (
              <text x="500" y="280" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">
                Amravati
              </text>
            )}
          </g>

          {/* NAGPUR REGION GROUP */}
          <g 
            id="nagpur-region" 
            className="region-group cursor-pointer transition-all duration-300 hover:brightness-110"
            onMouseEnter={() => setHoveredRegion('Nagpur')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Nagpur')}
          >
            <path 
              d="M542,208 L560,200 L580,210 L600,225 L615,245 L625,270 L630,295 L625,320 L615,340 L600,355 L580,365 L560,370 L540,365 L525,355 L515,340 L510,320 L515,295 L525,270 L542,208 Z" 
              fill={selectedRegion === 'Nagpur' ? '#f97316' : hoveredRegion === 'Nagpur' ? '#ea580c' : getRegionColor('Nagpur')}
              stroke={selectedRegion === 'Nagpur' ? '#ffffff' : '#e5e7eb'}
              strokeWidth={selectedRegion === 'Nagpur' ? 3 : hoveredRegion === 'Nagpur' ? 2 : 1}
              className="transition-all duration-300"
            />
            {hoveredRegion === 'Nagpur' && (
              <text x="580" y="290" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">
                Nagpur
              </text>
            )}
          </g>

          {/* Compass Rose */}
          <g transform="translate(50, 600)">
            <circle cx="0" cy="0" r="25" fill="rgba(255,255,255,0.1)" stroke="#ffffff" strokeWidth="1"/>
            <path d="M0,-20 L5,0 L0,20 L-5,0 Z" fill="#ffffff"/>
            <text x="0" y="-30" fill="#ffffff" fontSize="10" textAnchor="middle">N</text>
          </g>

          {/* Legend */}
          <g transform="translate(600, 550)">
            <rect x="0" y="0" width="180" height="120" fill="rgba(0,0,0,0.7)" rx="5"/>
            <text x="10" y="20" fill="#ffffff" fontSize="12" fontWeight="bold">Regions</text>
            
            <rect x="10" y="30" width="15" height="10" fill="#FFB6C1"/>
            <text x="30" y="40" fill="#ffffff" fontSize="10">Amravati</text>
            
            <rect x="10" y="45" width="15" height="10" fill="#f97316"/>
            <text x="30" y="55" fill="#ffffff" fontSize="10">Nagpur</text>
            
            <rect x="10" y="60" width="15" height="10" fill="#38bdf8"/>
            <text x="30" y="70" fill="#ffffff" fontSize="10">Aurangabad</text>
            
            <rect x="90" y="30" width="15" height="10" fill="#facc15"/>
            <text x="110" y="40" fill="#ffffff" fontSize="10">Nashik</text>
            
            <rect x="90" y="45" width="15" height="10" fill="#9ACD32"/>
            <text x="110" y="55" fill="#ffffff" fontSize="10">Pune</text>
            
            <rect x="90" y="60" width="15" height="10" fill="#6b7280"/>
            <text x="110" y="70" fill="#ffffff" fontSize="10">Konkan</text>
          </g>
        </svg>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
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

        <div className="relative w-full" style={{ height: '500px', overflow: 'hidden' }}>
          {createInteractiveMap()}
        </div>
      </CardContent>
    </Card>
  );
}