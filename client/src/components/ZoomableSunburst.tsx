import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, ChevronRight } from 'lucide-react';

interface SunburstNode {
  name: string;
  value?: number;
  children?: SunburstNode[];
  status?: string;
  lpcd?: number;
  population?: number;
  region?: string;
  scheme?: string;
  village?: string;
  type: 'root' | 'region' | 'scheme' | 'village';
}

interface ZoomableSunburstProps {
  data: SunburstNode;
  width?: number;
  height?: number;
}

export const ZoomableSunburst: React.FC<ZoomableSunburstProps> = ({
  data,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Maharashtra']);
  const radius = Math.min(width, height) / 6;

  useEffect(() => {
    if (data && svgRef.current) {
      console.log('ZoomableSunburst: Creating visualization with data:', data);
      console.log('ZoomableSunburst: Number of regions in data:', data.children?.length || 0);
      createSunburst(data);
    }
  }, [data, width, height]);

  const getNodeColor = (node: any) => {
    const statusColors = {
      'Completed': '#10b981',
      'In Progress': '#f59e0b', 
      'Not Started': '#ef4444',
      'default': '#6b7280'
    };

    const typeColors = {
      'root': '#1f2937',
      'region': '#3b82f6',
      'scheme': '#8b5cf6',
      'village': '#06b6d4'
    };

    if (node.data.status) {
      return statusColors[node.data.status as keyof typeof statusColors] || statusColors.default;
    }
    return typeColors[node.data.type as keyof typeof typeColors] || statusColors.default;
  };

  const createSunburst = (rootData: SunburstNode) => {
    console.log('ZoomableSunburst: Creating sunburst with data:', rootData);
    console.log('ZoomableSunburst: Root children count:', rootData.children?.length);
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr('width', width).attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create hierarchy
    const hierarchy = d3.hierarchy(rootData)
      .sum((d: any) => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
    
    console.log('ZoomableSunburst: Hierarchy children count:', hierarchy.children?.length);

    // Create partition layout
    const partition = d3.partition<SunburstNode>()
      .size([2 * Math.PI, hierarchy.height + 1]);

    const root = partition(hierarchy);
    
    // Add current property to each node for transitions
    root.each((d: any) => d.current = d);

    // Create arc generator
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius(d => d.y0 * radius)
      .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

    // Create tooltip
    const tooltip = d3.select('body')
      .selectAll('.sunburst-tooltip')
      .data([0])
      .join('div')
      .attr('class', 'sunburst-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);

    // Helper functions
    const arcVisible = (d: any) => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    const labelVisible = (d: any) => d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    const labelTransform = (d: any) => {
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (d.y0 + d.y1) / 2 * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    };

    // Draw arcs
    const path = g.append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('fill', d => getNodeColor(d))
      .attr('fill-opacity', (d: any) => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
      .attr('pointer-events', (d: any) => arcVisible(d.current) ? 'auto' : 'none')
      .attr('d', (d: any) => arc(d.current))
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .style('cursor', (d: any) => d.children ? 'pointer' : 'default')
      .on('mouseover', function(event, d: any) {
        d3.select(this).attr('fill-opacity', 0.8);
        
        const tooltipContent = `
          <div><strong>${d.data.name}</strong></div>
          ${d.data.type ? `<div>Type: ${d.data.type}</div>` : ''}
          ${d.data.population ? `<div>Population: ${d.data.population.toLocaleString()}</div>` : ''}
          ${d.data.lpcd ? `<div>LPCD: ${d.data.lpcd}</div>` : ''}
          ${d.data.status ? `<div>Status: ${d.data.status}</div>` : ''}
          ${d.children ? `<div>Sub-items: ${d.children.length}</div>` : ''}
          <div>Value: ${d.value}</div>
        `;
        
        tooltip
          .style('opacity', 1)
          .html(tooltipContent)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d: any) {
        d3.select(this).attr('fill-opacity', arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0);
        tooltip.style('opacity', 0);
      });

    // Add click handler for zoom
    path.filter((d: any) => d.children)
      .on('click', clicked);

    // Add labels
    const label = g.append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('dy', '0.35em')
      .attr('fill-opacity', (d: any) => +labelVisible(d.current))
      .attr('transform', (d: any) => labelTransform(d.current))
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text((d: any) => d.data.name);

    // Add center circle for zoom out
    const parent = g.append('circle')
      .datum(root)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .style('cursor', 'pointer')
      .on('click', clicked);

    // Click handler for zoom functionality with proper centering
    function clicked(event: any, p: any) {
      // Update parent for center circle
      parent.datum(p.parent || root);

      // Calculate the new scale and transform for proper centering
      const angleRange = p.x1 - p.x0;
      const centerAngle = (p.x0 + p.x1) / 2;
      
      // Normalize to make clicked segment take full circle
      root.each((d: any) => {
        // Calculate new angular positions relative to clicked segment
        const normalizedX0 = (d.x0 - p.x0) / angleRange;
        const normalizedX1 = (d.x1 - p.x0) / angleRange;
        
        d.target = {
          x0: normalizedX0 * 2 * Math.PI,
          x1: normalizedX1 * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth)
        };
      });

      // Animate to new positions with smooth transition
      const t = svg.transition().duration(750);
      
      // Update paths
      path.transition(t as any)
        .attrTween('d', (d: any) => {
          const i = d3.interpolate(d.current, d.target);
          return (t: number) => {
            d.current = i(t);
            return arc(d.current) || '';
          };
        })
        .attr('fill-opacity', (d: any) => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
        .attr('pointer-events', (d: any) => arcVisible(d.target) ? 'auto' : 'none');

      // Update labels
      label.transition(t as any)
        .attr('fill-opacity', (d: any) => +labelVisible(d.target))
        .attrTween('transform', (d: any) => {
          const i = d3.interpolate(d.current, d.target);
          return (t: number) => labelTransform(i(t)) || '';
        });

      // Update current state for each node
      setTimeout(() => {
        root.each((d: any) => {
          d.current = d.target;
        });
        
        // Update arcs
        path.attr('d', (d: any) => arc(d.current))
          .attr('fill-opacity', (d: any) => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
          .attr('pointer-events', (d: any) => arcVisible(d.current) ? 'auto' : 'none');
        
        // Update labels
        label.attr('transform', (d: any) => labelTransform(d.current))
          .attr('fill-opacity', (d: any) => +labelVisible(d.current));
      }, 750);

      // Update breadcrumbs
      const ancestors = p.ancestors().reverse();
      const names = ancestors.map((d: any) => d.data.name);
      setBreadcrumbs(names);
    }
  };

  const resetToRoot = () => {
    setBreadcrumbs(['Maharashtra']);
    if (data && svgRef.current) {
      createSunburst(data);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Maharashtra Water Infrastructure Hierarchy</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToRoot}
            className="h-6 px-2"
          >
            <Home className="h-3 w-3" />
          </Button>
          {breadcrumbs.map((name, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={index === breadcrumbs.length - 1 ? 'font-semibold' : ''}>
                {name}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          Click on segments to zoom in • Click center to zoom out • Hover for details
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <svg ref={svgRef} />
        </div>
      </CardContent>
    </Card>
  );
};