import React, { useRef, useEffect, useState, useCallback } from 'react';
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

interface WorkingEnhancedSunburstProps {
  width?: number;
  height?: number;
}

export const WorkingEnhancedSunburst: React.FC<WorkingEnhancedSunburstProps> = ({
  width = 800,
  height = 800
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Maharashtra']);
  const [currentFocus, setCurrentFocus] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const { data: sunburstData, isLoading, error } = useQuery<SunburstNode>({
    queryKey: ['/api/sunburst-data-v3'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const radius = Math.min(width, height) / 2.2;
  const innerRadius = 45; // Larger center for easier clicking

  // Enhanced color scheme
  const getNodeColor = useCallback((node: any, depth: number) => {
    const colors = [
      '#1e40af', // Root - blue-800
      '#dc2626', // Regions - red-600  
      '#059669', // Completion status - emerald-600
      '#d97706', // LPCD categories - amber-600
      '#7c3aed', // Villages - violet-600
    ];
    
    if (node.data.color) return node.data.color;
    
    // Enhanced color logic based on node type
    switch (node.data.type) {
      case 'root': return colors[0];
      case 'region': return colors[1];
      case 'completion-category': 
        return node.data.name === 'Completed' ? '#10b981' : '#f59e0b';
      case 'lpcd-category':
        if (node.data.name.includes('Above')) return '#22c55e';
        if (node.data.name.includes('Below')) return '#ef4444';
        return colors[3];
      default: return colors[Math.min(depth, colors.length - 1)];
    }
  }, []);

  const createSunburst = useCallback((data: SunburstNode) => {
    if (!svgRef.current) return;

    console.log('Creating enhanced sunburst with data:', data);

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('font', '12px sans-serif');

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Create partition layout
    const partition = d3.partition<SunburstNode>()
      .size([2 * Math.PI, radius]);

    // Create hierarchy
    const root = d3.hierarchy(data)
      .sum(d => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    partition(root);

    // Initialize current state
    root.each((d: any) => {
      d.current = d;
    });

    setCurrentFocus(root);

    // Arc generator
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(0.003)
      .innerRadius(d => Math.max(innerRadius, d.y0 * radius / root.height))
      .outerRadius(d => Math.max(innerRadius, d.y1 * radius / root.height - 1));

    // Create tooltip
    const tooltip = d3.select('body')
      .selectAll('.working-enhanced-tooltip')
      .data([0])
      .join('div')
      .attr('class', 'working-enhanced-tooltip')
      .style('position', 'absolute')
      .style('background', 'linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(30, 41, 59, 0.95))')
      .style('color', 'white')
      .style('padding', '12px 16px')
      .style('border-radius', '8px')
      .style('font-size', '13px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000)
      .style('box-shadow', '0 8px 32px rgba(0, 0, 0, 0.3)')
      .style('backdrop-filter', 'blur(10px)')
      .style('border', '1px solid rgba(255, 255, 255, 0.2)');

    // Helper functions
    const arcVisible = (d: any) => d.y1 <= root.height && d.y0 >= 0 && d.x1 > d.x0;
    const labelVisible = (d: any) => arcVisible(d) && (d.x1 - d.x0) > 0.1;

    // Create arcs
    const paths = g.append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('fill', (d: any) => getNodeColor(d, d.depth))
      .attr('fill-opacity', 0.8)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('d', (d: any) => arc(d.current))
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        d3.select(this)
          .attr('fill-opacity', 1)
          .attr('stroke-width', 2);

        const tooltipContent = `
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${d.data.name}</div>
          <div style="margin-bottom: 4px;">Type: ${d.data.type.replace('-', ' ')}</div>
          <div style="margin-bottom: 4px;">Count: ${d.value || 0}</div>
          ${d.data.population ? `<div style="margin-bottom: 4px;">Population: ${d.data.population.toLocaleString()}</div>` : ''}
          ${d.data.lpcd ? `<div style="margin-bottom: 4px;">LPCD: ${d.data.lpcd}</div>` : ''}
          ${d.data.status ? `<div>Status: ${d.data.status}</div>` : ''}
        `;

        tooltip
          .style('opacity', 1)
          .html(tooltipContent)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d: any) {
        d3.select(this)
          .attr('fill-opacity', 0.8)
          .attr('stroke-width', 1.5);

        tooltip.style('opacity', 0);
      })
      .on('click', clicked);

    // Add labels
    const labels = g.append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('dy', '0.35em')
      .attr('fill-opacity', (d: any) => +labelVisible(d.current))
      .attr('transform', (d: any) => labelTransform(d.current))
      .text((d: any) => {
        if ((d.current.x1 - d.current.x0) > 0.15) {
          return d.data.name.length > 15 ? d.data.name.substring(0, 12) + '...' : d.data.name;
        }
        return '';
      })
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', 'white')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)');

    // Add center circle for zoom out
    const centerCircle = g.append('circle')
      .datum(root)
      .attr('r', innerRadius)
      .attr('fill', '#1e40af')
      .attr('opacity', 0.8)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', clicked);

    // Add center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text('Maharashtra');

    function clicked(event: any, p: any) {
      if (isAnimating) return;
      setIsAnimating(true);

      root.each((d: any) => d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      });

      const t = g.transition().duration(1000).ease(d3.easeCubicInOut);

      // Update paths with simplified transitions
      paths.transition(t)
        .tween('data', (d: any) => {
          const i = d3.interpolate(d.current, d.target);
          return (t: number) => d.current = i(t);
        })
        .attr('fill-opacity', (d: any) => arcVisible(d.target) ? 0.8 : 0)
        .attrTween('d', (d: any) => () => arc(d.current));

      // Update labels with simplified transitions  
      labels.transition(t)
        .attr('fill-opacity', (d: any) => labelVisible(d.target) ? 1 : 0)
        .attrTween('transform', (d: any) => () => labelTransform(d.current));

      // Update breadcrumbs
      const newBreadcrumbs = [];
      let current = p;
      while (current.parent) {
        newBreadcrumbs.unshift(current.data.name);
        current = current.parent;
      }
      newBreadcrumbs.unshift('Maharashtra');
      setBreadcrumbs(newBreadcrumbs);
      setCurrentFocus(p);

      setTimeout(() => setIsAnimating(false), 1000);
    }

    function labelTransform(d: any) {
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (d.y0 + d.y1) / 2 * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

  }, [width, height, radius, innerRadius, getNodeColor, isAnimating]);

  useEffect(() => {
    if (sunburstData && svgRef.current) {
      createSunburst(sunburstData);
    }
  }, [sunburstData, createSunburst]);

  const handleReset = () => {
    if (sunburstData) {
      setBreadcrumbs(['Maharashtra']);
      createSunburst(sunburstData);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Enhanced Sunburst Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Building interactive visualization...</p>
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
            🌅 Enhanced Zoomable Sunburst
            {isAnimating && <Loader2 className="h-4 w-4 animate-spin" />}
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
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg text-sm">
            <div className="font-semibold mb-1">Interactive Navigation:</div>
            <div>• Click segments to zoom in</div>
            <div>• Click center circle to zoom out</div>
            <div>• Hover for detailed information</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkingEnhancedSunburst;