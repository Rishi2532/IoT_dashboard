import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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

interface EnhancedZoomableSunburstProps {
  data: SunburstNode;
  width?: number;
  height?: number;
}

export const EnhancedZoomableSunburst: React.FC<EnhancedZoomableSunburstProps> = ({
  data,
  width = 900,
  height = 900
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Maharashtra']);
  const [currentFocus, setCurrentFocus] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const radius = Math.min(width, height) / 2.2; // Optimized for better visibility
  const innerRadius = 40; // Larger center for easier zoom-out clicking

  useEffect(() => {
    if (data && svgRef.current) {
      console.log('EnhancedZoomableSunburst: Creating visualization with data:', data);
      createSunburst(data);
    }
  }, [data, width, height]);

  const getEnhancedNodeColor = useCallback((node: any) => {
    // Enhanced color scheme with better contrast
    if (node.data.color) return node.data.color;

    const enhancedColors = {
      'root': '#1e293b',
      'region': '#3b82f6',
      'completion-category': '#8b5cf6',
      'scheme': '#06b6d4',
      'lpcd-category': '#10b981',
      'village': '#f59e0b'
    };

    const statusColors = {
      'Fully Completed': '#22c55e',
      'Partially Completed': '#f59e0b', 
      'In Progress': '#ef4444',
      'Not Started': '#94a3b8'
    };

    const categoryColors = {
      'Above 55 LPCD': '#16a34a',
      'Below 55 LPCD': '#dc2626'
    };

    // Priority: category > status > type
    if (node.data.category) {
      return categoryColors[node.data.category as keyof typeof categoryColors] || '#6b7280';
    }
    
    if (node.data.status) {
      return statusColors[node.data.status as keyof typeof statusColors] || '#6b7280';
    }
    
    return enhancedColors[node.data.type as keyof typeof enhancedColors] || '#6b7280';
  }, []);

  const createSunburst = useCallback((rootData: SunburstNode) => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('font', '12px sans-serif');

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create partition layout
    const partition = d3.partition<SunburstNode>()
      .size([2 * Math.PI, radius]);

    // Create hierarchy
    const root = d3.hierarchy(rootData)
      .sum(d => d.value || 1);

    partition(root);

    // Initialize current state for all nodes
    root.each((d: any) => {
      d.current = d;
    });

    setCurrentFocus(root);

    // Enhanced arc generator with better spacing
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(0.002) // Minimal padding for clean appearance
      .innerRadius(d => Math.max(innerRadius, d.y0 * radius / root.height))
      .outerRadius(d => Math.max(innerRadius, d.y1 * radius / root.height - 1));

    // Enhanced tooltip with better styling
    const tooltip = d3.select('body')
      .selectAll('.enhanced-sunburst-tooltip')
      .data([0])
      .join('div')
      .attr('class', 'enhanced-sunburst-tooltip')
      .style('position', 'absolute')
      .style('background', 'linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(30, 41, 59, 0.9))')
      .style('color', 'white')
      .style('padding', '12px 16px')
      .style('border-radius', '8px')
      .style('font-size', '13px')
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000)
      .style('box-shadow', '0 10px 25px rgba(0, 0, 0, 0.3)')
      .style('backdrop-filter', 'blur(10px)')
      .style('border', '1px solid rgba(255, 255, 255, 0.1)');

    // Helper functions
    const arcVisible = (d: any) => d.y1 <= root.height && d.y0 >= 0 && d.x1 > d.x0;
    const labelVisible = (d: any) => arcVisible(d) && (d.x1 - d.x0) > 0.08;
    const labelTransform = (d: any) => {
      const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const r = (d.y0 + d.y1) / 2 * radius / root.height;
      const rotate = angle < 180 ? angle - 90 : angle + 90;
      return `rotate(${rotate}) translate(${r},0) rotate(${angle < 180 ? 0 : 180})`;
    };

    // Create path elements with enhanced styling
    const path = g.append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('fill', d => getEnhancedNodeColor(d))
      .attr('fill-opacity', (d: any) => arcVisible(d.current) ? 0.8 : 0)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)
      .attr('d', (d: any) => arc(d.current))
      .style('cursor', (d: any) => d.children ? 'pointer' : 'default')
      .style('filter', 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.1))')
      .on('mouseover', function(event, d: any) {
        if (!isAnimating) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('fill-opacity', 0.95)
            .style('transform', 'scale(1.02)')
            .style('filter', 'drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.2))');
          
          const tooltipContent = `
            <div style="margin-bottom: 8px;"><strong style="font-size: 14px;">${d.data.name}</strong></div>
            ${d.data.type ? `<div style="margin-bottom: 4px;"><span style="color: #94a3b8;">Type:</span> ${d.data.type.charAt(0).toUpperCase() + d.data.type.slice(1)}</div>` : ''}
            ${d.data.population ? `<div style="margin-bottom: 4px;"><span style="color: #94a3b8;">Population:</span> ${d.data.population.toLocaleString()}</div>` : ''}
            ${d.data.lpcd ? `<div style="margin-bottom: 4px;"><span style="color: #94a3b8;">LPCD:</span> ${d.data.lpcd}</div>` : ''}
            ${d.data.status ? `<div style="margin-bottom: 4px;"><span style="color: #94a3b8;">Status:</span> ${d.data.status}</div>` : ''}
            ${d.children ? `<div style="margin-bottom: 4px;"><span style="color: #94a3b8;">Sub-items:</span> ${d.children.length}</div>` : ''}
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.2);"><span style="color: #94a3b8;">Value:</span> ${d.value}</div>
            ${d.children ? '<div style="margin-top: 4px; font-size: 11px; color: #60a5fa;">🔍 Click to zoom in</div>' : ''}
          `;
          
          tooltip
            .style('opacity', 1)
            .html(tooltipContent)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        }
      })
      .on('mouseout', function(event, d: any) {
        if (!isAnimating) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('fill-opacity', arcVisible(d.current) ? 0.8 : 0)
            .style('transform', 'scale(1)')
            .style('filter', 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.1))');
          
          tooltip.style('opacity', 0);
        }
      });

    // Add click handler for zoom with enhanced animation
    path.filter((d: any) => d.children)
      .on('click', clicked);

    // Enhanced labels with better font sizing
    const label = g.append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('fill-opacity', (d: any) => +labelVisible(d.current))
      .attr('transform', (d: any) => labelTransform(d.current))
      .style('font-size', (d: any) => {
        const arcLength = (d.x1 - d.x0) * radius;
        const depth = d.depth;
        if (arcLength > 80) return Math.max(10, 14 - depth) + 'px';
        if (arcLength > 50) return Math.max(8, 12 - depth) + 'px';
        return Math.max(7, 10 - depth) + 'px';
      })
      .style('font-weight', (d: any) => d.depth <= 1 ? 'bold' : '600')
      .style('text-shadow', '2px 2px 4px rgba(0,0,0,0.8)')
      .text((d: any) => {
        if (d.data.type === 'lpcd-category') {
          return d.data.name.includes('>55') ? `${d.data.value} (>55)` : `${d.data.value} (<55)`;
        }
        const name = d.data.name;
        const arcLength = (d.x1 - d.x0) * radius;
        const maxLength = arcLength > 60 ? 20 : arcLength > 40 ? 15 : 10;
        return name.length > maxLength ? name.substring(0, maxLength) + '…' : name;
      });

    // Enhanced center circle with better visual design
    const centerGroup = g.append('g').attr('class', 'center-group');
    
    const centerCircle = centerGroup.append('circle')
      .datum(root)
      .attr('r', innerRadius)
      .attr('fill', 'linear-gradient(135deg, #1e293b, #334155)')
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .attr('pointer-events', 'all')
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))')
      .on('click', clicked)
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', innerRadius + 5)
          .style('filter', 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.3))');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', innerRadius)
          .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))');
      });

    // Add center icon
    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text('🏠');

    // Enhanced zoom functionality with smooth animations
    function clicked(event: any, p: any) {
      if (isAnimating) return;
      
      setIsAnimating(true);
      setCurrentFocus(p);

      // Hide tooltip during animation
      tooltip.style('opacity', 0);

      // Update parent for center circle
      centerCircle.datum(p.parent || root);

      // Calculate zoom transformation
      root.each((d: any) => {
        const angleRange = p.x1 - p.x0;
        const normalizedX0 = (d.x0 - p.x0) / angleRange;
        const normalizedX1 = (d.x1 - p.x0) / angleRange;
        
        d.target = {
          x0: normalizedX0 * 2 * Math.PI,
          x1: normalizedX1 * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth)
        };
      });

      // Enhanced smooth transition
      const t = svg.transition()
        .duration(1000)
        .ease(d3.easeCubicInOut);
      
      // Animate paths
      path.transition(t as any)
        .attrTween('d', (d: any) => {
          const i = d3.interpolate(d.current, d.target);
          return (t: number) => {
            d.current = i(t);
            return arc(d.current) || '';
          };
        })
        .attr('fill-opacity', (d: any) => arcVisible(d.target) ? 0.8 : 0)
        .style('pointer-events', (d: any) => arcVisible(d.target) ? 'auto' : 'none');

      // Animate labels
      label.transition(t as any)
        .attr('fill-opacity', (d: any) => +labelVisible(d.target))
        .attrTween('transform', (d: any) => {
          const i = d3.interpolate(d.current, d.target);
          return (t: number) => labelTransform(i(t)) || '';
        });

      // Update state after animation
      setTimeout(() => {
        root.each((d: any) => {
          d.current = d.target;
        });
        setIsAnimating(false);
        
        // Update zoom level
        setZoomLevel(p.depth);
        
        // Update breadcrumbs
        const ancestors = p.ancestors().reverse();
        const names = ancestors.map((d: any) => d.data.name);
        setBreadcrumbs(names);
      }, 1000);
    }
  }, [width, height, getEnhancedNodeColor, isAnimating]);

  const resetToRoot = useCallback(() => {
    if (!isAnimating) {
      setBreadcrumbs(['Maharashtra']);
      setZoomLevel(0);
      if (data && svgRef.current) {
        createSunburst(data);
      }
    }
  }, [data, createSunburst, isAnimating]);

  const navigateToLevel = useCallback((levelIndex: number) => {
    if (!isAnimating && currentFocus) {
      const ancestors = currentFocus.ancestors().reverse();
      if (ancestors[levelIndex]) {
        // Simulate click on that level
        const event = new MouseEvent('click');
        // This would require more complex implementation to navigate to specific level
      }
    }
  }, [currentFocus, isAnimating]);

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Maharashtra Water Infrastructure Hierarchy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive zoomable sunburst • {isAnimating ? 'Animating...' : `Zoom Level: ${zoomLevel}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToRoot}
              disabled={isAnimating}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
        
        {/* Enhanced Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg p-3 mt-3">
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
          {breadcrumbs.map((segment, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <span 
                className={`px-2 py-1 rounded ${
                  index === breadcrumbs.length - 1 
                    ? 'font-semibold bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted/50 cursor-pointer'
                }`}
                onClick={() => index < breadcrumbs.length - 1 && navigateToLevel(index)}
              >
                {segment}
              </span>
            </React.Fragment>
          ))}
        </div>
        
        {/* Enhanced Instructions */}
        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 mt-3">
          <div className="flex items-start gap-2">
            <ZoomOut className="h-4 w-4 mt-0.5 text-blue-500" />
            <div>
              <strong className="text-blue-700 dark:text-blue-400">How to navigate:</strong>
              <div className="mt-1 space-y-1">
                <div>• <strong>Click segments</strong> to zoom in and explore deeper levels</div>
                <div>• <strong>Click center circle</strong> to zoom out to parent level</div>
                <div>• <strong>Hover over segments</strong> for detailed information</div>
                <div>• <strong>Use Reset button</strong> to return to Maharashtra overview</div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex justify-center">
          <svg 
            ref={svgRef} 
            className={`transition-opacity duration-300 ${isAnimating ? 'opacity-80' : 'opacity-100'}`}
          />
        </div>
      </CardContent>
    </Card>
  );
};