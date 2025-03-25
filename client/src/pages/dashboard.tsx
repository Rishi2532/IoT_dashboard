import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import RegionFilter from "@/components/dashboard/region-filter";
import StatsCards from "@/components/dashboard/stats-cards";
import RegionComparisonChart from "@/components/dashboard/region-comparison-chart";
import CompletionStatusChart from "@/components/dashboard/completion-status-chart";
import SchemeTable from "@/components/dashboard/scheme-table";
import SchemeDetailsModal from "@/components/dashboard/scheme-details-modal";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { Region, RegionSummary, SchemeStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedScheme, setSelectedScheme] = useState<SchemeStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch regions data
  const { data: regions = [], isLoading: isRegionsLoading, refetch: refetchRegions } = useQuery<Region[]>({
    queryKey: ['/api/regions'],
  });

  // Fetch region summary data (total stats based on selected region)
  const { data: regionSummary, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery<RegionSummary>({
    queryKey: ['/api/regions/summary', selectedRegion],
    queryFn: () => fetch(`/api/regions/summary${ selectedRegion !== "all" ? `?region=${selectedRegion}` : ''}`).then(res => res.json())
  });

  // Fetch schemes data
  const { data: schemes = [], isLoading: isSchemesLoading, refetch: refetchSchemes } = useQuery<SchemeStatus[]>({
    queryKey: ['/api/schemes', selectedRegion],
    queryFn: () => fetch(`/api/schemes${ selectedRegion !== "all" ? `?region=${selectedRegion}` : ''}`).then(res => res.json())
  });

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
  };

  const handleRefresh = () => {
    refetchRegions();
    refetchSummary();
    refetchSchemes();
    toast({
      title: "Dashboard Refreshed",
      description: "Data has been updated successfully."
    });
  };

  const handleExport = () => {
    // In a real application, this would export data to CSV
    toast({
      title: "Export Feature",
      description: "This would export the dashboard data to CSV in a real application."
    });
  };

  const handleViewSchemeDetails = (scheme: SchemeStatus) => {
    setSelectedScheme(scheme);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <DashboardLayout>
      {/* Dashboard Header */}
      <div className="md:flex md:items-center md:justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-neutral-900">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Water Scheme Implementation Status
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button 
            variant="outline" 
            className="mr-3"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            onClick={handleRefresh}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Region Filter */}
      <RegionFilter 
        regions={regions || []} 
        selectedRegion={selectedRegion} 
        onChange={handleRegionChange}
        className="mb-6"
      />

      {/* Stats Cards */}
      <StatsCards 
        data={regionSummary} 
        isLoading={isSummaryLoading} 
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-6">
        <RegionComparisonChart 
          regions={regions || []} 
          isLoading={isRegionsLoading} 
        />
        <CompletionStatusChart 
          schemes={schemes || []} 
          isLoading={isSchemesLoading} 
        />
      </div>

      {/* Schemes Table */}
      <SchemeTable 
        schemes={schemes || []} 
        isLoading={isSchemesLoading}
        onViewDetails={handleViewSchemeDetails}
      />

      {/* Scheme Details Modal */}
      <SchemeDetailsModal 
        scheme={selectedScheme} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </DashboardLayout>
  );
}
