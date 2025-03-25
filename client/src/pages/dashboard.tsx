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
import * as XLSX from "xlsx";

export default function Dashboard() {
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedScheme, setSelectedScheme] = useState<SchemeStatus | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch regions data
  const {
    data: regions = [],
    isLoading: isRegionsLoading,
    refetch: refetchRegions,
  } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  // Fetch region summary data (total stats based on selected region)
  const {
    data: regionSummary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery<RegionSummary>({
    queryKey: ["/api/regions/summary", selectedRegion],
    queryFn: () =>
      fetch(
        `/api/regions/summary${selectedRegion !== "all" ? `?region=${selectedRegion}` : ""}`,
      ).then((res) => res.json()),
  });

  // Fetch schemes data
  const {
    data: schemes = [],
    isLoading: isSchemesLoading,
    refetch: refetchSchemes,
  } = useQuery<SchemeStatus[]>({
    queryKey: ["/api/schemes", selectedRegion],
    queryFn: () =>
      fetch(
        `/api/schemes${selectedRegion !== "all" ? `?region=${selectedRegion}` : ""}`,
      ).then((res) => res.json()),
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
      description: "Data has been updated successfully.",
    });
  };

  const handleExport = () => {
    // In a real application, this would export data to CSV
    toast({
      title: "Export Feature",
      description:
        "This would export the dashboard data to CSV in a real application.",
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
      {/* Dashboard Header with gradient */}
      <div className="p-6 bg-gradient-to-r from-blue-500/10 to-blue-600/5 rounded-lg mb-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-blue-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              SWSM IoT Dashboard
            </h1>
            <p className="mt-2 text-sm text-blue-700/80 font-medium">
              Integration Dashboard for Jal Jeevan Mission
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <Button
              variant="outline"
              className="border-blue-300 hover:bg-blue-50 transition-all"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 transition-all"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Region Filter in card */}
      <div className="mb-8 p-4 bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium mb-3 text-blue-800">
          Filter Dashboard
        </h2>
        <RegionFilter
          regions={regions || []}
          selectedRegion={selectedRegion}
          onChange={handleRegionChange}
        />
      </div>

      {/* Stats Cards with extra spacing and animations */}
      <div className="mb-8 animate-in fade-in duration-500">
        <StatsCards data={regionSummary} isLoading={isSummaryLoading} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <div className="bg-white p-5 rounded-lg border shadow-sm hover:shadow-md transition-all">
          <h2 className="text-lg font-medium mb-4 text-blue-800">
            Region Comparison
          </h2>
          <RegionComparisonChart
            regions={regions || []}
            isLoading={isRegionsLoading}
          />
        </div>
        <div className="bg-white p-5 rounded-lg border shadow-sm hover:shadow-md transition-all">
          <h2 className="text-lg font-medium mb-4 text-blue-800">
            Completion Status
          </h2>
          <CompletionStatusChart
            schemes={schemes || []}
            isLoading={isSchemesLoading}
          />
        </div>
      </div>

      {/* Schemes Table with title and styling */}
      <div className="bg-white p-5 rounded-lg border shadow-sm mb-6">
        <h2 className="text-lg font-medium mb-4 text-blue-800">
          Water Scheme Details
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          Click on any scheme to view detailed integration status and progress
          information.
        </p>
        <SchemeTable
          schemes={schemes || []}
          isLoading={isSchemesLoading}
          onViewDetails={handleViewSchemeDetails}
        />
      </div>

      {/* Scheme Details Modal */}
      <SchemeDetailsModal
        scheme={selectedScheme}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </DashboardLayout>
  );
}
