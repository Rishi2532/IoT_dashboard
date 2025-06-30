import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ZoomableSunburst } from '@/components/ZoomableSunburst';
import { Loader2 } from 'lucide-react';

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

const SunburstPage: React.FC = () => {
  const { data: sunburstData, isLoading, error, refetch } = useQuery<SunburstNode>({
    queryKey: ['/api/sunburst-data-v2'],
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Force refresh on component mount
  React.useEffect(() => {
    refetch();
  }, [refetch]);

  // Debug logging
  React.useEffect(() => {
    if (sunburstData) {
      console.log('Sunburst data received:', sunburstData);
      console.log('Number of regions:', sunburstData.children?.length || 0);
      if (sunburstData.children) {
        sunburstData.children.forEach(region => {
          console.log(`Region ${region.name}: ${region.children?.length || 0} schemes`);
        });
      }
    }
  }, [sunburstData]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading hierarchical data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error Loading Data
          </h2>
          <p className="text-red-600">
            Failed to load sunburst visualization data. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  if (!sunburstData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            No Data Available
          </h2>
          <p className="text-yellow-600">
            No hierarchical data is available for visualization. Please ensure data has been imported.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Infrastructure Hierarchy Visualization
        </h1>
        <p className="text-gray-600">
          3-ring hierarchy: Region → Completion Status (Fully/Partially Completed schemes) → LPCD Categories (Villages &gt;55 LPCD / &lt;55 LPCD).
          Click segments to zoom in and explore deeper levels.
        </p>
      </div>

      <div className="grid gap-6">
        <ZoomableSunburst 
          data={sunburstData} 
          width={800} 
          height={600} 
        />

        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">How to Use This Visualization</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Navigation</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Click any segment to zoom into that level</li>
                <li>• Click the center circle to zoom out</li>
                <li>• Use breadcrumbs to navigate back to any level</li>
                <li>• Hover over segments for detailed information</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Color Coding</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Blue: Regional level (outer ring)</li>
                <li>• Green: Fully Completed schemes</li>
                <li>• Amber: Partially Completed schemes</li>
                <li>• Green: Villages &gt;55 LPCD (adequate)</li>
                <li>• Red: Villages &lt;55 LPCD (below standard)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SunburstPage;