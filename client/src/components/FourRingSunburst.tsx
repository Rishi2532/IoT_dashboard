import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SunburstNode {
  name: string;
  value: number;
  actualValue?: number;
  children?: SunburstNode[];
  type: 'root' | 'region' | 'completion-category' | 'lpcd-category';
  color?: string;
  status?: string;
  category?: string;
}

interface FourRingSunburstProps {
  data: SunburstNode;
  width?: number;
  height?: number;
}

export const FourRingSunburst: React.FC<FourRingSunburstProps> = ({
  data,
  width = 600,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const radius = Math.min(width, height) / 2 - 10;
  const [focusedNode, setFocusedNode] = useState<any>(null);
  const partitionedRootRef = useRef<any>(null);
  const gRef = useRef<any>(null);

  // Zoom function accessible from component level
  const zoomTo = (p: any) => {
    if (!gRef.current || !partitionedRootRef.current) return;
    
    setFocusedNode(p);
    
    const transition = gRef.current.transition()
      .duration(750);

    // Update path opacity based on focus
    transition.selectAll("path")
      .style("opacity", (d: any) => {
        if (p === partitionedRootRef.current) {
          return 1;
        } else if (d === p || (d?.parent && d.parent === p) || (d?.parent?.parent && d.parent.parent === p)) {
          return 1;
        } else {
          return 0.3;
        }
      });

    // Update label opacity
    transition.selectAll("text")
      .style("opacity", (d: any) => {
        if (p === partitionedRootRef.current) {
          return 1;
        } else if (d === p || (d?.parent && d.parent === p) || (d?.parent?.parent && d.parent.parent === p)) {
          return 1;
        } else {
          return 0.3;
        }
      });
  };

  // Reset zoom function
  const resetZoom = () => {
    if (partitionedRootRef.current) {
      zoomTo(partitionedRootRef.current);
    }
  };

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create the sunburst visualization
    createSunburst();
  }, [data, width, height]);

  const createSunburst = () => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Store g reference for zoom functionality
    gRef.current = g;

    // Create the partition layout
    const partition = d3.partition<SunburstNode>()
      .size([2 * Math.PI, radius]);

    // Create hierarchy from data
    const root = d3.hierarchy(data)
      .sum(d => d.value || 1);

    // Apply partition layout - this adds x0, x1, y0, y1 properties
    const partitionedRoot = partition(root);

    // Store partitioned root reference for zoom functionality
    partitionedRootRef.current = partitionedRoot;
    
    // Initialize focused node if not set
    if (!focusedNode) {
      setFocusedNode(partitionedRoot);
    }

    // Create arc generator for the 4 rings
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(0.002) // Small padding for visual separation
      .innerRadius(d => {
        // Define the 4 rings according to specifications
        if (d.depth === 0) return 0; // Center: Maharashtra
        if (d.depth === 1) return radius * 0.2; // Ring 1: Regions
        if (d.depth === 2) return radius * 0.5; // Ring 2: Completion Status
        if (d.depth === 3) return radius * 0.75; // Ring 3: LPCD Categories
        return radius;
      })
      .outerRadius(d => {
        if (d.depth === 0) return radius * 0.2; // Center: Maharashtra
        if (d.depth === 1) return radius * 0.5; // Ring 1: Regions
        if (d.depth === 2) return radius * 0.75; // Ring 2: Completion Status
        if (d.depth === 3) return radius; // Ring 3: LPCD Categories
        return radius;
      });

    // Color scheme for each ring type
    const getColor = (node: any) => {
      if (node.data.color) return node.data.color;
      
      // Ring-specific colors
      if (node.depth === 0) return '#1f2937'; // Maharashtra - dark gray
      if (node.depth === 1) return '#3b82f6'; // Regions - blue
      if (node.depth === 2) {
        // Completion status
        return node.data.status === 'Fully Completed' ? '#10b981' : '#f59e0b';
      }
      if (node.depth === 3) {
        // LPCD categories
        return node.data.category === 'Above 55 LPCD' ? '#22c55e' : '#ef4444';
      }
      return '#6b7280';
    };

    // Create tooltip
    const tooltip = d3.select('body')
      .selectAll('.four-ring-tooltip')
      .data([0])
      .join('div')
      .attr('class', 'four-ring-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);



    // Create arcs using partitioned data
    const arcs = g.selectAll('path')
      .data(partitionedRoot.descendants())
      .join('path')
      .attr('d', arc as any)
      .style('fill', getColor)
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', function(event, d: any) {
        // Only zoom on ring 1 (regions) or center
        if (d.depth <= 1) {
          zoomTo(d === focusedNode ? partitionedRootRef.current : d);
        }
      })
      .on('mouseover', function(event, d: any) {
        // Highlight segment
        d3.select(this).style('stroke-width', 2);
        
        // Show tooltip
        let content = `<strong>${d.data.name}</strong>`;
        
        if (d.depth === 1) {
          content += `<br/>Region: ${d.data.name}`;
          if (d.data.actualValue !== undefined) {
            content += `<br/>Villages: ${d.data.actualValue}`;
          }
          content += `<br/><em>Click to zoom</em>`;
        } else if (d.depth === 2) {
          content += `<br/>Status: ${d.data.status}`;
          if (d.data.actualValue !== undefined) {
            content += `<br/>Villages: ${d.data.actualValue}`;
          }
        } else if (d.depth === 3) {
          content += `<br/>LPCD: ${d.data.category}`;
          if (d.data.actualValue !== undefined) {
            content += `<br/>Villages: ${d.data.actualValue}`;
          }
        }
        
        tooltip
          .style('opacity', 1)
          .html(content)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        // Remove highlight
        d3.select(this).style('stroke-width', 1);
        
        // Hide tooltip
        tooltip.style('opacity', 0);
      });

    // Add center label for Maharashtra
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#374151')
      .text('Maharashtra');

    // Add ring labels if needed (optional)
    if (data.children && data.children.length > 0) {
      // Add region labels on Ring 1
      const regionLabels = g.selectAll('.region-label')
        .data(partitionedRoot.children || [])
        .join('text')
        .attr('class', 'region-label')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '500')
        .style('fill', '#fff')
        .style('pointer-events', 'none')
        .text((d: any) => d.data.name)
        .attr('transform', (d: any) => {
          const angle = (d.x0 + d.x1) / 2;
          const radiusPos = radius * 0.35; // Position in Ring 1
          const x = radiusPos * Math.sin(angle);
          const y = -radiusPos * Math.cos(angle);
          return `translate(${x}, ${y}) rotate(${angle * 180 / Math.PI - 90})`;
        });
    }
  };

  // Helper function to get breadcrumb path
  const getBreadcrumbPath = (node: any): string[] => {
    if (!node || node.data?.type === 'root') {
      return ['Maharashtra'];
    }
    const path = ['Maharashtra'];
    if (node.data?.type === 'region') {
      path.push(node.data.name);
    }
    return path;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Maharashtra Water Infrastructure Hierarchy
          {focusedNode && focusedNode.data?.type !== 'root' && (
            <Button variant="outline" size="sm" onClick={resetZoom}>
              Reset View
            </Button>
          )}
        </CardTitle>
        
        {/* Breadcrumb Navigation */}
        {focusedNode && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
            <span>Current View:</span>
            {getBreadcrumbPath(focusedNode).map((item, index, arr) => (
              <span key={index} className="flex items-center">
                <span className={index === arr.length - 1 ? "font-medium text-foreground" : ""}>
                  {item}
                </span>
                {index < arr.length - 1 && <span className="mx-1">→</span>}
              </span>
            ))}
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <div className="font-medium">Ring Structure:</div>
              <div className="text-xs space-y-1 mt-1">
                <div>🎯 Center: Maharashtra</div>
                <div>🟢 Ring 1: 6 Regions (Equal)</div>
                <div>🟠 Ring 2: Completion Status</div>
                <div>🟡 Ring 3: LPCD Levels (&gt;55 / &lt;55)</div>
              </div>
            </div>
            <div>
              <div className="font-medium">Legend:</div>
              <div className="text-xs space-y-1 mt-1">
                <div><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-1"></span>Regions</div>
                <div><span className="inline-block w-3 h-3 bg-green-500 rounded mr-1"></span>Fully Completed</div>
                <div><span className="inline-block w-3 h-3 bg-amber-500 rounded mr-1"></span>Partially Completed</div>
                <div><span className="inline-block w-3 h-3 bg-red-500 rounded mr-1"></span>&lt;55 LPCD</div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <svg ref={svgRef}></svg>
        </div>
      </CardContent>
    </Card>
  );
};