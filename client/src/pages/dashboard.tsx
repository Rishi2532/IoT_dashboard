import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import RegionFilter from "@/components/dashboard/region-filter";
import StatsCards from "@/components/dashboard/stats-cards";
import RegionComparisonChart from "@/components/dashboard/region-comparison-chart";
import SimpleMaharashtraMap from "@/components/dashboard/simple-maharashtra-map";
import MetricSelector from "@/components/dashboard/metric-selector";
import DailyUpdates from "@/components/dashboard/daily-updates";
import FlipPopulationCards from "@/components/dashboard/flip-population-cards";
import SchemeTable from "@/components/dashboard/scheme-table";
import SchemeDetailsModal from "@/components/dashboard/scheme-details-modal";
import ComponentTypeFilter from "@/components/dashboard/ComponentTypeFilter";
import WorkingCirclePacking from "@/components/dashboard/working-circle-packing";
import ChatbotComponent, {
  FilterContextProvider,
} from "@/components/chatbot/ChatbotComponent";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Map, Filter } from "lucide-react";
import { Region, RegionSummary, SchemeStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useComprehensiveActivityTracker } from "@/hooks/use-comprehensive-activity-tracker";
import * as XLSX from "xlsx";
// Import our map components
import { GitHubStyleMapPreview } from "@/components/maps";
// Import Enhanced GeoFilter Map
import EnhancedGeoFilterMap, {
  MapLocation,
} from "@/components/maps/EnhancedGeoFilterMap";
// Import GeoFilter context
import { useGeoFilter } from "@/contexts/GeoFilterContext";
// Import data hooks for geographic filtering
import { useGeographicFilteredSchemes } from "@/hooks/useGeographicFilteredData";
// Import GeoJSON data for our map
import getMaharashtraGeoJson from "@/lib/maharashtra-geojson";

export default function Dashboard() {
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedScheme, setSelectedScheme] = useState<SchemeStatus | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showEnhancedMap, setShowEnhancedMap] = useState(false);
  const { toast } = useToast();
  const { trackPageVisit, trackDataExport, trackFilterUsage } =
    useComprehensiveActivityTracker();

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Main Dashboard", window.location.href);
  }, [trackPageVisit]);

  // Listen for region filter changes from chatbot
  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Main Dashboard received region filter:", region);
      setSelectedRegion(region === 'all' ? 'all' : region);
    };

    window.addEventListener('regionFilterChange', handleRegionFilterChange as EventListener);
    
    return () => {
      window.removeEventListener('regionFilterChange', handleRegionFilterChange as EventListener);
    };
  }, []);

  // Map configuration
  const mapRef = useRef(null);

  // Get geographic filter context
  const { filter, isFiltering, clearFilter } = useGeoFilter();

  // Use our geographic filtered schemes
  const {
    data: geoFilteredSchemes = [],
    isLoading: isGeoFilteredSchemesLoading,
  } = useGeographicFilteredSchemes();

  // Maharashtra major 6 regions with verified accurate coordinates - names exactly match database
  const [sampleLocations, setSampleLocations] = useState<MapLocation[]>([
    // Pune Region
    {
      name: "Pune",
      latitude: 18.52,
      longitude: 73.85,
      type: "scheme",
      details: {
        Schemes: "36",
        Villages: "426",
        ESRs: "156",
      },
    },

    // Nashik Region
    {
      name: "Nashik",
      latitude: 20.0,
      longitude: 73.78,
      type: "scheme",
      details: {
        Schemes: "29",
        Villages: "342",
        ESRs: "124",
      },
    },

    // Amravati Region
    {
      name: "Amravati",
      latitude: 20.93,
      longitude: 77.75,
      type: "scheme",
      details: {
        Schemes: "21",
        Villages: "197",
        ESRs: "86",
      },
    },

    // Chhatrapati Sambhajinagar Region
    {
      name: "Chhatrapati Sambhajinagar",
      latitude: 19.87,
      longitude: 75.34,
      type: "scheme",
      details: {
        Schemes: "26",
        Villages: "280",
        ESRs: "102",
      },
    },

    // Nagpur Region
    {
      name: "Nagpur",
      latitude: 21.15,
      longitude: 79.09,
      type: "scheme",
      details: {
        Schemes: "30",
        Villages: "364",
        ESRs: "146",
      },
    },

    // Konkan Region - adjusted position for better visibility
    {
      name: "Konkan",
      latitude: 18.1,
      longitude: 73.1,
      type: "scheme",
      details: {
        Schemes: "18",
        Villages: "163",
        ESRs: "76",
      },
    },
  ]);

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

  // State for status filter
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mapMetric, setMapMetric] = useState<
    "completion" | "esr" | "villages" | "flow_meter"
  >("completion");

  // Fetch schemes data with region and status filters
  const {
    data: schemes = [],
    isLoading: isSchemesLoading,
    refetch: refetchSchemes,
  } = useQuery<SchemeStatus[]>({
    queryKey: ["/api/schemes", selectedRegion, statusFilter],
    queryFn: () => {
      let url = `/api/schemes`;
      const params = new URLSearchParams();

      if (selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      return fetch(url).then((res) => res.json());
    },
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

  // State to track the currently filtered schemes from SchemeTable
  const [currentFilteredSchemes, setCurrentFilteredSchemes] = useState<
    SchemeStatus[]
  >([]);

  // Callback to receive filtered schemes from SchemeTable
  const handleFilteredSchemesChange = (filteredSchemes: SchemeStatus[]) => {
    setCurrentFilteredSchemes(filteredSchemes);
    console.log(
      `Received ${filteredSchemes.length} filtered schemes from SchemeTable`,
    );
  };

  // Export function
  const handleExport = async () => {
    try {
      // Use the filtered schemes directly from SchemeTable
      // This ensures we export exactly what the user sees in the table
      const allFilteredSchemes = currentFilteredSchemes;

      console.log(
        `Exporting ${allFilteredSchemes.length} schemes that are currently displayed in the table`,
      );

      if (allFilteredSchemes.length === 0) {
        toast({
          title: "No Data To Export",
          description:
            "There are no water schemes matching your current filter criteria.",
          variant: "destructive",
        });
        return;
      }

      // Show loading toast
      toast({
        title: "Preparing Export",
        description: `Gathering ${allFilteredSchemes.length} schemes for export...`,
      });

      // Import XLSX dynamically
      const XLSX = await import("xlsx");

      // Helper function to get appropriate agency based on region
      const getAgencyByRegion = (regionName: string): string => {
        const regionAgencyMap: Record<string, string> = {
          Nagpur: "M/s Rite Water",
          Amravati: "M/s Ceinsys",
          Nashik: "M/s Ceinsys",
          Pune: "M/s Indo/Chetas",
          Konkan: "M/s Indo/Chetas",
          "Chhatrapati Sambhajinagar": "M/s Rite Water",
        };
        return regionAgencyMap[regionName] || "Not Specified";
      };

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(
        allFilteredSchemes.map((scheme: SchemeStatus) => ({
          "Scheme ID": scheme.scheme_id,
          "Scheme Name": scheme.scheme_name,
          Region: scheme.region,
          // Use agency from scheme data if available, otherwise determine from region
          Agency:
            scheme.agency ||
            (scheme.region
              ? getAgencyByRegion(scheme.region)
              : "Not Specified"),
          "Total Villages": scheme.number_of_village,
          "Villages Integrated": scheme.total_villages_integrated,
          "Villages Completed": scheme.fully_completed_villages,
          "Total ESR": scheme.total_number_of_esr,
          "ESR Integrated": scheme.total_esr_integrated,
          "ESR Completed": scheme.no_fully_completed_esr,
          "Flow Meters": scheme.flow_meters_connected,
          "Pressure Transmitters": scheme.pressure_transmitter_connected,
          "Residual Chlorine Analyzers":
            scheme.residual_chlorine_analyzer_connected,
          // Add MJP columns
          "MJP Commissioned": scheme.mjp_commissioned || "No",
          "MJP Fully Completed": scheme.mjp_fully_completed || "In Progress",
          Status:
            scheme.fully_completion_scheme_status ||
            scheme.scheme_functional_status ||
            "Not-Connected",
        })),
      );

      // Format the headers with blue background and white text to match the image
      const headerStyle = {
        fill: { fgColor: { rgb: "0000FF" } }, // Bright blue background
        font: { color: { rgb: "FFFFFF" }, bold: true }, // White bold text
        alignment: { horizontal: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      };

      // Get all header cells (first row)
      const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;

        // Apply header styling
        ws[cellAddress].s = headerStyle;
      }

      // Apply conditional formatting for MJP status cells with bright colors to match the image
      const greenStyle = {
        fill: { fgColor: { rgb: "00FF00" } },
        font: { color: { rgb: "000000" }, bold: true },
      }; // Bright green
      const yellowStyle = {
        fill: { fgColor: { rgb: "FFFF00" } },
        font: { color: { rgb: "000000" }, bold: true },
      }; // Bright yellow

      // Find the indexes of the MJP columns and Status column
      let mjpCommissionedCol = -1;
      let mjpFullyCompletedCol = -1;
      let statusCol = -1;

      // Get the first row keys to find column indexes
      const firstRow = Object.keys(XLSX.utils.sheet_to_json(ws)[0] || {});
      mjpCommissionedCol = firstRow.findIndex(
        (key) => key === "MJP Commissioned",
      );
      mjpFullyCompletedCol = firstRow.findIndex(
        (key) => key === "MJP Fully Completed",
      );
      statusCol = firstRow.findIndex((key) => key === "Status");

      // Apply styles to MJP cells based on their values
      for (let row = 1; row <= headerRange.e.r; row++) {
        // Start from row 1 (skip header)
        // Style MJP Commissioned column
        if (mjpCommissionedCol !== -1) {
          const cellAddress = XLSX.utils.encode_cell({
            r: row,
            c: mjpCommissionedCol,
          });
          if (ws[cellAddress] && ws[cellAddress].v === "Yes") {
            ws[cellAddress].s = greenStyle;
          } else if (ws[cellAddress]) {
            ws[cellAddress].s = yellowStyle;
          }
        }

        // Style MJP Fully Completed column
        if (mjpFullyCompletedCol !== -1) {
          const cellAddress = XLSX.utils.encode_cell({
            r: row,
            c: mjpFullyCompletedCol,
          });
          if (ws[cellAddress] && ws[cellAddress].v === "Fully Completed") {
            ws[cellAddress].s = greenStyle;
          } else if (ws[cellAddress]) {
            ws[cellAddress].s = yellowStyle;
          }
        }

        // Style Status column
        if (statusCol !== -1) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: statusCol });
          if (ws[cellAddress] && ws[cellAddress].v === "Fully Completed") {
            ws[cellAddress].s = greenStyle;
          } else if (ws[cellAddress]) {
            ws[cellAddress].s = yellowStyle;
          }
        }
      }

      // Set column widths for better readability
      const colWidths = [
        { wch: 12 }, // Scheme ID
        { wch: 30 }, // Scheme Name
        { wch: 12 }, // Region
        { wch: 15 }, // Agency
        { wch: 12 }, // Total Villages
        { wch: 12 }, // Villages Integrated
        { wch: 12 }, // Villages Completed
        { wch: 10 }, // Total ESR
        { wch: 12 }, // ESR Integrated
        { wch: 12 }, // ESR Completed
        { wch: 12 }, // Flow Meters
        { wch: 12 }, // Pressure Transmitters
        { wch: 12 }, // Residual Chlorine Analyzers
        { wch: 15 }, // MJP Commissioned
        { wch: 15 }, // MJP Fully Completed
        { wch: 18 }, // Status
      ];

      // Apply column widths
      ws["!cols"] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Schemes Data");

      // Generate filename based on filters
      let filename = "swsm-schemes";
      if (selectedRegion !== "all") {
        filename += `-${selectedRegion}`;
      }
      if (statusFilter !== "all") {
        filename += `-${statusFilter}`;
      }
      filename += ".xlsx";

      // Generate and download file
      XLSX.writeFile(wb, filename);

      // Track the data export activity with detailed filter information
      const appliedFilters = {
        region: selectedRegion !== "all" ? selectedRegion : undefined,
        statusFilter: statusFilter !== "all" ? statusFilter : undefined,
        geoFilter: isFiltering ? "Geographic Filter Applied" : undefined,
      };

      // Clean up undefined values for tracking
      const cleanedFilters = Object.fromEntries(
        Object.entries(appliedFilters).filter(
          ([_, value]) => value !== undefined,
        ),
      );

      trackDataExport(
        "Schemes Data",
        filename,
        allFilteredSchemes.length,
        cleanedFilters,
        {
          exportSource: "main_dashboard",
          totalSchemesAvailable: schemes.length,
          filteredSchemes: allFilteredSchemes.length,
        },
      );

      toast({
        title: "Export Complete",
        description: `Exported ${allFilteredSchemes.length} schemes to Excel with your current filters applied.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewSchemeDetails = (scheme: SchemeStatus) => {
    setSelectedScheme(scheme);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Handler for status filter changes
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    // Track filter usage
    if (status !== "all") {
      trackFilterUsage("status", status, undefined, "main_dashboard");
    }
  };

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Main Dashboard");
  }, [trackPageVisit]);

  // Make export function globally accessible
  useEffect(() => {
    // Expose the export function to window for the chatbot to use
    // We need to make sure the function is properly bound to the component
    // and its filters, so we create a new function that calls our export
    (window as any).triggerDashboardExport = () => {
      console.log("Global Excel export triggered with filters:", {
        region: selectedRegion,
        status: statusFilter,
      });

      // Execute the export function directly (not as a Promise)
      handleExport();

      // Return a resolved promise for API consistency
      return Promise.resolve();
    };

    // Clean up when component unmounts
    return () => {
      (window as any).triggerDashboardExport = undefined;
    };
  }, [selectedRegion, statusFilter, handleExport]); // Re-bind when filters or the handler changes

  return (
    <DashboardLayout>
      {/* Add ComponentTypeFilter for highlighting components when asked about through chatbot */}
      <ComponentTypeFilter
        onFilterChange={(componentType) => {
          console.log(
            `Dashboard received component filter change: ${componentType}`,
          );
          // You can add additional logic here if needed
        }}
      />

      {/* Enhanced Dashboard Header with water-themed gradient */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600/20 via-blue-400/15 to-blue-700/10 rounded-lg mb-4 sm:mb-6 shadow-md border border-blue-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500">
              SWSM IoT Project Progress Dashboard
            </h1>
            <p className="mt-1 sm:mt-2 text-sm text-blue-700/80 font-medium flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Integration Dashboard for Jal Jeevan Mission
              <span className="ml-3 py-0.5 px-2 text-xs bg-blue-100 text-blue-700 rounded-full">
                Live Data
              </span>
            </p>
          </div>
          <div className="mt-4 flex sm:mt-0 sm:ml-4 space-x-3">
            <Button
              variant="outline"
              size="sm"
              className="border-blue-300 hover:bg-blue-50 transition-all text-xs sm:text-sm shadow-sm"
              onClick={handleExport}
            >
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={handleRefresh}
              className="bg-[#05529c] hover:bg-blue-700 transition-all text-xs sm:text-sm shadow-sm"
            >
              <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Daily Updates */}
      <DailyUpdates isLoading={false} />

      {/* Region Filter in card */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white rounded-lg border shadow-sm relative z-10">
        <h2 className="text-base sm:text-lg font-medium mb-2 sm:mb-3 text-blue-800">
          Filter Dashboard
        </h2>
        <RegionFilter
          regions={regions || []}
          selectedRegion={selectedRegion}
          onChange={handleRegionChange}
        />
        {/* Add global styling to ensure dropdown is always visible */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .region-select-dropdown {
              z-index: 9999 !important;
              position: absolute !important;
              top: auto !important;
              bottom: auto !important;
            }
            /* Force the portal to render even above maps */
            [data-radix-popper-content-wrapper] {
              z-index: 9999 !important;
            }
          `,
          }}
        />
      </div>

      {/* Map and Stats Cards Layout (stacked on mobile, side-by-side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Map Column - Full width on mobile, 5/12 on desktop */}
        <div className="lg:col-span-5 bg-white p-3 sm:p-4 rounded-lg border-0 flex flex-col">
          <div className="flex justify-between items-center mb-2 sm:mb-3">
            <h2 className="text-sm sm:text-base font-medium text-blue-800">
              Maharashtra Regional Status
            </h2>
          </div>
          <div className="w-full overflow-x-auto flex-1 min-h-[480px]">
            <div className="min-w-[280px] sm:min-w-full h-full">
              {/* Enhanced Geographic Filter Map */}
              <div
                className="map-container"
                id="maharashtra-map-preview"
                style={{ height: "480px" }}
              >
                {/* Add the enhanced map with GeoJSON data */}
                <EnhancedGeoFilterMap
                  mapHeight="480px"
                  className="h-full w-full"
                  locations={sampleLocations}
                  onRegionClick={(regionName) => {
                    handleRegionChange(regionName);
                  }}
                />
              </div>

              {/* Remove error modal if it appears */}
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                  /* Hide runtime error popup for map */
                  #maharashtra-map-preview + div[data-plugin-id="runtime-errors"] {
                    display: none !important;
                  }
                `,
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats Cards Area - Full width on mobile, 7/12 on desktop */}
        <div className="lg:col-span-7">
          <StatsCards
            data={regionSummary}
            isLoading={isSummaryLoading}
            layout="compact"
          />
        </div>
      </div>

      {/* Full-width Population Cards Section */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200 shadow-md">
          <div className="flex items-center mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 flex items-center">
              <span className="w-2 h-6 bg-blue-500 rounded-sm mr-3"></span>
              Population Water Coverage Overview
            </h2>
            {selectedRegion !== "all" && (
              <span className="ml-3 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                {selectedRegion} Region
              </span>
            )}
          </div>
          <FlipPopulationCards selectedRegion={selectedRegion} />
        </div>
      </div>

      {/* Region Comparison Chart - Full Width */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100 shadow-md hover:shadow-lg transition-all">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3">
            <h2 className="text-sm sm:text-base font-semibold text-blue-800 flex items-center mb-2 sm:mb-0">
              <span className="w-1.5 h-5 bg-blue-500 rounded-sm mr-2"></span>
              Region Wise Project Status
            </h2>
            <div className="flex flex-wrap space-x-2 items-center text-[8px] sm:text-[10px]">
              <span className="flex items-center">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-sm bg-green-500 mr-1"></span>
                <span className="text-green-700">ESR</span>
              </span>
              <span className="flex items-center">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-sm bg-pink-500 mr-1"></span>
                <span className="text-pink-700">Villages</span>
              </span>
              <span className="flex items-center">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-sm bg-red-500 mr-1"></span>
                <span className="text-red-700">Schemes</span>
              </span>
            </div>
          </div>
          <div className="w-full overflow-hidden flex-1 flex flex-col bg-white rounded-lg p-2">
            <div className="w-full flex-1 flex flex-col h-[40vh]">
              <RegionComparisonChart
                regions={regions || []}
                isLoading={isRegionsLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Circle Packing Visualization */}
      <div className="mb-4 sm:mb-6">
        <WorkingCirclePacking />
      </div>

      {/* Enhanced Schemes Table with title and styling */}
      <div className="bg-white p-3 sm:p-5 rounded-lg border border-blue-100 shadow-md mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-blue-800 flex items-center">
              <span className="w-1.5 h-6 bg-blue-500 rounded-sm mr-2"></span>
              Water Scheme Details
              {selectedRegion !== "all" && !isFiltering && (
                <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full region-selected">
                  {selectedRegion} Region
                </span>
              )}
              {isFiltering && (
                <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full geo-filter-badge flex items-center">
                  <Filter className="h-3 w-3 mr-1" />
                  Geographic Filter: {filter.level}
                  {filter.block && (
                    <span className="ml-1">- {filter.block}</span>
                  )}
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 sm:mt-2">
              {isFiltering
                ? `Showing schemes filtered by ${filter.level} level geographic filter`
                : selectedRegion === "all"
                  ? "Click on any scheme to view detailed integration status and progress information"
                  : `Showing water schemes in ${selectedRegion} region. Use the chatbot to filter other regions.`}
            </p>
          </div>
          <span className="hidden sm:flex items-center text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <span className="font-medium">
              {isFiltering ? geoFilteredSchemes.length : schemes.length}
            </span>
            <span className="ml-1">
              scheme
              {(isFiltering ? geoFilteredSchemes.length : schemes.length) !== 1
                ? "s"
                : ""}{" "}
              found
            </span>
          </span>
        </div>
        <div className="w-full overflow-x-auto bg-gradient-to-r from-blue-50/30 via-white to-blue-50/30 rounded-lg p-2">
          <div className="min-w-[650px]">
            <SchemeTable
              schemes={isFiltering ? geoFilteredSchemes : schemes || []}
              isLoading={
                isFiltering ? isGeoFilteredSchemesLoading : isSchemesLoading
              }
              onViewDetails={handleViewSchemeDetails}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              onFilteredSchemesChange={handleFilteredSchemesChange}
              selectedRegion={selectedRegion}
            />
          </div>
        </div>
      </div>

      {/* Scheme Details Modal */}
      <SchemeDetailsModal
        scheme={selectedScheme}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* AI Assistant Chatbot is now managed globally in App.tsx */}
    </DashboardLayout>
  );
}
