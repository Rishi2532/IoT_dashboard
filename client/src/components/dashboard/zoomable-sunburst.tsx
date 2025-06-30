import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

interface RegionData {
  region_id: number;
  region_name: string;
  total_schemes_integrated: number;
  fully_completed_schemes: number;
  total_villages_integrated: number;
  fully_completed_villages: number;
  total_esr_integrated: number;
  fully_completed_esr: number;
}

interface SchemeData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  block: string;
  completion_status?: string;
  fully_completion_scheme_status?: string;
  total_villages_integrated?: number;
  fully_completed_villages?: number;
}

interface WaterSchemeData {
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  region: string;
  block: string;
  population: number;
  lpcd_value_day7: string;
  lpcd_value_day6: string;
  lpcd_value_day5: string;
}

interface HierarchyNode {
  name: string;
  value?: number;
  status?: string;
  type: 'root' | 'region' | 'scheme' | 'village';
  children?: HierarchyNode[];
  details?: any;
}

export default function ZoomableSunburst() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState<string[]>(['Maharashtra']);
  const [selectedNode, setSelectedNode] = useState<any>(null);

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

    // Build hierarchical data structure
    const hierarchyData: HierarchyNode = {
      name: "Maharashtra",
      type: 'root',
      children: regions.map((region: RegionData) => {
        // Get schemes for this region
        const regionSchemes = schemes.filter((s: SchemeData) => s.region === region.region_name);
        
        return {
          name: region.region_name,
          type: 'region' as const,
          value: region.total_schemes_integrated,
          status: region.fully_completed_schemes > region.total_schemes_integrated / 2 ? 'good' : 'partial',
          details: {
            totalSchemes: region.total_schemes_integrated,
            completedSchemes: region.fully_completed_schemes,
            totalVillages: region.total_villages_integrated,
            completedVillages: region.fully_completed_villages,
            totalESR: region.total_esr_integrated,
            completedESR: region.fully_completed_esr
          },
          children: regionSchemes.map((scheme: SchemeData) => {
            // Get villages for this scheme
            const schemeVillages = villages.filter((v: WaterSchemeData) => 
              v.scheme_id === scheme.scheme_id && v.region === region.region_name
            );
            
            const schemeStatus = scheme.fully_completion_scheme_status === 'Fully Completed' ? 'completed' : 'progress';
            
            return {
              name: scheme.scheme_name || `Scheme ${scheme.scheme_id}`,
              type: 'scheme' as const,
              value: schemeVillages.length || 1,
              status: schemeStatus,
              details: {
                schemeId: scheme.scheme_id,
                block: scheme.block,
                totalVillages: schemeVillages.length,
                completionStatus: scheme.fully_completion_scheme_status
              },
              children: schemeVillages.map((village: WaterSchemeData) => {
                // Calculate LPCD status
                const lpcdValues = [
                  parseFloat(village.lpcd_value_day7 || '0'),
                  parseFloat(village.lpcd_value_day6 || '0'),
                  parseFloat(village.lpcd_value_day5 || '0')
                ];
                const avgLpcd = lpcdValues.reduce((a, b) => a + b, 0) / lpcdValues.filter(v => v > 0).length || 0;
                const lpcdStatus = avgLpcd > 55 ? 'good' : avgLpcd > 0 ? 'warning' : 'critical';
                
                return {
                  name: village.village_name,
                  type: 'village' as const,
                  value: village.population || 100,
                  status: lpcdStatus,
                  details: {
                    population: village.population,
                    averageLPCD: Math.round(avgLpcd),
                    block: village.block,
                    schemeId: village.scheme_id
                  }
                };
              })
            };
          })
        };
      })
    };

    // Container setup
    const containerWidth = containerRef.current.offsetWidth;
    const width = Math.max(600, containerWidth);
    const height = 600;
    const radius = Math.min(width, height) / 2 - 10;

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Color scales for different statuses
    const colorScale = (d: any) => {
      if (d.data.type === 'root') return '#1e40af';
      if (d.data.type === 'region') {
        return d.data.status === 'good' ? '#059669' : '#d97706';
      }
      if (d.data.type === 'scheme') {
        return d.data.status === 'completed' ? '#10b981' : '#f59e0b';
      }
      if (d.data.type === 'village') {
        switch (d.data.status) {
          case 'good': return '#22c55e';
          case 'warning': return '#eab308';
          case 'critical': return '#ef4444';
          default: return '#6b7280';
        }
      }
      return '#6b7280';
    };

    // Create partition layout
    const partition = d3.partition<HierarchyNode>()
      .size([2 * Math.PI, radius]);

    // Create arc generator
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    // Create hierarchy and compute partition
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const partitionedData = partition(root);

    // Create paths
    const paths = g.selectAll("path")
      .data(partitionedData.descendants().filter(d => d.depth > 0))
      .enter().append("path")
      .attr("d", arc)
      .style("fill", colorScale)
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .style("opacity", 0.8)
      .style("cursor", "pointer");

    // Add hover effects
    paths
      .on("mouseover", function(event, d) {
        d3.select(this)
          .style("opacity", 1)
          .style("stroke-width", 3);
        
        // Show tooltip information
        setSelectedNode(d);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .style("opacity", 0.8)
          .style("stroke-width", 2);
      })
      .on("click", function(event, d) {
        event.stopPropagation();
        zoomToNode(d);
      });

    // Add text labels for larger segments
    const text = g.selectAll("text")
      .data(partitionedData.descendants().filter(d => d.depth > 0 && (d.x1 - d.x0) > 0.1))
      .enter().append("text")
      .attr("transform", function(d) {
        const angle = (d.x0 + d.x1) / 2;
        const radius = (d.y0 + d.y1) / 2;
        return `rotate(${(angle * 180 / Math.PI - 90)}) translate(${radius},0) rotate(${angle > Math.PI ? 180 : 0})`;
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", function(d) {
        const angle = (d.x0 + d.x1) / 2;
        return angle > Math.PI ? "end" : "start";
      })
      .style("font-size", "10px")
      .style("font-weight", "500")
      .style("fill", "#fff")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.8)")
      .style("pointer-events", "none")
      .text(d => {
        const name = d.data.name;
        return name.length > 15 ? name.substring(0, 12) + "..." : name;
      });

    // Zoom functionality
    function zoomToNode(d: any) {
      if (d.data.type === 'village') return; // Don't zoom into villages
      
      const newPath = getPathToNode(d);
      setCurrentPath(newPath);
      
      // Recreate the visualization with new root
      const newRoot = d;
      const newPartitionedData = partition(newRoot);
      
      // Remove old elements
      g.selectAll("path").remove();
      g.selectAll("text").remove();
      
      // Create new paths
      const newPaths = g.selectAll("path")
        .data(newPartitionedData.descendants().filter(node => node.depth > 0))
        .enter().append("path")
        .attr("d", arc)
        .style("fill", colorScale)
        .style("stroke", "#fff")
        .style("stroke-width", 2)
        .style("opacity", 0.8)
        .style("cursor", "pointer");

      // Add interactions to new paths
      newPaths
        .on("mouseover", function(event, node) {
          d3.select(this).style("opacity", 1).style("stroke-width", 3);
          setSelectedNode(node);
        })
        .on("mouseout", function(event, node) {
          d3.select(this).style("opacity", 0.8).style("stroke-width", 2);
        })
        .on("click", function(event, node) {
          event.stopPropagation();
          zoomToNode(node);
        });

      // Add new text labels
      g.selectAll("text")
        .data(newPartitionedData.descendants().filter(node => node.depth > 0 && (node.x1 - node.x0) > 0.1))
        .enter().append("text")
        .attr("transform", function(node) {
          const angle = (node.x0 + node.x1) / 2;
          const radius = (node.y0 + node.y1) / 2;
          return `rotate(${(angle * 180 / Math.PI - 90)}) translate(${radius},0) rotate(${angle > Math.PI ? 180 : 0})`;
        })
        .attr("dy", "0.35em")
        .attr("text-anchor", function(node) {
          const angle = (node.x0 + node.x1) / 2;
          return angle > Math.PI ? "end" : "start";
        })
        .style("font-size", "10px")
        .style("font-weight", "500")
        .style("fill", "#fff")
        .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.8)")
        .style("pointer-events", "none")
        .text(node => {
          const name = node.data.name;
          return name.length > 15 ? name.substring(0, 12) + "..." : name;
        });
    }
    
    function getPathToNode(node: any): string[] {
      const path = [];
      let current = node;
      while (current) {
        path.unshift(current.data.name);
        current = current.parent;
      }
      return path;
    }

    // Reset zoom on background click
    svg.on("click", () => {
      resetZoom();
    });

    function resetZoom() {
      setCurrentPath(['Maharashtra']);
      setSelectedNode(null);
      
      // Simply recreate the entire visualization with original root
      g.selectAll("*").remove();
      
      // Recreate paths with original data
      const resetPaths = g.selectAll("path")
        .data(partitionedData.descendants().filter(d => d.depth > 0))
        .enter().append("path")
        .attr("d", arc)
        .style("fill", colorScale)
        .style("stroke", "#fff")
        .style("stroke-width", 2)
        .style("opacity", 0.8)
        .style("cursor", "pointer");

      // Add interactions
      resetPaths
        .on("mouseover", function(event, d) {
          d3.select(this).style("opacity", 1).style("stroke-width", 3);
          setSelectedNode(d);
        })
        .on("mouseout", function(event, d) {
          d3.select(this).style("opacity", 0.8).style("stroke-width", 2);
        })
        .on("click", function(event, d) {
          event.stopPropagation();
          zoomToNode(d);
        });

      // Recreate text
      g.selectAll("text")
        .data(partitionedData.descendants().filter(d => d.depth > 0 && (d.x1 - d.x0) > 0.1))
        .enter().append("text")
        .attr("transform", function(d) {
          const angle = (d.x0 + d.x1) / 2;
          const radius = (d.y0 + d.y1) / 2;
          return `rotate(${(angle * 180 / Math.PI - 90)}) translate(${radius},0) rotate(${angle > Math.PI ? 180 : 0})`;
        })
        .attr("dy", "0.35em")
        .attr("text-anchor", function(d) {
          const angle = (d.x0 + d.x1) / 2;
          return angle > Math.PI ? "end" : "start";
        })
        .style("font-size", "10px")
        .style("font-weight", "500")
        .style("fill", "#fff")
        .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.8)")
        .style("pointer-events", "none")
        .text(d => {
          const name = d.data.name;
          return name.length > 15 ? name.substring(0, 12) + "..." : name;
        });
    }

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
              Interactive drill-down: Regions → Schemes → Villages
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPath(['Maharashtra'])}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {currentPath.map((segment, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>→</span>}
              <span className={index === currentPath.length - 1 ? "font-medium text-foreground" : ""}>
                {segment}
              </span>
            </React.Fragment>
          ))}
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
                  <span>Completed/Good (LPCD {'>'}55)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>In Progress/Warning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Critical (No supply)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span>Regional Overview</span>
                </div>
              </div>
            </div>
            
            {/* Selected Node Details */}
            {selectedNode && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{selectedNode.data.name}</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Type:</span> {selectedNode.data.type}</p>
                  {selectedNode.data.details && (
                    <>
                      {selectedNode.data.type === 'region' && (
                        <>
                          <p><span className="font-medium">Schemes:</span> {selectedNode.data.details.completedSchemes}/{selectedNode.data.details.totalSchemes}</p>
                          <p><span className="font-medium">Villages:</span> {selectedNode.data.details.completedVillages}/{selectedNode.data.details.totalVillages}</p>
                          <p><span className="font-medium">ESRs:</span> {selectedNode.data.details.completedESR}/{selectedNode.data.details.totalESR}</p>
                        </>
                      )}
                      {selectedNode.data.type === 'scheme' && (
                        <>
                          <p><span className="font-medium">ID:</span> {selectedNode.data.details.schemeId}</p>
                          <p><span className="font-medium">Block:</span> {selectedNode.data.details.block}</p>
                          <p><span className="font-medium">Villages:</span> {selectedNode.data.details.totalVillages}</p>
                          <p><span className="font-medium">Status:</span> {selectedNode.data.details.completionStatus}</p>
                        </>
                      )}
                      {selectedNode.data.type === 'village' && (
                        <>
                          <p><span className="font-medium">Population:</span> {selectedNode.data.details.population?.toLocaleString()}</p>
                          <p><span className="font-medium">Avg LPCD:</span> {selectedNode.data.details.averageLPCD}</p>
                          <p><span className="font-medium">Block:</span> {selectedNode.data.details.block}</p>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Instructions */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">How to Use</h4>
              <div className="text-sm space-y-1">
                <p>• Click segments to zoom in</p>
                <p>• Hover for details</p>
                <p>• Use Reset to return to top</p>
                <p>• Size = Population/Count</p>
                <p>• Color = Status/Performance</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}