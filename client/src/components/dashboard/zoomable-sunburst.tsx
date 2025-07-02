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
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['Maharashtra']);

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

        // Group by circle
        const circleGroups = d3.group(regionSchemes, d => d.circle || 'Unknown Circle');

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
                high: highLPCD.length,
                low: lowLPCD.length
              };
            };

            const completedLPCD = calculateLPCDPerformance(completedSchemes);
            const inProgressLPCD = calculateLPCDPerformance(inProgressSchemes);

            return {
              name: circleName,
              children: [
                {
                  name: "Fully Completed",
                  children: [
                    { name: ">55 LPCD", value: completedLPCD.high || 1 },
                    { name: "≤55 LPCD", value: completedLPCD.low || 1 }
                  ]
                },
                {
                  name: "In Progress", 
                  children: [
                    { name: ">55 LPCD", value: inProgressLPCD.high || 1 },
                    { name: "≤55 LPCD", value: inProgressLPCD.low || 1 }
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
    const radius = Math.min(width, height) / 2 - 40;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Create hierarchy
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition
    const partition = d3.partition<HierarchyNode>()
      .size([2 * Math.PI, radius]);

    partition(root);

    // Color scale
    const color = d3.scaleOrdinal<string>()
      .domain(['Maharashtra', 'Fully Completed', 'In Progress', '>55 LPCD', '≤55 LPCD'])
      .range(['#1f2937', '#22c55e', '#f97316', '#16a34a', '#dc2626']);

    // Arc generator
    const arc = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => Math.sqrt(d.y0))
      .outerRadius(d => Math.sqrt(d.y1));

    // Current data
    let currentData = root;

    // Function to update the visualization
    const updateVisualization = (sourceData: any) => {
      const descendants = sourceData.descendants();
      
      // Update arcs
      const paths = g.selectAll("path")
        .data(descendants, (d: any) => d.data.name + d.depth);

      paths.exit().remove();

      const pathsEnter = paths.enter().append("path")
        .style("fill", (d: any) => {
          if (d.depth === 0) return color('Maharashtra');
          if (d.depth === 3) return color(d.data.name);
          if (d.depth === 4) return color(d.data.name);
          return d3.interpolateBlues(0.3 + (d.depth * 0.2));
        })
        .style("stroke", "#fff")
        .style("stroke-width", 2)
        .style("cursor", (d: any) => d.children ? "pointer" : "default")
        .on("click", (event, d: any) => {
          if (d.children) {
            zoomTo(d);
          }
        })
        .on("mouseover", function(event, d: any) {
          d3.select(this).style("opacity", 0.8);
          
          // Show tooltip
          const tooltip = d3.select("body").append("div")
            .attr("class", "sunburst-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          tooltip.html(`
            <strong>${d.data.name}</strong><br/>
            ${d.value ? `Count: ${d.value}` : ''}
            ${d.children ? `<br/>Click to zoom in` : ''}
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).style("opacity", 1);
          d3.selectAll(".sunburst-tooltip").remove();
        });

      pathsEnter.merge(paths as any)
        .transition()
        .duration(750)
        .attrTween("d", (d: any) => {
          const interpolate = d3.interpolate({ x0: 0, x1: 0, y0: 0, y1: 0 }, d);
          return (t: number) => arc(interpolate(t) as any) || "";
        });

      // Update text labels
      const texts = g.selectAll("text")
        .data(descendants.filter((d: any) => d.depth > 0 && (d.x1 - d.x0) > 0.1), (d: any) => d.data.name + d.depth);

      texts.exit().remove();

      const textsEnter = texts.enter().append("text")
        .style("fill", "#000")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("text-anchor", "middle")
        .style("pointer-events", "none");

      textsEnter.merge(texts as any)
        .transition()
        .duration(750)
        .attr("transform", (d: any) => {
          const angle = (d.x0 + d.x1) / 2;
          const radius = (Math.sqrt(d.y0) + Math.sqrt(d.y1)) / 2;
          return `translate(${Math.sin(angle) * radius}, ${-Math.cos(angle) * radius})`;
        })
        .text((d: any) => {
          if (d.depth <= 2) return d.data.name;
          return `${d.data.name}${d.value ? ` (${d.value})` : ''}`;
        });
    };

    // Zoom function
    const zoomTo = (node: any) => {
      // Update breadcrumb
      const pathArray = [];
      let current: any = node;
      while (current) {
        pathArray.unshift(current.data.name);
        current = current.parent;
      }
      setBreadcrumb(pathArray);

      // Recalculate partition for the selected node
      const newRoot = d3.hierarchy(node.data)
        .sum(d => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      partition(newRoot);
      const partitionedRoot = newRoot as d3.HierarchyRectangularNode<HierarchyNode>;
      currentData = partitionedRoot;
      updateVisualization(partitionedRoot);
    };

    // Initial render
    updateVisualization(root);
    currentData = root;

  }, [isLoading, regions, schemeStatus, waterSchemeData]);

  // Handle breadcrumb click
  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      setBreadcrumb(['Maharashtra']);
      // Trigger re-render by updating the component
      const hierarchyData = buildHierarchyData();
      if (hierarchyData && svgRef.current) {
        // Clear and re-render
        d3.select(svgRef.current).selectAll("*").remove();
      }
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
                className={`px-2 py-1 rounded ${
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
          <svg ref={svgRef}></svg>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
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
            <span>{'>'}55 LPCD (Good)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
            <span>≤55 LPCD (Needs Improvement)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}