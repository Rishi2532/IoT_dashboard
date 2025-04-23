import React from 'react';
import { GitHubStyleMapPreview } from '@/components/maps';
import DashboardLayout from "@/components/dashboard/dashboard-layout";

export default function MapPreviewPage() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600/20 via-blue-400/15 to-blue-700/10 rounded-lg mb-4 sm:mb-6 shadow-md border border-blue-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500">
              Maharashtra Map Preview
            </h1>
            <p className="mt-1 sm:mt-2 text-sm text-blue-700/80 font-medium flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              GitHub-style map visualization 
              <span className="ml-3 py-0.5 px-2 text-xs bg-blue-100 text-blue-700 rounded-full">Interactive</span>
            </p>
          </div>
        </div>
      </div>
      
      <div className="mx-auto max-w-4xl">
        <GitHubStyleMapPreview 
          title="maharashtra.topo.json"
          description="Add division maps for states"
        />
      </div>
    </DashboardLayout>
  );
}