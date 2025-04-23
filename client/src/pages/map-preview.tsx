import React, { useState } from 'react';
import { GitHubStyleMapPreview } from '@/components/maps';
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function MapPreviewPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const { toast } = useToast();
  
  const handleRegionClick = (region: string) => {
    setSelectedRegion(region);
    toast({
      title: "Region Selected",
      description: `You selected ${region} region. In a full implementation, this would filter the dashboard data.`,
    });
  };
  
  const handleResetSelection = () => {
    setSelectedRegion("all");
    toast({
      title: "Selection Reset",
      description: "Region selection has been reset to All Regions",
    });
  };
  
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
          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
            <div className="text-sm bg-white px-3 py-1 rounded-md border shadow-sm">
              Selected: <span className="font-medium text-blue-700">{selectedRegion === "all" ? "All Regions" : selectedRegion}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSelection}
              disabled={selectedRegion === "all"}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start">
            <MapPin className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              <span className="font-medium">Interactive Map:</span> Click on any of the colored region markers 
              to filter dashboard data. The map includes markers for Nagpur, Amravati, Chhatrapati Sambhajinagar, 
              Nashik, Pune, and Konkan regions. Each marker will filter the data in a real implementation.
            </p>
          </div>
        </div>
        
        <GitHubStyleMapPreview 
          title="maharashtra.topo.json"
          description="Add division maps for states"
          onRegionClick={handleRegionClick}
        />
      </div>
    </DashboardLayout>
  );
}