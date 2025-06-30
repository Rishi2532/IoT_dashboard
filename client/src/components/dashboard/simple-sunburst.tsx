import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

interface RegionData {
  region_id: number;
  region_name: string;
  total_schemes_integrated: number;
  fully_completed_schemes: number;
  total_villages_integrated: number;
  fully_completed_villages: number;
}

interface SchemeData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  completion_status?: string;
  fully_completion_scheme_status?: string;
}

interface WaterSchemeData {
  scheme_id: string;
  village_name: string;
  region: string;
  population: number;
  lpcd_value_day7: string;
  lpcd_value_day6: string;
  lpcd_value_day5: string;
}

export default function SimpleSunburst() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSegment, setSelectedSegment] = useState<any>(null);

  // Fetch all required data
  const { data: regions, isLoading: regionsLoading } = useQuery<RegionData[]>({ 
    queryKey: ["/api/regions"] 
  });
  
  const { data: schemes, isLoading: schemesLoading } = useQuery<SchemeData[]>({ 
    queryKey: ["/api/scheme-status"] 
  });
  
  const { data: villages, isLoading: villagesLoading } = useQuery<WaterSchemeData[]>({ 
    queryKey: ["/api/water-scheme-data"] 
  });

  const isLoading = regionsLoading || schemesLoading || villagesLoading;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || isLoading || !regions || !schemes || !villages) {
      return;
    }

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    // Container setup
    const containerWidth = containerRef.current.offsetWidth;
    const width = Math.max(600, containerWidth);
    const height = 600;
    const radius = Math.min(width, height) / 2 - 20;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Build simplified hierarchy data
    const hierarchyData = {
      name: "Maharashtra",
      children: regions.map((region: RegionData) => {
        const regionSchemes = schemes.filter((s: SchemeData) => s.region === region.region_name);
        
        return {
          name: region.region_name,
          type: 'region',
          value: region.total_schemes_integrated,
          completedSchemes: region.fully_completed_schemes,
          totalSchemes: region.total_schemes_integrated,
          children: regionSchemes.slice(0, 5).map((scheme: SchemeData) => { // Limit to 5 schemes per region for clarity
            const schemeVillages = villages.filter((v: WaterSchemeData) => 
              v.scheme_id === scheme.scheme_id && v.region === region.region_name
            );
            
            return {
              name: scheme.scheme_name || `Scheme ${scheme.scheme_id}`,
              type: 'scheme',
              value: schemeVillages.length || 1,
              status: scheme.fully_completion_scheme_status === 'Fully Completed' ? 'completed' : 'progress'
            };
          })
        };
      })
    };

    // Create partition layout
    const partition = d3.partition()
      .size([2 * Math.PI, radius])
      .padding(0.02);

    // Create hierarchy with proper typing
    const root = d3.hierarchy(hierarchyData as any)
      .sum((d: any) => d.value || 1)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    // Generate the partition
    const partitionData = partition(root as any);

    // Color function
    const getColor = (d: any) => {
      if (d.depth === 0) return '#1e40af'; // Root - blue
      if (d.depth === 1) { // Regions
        const completionRate = d.data.completedSchemes / d.data.totalSchemes;
        return completionRate > 0.5 ? '#059669' : '#d97706'; // Green if >50% complete, orange otherwise
      }
      if (d.depth === 2) { // Schemes
        return d.data.status === 'completed' ? '#10b981' : '#f59e0b'; // Green if completed, yellow if in progress
      }
      return '#6b7280'; // Default gray
    };

    // Create arc generator
    const arc = d3.arc()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .innerRadius((d: any) => d.y0)
      .outerRadius((d: any) => d.y1);

    // Create the segments
    const segments = g.selectAll('path')
      .data(partitionData.descendants().filter((d: any) => d.depth > 0))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .style('fill', getColor)
      .style('stroke', '#fff')
      .style('stroke-width', 2)
      .style('opacity', 0.8)
      .style('cursor', 'pointer');

    // Add hover effects and click handlers
    segments
      .on('mouseover', function(event: any, d: any) {
        d3.select(this)
          .style('opacity', 1)
          .style('stroke-width', 3);
        setSelectedSegment(d);
      })
      .on('mouseout', function(event: any, d: any) {
        d3.select(this)
          .style('opacity', 0.8)
          .style('stroke-width', 2);
      })
      .on('click', function(event: any, d: any) {
        event.stopPropagation();
        // Handle click - could implement zooming here
        setSelectedSegment(d);
      });

    // Add text labels for larger segments
    const labels = g.selectAll('text')
      .data(partitionData.descendants().filter((d: any) => d.depth > 0 && (d.x1 - d.x0) > 0.1))
      .enter()
      .append('text')
      .attr('transform', function(d: any) {
        const angle = (d.x0 + d.x1) / 2;
        const radius = (d.y0 + d.y1) / 2;
        return `rotate(${(angle * 180 / Math.PI - 90)}) translate(${radius},0) rotate(${angle > Math.PI ? 180 : 0})`;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', function(d: any) {
        const angle = (d.x0 + d.x1) / 2;
        return angle > Math.PI ? 'end' : 'start';
      })
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', '#fff')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .style('pointer-events', 'none')
      .text((d: any) => {
        const name = d.data.name;
        if (d.depth === 1) { // Regions - show short names
          const shortNames: {[key: string]: string} = {
            'Nagpur': 'NGP',
            'Pune': 'PNE',
            'Nashik': 'NSK',
            'Amravati': 'AMR',
            'Konkan': 'KNK',
            'Chhatrapati Sambhajinagar': 'CSN'
          };
          return shortNames[name] || name.substring(0, 3).toUpperCase();
        }
        return name.length > 12 ? name.substring(0, 9) + "..." : name;
      });

  }, [regions, schemes, villages, isLoading]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Maharashtra Water Infrastructure Sunburst</CardTitle>
          <CardDescription>Interactive hierarchical visualization</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading infrastructure data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Maharashtra Water Infrastructure Sunburst</CardTitle>
            <CardDescription>
              Hierarchical view: Regions → Schemes (hover for details)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedSegment(null)}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Clear Selection
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sunburst Visualization */}
          <div className="lg:col-span-3">
            <div ref={containerRef} className="w-full">
              <svg ref={svgRef} className="w-full"></svg>
            </div>
          </div>
          
          {/* Legend and Details */}
          <div className="space-y-4">
            {/* Color Legend */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Status Colors</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span>Completed Schemes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-600 rounded"></div>
                  <span>Low Completion Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span>State Overview</span>
                </div>
              </div>
            </div>
            
            {/* Selected Segment Details */}
            {selectedSegment && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{selectedSegment.data.name}</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Level:</span> {selectedSegment.depth === 1 ? 'Region' : 'Scheme'}</p>
                  {selectedSegment.depth === 1 && (
                    <>
                      <p><span className="font-medium">Total Schemes:</span> {selectedSegment.data.totalSchemes}</p>
                      <p><span className="font-medium">Completed:</span> {selectedSegment.data.completedSchemes}</p>
                      <p><span className="font-medium">Completion Rate:</span> {Math.round((selectedSegment.data.completedSchemes / selectedSegment.data.totalSchemes) * 100)}%</p>
                    </>
                  )}
                  {selectedSegment.depth === 2 && (
                    <>
                      <p><span className="font-medium">Status:</span> {selectedSegment.data.status === 'completed' ? 'Fully Completed' : 'In Progress'}</p>
                      <p><span className="font-medium">Villages:</span> {selectedSegment.data.value}</p>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Instructions */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">How to Use</h4>
              <div className="text-sm space-y-1">
                <p>• Hover over segments for details</p>
                <p>• Click to select a segment</p>
                <p>• Inner ring = Regions</p>
                <p>• Outer ring = Major Schemes</p>
                <p>• Size = Number of schemes/villages</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}