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
}

export default function ZoomableSunburst() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Build hierarchy data
  const buildHierarchyData = (): HierarchyNode | null => {
    if (!regions || !schemeStatus || !waterSchemeData) return null;

    const regionsArray = Array.isArray(regions) ? regions : [];
    const schemeStatusArray = Array.isArray(schemeStatus) ? schemeStatus : [];
    const waterSchemeArray = Array.isArray(waterSchemeData) ? waterSchemeData : [];

    // Build the hierarchy: Maharashtra -> Regions -> Circles -> Status -> LPCD Performance
    const root: HierarchyNode = {
      name: "Maharashtra",
      children: regionsArray.map(region => {
        // Get all schemes for this region
        const regionSchemes = schemeStatusArray.filter(scheme => 
          scheme.region === region.region_name
        );

        // Group by circle - filter out null/undefined circles and give meaningful names
        const circleGroups = d3.group(regionSchemes, d => {
          if (!d.circle || d.circle.trim() === '' || d.circle.toLowerCase() === 'null' || d.circle.toLowerCase() === 'na') {
            return 'Other Circles';
          }
          return d.circle.trim();
        });

        return {
          name: region.region_name,
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

            // Only include circles that have connected schemes (Fully Completed + In Progress)
            const totalConnectedSchemes = completedSchemes.length + inProgressSchemes.length;
            if (totalConnectedSchemes === 0) {
              return null; // Skip circles with no connected schemes
            }

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
              children: [
                {
                  name: `Fully Completed (${completedSchemes.length})`,
                  value: completedSchemes.length,
                  children: [
                    { name: `>55 LPCD (${completedLPCD.high})`, value: completedLPCD.high },
                    { name: `≤55 LPCD (${completedLPCD.low})`, value: completedLPCD.low }
                  ]
                },
                {
                  name: `In Progress (${inProgressSchemes.length})`, 
                  value: inProgressSchemes.length,
                  children: [
                    { name: `>55 LPCD (${inProgressLPCD.high})`, value: inProgressLPCD.high },
                    { name: `≤55 LPCD (${inProgressLPCD.low})`, value: inProgressLPCD.low }
                  ]
                }
              ]
            };
          }).filter(Boolean) // Remove null entries (circles with no connected schemes)
        };
      })
    };

    return root;
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || isLoading) return;

    const data = buildHierarchyData();
    if (!data) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Chart dimensions
    const width = 928;
    const height = width;
    const radius = width / 6;

    // Create the color scale
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, (data.children?.length || 0) + 1));

    // Compute the layout
    const hierarchy = d3.hierarchy(data)
        .sum(d => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));
    
    const root = d3.partition()
        .size([2 * Math.PI, hierarchy.height + 1])
        (hierarchy);
    
    root.each((d: any) => d.current = d);

    // Create the arc generator
    const arc = d3.arc<any>()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius * 1.5)
        .innerRadius(d => d.y0 * radius)
        .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

    // Create the SVG container
    const svg = d3.select(svgRef.current)
        .attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${width}`)
        .style("font", "10px sans-serif");

    // Helper functions
    function arcVisible(d: any) {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function labelVisible(d: any) {
      return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    function labelTransform(d: any) {
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (d.y0 + d.y1) / 2 * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

    // Append the arcs
    const path = svg.append("g")
      .selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
        .attr("fill", (d: any) => { 
          while (d.depth > 1) d = d.parent; 
          return color(d.data.name); 
        })
        .attr("fill-opacity", (d: any) => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("pointer-events", (d: any) => arcVisible(d.current) ? "auto" : "none")
        .attr("d", (d: any) => arc(d.current));

    // Add click functionality
    path.filter((d: any) => d.children)
        .style("cursor", "pointer")
        .on("click", clicked);

    // Add tooltips
    const format = d3.format(",d");
    path.append("title")
        .text((d: any) => `${d.ancestors().map((d: any) => d.data.name).reverse().join("/")}\n${format(d.value || 0)}`);

    // Add labels
    const label = svg.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().slice(1))
      .join("text")
        .attr("dy", "0.35em")
        .attr("fill-opacity", (d: any) => +labelVisible(d.current))
        .attr("transform", (d: any) => labelTransform(d.current))
        .text((d: any) => d.data.name);

    // Add center circle for navigation
    const parent = svg.append("circle")
        .datum(root)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("click", clicked);

    // Handle zoom on click
    function clicked(event: any, p: any) {
      parent.datum(p.parent || root);

      root.each((d: any) => d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      });

      const t = svg.transition().duration(event.altKey ? 7500 : 750);

      // Transition the data on all arcs, even the ones that aren't visible,
      // so that if this transition is interrupted, entering arcs will start
      // the next transition from the desired position.
      path.transition(t)
          .tween("data", (d: any) => {
            const i = d3.interpolate(d.current, d.target);
            return (t: number) => d.current = i(t);
          })
        .filter(function(d: any) {
          return +(this as any).getAttribute("fill-opacity") || arcVisible(d.target);
        })
          .attr("fill-opacity", (d: any) => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
          .attr("pointer-events", (d: any) => arcVisible(d.target) ? "auto" : "none")
          .attrTween("d", (d: any) => () => arc(d.current));

      label.filter(function(d: any) {
          return +(this as any).getAttribute("fill-opacity") || labelVisible(d.target);
        }).transition(t)
          .attr("fill-opacity", (d: any) => +labelVisible(d.target))
          .attrTween("transform", (d: any) => () => labelTransform(d.current));
    }

  }, [isLoading, regions, schemeStatus, waterSchemeData]);

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
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full flex justify-center">
          <svg ref={svgRef} className="max-w-full h-auto"></svg>
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