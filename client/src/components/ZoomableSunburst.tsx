import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, ZoomIn, ZoomOut } from 'lucide-react';

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
  const [currentNode, setCurrentNode] = useState<SunburstNode>(data);
  const [breadcrumbs, setBreadcrumbs] = useState<SunburstNode[]>([data]);

  const radius = Math.min(width, height) / 2;

  // Color scales for different statuses and LPCD levels
  const statusColors = {
    'Completed': '#10b981', // green
    'In Progress': '#f59e0b', // amber
    'Not Started': '#ef4444', // red
    'default': '#6b7280' // gray
  };

  const lpcdColors = d3.scaleSequential(d3.interpolateRdYlGn)
    .domain([0, 100]);

  const getNodeColor = (node: any) => {
    if (node.data.type === 'root') return '#1f2937';
    if (node.data.lpcd) return lpcdColors(node.data.lpcd);
    if (node.data.status) return statusColors[node.data.status as keyof typeof statusColors] || statusColors.default;
    
    // Default colors by type
    const typeColors = {
      region: '#3b82f6',
      scheme: '#8b5cf6',
      village: '#06b6d4'
    };
    return typeColors[node.data.type as keyof typeof typeColors] || statusColors.default;
  };

  const createSunburst = (rootData: SunburstNode) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Create hierarchy
    const hierarchy = d3.hierarchy(rootData)
      .sum((d: any) => d.value || d.children?.length || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition<SunburstNode>()
      .size([2 * Math.PI, radius]);

    const root = partition(hierarchy);

    // Create arc generator
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

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

    // Draw arcs
    const arcs = g.selectAll('path')
      .data(root.descendants().slice(1)) // Skip root
      .join('path')
      .attr('d', arc)
      .attr('fill', getNodeColor)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('opacity', 0.8)
      .on('mouseover', function(event, d) {
        d3.select(this).style('opacity', 1);
        
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
      .on('mouseout', function() {
        d3.select(this).style('opacity', 0.8);
        tooltip.style('opacity', 0);
      })
      .on('click', function(event, d) {
        if (d.data.children && d.data.children.length > 0) {
          zoomTo(d.data);
        }
      });

    // Add labels
    const labels = g.selectAll('text')
      .data(root.descendants().slice(1).filter(d => d.depth <= 2 && (d.x1 - d.x0) > 0.1))
      .join('text')
      .attr('transform', d => {
        const angle = (d.x0 + d.x1) / 2;
        const radius = (d.y0 + d.y1) / 2;
        return `rotate(${angle * 180 / Math.PI - 90}) translate(${radius},0) rotate(${angle > Math.PI ? 180 : 0})`;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 + d.x1) / 2 > Math.PI ? 'end' : 'start')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => d.data.name.length > 15 ? d.data.name.substring(0, 15) + '...' : d.data.name);

    // Add center circle for zoom out
    g.append('circle')
      .attr('r', 30)
      .attr('fill', '#374151')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', () => {
        if (breadcrumbs.length > 1) {
          zoomOut();
        }
      });

    // Add center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(rootData.name.length > 10 ? rootData.name.substring(0, 10) + '...' : rootData.name);
  };

  const zoomTo = (node: SunburstNode) => {
    setCurrentNode(node);
    setBreadcrumbs(prev => [...prev, node]);
  };

  const zoomOut = () => {
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      setBreadcrumbs(newBreadcrumbs);
      setCurrentNode(newBreadcrumbs[newBreadcrumbs.length - 1]);
    }
  };

  const resetZoom = () => {
    setCurrentNode(data);
    setBreadcrumbs([data]);
  };

  useEffect(() => {
    if (currentNode) {
      createSunburst(currentNode);
    }
  }, [currentNode, width, height]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Maharashtra Water Infrastructure Hierarchy
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={breadcrumbs.length <= 1}
            >
              <ZoomOut className="w-4 h-4 mr-1" />
              Zoom Out
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
              disabled={breadcrumbs.length <= 1}
            >
              <Home className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              <button
                onClick={() => {
                  const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
                  setBreadcrumbs(newBreadcrumbs);
                  setCurrentNode(newBreadcrumbs[newBreadcrumbs.length - 1]);
                }}
                className="hover:text-blue-600 underline"
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Not Started</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Region</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span>Scheme</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded"></div>
            <span>Village</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="flex justify-center">
          <svg ref={svgRef} className="sunburst-chart"></svg>
        </div>
        
        <div className="mt-4 text-sm text-gray-600 text-center">
          Click on any segment to zoom in. Click the center or breadcrumbs to zoom out.
          <br />
          Hover over segments for detailed information.
        </div>
      </CardContent>
    </Card>
  );
};

export default ZoomableSunburst;