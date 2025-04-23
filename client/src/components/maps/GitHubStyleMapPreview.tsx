import React, { useState, useEffect } from 'react';
import SimpleLeafletMap from './SimpleLeafletMap';

// Fallback map implementation using SVG
const FallbackMaharashtraMap = ({ onRegionClick }: { onRegionClick?: (region: string) => void }) => {
  const regions = [
    { name: 'Nagpur', color: '#E2B8B8', x: 400, y: 170, width: 80, height: 80 },
    { name: 'Amravati', color: '#FF7300', x: 300, y: 170, width: 80, height: 80 },
    { name: 'Chhatrapati Sambhajinagar', color: '#68A9A9', x: 220, y: 240, width: 100, height: 80 },
    { name: 'Nashik', color: '#8CB3E2', x: 150, y: 200, width: 80, height: 80 },
    { name: 'Pune', color: '#FFC408', x: 170, y: 290, width: 80, height: 80 },
    { name: 'Konkan', color: '#4A77BB', x: 110, y: 280, width: 60, height: 100 },
  ];
  
  return (
    <div className="w-full h-[350px] bg-gray-100 flex justify-center items-center">
      <svg width="500" height="350" viewBox="0 0 500 350">
        <rect x="0" y="0" width="500" height="350" fill="#f5f8fa" />
        {regions.map((region) => (
          <g key={region.name} onClick={() => onRegionClick?.(region.name)} style={{ cursor: 'pointer' }}>
            <rect
              x={region.x}
              y={region.y}
              width={region.width}
              height={region.height}
              fill={region.color}
              stroke="#ffffff"
              strokeWidth="2"
              rx="5"
              opacity="0.75"
            />
            <text
              x={region.x + region.width / 2}
              y={region.y + region.height / 2 + 5}
              textAnchor="middle"
              fill="#000000"
              fontSize="12"
              fontWeight="500"
            >
              {region.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

interface GitHubStyleMapPreviewProps {
  title?: string;
  description?: string;
  onRegionClick?: (region: string) => void;
}

export default function GitHubStyleMapPreview({
  title = "maharashtra.topo.json",
  description = "Add division maps for states",
  onRegionClick
}: GitHubStyleMapPreviewProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'blame'>('preview');
  const [useLeaflet, setUseLeaflet] = useState<boolean>(true);
  const [errorOccurred, setErrorOccurred] = useState<boolean>(false);

  // Handle errors in the Leaflet component by tracking window.onerror
  useEffect(() => {
    // Disable runtime error overlay plugin for this component
    try {
      if (typeof window !== 'undefined') {
        // Store original console.error
        const originalConsoleError = console.error;
        
        // Create a patched version that filters out the specific error
        console.error = function(...args) {
          const errorString = args.join(' ');
          if (errorString.includes('__refresh-page')) {
            setErrorOccurred(true);
            // Don't pass this specific error to the original console.error
            return;
          }
          
          // Pass other errors to the original console.error
          return originalConsoleError.apply(console, args);
        };
        
        // Cleanup
        return () => {
          console.error = originalConsoleError;
        };
      }
    } catch (err) {
      // If this fails, just continue
      console.warn('Error interception setup failed:', err);
    }
  }, []);

  // If an error occurs, use the fallback map
  useEffect(() => {
    if (errorOccurred) {
      setUseLeaflet(false);
    }
  }, [errorOccurred]);

  return (
    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
      {/* Header with file info - formatted like GitHub */}
      <div className="border-b border-gray-200 p-3 flex items-center text-sm">
        <span className="font-medium text-gray-700">datameet</span>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-gray-500">maps</span>
      </div>
      
      {/* File metadata */}
      <div className="border-b border-gray-200 p-3 flex justify-between items-center text-sm">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-100 rounded-full mr-2 flex items-center justify-center overflow-hidden text-gray-700">
            <span className="text-xs">A</span>
          </div>
          <span className="text-gray-700">{description}</span>
        </div>
        <div className="text-gray-500 text-xs">
          111 KB
        </div>
      </div>
      
      {/* File location - path like in GitHub */}
      <div className="border-b border-gray-200 p-2 flex items-center text-xs bg-gray-50">
        <span className="text-gray-600 font-medium mr-2">maps</span>
        <span className="text-gray-500">/</span>
        <span className="text-gray-600 font-medium mx-2">divisions</span>
        <span className="text-gray-500">/</span>
        <span className="text-gray-600 font-medium ml-2">{title}</span>
      </div>
      
      {/* Tabs - closer to GitHub styling */}
      <div className="border-b border-gray-200 flex text-sm">
        <button 
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 border-b-2 ${activeTab === 'preview' ? 'border-indigo-500 font-medium' : 'border-transparent text-gray-600'}`}
        >
          Preview
        </button>
        <button 
          onClick={() => setActiveTab('code')}
          className={`px-4 py-2 border-b-2 ${activeTab === 'code' ? 'border-indigo-500 font-medium' : 'border-transparent text-gray-600'}`}
        >
          Code
        </button>
        <button 
          onClick={() => setActiveTab('blame')}
          className={`px-4 py-2 border-b-2 ${activeTab === 'blame' ? 'border-indigo-500 font-medium' : 'border-transparent text-gray-600'}`}
        >
          Blame
        </button>
      </div>
      
      {/* Content */}
      <div className="p-0">
        {activeTab === 'preview' && (
          <>
            {useLeaflet && !errorOccurred ? (
              <div className="leaflet-map-container">
                <SimpleLeafletMap 
                  containerClassName="h-[350px] w-full" 
                  onRegionClick={onRegionClick}
                />
              </div>
            ) : (
              <FallbackMaharashtraMap onRegionClick={onRegionClick} />
            )}
          </>
        )}
        
        {activeTab === 'code' && (
          <div className="p-4 text-sm font-mono text-gray-700">
            <pre>{`{
  "type": "Topology",
  "objects": {
    "maharashtra": {
      "type": "GeometryCollection",
      "geometries": [
        // ... Map data would be here
      ]
    }
  }
}`}</pre>
          </div>
        )}
        
        {activeTab === 'blame' && (
          <div className="p-4 text-sm text-gray-700">
            <p>Blame information would be displayed here.</p>
          </div>
        )}
      </div>
    </div>
  );
}