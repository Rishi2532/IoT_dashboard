import React, { useEffect, useRef, useState } from 'react';
import { MaharashtraOpenStreetMap } from '.';

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
          <MaharashtraOpenStreetMap 
            containerClassName="h-[350px] w-full" 
            onRegionClick={onRegionClick}
          />
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