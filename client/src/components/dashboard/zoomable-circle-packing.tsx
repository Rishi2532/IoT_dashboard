import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface SchemeData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  completion_status: string;
  total_villages: number;
  completed_villages: number;
}

interface HierarchyNode {
  name: string;
  value?: number;
  type?: string;
  children?: HierarchyNode[];
}

export default function ZoomableCirclePacking() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentNode, setCurrentNode] = useState<any>(null);
  
  // Fetch scheme status data
  const { data: schemeStatus, isLoading, error } = useQuery<SchemeData[]>({ 
    queryKey: ["/api/scheme-status"] 
  });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || isLoading || !schemeStatus || !Array.isArray(schemeStatus)) {
      return;
    }

    // Container dimensions
    const containerWidth = containerRef.current.offsetWidth;
    const width = Math.max(800, containerWidth);
    const height = 600;
    const margin = 20;

    // Process data by region
    const regionStats = new Map<string, {
      totalSchemes: number;
      completedSchemes: number;
      inProgressSchemes: number;
    }>();
    
    schemeStatus.forEach((scheme: SchemeData) => {
      const region = scheme.region || 'Unknown';
      if (!regionStats.has(region)) {
        regionStats.set(region, {
          totalSchemes: 0,
          completedSchemes: 0,
          inProgressSchemes: 0
        });
      }
      
      const stats = regionStats.get(region)!;
      stats.totalSchemes += 1;
      
      if (scheme.completion_status === 'Fully Completed') {
        stats.completedSchemes += 1;
      } else {
        stats.inProgressSchemes += 1;
      }
    });

    // Build hierarchy - Maharashtra as root with regions as children
    const hierarchyData: HierarchyNode = {
      name: "Maharashtra",
      children: Array.from(regionStats.entries()).map(([regionName, stats]) => ({
        name: regionName,
        children: [
          ...(stats.completedSchemes > 0 ? [{
            name: stats.completedSchemes.toString(),
            value: stats.completedSchemes,
            type: "completed"
          }] : []),
          ...(stats.inProgressSchemes > 0 ? [{
            name: stats.inProgressSchemes.toString(),
            value: stats.inProgressSchemes,
            type: "progress"
          }] : [])
        ]
      })).filter(region => region.children.length > 0)
    };

    // Clear previous chart
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set up SVG
    svg.attr("width", width)
       .attr("height", height)
       .attr("viewBox", `0 0 ${width} ${height}`)
       .style("background", "linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)")
       .style("border-radius", "12px");

    // Create hierarchy
    const root = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.value || 0)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    // Pack layout
    const pack = d3.pack<HierarchyNode>()
      .size([width - margin * 2, height - margin * 2])
      .padding(6);

    pack(root);

    // Color scale
    const colorScale = (d: d3.HierarchyCircularNode<HierarchyNode>) => {
      if (d.depth === 0) return "#4fc3f7"; // Root - light blue
      if (d.depth === 1) return "#29b6f6"; // Regions - medium blue
      if (d.data.type === "completed") return "#4caf50"; // Completed - green
      if (d.data.type === "progress") return "#ff9800"; // In progress - orange
      return "#90caf9"; // Default - light blue
    };

    // Create container group
    const container = svg.append("g")
      .attr("transform", `translate(${margin}, ${margin})`);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on("zoom", (event) => {
        container.attr("transform", 
          `translate(${margin + event.transform.x}, ${margin + event.transform.y}) scale(${event.transform.k})`
        );
      });

    svg.call(zoom);

    // Create nodes
    const nodes = container.selectAll("g")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer");

    // Add circles
    nodes.append("circle")
      .attr("r", (d: any) => d.r)
      .style("fill", (d: any) => colorScale(d))
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .style("opacity", 0.8)
      .on("mouseover", function(event, d: any) {
        d3.select(this)
          .style("opacity", 1)
          .style("stroke-width", 3);
      })
      .on("mouseout", function(event, d: any) {
        d3.select(this)
          .style("opacity", 0.8)
          .style("stroke-width", 2);
      })
      .on("click", function(event, d: any) {
        event.stopPropagation();
        zoomToNode(d);
      });

    // Add text labels - only show numbers for leaf nodes
    nodes.append("text")
      .attr("dy", "0.3em")
      .attr("text-anchor", "middle")
      .style("font-size", (d: any) => {
        if (d.r < 15) return "0px"; // Hide text for very small circles
        if (d.r < 25) return "10px";
        if (d.r < 40) return "12px";
        if (d.r < 60) return "14px";
        return "16px";
      })
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text((d: any) => {
        // Show only numbers for leaf nodes (actual scheme counts)
        if (d.children) {
          // For parent nodes, show region names only if they fit
          if (d.depth === 1 && d.r > 60) {
            return d.data.name;
          }
          return "";
        }
        // For leaf nodes, show the number
        return d.data.name;
      });

    // Add region labels as separate text for better visibility
    nodes.filter((d: any) => d.depth === 1)
      .append("text")
      .attr("dy", "-0.5em")
      .attr("text-anchor", "middle")
      .style("font-size", (d: any) => Math.min(d.r / 4, 14) + "px")
      .style("font-weight", "normal")
      .style("fill", "#fff")
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text((d: any) => d.r > 40 ? d.data.name : "");

    // Zoom to node function
    function zoomToNode(d: d3.HierarchyCircularNode<HierarchyNode>) {
      const scale = Math.min(width, height) / (d.r * 2.2);
      const x = -d.x * scale + width / 2;
      const y = -d.y * scale + height / 2;

      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity
            .translate(x - margin, y - margin)
            .scale(scale)
        );

      setCurrentNode(d);
    }

    // Initialize with root view
    setCurrentNode(root);

    // Reset zoom on background click
    svg.on("click", () => {
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
      setCurrentNode(root);
    });

  }, [schemeStatus, isLoading]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Water Infrastructure Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading visualization...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Water Infrastructure Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 p-8">
            Error loading data: {error.toString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Water Infrastructure Hierarchy</CardTitle>
        <p className="text-sm text-gray-600">
          Circle size represents the number of schemes. Green = Completed, Orange = In Progress. Click to zoom.
        </p>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full relative">
          <svg ref={svgRef} className="w-full border rounded-lg shadow-lg"></svg>
          
          {/* Legend */}
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
              <span>Regions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Completed Schemes</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span>In Progress Schemes</span>
            </div>
          </div>

          {/* Current view indicator */}
          {currentNode && (
            <div className="mt-2 text-center text-sm text-gray-500">
              Current view: {currentNode.data.name}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}