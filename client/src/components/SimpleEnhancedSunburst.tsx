import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';

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
  type: 'root' | 'region' | 'scheme' | 'village' | 'completion-category' | 'lpcd-category';
  category?: string;
  color?: string;
}

interface SimpleEnhancedSunburstProps {
  width?: number;
  height?: number;
}

export const SimpleEnhancedSunburst: React.FC<SimpleEnhancedSunburstProps> = ({
  width = 800,
  height = 800
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Maharashtra']);
  const [currentNode, setCurrentNode] = useState<any>(null);
  
  const { data: sunburstData, isLoading, error } = useQuery<SunburstNode>({
    queryKey: ['/api/sunburst-data-v3'],
    staleTime: 5 * 60 * 1000,
  });

  const radius = Math.min(width, height) / 2.2;
  const centerRadius = 50;

  useEffect(() => {
    if (sunburstData && svgRef.current) {
      createVisualization(sunburstData);
    }
  }, [sunburstData, width, height]);

  const createVisualization = (data: SunburstNode) => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Create partition layout
    const partition = d3.partition<SunburstNode>()
      .size([2 * Math.PI, radius]);

    const root = d3.hierarchy(data)
      .sum(d => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    partition(root);
    setCurrentNode(root);

    // Color scheme
    const getColor = (d: any) => {
      const colors = {
        'root': '#1e40af',
        'region': '#dc2626',
        'completion-category': d.data.name === 'Completed' ? '#10b981' : '#f59e0b',
        'lpcd-category': d.data.name.includes('Above') ? '#22c55e' : '#ef4444',
        'scheme': '#7c3aed',
        'village': '#0891b2'
      };
      return colors[d.data.type as keyof typeof colors] || '#64748b';
    };

    // Arc generator
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(0.005)
      .innerRadius(d => Math.max(centerRadius, d.y0 * radius / root.height))
      .outerRadius(d => Math.max(centerRadius, d.y1 * radius / root.height - 2));

    // Create tooltip
    const tooltip = d3.select('body')
      .selectAll('.simple-enhanced-tooltip')
      .data([0])
      .join('div')
      .attr('class', 'simple-enhanced-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', 'white')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);

    // Create segments
    const segments = g.selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('d', arc)
      .attr('fill', getColor)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        d3.select(this).attr('opacity', 0.8);
        
        tooltip
          .style('opacity', 1)
          .html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${d.data.name}</div>
            <div>Type: ${d.data.type.replace('-', ' ')}</div>
            <div>Count: ${d.value || 0}</div>
            ${d.data.population ? `<div>Population: ${d.data.population.toLocaleString()}</div>` : ''}
            ${d.data.lpcd ? `<div>LPCD: ${d.data.lpcd}</div>` : ''}
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 1);
        tooltip.style('opacity', 0);
      })
      .on('click', (event, d) => {
        zoomTo(d);
      });

    // Add labels
    g.selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('transform', d => {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2 * radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .style('pointer-events', 'none')
      .text(d => {
        const textLength = (d.x1 - d.x0) * radius;
        if (textLength > 30) {
          return d.data.name.length > 12 ? d.data.name.substring(0, 10) + '...' : d.data.name;
        }
        return '';
      });

    // Center circle
    g.append('circle')
      .attr('r', centerRadius)
      .attr('fill', '#1e40af')
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', () => {
        if (currentNode.parent) {
          zoomTo(currentNode.parent);
        } else {
          resetView();
        }
      });

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text('Maharashtra');

    function zoomTo(node: any) {
      // Simple zoom by recreating the visualization focused on the clicked node
      const newData = node.data;
      
      // Update breadcrumbs
      const newBreadcrumbs = [];
      let current = node;
      while (current.parent) {
        newBreadcrumbs.unshift(current.data.name);
        current = current.parent;
      }
      newBreadcrumbs.unshift('Maharashtra');
      setBreadcrumbs(newBreadcrumbs);
      
      // For simplicity, just highlight the clicked section
      segments.attr('opacity', d => {
        return d === node || isChildOf(d, node) ? 1 : 0.3;
      });
      
      setCurrentNode(node);
    }

    function isChildOf(child: any, parent: any): boolean {
      let current = child.parent;
      while (current) {
        if (current === parent) return true;
        current = current.parent;
      }
      return false;
    }

    function resetView() {
      segments.attr('opacity', 1);
      setBreadcrumbs(['Maharashtra']);
      setCurrentNode(root);
    }
  };

  const handleReset = () => {
    if (sunburstData) {
      setBreadcrumbs(['Maharashtra']);
      createVisualization(sunburstData);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Enhanced Sunburst
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Building visualization...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !sunburstData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Enhanced Sunburst Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {error ? 'Failed to load data' : 'No data available'}
            </p>
            <Button onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🌟 Enhanced Zoomable Sunburst
          </CardTitle>
          <Button onClick={handleReset} variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" />
            Reset View
          </Button>
        </div>
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground bg-slate-50 p-2 rounded-md">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb}>
              {index > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={index === breadcrumbs.length - 1 ? 'font-semibold text-slate-900' : ''}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="flex justify-center">
        <div className="relative">
          <svg ref={svgRef} className="drop-shadow-lg" />
          
          {/* Instructions */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg text-sm max-w-xs">
            <div className="font-semibold mb-1">Navigation:</div>
            <div>• Click segments to focus/zoom</div>
            <div>• Click center to zoom out</div>
            <div>• Hover for details</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleEnhancedSunburst;