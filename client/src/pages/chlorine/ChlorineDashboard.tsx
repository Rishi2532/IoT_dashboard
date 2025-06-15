import React, { useState, useMemo, useEffect } from "react";
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
import { TranslatedText } from "@/components/ui/translated-text";
import { useComprehensiveActivityTracker } from "@/hooks/use-comprehensive-activity-tracker";
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
  BarChart,
  ExternalLink,
  Calendar,
  History,
  TrendingUp,
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
  // Dashboard URL for PI Vision integration
  dashboard_url?: string;
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
  lastImport?: {
    inserted: number;
    updated: number;
    totalProcessed: number;
    timestamp: string;
    errors: number;
  };
}

interface HistoricalChlorineData {
  scheme_id: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  measurement_date: string;
  chlorine_value: number;
  dashboard_url?: string;
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
  const { trackPageVisit, trackDataExport, trackFilterUsage, trackDashboardAccess } = useComprehensiveActivityTracker();

  // Global filter state (affects both cards and table)
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [commissionedFilter, setCommissionedFilter] = useState<string>("all");
  const [fullyCompletedFilter, setFullyCompletedFilter] =
    useState<string>("all");
  const [schemeStatusFilter, setSchemeStatusFilter] = useState<string>("all");
  
  // Card-specific filter state (only affects table data, not card values)
  const [selectedCardFilter, setSelectedCardFilter] = useState<ChlorineRange>("all");
  
  // Remove the old selectedCardFilter state entirely - we'll use selectedCardFilter instead

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected ESR for detailed view
  const [selectedESR, setSelectedESR] = useState<ChlorineData | null>(null);

  // Historical data state
  const [showHistoricalData, setShowHistoricalData] = useState<boolean>(false);
  const [historicalStartDate, setHistoricalStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days ago
  );
  const [historicalEndDate, setHistoricalEndDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Today
  );

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Chlorine Dashboard");
  }, [trackPageVisit]);

  // Listen for region filter changes from chatbot
  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Chlorine Dashboard received region filter:", region);
      setSelectedRegion(region);
    };

    window.addEventListener('regionFilterChange', handleRegionFilterChange as EventListener);
    
    return () => {
      window.removeEventListener('regionFilterChange', handleRegionFilterChange as EventListener);
    };
  }, []);

  // Fetch all chlorine data
  const {
    data: allChlorineData = [],
    isLoading: isLoadingChlorine,
    error: chlorineError,
    refetch,
  } = useQuery<ChlorineData[]>({
    queryKey: ["/api/chlorine", selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      // No longer filtering API requests by card selection
      // This ensures we get all data for the region and can filter locally

      const queryString = params.toString();
      const url = `/api/chlorine${queryString ? `?${queryString}` : ""}`;

      console.log("Fetching chlorine data with URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch chlorine data");
      }

      const data = await response.json();
      console.log(
        `Received ${data.length} chlorine records for region: ${selectedRegion}, filter: ${selectedCardFilter}`,
      );
      return data;
    },
  });

  // Fetch dashboard stats from API - we'll override these with local calculations
  const { data: apiDashboardStats, isLoading: isLoadingStats } =
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

  // Fetch scheme status data for filtering
  const { data: schemeStatusData = [], isLoading: isLoadingSchemeStatus } =
    useQuery<any[]>({
      queryKey: ["/api/schemes", selectedRegion],
      queryFn: async () => {
        const params = new URLSearchParams();

        if (selectedRegion && selectedRegion !== "all") {
          params.append("region", selectedRegion);
        }

        const queryString = params.toString();
        const url = `/api/schemes${queryString ? `?${queryString}` : ""}`;

        console.log("Fetching scheme status data with URL:", url);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch scheme status data");
        }

        const data = await response.json();
        console.log(`Received ${data.length} scheme status records`);
        return data;
      },
    });

  // Fetch historical chlorine data when dates change
  const {
    data: historicalChlorineData = [],
    isLoading: isLoadingHistorical,
    error: historicalError,
    refetch: refetchHistorical,
  } = useQuery<HistoricalChlorineData[]>({
    queryKey: ["/api/chlorine/historical", historicalStartDate, historicalEndDate, selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", historicalStartDate);
      params.append("endDate", historicalEndDate);
      
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      const queryString = params.toString();
      const url = `/api/chlorine/historical?${queryString}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch historical chlorine data");
      }

      const result = await response.json();
      return result.data || [];
    },
    enabled: showHistoricalData, // Only fetch when historical view is enabled
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

  // Handler for commissioned filter changes
  const handleCommissionedFilterChange = (value: string) => {
    setCommissionedFilter(value);

    // Track filter usage
    if (value !== "all") {
      trackFilterUsage("commissioned_status", value, filteredData.length, "chlorine_dashboard");
    }

    // If "Not Commissioned", maintain the fully completed filter value
    // We'll handle the filtering logic differently

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Handler for fully completed filter changes
  const handleFullyCompletedFilterChange = (value: string) => {
    setFullyCompletedFilter(value);

    // Track filter usage
    if (value !== "all") {
      trackFilterUsage("completion_status", value, filteredData.length, "chlorine_dashboard");
    }

    // If "Fully Completed", set "Commissioned" to "Yes" if not already set
    if (value === "Fully Completed" && commissionedFilter === "No") {
      // Automatically adjust the commissioned filter to allow the selection
      setCommissionedFilter("Yes");
    }

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Handler for scheme status filter changes
  const handleSchemeStatusFilterChange = (value: string) => {
    setSchemeStatusFilter(value);

    // Track filter usage
    if (value !== "all") {
      trackFilterUsage("iot_status", value, filteredData.length, "chlorine_dashboard");
    }

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Calculate dashboard stats locally based on filtered data
  // Apply global filters to data for both cards and table
  const globallyFilteredData = useMemo(() => {
    let filtered = [...allChlorineData];

    // Apply search filter if query exists
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.scheme_name?.toLowerCase().includes(query) ||
          item.region?.toLowerCase().includes(query) ||
          item.village_name?.toLowerCase().includes(query) ||
          item.esr_name?.toLowerCase().includes(query),
      );
    }

    // Double-check region filtering to ensure only data from selected region is shown
    if (selectedRegion && selectedRegion !== "all") {
      filtered = filtered.filter((item) => item.region === selectedRegion);
    }

    // Create a map of scheme IDs to their scheme status data for filtering
    const schemeStatusMap = new Map();
    if (schemeStatusData && schemeStatusData.length > 0) {
      schemeStatusData.forEach((status) => {
        schemeStatusMap.set(status.scheme_id, status);
      });
    }

    // Apply commissioned status filter
    if (commissionedFilter !== "all") {
      filtered = filtered.filter((item) => {
        // Get scheme status from the map using scheme_id
        const status = schemeStatusMap.get(item.scheme_id);
        return status && status.mjp_commissioned === commissionedFilter;
      });
    }
    
    // Apply fully completed filter
    if (fullyCompletedFilter !== "all") {
      filtered = filtered.filter((item) => {
        // Get scheme status from the map using scheme_id
        const status = schemeStatusMap.get(item.scheme_id);
        return status && status.mjp_fully_completed === fullyCompletedFilter;
      });
    }
    
    // Apply scheme status filter
    if (schemeStatusFilter !== "all") {
      filtered = filtered.filter((item) => {
        // Get scheme status from the map using scheme_id
        const status = schemeStatusMap.get(item.scheme_id);
        if (!status) return false;
        
        if (schemeStatusFilter === "Connected") {
          return status.fully_completion_scheme_status !== "Not-Connected";
        }
        return status.fully_completion_scheme_status === schemeStatusFilter;
      });
    }

    // No need for additional filtering here as global filters are already applied in globallyFilteredData
    
    return filtered;
  }, [allChlorineData, selectedRegion, searchQuery, commissionedFilter, fullyCompletedFilter, schemeStatusFilter, schemeStatusData]);
  
  // Calculate card statistics based on the globally filtered data
  const updatedCardStats = useMemo(() => {
    if (!apiDashboardStats) return null;
    
    // Start with a copy of the API stats
    const stats = {...apiDashboardStats};
    
    // Count values by category from the globally filtered data (respects all global filters)
    let totalSensors = 0;
    let belowRangeSensors = 0;
    let optimalRangeSensors = 0;
    let aboveRangeSensors = 0;
    let consistentZeroSensors = 0;
    let consistentBelowRangeSensors = 0;
    let consistentOptimalSensors = 0;
    let consistentAboveRangeSensors = 0;
    
    globallyFilteredData.forEach(item => {
      totalSensors++;
      
      const latestValue = getLatestChlorineValue(item);
      
      if (latestValue !== null) {
        if (latestValue < 0.2 && latestValue >= 0) {
          belowRangeSensors++;
        } else if (latestValue >= 0.2 && latestValue <= 0.5) {
          optimalRangeSensors++;
        } else if (latestValue > 0.5) {
          aboveRangeSensors++;
        }
      }
      
      // Count consistent readings
      if ((item.number_of_consistent_zero_value_in_chlorine || 0) === 7) {
        consistentZeroSensors++;
      }
      
      const values = [
        parseFloat(String(item.chlorine_value_1 || 0)),
        parseFloat(String(item.chlorine_value_2 || 0)),
        parseFloat(String(item.chlorine_value_3 || 0)),
        parseFloat(String(item.chlorine_value_4 || 0)),
        parseFloat(String(item.chlorine_value_5 || 0)),
        parseFloat(String(item.chlorine_value_6 || 0)),
        parseFloat(String(item.chlorine_value_7 || 0)),
      ];
      
      if (values.every(val => val > 0 && val < 0.2)) {
        consistentBelowRangeSensors++;
      } else if (values.every(val => val >= 0.2 && val <= 0.5)) {
        consistentOptimalSensors++;
      } else if (values.every(val => val > 0.5)) {
        consistentAboveRangeSensors++;
      }
    });
    
    return {
      ...stats,
      totalSensors,
      belowRangeSensors,
      optimalRangeSensors,
      aboveRangeSensors,
      consistentZeroSensors,
      consistentBelowRangeSensors,
      consistentOptimalSensors,
      consistentAboveRangeSensors
    };
  }, [apiDashboardStats, globallyFilteredData]);

  // Final data filtering - uses globally filtered data and applies card-specific filters
  const filteredData = useMemo(() => {
    // Start with the globally filtered data that affects both cards and table
    let filtered = [...globallyFilteredData];
    
    // Apply card-specific filter if selected (only affects table, not card values)
    if (selectedCardFilter && selectedCardFilter !== "all") {
      filtered = filtered.filter((item) => {
        const latestValue = getLatestChlorineValue(item);

        switch (selectedCardFilter) {
          case "below_0.2":
            return latestValue !== null && latestValue < 0.2 && latestValue >= 0;
          case "between_0.2_0.5":
            return (
              latestValue !== null && latestValue >= 0.2 && latestValue <= 0.5
            );
          case "above_0.5":
            return latestValue !== null && latestValue > 0.5;
          case "consistent_zero":
            return (item.number_of_consistent_zero_value_in_chlorine || 0) === 7;
          case "consistent_below":
            const belowValues = [
              parseFloat(String(item.chlorine_value_1 || 0)),
              parseFloat(String(item.chlorine_value_2 || 0)),
              parseFloat(String(item.chlorine_value_3 || 0)),
              parseFloat(String(item.chlorine_value_4 || 0)),
              parseFloat(String(item.chlorine_value_5 || 0)),
              parseFloat(String(item.chlorine_value_6 || 0)),
              parseFloat(String(item.chlorine_value_7 || 0)),
            ];
            return belowValues.every(val => val > 0 && val < 0.2);
          case "consistent_optimal":
            const optimalValues = [
              parseFloat(String(item.chlorine_value_1 || 0)),
              parseFloat(String(item.chlorine_value_2 || 0)),
              parseFloat(String(item.chlorine_value_3 || 0)),
              parseFloat(String(item.chlorine_value_4 || 0)),
              parseFloat(String(item.chlorine_value_5 || 0)),
              parseFloat(String(item.chlorine_value_6 || 0)),
              parseFloat(String(item.chlorine_value_7 || 0)),
            ];
            return optimalValues.every(val => val >= 0.2 && val <= 0.5);
          case "consistent_above":
            const aboveValues = [
              parseFloat(String(item.chlorine_value_1 || 0)),
              parseFloat(String(item.chlorine_value_2 || 0)),
              parseFloat(String(item.chlorine_value_3 || 0)),
              parseFloat(String(item.chlorine_value_4 || 0)),
              parseFloat(String(item.chlorine_value_5 || 0)),
              parseFloat(String(item.chlorine_value_6 || 0)),
              parseFloat(String(item.chlorine_value_7 || 0)),
            ];
            return aboveValues.every(val => val > 0.5);
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [globallyFilteredData, selectedCardFilter, showHistoricalData, historicalChlorineData, searchQuery]);

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
    setSelectedCardFilter(range);
    
    // Track card filter usage
    if (range !== "all") {
      trackFilterUsage("chlorine_range", getFilterTitle(range), filteredData.length, "chlorine_dashboard");
    }
    
    setPage(1); // Reset to first page when filter changes
  };

  // Handler for exporting historical chlorine data
  const exportHistoricalData = async () => {
    try {
      const params = new URLSearchParams();
      params.append("startDate", historicalStartDate);
      params.append("endDate", historicalEndDate);
      
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      const queryString = params.toString();
      const url = `/api/chlorine/export/historical?${queryString}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export historical data");
      }

      // Get the filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `Chlorine_Historical_Data_${historicalStartDate}_to_${historicalEndDate}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and trigger download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Track the export activity
      trackDataExport(
        "Chlorine Historical Data",
        filename,
        historicalChlorineData.length,
        { 
          dateRange: `${historicalStartDate} to ${historicalEndDate}`,
          region: selectedRegion !== "all" ? selectedRegion : undefined 
        },
        {
          exportSource: "chlorine_historical_dashboard",
          startDate: historicalStartDate,
          endDate: historicalEndDate
        }
      );

      toast({
        title: "Export Successful",
        description: `Historical chlorine data exported successfully`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export historical data",
        variant: "destructive",
      });
    }
  };

  // Function to export data to Excel
  const exportToExcel = (data: ChlorineData[], filename: string) => {
    try {
      // Helper function to format date for better readability in Excel
      const formatDateForHeader = (dateStr: string | null | undefined) => {
        if (!dateStr) return "N/A";
        try {
          const date = new Date(dateStr);
          return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          });
        } catch {
          return dateStr || "N/A";
        }
      };

      // Format data for Excel
      const worksheetData = data.map((item) => {
        const latestChlorine = getLatestChlorineValue(item);
        const { statusText } = getChlorineStatusInfo(latestChlorine);

        // Format dates for headers
        const date1 = formatDateForHeader(item.chlorine_date_day_1);
        const date2 = formatDateForHeader(item.chlorine_date_day_2);
        const date3 = formatDateForHeader(item.chlorine_date_day_3);
        const date4 = formatDateForHeader(item.chlorine_date_day_4);
        const date5 = formatDateForHeader(item.chlorine_date_day_5);
        const date6 = formatDateForHeader(item.chlorine_date_day_6);
        const date7 = formatDateForHeader(item.chlorine_date_day_7);

        return {
          "Scheme ID": item.scheme_id,
          "Scheme Name": item.scheme_name || "N/A",
          Region: item.region || "N/A",
          "Village Name": item.village_name || "N/A",
          "ESR Name": item.esr_name || "N/A",

          // Latest chlorine value
          "Latest Chlorine Value (mg/l)":
            latestChlorine !== null ? latestChlorine.toFixed(2) : "No data",
          Status: statusText,

          // Daily chlorine values with date headers
          [`Chlorine (${date1}) mg/l`]:
            item.chlorine_value_1 !== null &&
            item.chlorine_value_1 !== undefined
              ? Number(item.chlorine_value_1).toFixed(2)
              : "N/A",
          [`Chlorine (${date2}) mg/l`]:
            item.chlorine_value_2 !== null &&
            item.chlorine_value_2 !== undefined
              ? Number(item.chlorine_value_2).toFixed(2)
              : "N/A",
          [`Chlorine (${date3}) mg/l`]:
            item.chlorine_value_3 !== null &&
            item.chlorine_value_3 !== undefined
              ? Number(item.chlorine_value_3).toFixed(2)
              : "N/A",
          [`Chlorine (${date4}) mg/l`]:
            item.chlorine_value_4 !== null &&
            item.chlorine_value_4 !== undefined
              ? Number(item.chlorine_value_4).toFixed(2)
              : "N/A",
          [`Chlorine (${date5}) mg/l`]:
            item.chlorine_value_5 !== null &&
            item.chlorine_value_5 !== undefined
              ? Number(item.chlorine_value_5).toFixed(2)
              : "N/A",
          [`Chlorine (${date6}) mg/l`]:
            item.chlorine_value_6 !== null &&
            item.chlorine_value_6 !== undefined
              ? Number(item.chlorine_value_6).toFixed(2)
              : "N/A",
          [`Chlorine (${date7}) mg/l`]:
            item.chlorine_value_7 !== null &&
            item.chlorine_value_7 !== undefined
              ? Number(item.chlorine_value_7).toFixed(2)
              : "N/A",

          // Analysis data
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
      const finalFilename = `${filename}.xlsx`;
      XLSX.writeFile(workbook, finalFilename);

      // Track the data export activity with detailed filter information
      const appliedFilters = {
        region: selectedRegion !== "all" ? selectedRegion : undefined,
        cardFilter: selectedCardFilter !== "all" ? selectedCardFilter : undefined,
        searchTerm: searchQuery || undefined,
        commissionedStatus: commissionedFilter !== "all" ? commissionedFilter : undefined,
        completionStatus: fullyCompletedFilter !== "all" ? fullyCompletedFilter : undefined,
        iotStatus: schemeStatusFilter !== "all" ? schemeStatusFilter : undefined
      };

      // Clean up undefined values for tracking
      const cleanedFilters = Object.fromEntries(
        Object.entries(appliedFilters).filter(([_, value]) => value !== undefined)
      );

      trackDataExport(
        "Chlorine Data",
        finalFilename,
        worksheetData.length,
        cleanedFilters,
        {
          exportSource: "chlorine_dashboard",
          totalRecordsAvailable: allChlorineData.length,
          filteredRecords: data.length
        }
      );

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
      {/* Header with Date */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          <TranslatedText>Chlorine Dashboard</TranslatedText>
        </h1>
        <p className="text-gray-500 mt-1">
          <TranslatedText>Monitor residual chlorine levels across water schemes and ESRs</TranslatedText>
        </p>
        <p className="text-sm text-blue-600 font-medium mt-2">
          <TranslatedText>Dashboard Updated</TranslatedText>: {new Date().toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })} <TranslatedText>at</TranslatedText> {new Date().toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>

      {/* Region Filter */}
      <div className="bg-white rounded-xl shadow-md mb-6 p-4 border border-blue-100">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TranslatedText>Select Region</TranslatedText>
            </label>
            <Select
              value={selectedRegion}
              onValueChange={(value) => {
                setSelectedRegion(value);
                setPage(1);
                // Track filter usage
                if (value !== "all") {
                  trackFilterUsage("region", value, undefined, "chlorine_dashboard");
                }
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

          {/* Commissioned Status Filter */}
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commissioned Status
            </label>
            <Select
              value={commissionedFilter}
              onValueChange={handleCommissionedFilterChange}
            >
              <SelectTrigger className="bg-white border border-blue-200 shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Yes">Commissioned</SelectItem>
                <SelectItem value="No">Not Commissioned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fully Completed Filter */}
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Completion Status
            </label>
            <Select
              value={fullyCompletedFilter}
              onValueChange={handleFullyCompletedFilterChange}
              disabled={false} // Never disable the filter, we'll handle the logic in filtering
            >
              <SelectTrigger className="bg-white border border-blue-200 shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Fully Completed">Fully Completed</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scheme Status Filter */}
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IoT Status
            </label>
            <Select
              value={schemeStatusFilter}
              onValueChange={handleSchemeStatusFilterChange}
            >
              <SelectTrigger className="bg-white border border-blue-200 shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="All IoT Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All IoT Status</SelectItem>
                <SelectItem value="Connected">Connected</SelectItem>
                <SelectItem value="Fully Completed">Fully Completed</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Not-Connected">Not Connected</SelectItem>
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
                  const newValue = e.target.value;
                  setSearchQuery(newValue);
                  setPage(1); // Reset to first page on search
                  
                  // Track search activity after user stops typing (debounced)
                  if (newValue.trim().length > 2) {
                    setTimeout(() => {
                      if (searchQuery === newValue) { // Only track if value hasn't changed
                        trackFilterUsage("search", newValue, filteredData.length, "chlorine_dashboard");
                      }
                    }, 1000);
                  }
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
                  `Chlorine_Data_${selectedRegion}_${selectedCardFilter}_${new Date().toISOString().split("T")[0]}`,
                )
              }
              variant="outline"
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Excel
              {filteredData.length > 0 ? ` (${filteredData.length})` : ""}
            </Button>
            <Button
              onClick={() => setShowHistoricalData(!showHistoricalData)}
              variant={showHistoricalData ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              {showHistoricalData ? "Current Data" : "Historical Data"}
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

        {/* Historical Data Date Selection */}
        {showHistoricalData && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Select Date Range for Historical Data
                </span>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Start Date</label>
                  <Input
                    type="date"
                    value={historicalStartDate}
                    onChange={(e) => setHistoricalStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">End Date</label>
                  <Input
                    type="date"
                    value={historicalEndDate}
                    onChange={(e) => setHistoricalEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>

                <Button
                  onClick={() => refetchHistorical()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 mt-4 md:mt-0"
                  disabled={isLoadingHistorical}
                >
                  <TrendingUp className="h-4 w-4" />
                  Query Historical Data
                </Button>

                <Button
                  onClick={exportHistoricalData}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2 mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoadingHistorical}
                >
                  <Download className="h-4 w-4" />
                  Export to Excel ({updatedCardStats?.totalSensors || 0})
                </Button>
              </div>
            </div>

            {historicalChlorineData.length > 0 && (
              <div className="mt-3 text-sm text-green-700">
                Found {historicalChlorineData.length} historical records
                ({historicalStartDate} to {historicalEndDate})
              </div>
            )}

            {historicalError && (
              <div className="mt-3 text-sm text-red-700">
                Error loading historical data. Please try again.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        {/* Total Sensors Card */}
        <Card
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            selectedCardFilter === "all" ? "ring-2 ring-teal-500 ring-offset-2" : ""
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick("all")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-white"></div>
          <div className="absolute bottom-0 right-0 opacity-10">
            <div className="h-24 w-24 text-teal-500 flex items-center justify-center">
              <span className="text-5xl font-bold">Cl</span>
            </div>
          </div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg font-bold text-teal-800 flex items-center">
              <div className="h-5 w-8 text-teal-600 mr-2 flex items-center justify-center bg-teal-50 rounded">
                <span className="text-xs font-bold">Cl</span>
              </div>
              Total Connected ESRs
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-5xl font-bold text-teal-600">
              {updatedCardStats?.totalSensors || 0}
            </p>
            <p className="text-sm text-teal-600/80 mt-2 font-medium">
              Total chlorine sensors connected
            </p>
          </CardContent>
        </Card>

        {/* Below Range Card */}
        <Card
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            selectedCardFilter === "below_0.2"
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
              {updatedCardStats?.belowRangeSensors || 0}
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
            selectedCardFilter === "between_0.2_0.5"
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
              {updatedCardStats?.optimalRangeSensors || 0}
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
            selectedCardFilter === "above_0.5"
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
              {updatedCardStats?.aboveRangeSensors || 0}
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
            selectedCardFilter === "consistent_zero"
              ? "ring-2 ring-gray-500 ring-offset-2"
              : ""
          }`}
          onClick={() => handleCardClick("consistent_zero")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-gray-700 flex items-center">
              <div className="h-5 w-7 text-gray-600 mr-2 flex items-center justify-center bg-gray-50 rounded">
                <span className="text-xs font-bold">Cl</span>
              </div>
              Consistent Zero Chlorine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-700">
              {updatedCardStats?.consistentZeroSensors || 0}
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
            selectedCardFilter === "consistent_below"
              ? "ring-2 ring-red-500 ring-offset-2"
              : ""
          }`}
          onClick={() => handleCardClick("consistent_below")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-red-700 flex items-center">
              <div className="h-5 w-7 text-red-600 mr-2 flex items-center justify-center bg-red-50 rounded">
                <span className="text-xs font-bold">Cl</span>
              </div>
              Consistent Below Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {updatedCardStats?.consistentBelowRangeSensors || 0}
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
            selectedCardFilter === "consistent_optimal"
              ? "ring-2 ring-green-500 ring-offset-2"
              : ""
          }`}
          onClick={() => handleCardClick("consistent_optimal")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-green-700 flex items-center">
              <div className="h-5 w-7 text-green-600 mr-2 flex items-center justify-center bg-green-50 rounded">
                <span className="text-xs font-bold">Cl</span>
              </div>
              Consistent Optimal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {updatedCardStats?.consistentOptimalSensors || 0}
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
            selectedCardFilter === "consistent_above"
              ? "ring-2 ring-orange-500 ring-offset-2"
              : ""
          }`}
          onClick={() => handleCardClick("consistent_above")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-orange-700 flex items-center">
              <div className="h-5 w-7 text-orange-600 mr-2 flex items-center justify-center bg-orange-50 rounded">
                <span className="text-xs font-bold">Cl</span>
              </div>
              Consistent Above Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {updatedCardStats?.consistentAboveRangeSensors || 0}
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
          <div className="flex flex-col space-y-3">
            {/* Main Title */}
            <CardTitle className="flex items-center gap-2">
              {selectedCardFilter === "below_0.2" && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              {selectedCardFilter === "between_0.2_0.5" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {selectedCardFilter === "above_0.5" && (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
              {selectedCardFilter === "consistent_zero" && (
                <Activity className="h-5 w-5 text-gray-600" />
              )}
              {selectedCardFilter === "consistent_below" && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              {selectedCardFilter === "consistent_optimal" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {selectedCardFilter === "consistent_above" && (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
              {getFilterTitle(selectedCardFilter)}
              <span className="ml-2 px-2 py-1 bg-blue-100 rounded-full text-blue-800 text-sm font-medium">
                {filteredData.length} {filteredData.length === 1 ? "ESR" : "ESRs"} found
              </span>
            </CardTitle>
            
            {/* Filter badges row */}
            {(commissionedFilter !== "all" || fullyCompletedFilter !== "all" || schemeStatusFilter !== "all") && (
              <div className="flex flex-wrap gap-2 text-sm">
                {commissionedFilter !== "all" && (
                  <div className="border px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {commissionedFilter === "Yes" ? "Commissioned" : "Not Commissioned"}: 
                    <span className="font-bold ml-1">{
                      filteredData.filter(item => {
                        const status = schemeStatusData?.find(s => s.scheme_id === item.scheme_id);
                        return status && status.mjp_commissioned === commissionedFilter;
                      }).length
                    }</span>
                  </div>
                )}
                
                {fullyCompletedFilter !== "all" && (
                  <div className="border px-3 py-1 rounded-full bg-green-50 text-green-700 font-medium">
                    {fullyCompletedFilter}: 
                    <span className="font-bold ml-1">{
                      filteredData.filter(item => {
                        const status = schemeStatusData?.find(s => s.scheme_id === item.scheme_id);
                        return status && status.mjp_fully_completed === fullyCompletedFilter;
                      }).length
                    }</span>
                  </div>
                )}
                
                {schemeStatusFilter !== "all" && (
                  <div className="border px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">
                    {schemeStatusFilter === "Connected" ? "Connected" : schemeStatusFilter}: 
                    <span className="font-bold ml-1">{
                      filteredData.filter(item => {
                        const status = schemeStatusData?.find(s => s.scheme_id === item.scheme_id);
                        return status && (schemeStatusFilter === "Connected" ? 
                          status.fully_completion_scheme_status !== "Not-Connected" :
                          status.fully_completion_scheme_status === schemeStatusFilter);
                      }).length
                    }</span>
                  </div>
                )}
              </div>
            )}
          </div>
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
                {/* Results count */}
                <div className="mb-4 text-sm text-gray-600 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  {!isLoadingChlorine && (
                    <>
                      <div className="flex items-center">
                        <span className="font-semibold">
                          {filteredData.length}
                        </span>
                        <span className="ml-1">
                          {filteredData.length === 1 ? "ESR" : "ESRs"} found
                        </span>
                        {(selectedCardFilter !== "all" ||
                          selectedRegion !== "all" ||
                          commissionedFilter !== "all" ||
                          fullyCompletedFilter !== "all" ||
                          schemeStatusFilter !== "all") && (
                          <span className="ml-1">with applied filters</span>
                        )}
                      </div>

                      {/* Filter details */}
                      <div className="mt-2 sm:mt-0 text-xs flex flex-wrap gap-2">
                        {commissionedFilter !== "all" && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                            {commissionedFilter === "Yes"
                              ? "Commissioned"
                              : "Not Commissioned"}
                            :
                            <span className="font-semibold ml-1">
                              {
                                filteredData.filter((item) => {
                                  const status = schemeStatusData?.find(
                                    (s) => s.scheme_id === item.scheme_id,
                                  );
                                  return (
                                    status &&
                                    status.mjp_commissioned ===
                                      commissionedFilter
                                  );
                                }).length
                              }
                            </span>
                          </span>
                        )}

                        {fullyCompletedFilter !== "all" && (
                          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md">
                            {fullyCompletedFilter}:
                            <span className="font-semibold ml-1">
                              {
                                filteredData.filter((item) => {
                                  const status = schemeStatusData?.find(
                                    (s) => s.scheme_id === item.scheme_id,
                                  );
                                  return (
                                    status &&
                                    status.mjp_fully_completed ===
                                      fullyCompletedFilter
                                  );
                                }).length
                              }
                            </span>
                          </span>
                        )}

                        {schemeStatusFilter !== "all" && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md">
                            {schemeStatusFilter === "Connected"
                              ? "Connected"
                              : schemeStatusFilter}
                            :
                            <span className="font-semibold ml-1">
                              {
                                filteredData.filter((item) => {
                                  const status = schemeStatusData?.find(
                                    (s) => s.scheme_id === item.scheme_id,
                                  );
                                  return (
                                    status &&
                                    (schemeStatusFilter === "Connected"
                                      ? status.fully_completion_scheme_status !==
                                        "Not-Connected"
                                      : status.fully_completion_scheme_status ===
                                        schemeStatusFilter)
                                  );
                                }).length
                              }
                            </span>
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <Table className="border-collapse">
                  <TableHeader className="bg-blue-50">
                    <TableRow className="chlorine-item hover:bg-blue-100">
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        Region
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        Scheme ID
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        Scheme Name
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        Village
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        ESR Name
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        Latest Chlorine (mg/l)
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        PI Vision
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
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

                      // Add alternating row colors
                      const isEven = index % 2 === 0;
                      const baseRowClass = isEven ? "bg-white" : "bg-blue-50";

                      return (
                        <TableRow
                          key={`${item.scheme_id}-${item.village_name}-${item.esr_name}-${index}`}
                          className={`chlorine-item ${baseRowClass} hover:bg-blue-100`}
                        >
                          <TableCell className="font-medium border-b border-blue-200">
                            {item.region}
                          </TableCell>
                          <TableCell className="font-mono text-sm border-b border-blue-200">
                            {item.scheme_id}
                          </TableCell>
                          <TableCell className="border-b border-blue-200">
                            {item.scheme_name}
                          </TableCell>
                          <TableCell className="border-b border-blue-200">
                            {item.village_name}
                          </TableCell>
                          <TableCell className="border-b border-blue-200">
                            {item.esr_name}
                          </TableCell>
                          <TableCell className="font-medium border-b border-blue-200">
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

                          <TableCell className="border-b border-blue-200">
                            <Badge
                              className={`${className} ${textColor} flex items-center gap-1 w-fit shadow-sm border`}
                            >
                              {icon} {statusText}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-b border-blue-200">
                            {item.dashboard_url ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="py-1 px-2 h-8 text-xs"
                                onClick={() => {
                                  // Track external dashboard access
                                  trackDashboardAccess(item.dashboard_url!, "PI Vision Chlorine Dashboard");
                                  window.open(item.dashboard_url, "_blank");
                                }}
                              >
                                <BarChart className="h-3.5 w-3.5 mr-1" /> View
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">
                                Not available
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="border-b border-blue-200">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:bg-blue-50 hover:text-blue-700 transition-colors rounded-full"
                                  onClick={() => setSelectedESR(item)}
                                >
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl bg-white">
                                {selectedESR && (
                                  <>
                                    <DialogHeader>
                                      <DialogTitle className="text-xl font-bold flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                                            <span className="font-bold text-teal-600">
                                              Cl
                                            </span>
                                          </div>
                                          <span>
                                            {selectedESR.esr_name} -{" "}
                                            {selectedESR.village_name}
                                          </span>
                                          {selectedESR.dashboard_url && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="ml-2 text-xs"
                                              onClick={() => {
                                                trackDashboardAccess(selectedESR.dashboard_url!, "PI Vision Chlorine Dashboard Detail");
                                                window.open(
                                                  selectedESR.dashboard_url,
                                                  "_blank",
                                                );
                                              }}
                                            >
                                              <BarChart className="h-4 w-4 mr-1" />{" "}
                                              PI Vision Dashboard
                                            </Button>
                                          )}
                                        </div>
                                      </DialogTitle>
                                      <DialogDescription>
                                        Detailed chlorine monitoring data for
                                        this ESR
                                      </DialogDescription>
                                    </DialogHeader>

                                    <div className="py-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="bg-teal-50/50 rounded-lg p-4 border border-teal-100">
                                          <h3 className="text-sm font-medium text-teal-800 mb-3">
                                            ESR Information
                                          </h3>

                                          <div className="space-y-3">
                                            <div className="flex justify-between items-center border-b border-teal-100 pb-2">
                                              <span className="text-sm text-teal-700">
                                                Region
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.region}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-teal-100 pb-2">
                                              <span className="text-sm text-teal-700">
                                                Scheme ID
                                              </span>
                                              <span className="font-medium font-mono">
                                                {selectedESR.scheme_id}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-teal-100 pb-2">
                                              <span className="text-sm text-teal-700">
                                                Scheme
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.scheme_name}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-teal-100 pb-2">
                                              <span className="text-sm text-teal-700">
                                                Village
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.village_name}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-teal-100 pb-2">
                                              <span className="text-sm text-teal-700">
                                                Sensor ID
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.sensor_id || "N/A"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-teal-50 to-white rounded-lg p-4 border border-teal-100 flex flex-col">
                                          <h3 className="text-sm font-medium text-teal-800 mb-3">
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
                                        <h3 className="font-medium text-lg mb-4 text-teal-800 flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                                            <div className="h-3 w-3 text-teal-600 text-[10px] font-bold">
                                              Cl
                                            </div>
                                          </div>
                                          7-Day Chlorine History
                                        </h3>
                                        <div className="grid grid-cols-7 gap-3">
                                          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
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
                                                    Day {day}
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
                                      
                                      {/* Add 7-Day Analysis section */}
                                      <div className="border-t border-gray-200 pt-6 mt-6">
                                        <h3 className="font-medium text-lg mb-4 text-teal-800 flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                                            <div className="h-3 w-3 text-teal-600 text-[10px] font-bold">
                                              Cl
                                            </div>
                                          </div>
                                          7-Day Analysis
                                        </h3>
                                        <div className="grid grid-cols-4 gap-4">
                                          <div className="bg-red-50 p-4 rounded-md border border-red-100 text-center">
                                            <div className="text-sm text-red-700 mb-1">
                                              Below Range Days
                                            </div>
                                            <div className="font-semibold text-2xl text-red-600">
                                              {(() => {
                                                let count = 0;
                                                for (let day = 1; day <= 7; day++) {
                                                  const value = selectedESR[`chlorine_value_${day}` as keyof ChlorineData];
                                                  const numValue = value !== undefined && value !== null ? Number(value) : null;
                                                  if (numValue !== null && numValue >= 0 && numValue < 0.2) {
                                                    count++;
                                                  }
                                                }
                                                return count;
                                              })()}
                                            </div>
                                          </div>
                                          
                                          <div className="bg-green-50 p-4 rounded-md border border-green-100 text-center">
                                            <div className="text-sm text-green-700 mb-1">
                                              Optimal Range Days
                                            </div>
                                            <div className="font-semibold text-2xl text-green-600">
                                              {(() => {
                                                let count = 0;
                                                for (let day = 1; day <= 7; day++) {
                                                  const value = selectedESR[`chlorine_value_${day}` as keyof ChlorineData];
                                                  const numValue = value !== undefined && value !== null ? Number(value) : null;
                                                  if (numValue !== null && numValue >= 0.2 && numValue <= 0.5) {
                                                    count++;
                                                  }
                                                }
                                                return count;
                                              })()}
                                            </div>
                                          </div>
                                          
                                          <div className="bg-orange-50 p-4 rounded-md border border-orange-100 text-center">
                                            <div className="text-sm text-orange-700 mb-1">
                                              Above Range Days
                                            </div>
                                            <div className="font-semibold text-2xl text-orange-600">
                                              {(() => {
                                                let count = 0;
                                                for (let day = 1; day <= 7; day++) {
                                                  const value = selectedESR[`chlorine_value_${day}` as keyof ChlorineData];
                                                  const numValue = value !== undefined && value !== null ? Number(value) : null;
                                                  if (numValue !== null && numValue > 0.5) {
                                                    count++;
                                                  }
                                                }
                                                return count;
                                              })()}
                                            </div>
                                          </div>
                                          
                                          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-center">
                                            <div className="text-sm text-gray-700 mb-1">
                                              Zero Chlorine Days
                                            </div>
                                            <div className="font-semibold text-2xl text-gray-600">
                                              {(() => {
                                                let count = 0;
                                                for (let day = 1; day <= 7; day++) {
                                                  const value = selectedESR[`chlorine_value_${day}` as keyof ChlorineData];
                                                  const numValue = value !== undefined && value !== null ? Number(value) : null;
                                                  if (numValue === 0) {
                                                    count++;
                                                  }
                                                }
                                                return count;
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Add PI Vision Dashboard section */}
                                      {selectedESR.dashboard_url && (
                                        <div className="border-t border-gray-200 pt-6 mt-6">
                                          <h3 className="font-medium text-lg mb-4 text-blue-800 flex items-center gap-2">
                                            <BarChart className="h-5 w-5 text-blue-600" />
                                            PI Vision Dashboard
                                          </h3>
                                          <p className="text-sm text-gray-600 mb-4">
                                            View detailed historical chlorine data in PI Vision
                                          </p>
                                          <Button 
                                            variant="outline" 
                                            onClick={() => window.open(selectedESR.dashboard_url, '_blank')}
                                            className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                          >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Open Dashboard
                                          </Button>
                                        </div>
                                      )}
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
