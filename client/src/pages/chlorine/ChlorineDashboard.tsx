import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Droplet,
  Activity,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

// Define types for Chlorine Data
interface ChlorineData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  village_name: string;
  esr_name: string;
  sensor_id?: string;
  chlorine_value_1?: number | null;
  chlorine_date_day_1?: string | null;
  chlorine_value_2?: number | null;
  chlorine_date_day_2?: string | null;
  chlorine_value_3?: number | null;
  chlorine_date_day_3?: string | null;
  chlorine_value_4?: number | null;
  chlorine_date_day_4?: string | null;
  chlorine_value_5?: number | null;
  chlorine_date_day_5?: string | null;
  chlorine_value_6?: number | null;
  chlorine_date_day_6?: string | null;
  chlorine_value_7?: number | null;
  chlorine_date_day_7?: string | null;
  // Additional analysis fields
  number_of_consistent_zero_value_in_chlorine?: number | null;
  chlorine_less_than_02_mgl?: number | null;
  chlorine_between_02_05_mgl?: number | null;
  chlorine_greater_than_05_mgl?: number | null;
}

interface RegionData {
  region_id: number;
  region_name: string;
}

interface ChlorineDashboardStats {
  totalSensors: number;
  belowRangeSensors: number;
  optimalRangeSensors: number;
  aboveRangeSensors: number;
  consistentZeroSensors: number;
  consistentBelowRangeSensors: number;
  consistentOptimalSensors: number;
  consistentAboveRangeSensors: number;
}

type ChlorineRange =
  | "all"
  | "below_0.2"
  | "between_0.2_0.5"
  | "above_0.5"
  | "consistent_zero"
  | "consistent_below"
  | "consistent_optimal"
  | "consistent_above";

const ChlorineDashboard: React.FC = () => {
  const { toast } = useToast();

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [currentFilter, setCurrentFilter] = useState<ChlorineRange>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected ESR for detailed view
  const [selectedESR, setSelectedESR] = useState<ChlorineData | null>(null);

  // Fetch all chlorine data
  const {
    data: allChlorineData = [],
    isLoading: isLoadingChlorine,
    error: chlorineError,
    refetch,
  } = useQuery<ChlorineData[]>({
    queryKey: ["/api/chlorine", selectedRegion, currentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      if (currentFilter && currentFilter !== "all") {
        params.append("chlorineRange", currentFilter);
      }

      const queryString = params.toString();
      const url = `/api/chlorine${queryString ? `?${queryString}` : ""}`;

      console.log("Fetching chlorine data with URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch chlorine data");
      }

      const data = await response.json();
      console.log(`Received ${data.length} chlorine records for region: ${selectedRegion}, filter: ${currentFilter}`);
      return data;
    },
  });

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading: isLoadingStats } =
    useQuery<ChlorineDashboardStats>({
      queryKey: ["/api/chlorine/dashboard-stats", selectedRegion],
      queryFn: async () => {
        const params = new URLSearchParams();

        if (selectedRegion && selectedRegion !== "all") {
          params.append("region", selectedRegion);
        }

        const queryString = params.toString();
        const url = `/api/chlorine/dashboard-stats${queryString ? `?${queryString}` : ""}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }

        return response.json();
      },
    });

  // Fetch region data
  const { data: regionsData = [], isLoading: isLoadingRegions } = useQuery<
    RegionData[]
  >({
    queryKey: ["/api/regions"],
  });

  // Get latest chlorine value
  const getLatestChlorineValue = (data: ChlorineData): number | null => {
    // Try to get the latest non-null value
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
      const value = data[`chlorine_value_${day}` as keyof ChlorineData];
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !isNaN(Number(value))
      ) {
        return Number(value);
      }
    }
    return null;
  };

  // Get the CSS class and status text based on chlorine value
  const getChlorineStatusInfo = (value: number | null) => {
    if (value === null)
      return { className: "bg-gray-100", statusText: "No Data" };

    if (value < 0.2)
      return {
        className: "bg-red-50 border-red-200",
        statusText: "Below Range",
        textColor: "text-red-800",
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      };

    if (value >= 0.2 && value <= 0.5)
      return {
        className: "bg-green-50 border-green-200",
        statusText: "Optimal",
        textColor: "text-green-800",
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      };

    return {
      className: "bg-orange-50 border-orange-200",
      statusText: "Above Range",
      textColor: "text-orange-800",
      icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
    };
  };

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...allChlorineData];

    // Apply search filter if query exists
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.scheme_name?.toLowerCase().includes(query) ||
          item.region?.toLowerCase().includes(query) ||
          item.village_name?.toLowerCase().includes(query) ||
          item.esr_name?.toLowerCase().includes(query)
          // Removed sensor_id from search as requested
      );
    }

    // Double-check region filtering to ensure only data from selected region is shown
    if (selectedRegion && selectedRegion !== 'all') {
      filtered = filtered.filter(item => item.region === selectedRegion);
    }

    // Note: The API should already apply most filtering, but we're adding an extra
    // check here to ensure only data from the selected region is displayed

    return filtered;
  }, [allChlorineData, searchQuery, selectedRegion]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, page, itemsPerPage]);

  // Get status filter title
  const getFilterTitle = (filter: ChlorineRange) => {
    switch (filter) {
      case "below_0.2":
        return "Below Range (<0.2mg/l)";
      case "between_0.2_0.5":
        return "Optimal Range (0.2-0.5mg/l)";
      case "above_0.5":
        return "Above Range (>0.5mg/l)";
      case "consistent_zero":
        return "Consistent Zero Chlorine (7 days)";
      case "consistent_below":
        return "Consistent Below Range (7 days)";
      case "consistent_optimal":
        return "Consistent Optimal Range (7 days)";
      case "consistent_above":
        return "Consistent Above Range (7 days)";
      default:
        return "All ESRs";
    }
  };

  // Handler for dashboard card clicks
  const handleCardClick = (range: ChlorineRange) => {
    setCurrentFilter(range);
    setPage(1); // Reset to first page when filter changes
  };

  // Function to export data to Excel
  const exportToExcel = (data: ChlorineData[], filename: string) => {
    try {
      // Format data for Excel
      const worksheetData = data.map((item) => {
        const latestChlorine = getLatestChlorineValue(item);
        const { statusText } = getChlorineStatusInfo(latestChlorine);

        // Get the latest date
        let latestDate = null;
        for (const day of [7, 6, 5, 4, 3, 2, 1]) {
          const dateValue =
            item[`chlorine_date_day_${day}` as keyof ChlorineData];
          if (dateValue) {
            latestDate = dateValue;
            break;
          }
        }

        return {
          "Scheme ID": item.scheme_id,
          "Scheme Name": item.scheme_name || "N/A",
          Region: item.region || "N/A",
          "Village Name": item.village_name || "N/A",
          "ESR Name": item.esr_name || "N/A",
          // Removed "Sensor ID" as requested
          "Latest Chlorine Value (mg/l)":
            latestChlorine !== null ? latestChlorine.toFixed(2) : "No data",
          Status: statusText,
          "Days Below Range (<0.2 mg/l)": item.chlorine_less_than_02_mgl || 0,
          "Days Optimal Range (0.2-0.5 mg/l)":
            item.chlorine_between_02_05_mgl || 0,
          "Days Above Range (>0.5 mg/l)":
            item.chlorine_greater_than_05_mgl || 0,
          "Consistent Zero for 7 Days":
            item.number_of_consistent_zero_value_in_chlorine === 7
              ? "Yes"
              : "No",
        };
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Create workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Chlorine Data");

      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, `${filename}.xlsx`);

      toast({
        title: "Export Successful",
        description: `${worksheetData.length} records exported to Excel`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state for dashboard
  if (isLoadingChlorine || isLoadingStats || isLoadingRegions) {
    return (
      <div className="container mx-auto p-4">
        {/* <h1 className="text-2xl font-bold mb-6">Chlorine Monitoring Dashboard</h1> */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (chlorineError) {
    return (
      <div className="container mx-auto p-4">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">
            Failed to load chlorine data. Please try again later.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Region Filter */}
      <div className="bg-white rounded-xl shadow-md mb-6 p-4 border border-blue-100">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Region
            </label>
            <Select
              value={selectedRegion}
              onValueChange={(value) => {
                setSelectedRegion(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-white border border-blue-200 shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-medium">
                  All Regions
                </SelectItem>
                <div className="h-px bg-gray-200 my-1"></div>
                {regionsData.map((region) => (
                  <SelectItem key={region.region_id} value={region.region_name}>
                    {region.region_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-96 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search ESRs
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                placeholder="Search by scheme, village or ESR name..."
                className="pl-9 pr-4 py-2 border-blue-200 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="ml-auto self-end flex gap-2">
            <Button
              onClick={() =>
                exportToExcel(
                  filteredData,
                  `Chlorine_Data_${selectedRegion}_${currentFilter}_${new Date().toISOString().split("T")[0]}`,
                )
              }
              variant="outline"
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Excel{filteredData.length > 0 ? ` (${filteredData.length})` : ''}
            </Button>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        {/* Total Sensors Card */}
        <Card
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === "all" ? "ring-2 ring-blue-500 ring-offset-2" : ""
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick("all")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white"></div>
          {/* X button removed */}
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg font-bold text-blue-800 font-sans">
              Total Connected ESRs
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-5xl font-bold text-blue-700 font-sans">
              {dashboardStats?.totalSensors || 0}
            </p>
            <p className="text-sm text-blue-600/80 mt-2 font-medium font-sans">
              Total chlorine sensors connected
            </p>
          </CardContent>
        </Card>

        {/* Below Range Card */}
        <Card
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === "below_0.2"
              ? "ring-2 ring-red-500 ring-offset-2"
              : ""
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick("below_0.2")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-white"></div>
          <div className="absolute bottom-0 right-0 opacity-10">
            <AlertTriangle className="h-24 w-24 text-red-500" />
          </div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg font-bold text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              Below Range
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-5xl font-bold text-red-600">
              {dashboardStats?.belowRangeSensors || 0}
            </p>
            <div className="flex items-center mt-2">
              <p className="text-sm text-red-600/80 font-medium">
                ESRs with chlorine &lt;0.2mg/l
              </p>
              <span className="ml-auto px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                Action Required
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Optimal Range Card */}
        <Card
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === "between_0.2_0.5"
              ? "ring-2 ring-green-500 ring-offset-2"
              : ""
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick("between_0.2_0.5")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-white"></div>
          <div className="absolute bottom-0 right-0 opacity-10">
            <CheckCircle className="h-24 w-24 text-green-500" />
          </div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg font-bold text-green-800 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Optimal Range
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-5xl font-bold text-green-600">
              {dashboardStats?.optimalRangeSensors || 0}
            </p>
            <div className="flex items-center mt-2">
              <p className="text-sm text-green-600/80 font-medium">
                ESRs with chlorine 0.2-0.5mg/l
              </p>
              <span className="ml-auto px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                Good Quality
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Above Range Card */}
        <Card
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === "above_0.5"
              ? "ring-2 ring-orange-500 ring-offset-2"
              : ""
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick("above_0.5")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white"></div>
          <div className="absolute bottom-0 right-0 opacity-10">
            <AlertCircle className="h-24 w-24 text-orange-500" />
          </div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg font-bold text-orange-800 flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
              Above Range
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-5xl font-bold text-orange-600">
              {dashboardStats?.aboveRangeSensors || 0}
            </p>
            <div className="flex items-center mt-2">
              <p className="text-sm text-orange-600/80 font-medium">
                ESRs with chlorine &gt;0.5mg/l
              </p>
              <span className="ml-auto px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                Review Required
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consistent Reading Cards */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4 mt-2">
        ESRs with Consistent Readings (7 days)
      </h2>
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {/* Consistent Zero Card */}
        <Card
          className={`cursor-pointer border border-gray-200 hover:shadow-md transition-all duration-200 ${
            currentFilter === "consistent_zero"
              ? "ring-2 ring-gray-500 ring-offset-2"
              : ""
          }`}
          onClick={() => handleCardClick("consistent_zero")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-gray-700 flex items-center">
              <Activity className="h-4 w-4 text-gray-500 mr-2" />
              Consistent Zero Chlorine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-700">
              {dashboardStats?.consistentZeroSensors || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ESRs with zero chlorine for 7 days
            </p>
            <div className="mt-2">
              <Badge
                variant="outline"
                className="bg-gray-50 text-gray-600 border-gray-200"
              >
                Critical Review
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Consistent Below Range Card */}
        <Card
          className={`cursor-pointer border border-gray-200 hover:shadow-md transition-all duration-200 ${
            currentFilter === "consistent_below"
              ? "ring-2 ring-red-500 ring-offset-2"
              : ""
          }`}
          onClick={() => handleCardClick("consistent_below")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-red-700 flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
              Consistent Below Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {dashboardStats?.consistentBelowRangeSensors || 0}
            </p>
            <p className="text-xs text-red-500/80 mt-1">
              ESRs with &lt;0.2mg/l for 7 days
            </p>
            <div className="mt-2">
              <Badge
                variant="outline"
                className="bg-red-50 text-red-600 border-red-200"
              >
                Adjust Dosing
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Consistent Optimal Card */}
        <Card
          className={`cursor-pointer border border-gray-200 hover:shadow-md transition-all duration-200 ${
            currentFilter === "consistent_optimal"
              ? "ring-2 ring-green-500 ring-offset-2"
              : ""
          }`}
          onClick={() => handleCardClick("consistent_optimal")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-green-700 flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Consistent Optimal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {dashboardStats?.consistentOptimalSensors || 0}
            </p>
            <p className="text-xs text-green-500/80 mt-1">
              ESRs with 0.2-0.5mg/l for 7 days
            </p>
            <div className="mt-2">
              <Badge
                variant="outline"
                className="bg-green-50 text-green-600 border-green-200"
              >
                Excellent
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Consistent Above Range Card */}
        <Card
          className={`cursor-pointer border border-gray-200 hover:shadow-md transition-all duration-200 ${
            currentFilter === "consistent_above"
              ? "ring-2 ring-orange-500 ring-offset-2"
              : ""
          }`}
          onClick={() => handleCardClick("consistent_above")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-orange-700 flex items-center">
              <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
              Consistent Above Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {dashboardStats?.consistentAboveRangeSensors || 0}
            </p>
            <p className="text-xs text-orange-500/80 mt-1">
              ESRs with &gt;0.5mg/l for 7 days
            </p>
            <div className="mt-2">
              <Badge
                variant="outline"
                className="bg-orange-50 text-orange-600 border-orange-200"
              >
                Reduce Dosing
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="mb-6 shadow-md border-0">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2">
            {currentFilter === "below_0.2" && (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            {currentFilter === "between_0.2_0.5" && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            {currentFilter === "above_0.5" && (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
            {currentFilter === "consistent_zero" && (
              <Activity className="h-5 w-5 text-gray-600" />
            )}
            {currentFilter === "consistent_below" && (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            {currentFilter === "consistent_optimal" && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            {currentFilter === "consistent_above" && (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
            {getFilterTitle(currentFilter)}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredData.length} ESRs found)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredData.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-blue-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No Data Found
              </h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                No ESR data matching the selected criteria. Try changing your
                filters or search terms.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-md">
                <Table>
                  <TableHeader className="bg-blue-50/50">
                    <TableRow className="hover:bg-blue-50/80">
                      <TableHead className="font-semibold text-blue-800">
                        Region
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800">
                        Scheme ID
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800">
                        Scheme Name
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800">
                        Village
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800">
                        ESR Name
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800">
                        Latest Chlorine (mg/l)
                      </TableHead>

                      <TableHead className="font-semibold text-blue-800">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, index) => {
                      const latestValue = getLatestChlorineValue(item);
                      const { className, statusText, textColor, icon } =
                        getChlorineStatusInfo(latestValue);

                      // Get the latest date
                      let latestDate = null;
                      for (const day of [7, 6, 5, 4, 3, 2, 1]) {
                        const dateValue =
                          item[
                            `chlorine_date_day_${day}` as keyof ChlorineData
                          ];
                        if (dateValue) {
                          latestDate = dateValue;
                          break;
                        }
                      }

                      // Get row variant based on chlorine value
                      let rowVariantClass = "";
                      if (latestValue !== null) {
                        if (latestValue < 0.2)
                          rowVariantClass = "bg-red-50/40 hover:bg-red-50";
                        else if (latestValue >= 0.2 && latestValue <= 0.5)
                          rowVariantClass = "hover:bg-green-50";
                        else
                          rowVariantClass =
                            "bg-orange-50/40 hover:bg-orange-50";
                      }

                      return (
                        <TableRow
                          key={`${item.scheme_id}-${item.village_name}-${item.esr_name}-${index}`}
                          className={`${rowVariantClass} transition-colors`}
                        >
                          <TableCell className="font-medium">
                            {item.region}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.scheme_id}
                          </TableCell>
                          <TableCell>{item.scheme_name}</TableCell>
                          <TableCell>{item.village_name}</TableCell>
                          <TableCell>{item.esr_name}</TableCell>
                          <TableCell className="font-medium">
                            {latestValue !== null ? (
                              <span
                                className={
                                  latestValue < 0.2
                                    ? "text-red-600"
                                    : latestValue > 0.5
                                      ? "text-orange-600"
                                      : "text-green-600"
                                }
                              >
                                {latestValue.toFixed(2)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={`${className} ${textColor} flex items-center gap-1 w-fit shadow-sm border`}
                            >
                              {icon} {statusText}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                  onClick={() => setSelectedESR(item)}
                                >
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl bg-white">
                                {selectedESR && (
                                  <>
                                    <DialogHeader>
                                      <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                          <Droplet className="h-5 w-5 text-blue-600" />
                                        </div>
                                        {selectedESR.esr_name} -{" "}
                                        {selectedESR.village_name}
                                      </DialogTitle>
                                      <DialogDescription>
                                        Detailed chlorine monitoring data for
                                        this ESR
                                      </DialogDescription>
                                    </DialogHeader>

                                    <div className="py-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                                          <h3 className="text-sm font-medium text-blue-800 mb-3">
                                            ESR Information
                                          </h3>

                                          <div className="space-y-3">
                                            <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                              <span className="text-sm text-blue-700">
                                                Region
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.region}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                              <span className="text-sm text-blue-700">
                                                Scheme ID
                                              </span>
                                              <span className="font-medium font-mono">
                                                {selectedESR.scheme_id}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                              <span className="text-sm text-blue-700">
                                                Scheme
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.scheme_name}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                              <span className="text-sm text-blue-700">
                                                Village
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.village_name}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                              <span className="text-sm text-blue-700">
                                                Sensor ID
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.sensor_id || "N/A"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-100 flex flex-col">
                                          <h3 className="text-sm font-medium text-blue-800 mb-3">
                                            Current Status
                                          </h3>

                                          {(() => {
                                            const latestValue =
                                              getLatestChlorineValue(
                                                selectedESR,
                                              );
                                            const {
                                              className,
                                              statusText,
                                              textColor,
                                              icon,
                                            } =
                                              getChlorineStatusInfo(
                                                latestValue,
                                              );

                                            let statusBgClass = "bg-gray-100";
                                            let statusTextClass =
                                              "text-gray-800";

                                            if (latestValue !== null) {
                                              if (latestValue < 0.2) {
                                                statusBgClass = "bg-red-100";
                                                statusTextClass =
                                                  "text-red-800";
                                              } else if (
                                                latestValue >= 0.2 &&
                                                latestValue <= 0.5
                                              ) {
                                                statusBgClass = "bg-green-100";
                                                statusTextClass =
                                                  "text-green-800";
                                              } else {
                                                statusBgClass = "bg-orange-100";
                                                statusTextClass =
                                                  "text-orange-800";
                                              }
                                            }

                                            return (
                                              <div
                                                className={`${statusBgClass} rounded-lg p-4 flex-1 flex flex-col justify-center items-center`}
                                              >
                                                <div className="flex items-center gap-2 mb-2">
                                                  {icon}
                                                  <span
                                                    className={`text-lg font-bold ${statusTextClass}`}
                                                  >
                                                    {statusText}
                                                  </span>
                                                </div>

                                                <div className="text-4xl font-bold mb-2">
                                                  {latestValue !== null ? (
                                                    <span
                                                      className={
                                                        statusTextClass
                                                      }
                                                    >
                                                      {latestValue.toFixed(2)}
                                                    </span>
                                                  ) : (
                                                    "—"
                                                  )}
                                                </div>

                                                <div
                                                  className={`text-sm ${statusTextClass}`}
                                                >
                                                  mg/l
                                                </div>

                                                <div className="mt-4 text-xs text-gray-600">
                                                  Target Range: 0.2-0.5 mg/l
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>

                                      <div className="border-t border-gray-200 pt-6">
                                        <h3 className="font-medium text-lg mb-4 text-blue-800 flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                            <AlertCircle className="h-3 w-3 text-blue-600" />
                                          </div>
                                          7-Day Chlorine History
                                        </h3>
                                        <div className="grid grid-cols-7 gap-3">
                                          {[7, 6, 5, 4, 3, 2, 1].map((day) => {
                                            const value =
                                              selectedESR[
                                                `chlorine_value_${day}` as keyof ChlorineData
                                              ];
                                            const numValue =
                                              value !== undefined &&
                                              value !== null
                                                ? Number(value)
                                                : null;
                                            const dateValue =
                                              selectedESR[
                                                `chlorine_date_day_${day}` as keyof ChlorineData
                                              ];
                                            const {
                                              className: dayClassName,
                                              statusText,
                                              textColor,
                                            } = getChlorineStatusInfo(numValue);

                                            let cardBgClass =
                                              "bg-white border-gray-200";
                                            let valueTextClass =
                                              "text-gray-400";

                                            if (numValue !== null) {
                                              if (numValue < 0.2) {
                                                cardBgClass =
                                                  "bg-gradient-to-br from-red-50 to-white border-red-200";
                                                valueTextClass = "text-red-600";
                                              } else if (
                                                numValue >= 0.2 &&
                                                numValue <= 0.5
                                              ) {
                                                cardBgClass =
                                                  "bg-gradient-to-br from-green-50 to-white border-green-200";
                                                valueTextClass =
                                                  "text-green-600";
                                              } else {
                                                cardBgClass =
                                                  "bg-gradient-to-br from-orange-50 to-white border-orange-200";
                                                valueTextClass =
                                                  "text-orange-600";
                                              }
                                            }

                                            return (
                                              <div
                                                key={`chlorine-day-${day}`}
                                                className={`${cardBgClass} p-3 rounded-md text-center shadow-sm border relative overflow-hidden`}
                                              >
                                                <div className="relative">
                                                  <p className="text-xs text-gray-700 font-medium">
                                                    {day === 1
                                                      ? "Today"
                                                      : day === 2
                                                        ? "Yesterday"
                                                        : `Day ${day}`}
                                                  </p>
                                                  <p
                                                    className={`text-xl font-bold ${valueTextClass}`}
                                                  >
                                                    {numValue !== null
                                                      ? numValue.toFixed(2)
                                                      : "—"}
                                                  </p>
                                                  <p className="text-xs text-gray-500 truncate">
                                                    {dateValue || "No data"}
                                                  </p>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={
                            page === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          // Show first, last, current, and pages around current
                          let pageToShow;
                          if (totalPages <= 5) {
                            pageToShow = i + 1;
                          } else if (page <= 3) {
                            pageToShow = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageToShow = totalPages - 4 + i;
                          } else {
                            pageToShow = page - 2 + i;
                          }

                          if (pageToShow <= totalPages) {
                            return (
                              <PaginationItem key={pageToShow}>
                                <PaginationLink
                                  isActive={page === pageToShow}
                                  onClick={() => setPage(pageToShow)}
                                >
                                  {pageToShow}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          return null;
                        },
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          className={
                            page === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChlorineDashboard;
