import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Region, RegionSummary } from '@/types';

interface MaharashtraSvgMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

export default function MaharashtraSvgMap({
  regionSummary,
  regions = [],
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraSvgMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Get color based on metric value if available
  const getRegionColor = (regionName: string) => {
    if (selectedRegion === regionName || hoveredRegion === regionName) {
      return '#3b82f6'; // blue-500 for selected or hovered
    }

    // Find the region in the regions data
    const regionData = regions.find(r => r.region_name === regionName);
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

  // Handle region click
  const handleRegionClick = (regionName: string) => {
    onRegionClick(regionName);
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
        ) : (
          <div className="relative w-full" style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div className="relative">
              <svg 
                viewBox="0 0 800 700" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto"
              >
                {/* Map Legend - Regions */}
                <g transform="translate(650, 400)">
                  <text x="0" y="0" className="text-xs font-semibold" style={{ fill: '#333' }}>Regions</text>
                  {['Amravati', 'Nagpur', 'Chhatrapati Sambhajinagar', 'Nashik', 'Pune', 'Konkan'].map((region, index) => (
                    <g key={region} transform={`translate(0, ${20 * (index + 1)})`}>
                      <rect width="15" height="15" fill={getRegionColor(region)} />
                      <text x="20" y="12" className="text-xs" style={{ fill: '#333', fontSize: '10px' }}>{region}</text>
                    </g>
                  ))}
                </g>
                
                {/* Map Legend - Colors */}
                <g transform="translate(650, 570)">
                  <text x="0" y="0" className="text-xs font-semibold" style={{ fill: '#333' }}>
                    {metric === 'completion' && 'Scheme Completion'}
                    {metric === 'esr' && 'ESR Integration'}
                    {metric === 'villages' && 'Village Integration'}
                    {metric === 'flow_meter' && 'Flow Meter Progress'}
                  </text>
                  <g transform="translate(0, 20)">
                    <rect width="15" height="15" fill="#4ade80" />
                    <text x="20" y="12" className="text-xs" style={{ fill: '#333', fontSize: '10px' }}>75-100%</text>
                  </g>
                  <g transform="translate(0, 40)">
                    <rect width="15" height="15" fill="#a3e635" />
                    <text x="20" y="12" className="text-xs" style={{ fill: '#333', fontSize: '10px' }}>50-74%</text>
                  </g>
                  <g transform="translate(0, 60)">
                    <rect width="15" height="15" fill="#facc15" />
                    <text x="20" y="12" className="text-xs" style={{ fill: '#333', fontSize: '10px' }}>25-49%</text>
                  </g>
                  <g transform="translate(0, 80)">
                    <rect width="15" height="15" fill="#f87171" />
                    <text x="20" y="12" className="text-xs" style={{ fill: '#333', fontSize: '10px' }}>0-24%</text>
                  </g>
                </g>
                
                {/* Maharashtra outline - defines the SVG path for the full state outline */}
                <path d="M150,150 L290,100 L410,120 L620,80 L700,250 L650,380 L500,450 L380,500 L200,480 L100,400 Z" 
                  fill="none" 
                  stroke="#333" 
                  strokeWidth="1" 
                />
                
                {/* Konkan Region */}
                <path 
                  d="M72,205 L116,195 L168,220 L172,250 L147,313 L102,430 L41,361 L33,268 Z" 
                  fill={getRegionColor('Konkan')}
                  stroke={selectedRegion === 'Konkan' || hoveredRegion === 'Konkan' ? '#2563eb' : '#666'}
                  strokeWidth={selectedRegion === 'Konkan' || hoveredRegion === 'Konkan' ? 2 : 1}
                  onClick={() => handleRegionClick('Konkan')}
                  onMouseEnter={() => setHoveredRegion('Konkan')}
                  onMouseLeave={() => setHoveredRegion(null)}
                  style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
                />
                <text x="102" y="350" textAnchor="middle" style={{ fill: '#333', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}>Konkan</text>

                {/* Nashik Region */}
                <path 
                  d="M235,58 L270,53 L317,61 L401,87 L442,151 L405,205 L330,204 L285,220 L254,250 L229,186 L224,124 Z" 
                  fill={getRegionColor('Nashik')}
                  stroke={selectedRegion === 'Nashik' || hoveredRegion === 'Nashik' ? '#2563eb' : '#666'}
                  strokeWidth={selectedRegion === 'Nashik' || hoveredRegion === 'Nashik' ? 2 : 1}
                  onClick={() => handleRegionClick('Nashik')}
                  onMouseEnter={() => setHoveredRegion('Nashik')}
                  onMouseLeave={() => setHoveredRegion(null)}
                  style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
                />
                <text x="300" y="150" textAnchor="middle" style={{ fill: '#333', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}>Nashik</text>

                {/* Pune Region */}
                <path 
                  d="M202,341 L254,250 L285,220 L330,291 L392,321 L387,387 L330,458 L245,494 L198,453 L172,392 Z" 
                  fill={getRegionColor('Pune')}
                  stroke={selectedRegion === 'Pune' || hoveredRegion === 'Pune' ? '#2563eb' : '#666'}
                  strokeWidth={selectedRegion === 'Pune' || hoveredRegion === 'Pune' ? 2 : 1}
                  onClick={() => handleRegionClick('Pune')}
                  onMouseEnter={() => setHoveredRegion('Pune')}
                  onMouseLeave={() => setHoveredRegion(null)}
                  style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
                />
                <text x="280" y="380" textAnchor="middle" style={{ fill: '#333', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}>Pune</text>

                {/* Chhatrapati Sambhajinagar Region */}
                <path 
                  d="M316,206 L350,203 L389,220 L442,220 L495,220 L556,227 L582,236 L546,293 L487,340 L392,321 L330,291 Z" 
                  fill={getRegionColor('Chhatrapati Sambhajinagar')}
                  stroke={selectedRegion === 'Chhatrapati Sambhajinagar' || hoveredRegion === 'Chhatrapati Sambhajinagar' ? '#2563eb' : '#666'}
                  strokeWidth={selectedRegion === 'Chhatrapati Sambhajinagar' || hoveredRegion === 'Chhatrapati Sambhajinagar' ? 2 : 1}
                  onClick={() => handleRegionClick('Chhatrapati Sambhajinagar')}
                  onMouseEnter={() => setHoveredRegion('Chhatrapati Sambhajinagar')}
                  onMouseLeave={() => setHoveredRegion(null)}
                  style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
                />
                <text x="450" y="270" textAnchor="middle" style={{ fill: '#333', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}>Chhatrapati Sambhajinagar</text>

                {/* Amravati Region */}
                <path 
                  d="M510,124 L552,114 L608,109 L634,131 L619,190 L582,236 L525,242 L455,198 L442,151 L478,127 Z" 
                  fill={getRegionColor('Amravati')}
                  stroke={selectedRegion === 'Amravati' || hoveredRegion === 'Amravati' ? '#2563eb' : '#666'}
                  strokeWidth={selectedRegion === 'Amravati' || hoveredRegion === 'Amravati' ? 2 : 1}
                  onClick={() => handleRegionClick('Amravati')}
                  onMouseEnter={() => setHoveredRegion('Amravati')}
                  onMouseLeave={() => setHoveredRegion(null)}
                  style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
                />
                <text x="530" y="180" textAnchor="middle" style={{ fill: '#333', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}>Amravati</text>

                {/* Nagpur Region */}
                <path 
                  d="M697,56 L737,61 L760,91 L766,143 L749,193 L708,240 L665,265 L619,240 L608,190 L634,131 L665,92 Z" 
                  fill={getRegionColor('Nagpur')}
                  stroke={selectedRegion === 'Nagpur' || hoveredRegion === 'Nagpur' ? '#2563eb' : '#666'}
                  strokeWidth={selectedRegion === 'Nagpur' || hoveredRegion === 'Nagpur' ? 2 : 1}
                  onClick={() => handleRegionClick('Nagpur')}
                  onMouseEnter={() => setHoveredRegion('Nagpur')}
                  onMouseLeave={() => setHoveredRegion(null)}
                  style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
                />
                <text x="680" y="150" textAnchor="middle" style={{ fill: '#333', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}>Nagpur</text>

                {/* Decorative elements */}
                <g transform="translate(50, 600)">
                  {/* Compass Rose */}
                  <circle cx="25" cy="25" r="20" fill="white" stroke="#666" />
                  <path d="M25,5 L25,45 M5,25 L45,25 M15,15 L35,35 M15,35 L35,15" stroke="#666" strokeWidth="1" />
                  <text x="25" y="15" textAnchor="middle" style={{ fill: '#333', fontSize: '10px' }}>N</text>
                  <text x="25" y="40" textAnchor="middle" style={{ fill: '#333', fontSize: '10px' }}>S</text>
                  <text x="10" y="25" textAnchor="middle" style={{ fill: '#333', fontSize: '10px' }}>W</text>
                  <text x="40" y="25" textAnchor="middle" style={{ fill: '#333', fontSize: '10px' }}>E</text>
                </g>
                
                {/* Title */}
                <text x="400" y="30" textAnchor="middle" style={{ fill: '#333', fontSize: '16px', fontWeight: 'bold' }}>Maharashtra Water Infrastructure Management</text>
              </svg>
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