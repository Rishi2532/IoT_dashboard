import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

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
  circle: string;
  completion_status: string;
  total_villages: number;
  completed_villages: number;
}

interface WaterSchemeData {
  id: number;
  scheme_name: string;
  village_name: string;
  region: string;
  circle: string;
  lpcd: number;
  water_available: number;
  population: number;
}

interface HierarchyNode {
  name: string;
  value?: number;
  children?: HierarchyNode[];
  color?: string;
}

export default function ZoomableSunburst() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['Maharashtra']);
  const [currentRoot, setCurrentRoot] = useState<any>(null);

  // Fetch all required data
  const { data: regions, isLoading: regionsLoading } = useQuery<RegionData[]>({
    queryKey: ["/api/regions"],
  });

  const { data: schemeStatus, isLoading: schemeStatusLoading } = useQuery<SchemeData[]>({
    queryKey: ["/api/scheme-status"],
  });

  const { data: waterSchemeData, isLoading: waterSchemeDataLoading } = useQuery<WaterSchemeData[]>({
    queryKey: ["/api/water-scheme-data"],
  });

  const isLoading = regionsLoading || schemeStatusLoading || waterSchemeDataLoading;

  // Build hierarchy data with proper colors
  const buildHierarchyData = (): HierarchyNode | null => {
    if (!regions || !schemeStatus || !waterSchemeData) return null;

    const regionsArray = Array.isArray(regions) ? regions : [];
    const schemeStatusArray = Array.isArray(schemeStatus) ? schemeStatus : [];
    const waterSchemeArray = Array.isArray(waterSchemeData) ? waterSchemeData : [];

    // Color schemes for different levels
    const regionColors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
    const statusColors = { 'Fully Completed': '#22C55E', 'In Progress': '#F97316' };
    const lPCDColors = { '>55 LPCD': '#16A34A', '≤55 LPCD': '#DC2626' };

    // Build the hierarchy: Maharashtra -> Regions -> Circles -> Status -> LPCD Performance
    const root: HierarchyNode = {
      name: "Maharashtra",
      color: '#1F2937',
      children: regionsArray.map((region, regionIndex) => {
        // Get all schemes for this region
        const regionSchemes = schemeStatusArray.filter(scheme => 
          scheme.region === region.region_name
        );

        // Group by circle
        const circleGroups = d3.group(regionSchemes, d => d.circle || 'Unknown Circle');

        return {
          name: region.region_name,
          color: regionColors[regionIndex % regionColors.length],
          children: Array.from(circleGroups, ([circleName, circleSchemes]) => {
            // Split schemes by completion status
            const completedSchemes = circleSchemes.filter(scheme => 
              scheme.completion_status === 'Completed' || 
              scheme.completion_status === 'Fully Completed'
            );
            
            const inProgressSchemes = circleSchemes.filter(scheme => 
              scheme.completion_status !== 'Completed' && 
              scheme.completion_status !== 'Fully Completed'
            );

            // Function to calculate LPCD performance for schemes
            const calculateLPCDPerformance = (schemes: SchemeData[]) => {
              const schemeNames = schemes.map(s => s.scheme_name);
              const relevantWaterData = waterSchemeArray.filter(wd => 
                schemeNames.includes(wd.scheme_name) && 
                wd.lpcd && 
                wd.lpcd > 0
              );

              const highLPCD = relevantWaterData.filter(wd => wd.lpcd > 55);
              const lowLPCD = relevantWaterData.filter(wd => wd.lpcd <= 55);

              return {
                high: Math.max(highLPCD.length, 1),
                low: Math.max(lowLPCD.length, 1)
              };
            };

            const completedLPCD = calculateLPCDPerformance(completedSchemes);
            const inProgressLPCD = calculateLPCDPerformance(inProgressSchemes);

            return {
              name: circleName,
              color: d3.interpolateViridis(Math.random()),
              children: [
                {
                  name: "Fully Completed",
                  color: statusColors['Fully Completed'],
                  children: [
                    { 
                      name: ">55 LPCD", 
                      value: completedLPCD.high,
                      color: lPCDColors['>55 LPCD']
                    },
                    { 
                      name: "≤55 LPCD", 
                      value: completedLPCD.low,
                      color: lPCDColors['≤55 LPCD']
                    }
                  ]
                },
                {
                  name: "In Progress",
                  color: statusColors['In Progress'],
                  children: [
                    { 
                      name: ">55 LPCD", 
                      value: inProgressLPCD.high,
                      color: lPCDColors['>55 LPCD']
                    },
                    { 
                      name: "≤55 LPCD", 
                      value: inProgressLPCD.low,
                      color: lPCDColors['≤55 LPCD']
                    }
                  ]
                }
              ]
            };
          })
        };
      })
    };

    return root;
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || isLoading) return;

    const hierarchyData = buildHierarchyData();
    if (!hierarchyData) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Container dimensions
    const containerWidth = containerRef.current.offsetWidth;
    const width = Math.max(800, containerWidth);
    const height = 600;
    const radius = Math.min(width, height) / 2 - 60;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Create hierarchy
    const root = d3.hierarchy(currentRoot || hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition
    const partition = d3.partition<HierarchyNode>()
      .size([2 * Math.PI, radius]);

    partition(root);

    // Arc generator
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => Math.sqrt(d.y0))
      .outerRadius(d => Math.sqrt(d.y1));

    // Create arcs
    const arcs = g.selectAll("path")
      .data(root.descendants())
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", d => {
        if (d.data.color) return d3.color(d.data.color)?.toString() || '#6B7280';
        // Fallback color based on depth
        const colors = ['#1F2937', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'];
        return colors[d.depth] || '#6B7280';
      })
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .style("cursor", d => d.children ? "pointer" : "default")
      .style("opacity", 0.8)
      .on("click", (event, d) => {
        if (d.children) {
          zoomTo(d);
        }
      })
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 1);
        
        // Show tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "sunburst-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.9)")
          .style("color", "white")
          .style("padding", "12px")
          .style("border-radius", "8px")
          .style("font-size", "14px")
          .style("font-weight", "500")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)");

        tooltip.html(`
          <div><strong>${d.data.name}</strong></div>
          ${d.value ? `<div>Count: ${d.value}</div>` : ''}
          ${d.children ? '<div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">Click to zoom in</div>' : ''}
        `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 15) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 0.8);
        d3.selectAll(".sunburst-tooltip").remove();
      });

    // Add text labels
    const texts = g.selectAll("text")
      .data(root.descendants().filter(d => d.depth > 0 && (d.x1 - d.x0) > 0.05))
      .enter()
      .append("text")
      .attr("transform", d => {
        const angle = (d.x0 + d.x1) / 2;
        const radius = (Math.sqrt(d.y0) + Math.sqrt(d.y1)) / 2;
        let rotation = (angle * 180 / Math.PI) - 90;
        
        // Flip text if it would be upside down
        if (rotation > 90) rotation -= 180;
        
        return `translate(${Math.sin(angle) * radius}, ${-Math.cos(angle) * radius}) rotate(${rotation})`;
      })
      .style("text-anchor", "middle")
      .style("font-size", d => {
        // Dynamic font size based on segment size and depth
        const segmentSize = d.x1 - d.x0;
        const baseSize = Math.max(8, Math.min(14, segmentSize * 100));
        return `${baseSize}px`;
      })
      .style("font-weight", "600")
      .style("fill", "#000")
      .style("pointer-events", "none")
      .text(d => {
        const segmentSize = d.x1 - d.x0;
        let text = d.data.name;
        
        // Show count for leaf nodes
        if (!d.children && d.value) {
          text += ` (${d.value})`;
        }
        
        // Truncate long text for small segments
        if (segmentSize < 0.1 && text.length > 8) {
          text = text.substring(0, 8) + '...';
        }
        
        return text;
      });

    // Zoom function
    const zoomTo = (node: any) => {
      // Update breadcrumb
      const pathArray = [];
      let current = node;
      while (current) {
        pathArray.unshift(current.data.name);
        current = current.parent;
      }
      setBreadcrumb(pathArray);
      setCurrentRoot(node.data);
    };

    if (!currentRoot) {
      setCurrentRoot(hierarchyData);
    }

  }, [isLoading, regions, schemeStatus, waterSchemeData, currentRoot]);

  // Handle breadcrumb click
  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      setBreadcrumb(['Maharashtra']);
      setCurrentRoot(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Zoomable Sunburst - Water Infrastructure Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading sunburst visualization...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Zoomable Sunburst - Water Infrastructure Hierarchy</CardTitle>
        <p className="text-sm text-gray-600">
          Interactive exploration: Maharashtra → Regions → Circles → Status → LPCD Performance. Click segments to zoom in.
        </p>
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-500">Path:</span>
          {breadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="text-gray-400">→</span>}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  index === breadcrumb.length - 1
                    ? 'bg-blue-100 text-blue-800 font-semibold'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                {item}
              </button>
            </React.Fragment>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full">
          <svg ref={svgRef} className="drop-shadow-lg"></svg>
        </div>
        
        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span>Fully Completed</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-600 rounded mr-2"></div>
            <span>{'>'} 55 LPCD (Good)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
            <span>≤ 55 LPCD (Needs Improvement)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}