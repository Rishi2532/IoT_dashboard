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

interface TrueZoomableSunburstProps {
  width?: number;
  height?: number;
}

export const TrueZoomableSunburst: React.FC<TrueZoomableSunburstProps> = ({
  width = 900,
  height = 900
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Maharashtra']);
  const [currentFocus, setCurrentFocus] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const { data: sunburstData, isLoading, error } = useQuery<SunburstNode>({
    queryKey: ['/api/sunburst-data-v3'],
    staleTime: 5 * 60 * 1000,
  });

  const radius = Math.min(width, height) / 2.2;
  const centerRadius = 60;

  const createZoomableSunburst = useCallback((data: SunburstNode) => {
    if (!svgRef.current) return;

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

    // Initialize current state for zoom tracking
    root.each((d: any) => {
      d.current = d;
    });

    setCurrentFocus(root);

    // Enhanced color scheme
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

    // Arc generator with proper zoom support
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(0.003)
      .innerRadius(d => Math.max(centerRadius, d.y0 * radius / root.height))
      .outerRadius(d => Math.max(centerRadius, d.y1 * radius / root.height - 1));

    // Create tooltip
    const tooltip = d3.select('body')
      .selectAll('.true-zoomable-tooltip')
      .data([0])
      .join('div')
      .attr('class', 'true-zoomable-tooltip')
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

    // Helper functions for visibility
    const arcVisible = (d: any) => d.y1 <= root.height && d.y0 >= 0 && d.x1 > d.x0;
    const labelVisible = (d: any) => arcVisible(d) && (d.x1 - d.x0) > 0.08;
    const labelTransform = (d: any) => {
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (d.y0 + d.y1) / 2 * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    };

    // Create segments
    const paths = g.append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('fill', getColor)
      .attr('fill-opacity', 0.8)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('d', (d: any) => arc(d.current))
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        d3.select(this)
          .attr('fill-opacity', 1)
          .attr('stroke-width', 2.5);

        const tooltipContent = `
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${d.data.name}</div>
          <div style="margin-bottom: 4px;">Type: ${d.data.type.replace('-', ' ')}</div>
          <div style="margin-bottom: 4px;">Count: ${d.value || 0}</div>
          ${d.data.population ? `<div style="margin-bottom: 4px;">Population: ${d.data.population.toLocaleString()}</div>` : ''}
          ${d.data.lpcd ? `<div style="margin-bottom: 4px;">LPCD: ${d.data.lpcd}</div>` : ''}
          ${d.data.status ? `<div>Status: ${d.data.status}</div>` : ''}
          <div style="margin-top: 8px; font-style: italic; opacity: 0.8;">Click to zoom in</div>
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
        const textSpace = (d.current.x1 - d.current.x0) * radius;
        if (textSpace > 40) {
          return d.data.name.length > 15 ? d.data.name.substring(0, 12) + '...' : d.data.name;
        }
        return '';
      })
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', 'white')
      .style('text-shadow', '2px 2px 4px rgba(0,0,0,0.8)');

    // Add center circle for zoom out
    const centerCircle = g.append('circle')
      .datum(root)
      .attr('r', centerRadius)
      .attr('fill', '#1e40af')
      .attr('opacity', 0.9)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', clicked)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 1);
        tooltip
          .style('opacity', 1)
          .html('<div style="font-weight: bold;">Click to zoom out</div>')
          .style('left', (d3.event?.pageX || 0) + 'px')
          .style('top', (d3.event?.pageY || 0) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.9);
        tooltip.style('opacity', 0);
      });

    // Add center text showing current focus
    const centerText = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text('Maharashtra');

    // The main zoom function - this is the key zoomable behavior
    function clicked(event: any, p: any) {
      if (isAnimating) return;
      setIsAnimating(true);

      // Calculate new scale and translation for zoom
      root.each((d: any) => d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      });

      // Create smooth transition
      const t = g.transition()
        .duration(1000)
        .ease(d3.easeCubicInOut);

      // Animate paths
      paths.transition(t)
        .tween('data', (d: any) => {
          const i = d3.interpolate(d.current, d.target);
          return (t: number) => d.current = i(t);
        })
        .filter(function(d: any) {
          return +(this as any).getAttribute('fill-opacity') || arcVisible(d.target);
        })
        .attr('fill-opacity', (d: any) => arcVisible(d.target) ? 0.8 : 0)
        .attrTween('d', (d: any) => () => arc(d.current));

      // Animate labels
      labels.transition(t)
        .attr('fill-opacity', (d: any) => +labelVisible(d.target))
        .attrTween('transform', (d: any) => () => labelTransform(d.current))
        .text((d: any) => {
          const textSpace = (d.target.x1 - d.target.x0) * radius;
          if (textSpace > 40) {
            return d.data.name.length > 15 ? d.data.name.substring(0, 12) + '...' : d.data.name;
          }
          return '';
        });

      // Update center text to show current focus
      centerText.text(p.data.name);

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

      // End animation state
      setTimeout(() => setIsAnimating(false), 1000);
    }

  }, [width, height, radius, centerRadius, isAnimating]);

  useEffect(() => {
    if (sunburstData && svgRef.current) {
      createZoomableSunburst(sunburstData);
    }
  }, [sunburstData, createZoomableSunburst]);

  const handleReset = () => {
    if (sunburstData) {
      setBreadcrumbs(['Maharashtra']);
      createZoomableSunburst(sunburstData);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Zoomable Sunburst
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Building zoomable visualization...</p>
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
          <CardTitle className="text-red-600">Zoomable Sunburst Visualization</CardTitle>
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
            🎯 True Zoomable Sunburst
            {isAnimating && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <Button onClick={handleReset} variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" />
            Reset to Maharashtra
          </Button>
        </div>
        
        {/* Enhanced Breadcrumb Navigation */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground bg-gradient-to-r from-slate-50 to-blue-50 p-3 rounded-lg border">
          <span className="text-xs font-medium text-slate-600 mr-2">Current Focus:</span>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb}>
              {index > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
              <span className={index === breadcrumbs.length - 1 ? 'font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded' : 'text-slate-600'}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="flex justify-center">
        <div className="relative">
          <svg ref={svgRef} className="drop-shadow-xl" />
          
          {/* Enhanced Instructions */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg text-sm max-w-sm border border-slate-200">
            <div className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              🎯 Zoomable Navigation
            </div>
            <div className="space-y-1 text-slate-600">
              <div>• <strong>Click any slice</strong> to zoom in and make it the center</div>
              <div>• <strong>Click center circle</strong> to zoom out</div>
              <div>• <strong>Hover</strong> for detailed information</div>
              <div>• <strong>Use breadcrumbs</strong> to see current focus level</div>
            </div>
          </div>

          {/* Animation indicator */}
          {isAnimating && (
            <div className="absolute top-4 right-4 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">
              Zooming...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrueZoomableSunburst;