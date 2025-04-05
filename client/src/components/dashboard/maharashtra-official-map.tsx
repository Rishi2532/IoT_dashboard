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

  // Process the SVG content to add interactivity
  const processedSvg = React.useMemo(() => {
    if (!svgContent) return null;

    // Create a document to parse the SVG
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    
    // Find all paths in the SVG and add interactivity
    const paths = svgDoc.querySelectorAll('path');
    paths.forEach(path => {
      // Set the id as a data attribute to identify regions
      const id = path.getAttribute('id');
      if (id) {
        path.setAttribute('data-region-id', id);
      }
    });

    // Convert the modified SVG back to a string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgDoc);
  }, [svgContent]);

  // Handle region click
  const handleSvgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;
    
    // Find the region this element belongs to
    const regionElement = target.closest('[data-region-id]') as SVGElement | null;
    if (regionElement) {
      const regionId = regionElement.getAttribute('data-region-id');
      if (regionId) {
        const regionName = SVG_TO_DB_REGION_MAP[regionId] || regionId;
        onRegionClick(regionName);
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