import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useComprehensiveActivityTracker } from "@/hooks/use-comprehensive-activity-tracker";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  X,
  BarChart,
  BarChart2 as BarChart3,
  BarChartHorizontal as ChartBarOff,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  History,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination } from "@/components/ui/pagination";
import * as XLSX from "xlsx";

// Types
export interface WaterSchemeData {
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  population: number;
  number_of_esr: number;
  water_value_day1: number;
  water_value_day2: number;
  water_value_day3: number;
  water_value_day4: number;
  water_value_day5: number;
  water_value_day6: number;
  water_value_day7: number;
  lpcd_value_day1: number;
  lpcd_value_day2: number;
  lpcd_value_day3: number;
  lpcd_value_day4: number;
  lpcd_value_day5: number;
  lpcd_value_day6: number;
  lpcd_value_day7: number;
  water_date_day1: string;
  water_date_day2: string;
  water_date_day3: string;
  water_date_day4: string;
  water_date_day5: string;
  water_date_day6: string;
  water_date_day7: string;
  lpcd_date_day1: string;
  lpcd_date_day2: string;
  lpcd_date_day3: string;
  lpcd_date_day4: string;
  lpcd_date_day5: string;
  lpcd_date_day6: string;
  lpcd_date_day7: string;
  consistent_zero_lpcd_for_a_week: number;
  below_55_lpcd_count: number;
  above_55_lpcd_count: number;
  dashboard_url?: string;
  mjp_commissioned?: string;
  mjp_fully_completed?: string;
  fully_completion_scheme_status?: string;
}

export interface RegionData {
  region_id: number;
  region_name: string;
}

type LpcdRange =
  | "all"
  | "above55"
  | "below55"
  | "45to55"
  | "35to45"
  | "25to35"
  | "15to25"
  | "0to15"
  | "noSupply" // Filter for villages with 0 water supply
  | "55to60"
  | "60to65"
  | "65to70"
  | "70to75" // Range for LPCD between 70-75
  | "75to80" // Range for LPCD between 75-80
  | "above80" // Range for LPCD above 80
  | "above70"
  | "consistentlyAbove55"
  | "consistentlyBelow55";

const EnhancedLpcdDashboard = () => {
  const { toast } = useToast();
  const { trackPageVisit, trackDataExport, trackFilterUsage, trackFileDownload } = useComprehensiveActivityTracker();

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [currentFilter, setCurrentFilter] = useState<LpcdRange>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [commissionedFilter, setCommissionedFilter] = useState<string>("all");
  const [fullyCompletedFilter, setFullyCompletedFilter] =
    useState<string>("all");
  const [schemeStatusFilter, setSchemeStatusFilter] = useState<string>("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Historical data state
  const [showHistoricalData, setShowHistoricalData] = useState(false);
  const [historicalStartDate, setHistoricalStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to 30 days ago
    return date.toISOString().split('T')[0];
  });
  const [historicalEndDate, setHistoricalEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Village LPCD Dashboard");
  }, [trackPageVisit]);

  // Listen for filter changes from chatbot
  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Enhanced LPCD Dashboard received region filter:", region);
      const newRegion = region === 'all' ? 'all' : region;
      setSelectedRegion(newRegion);
      setPage(1);
    };

    const handleMjpCommissionedFilterChange = (event: CustomEvent) => {
      const { mjpCommissioned } = event.detail;
      console.log("Enhanced LPCD Dashboard received MJP commissioned filter:", mjpCommissioned);
      setCommissionedFilter(mjpCommissioned ? "true" : "all");
      setPage(1);
    };

    const handleMjpFullyCompletedFilterChange = (event: CustomEvent) => {
      const { mjpFullyCompleted } = event.detail;
      console.log("Enhanced LPCD Dashboard received MJP fully completed filter:", mjpFullyCompleted);
      setFullyCompletedFilter(mjpFullyCompleted ? "true" : "all");
      setPage(1);
    };

    const handleStatusFilterChange = (event: CustomEvent) => {
      const { status } = event.detail;
      console.log("Enhanced LPCD Dashboard received status filter:", status);
      if (status === "fully_completed") {
        setSchemeStatusFilter("Fully Completed");
      } else if (status === "in_progress") {
        setSchemeStatusFilter("In Progress");
      } else if (status === "connected") {
        setSchemeStatusFilter("Connected");
      } else if (status === "not_connected") {
        setSchemeStatusFilter("Not-Connected");
      } else {
        setSchemeStatusFilter("all");
      }
      setPage(1);
    };

    window.addEventListener('regionFilterChange', handleRegionFilterChange as EventListener);
    window.addEventListener('mjpCommissionedFilterChange', handleMjpCommissionedFilterChange as EventListener);
    window.addEventListener('mjpFullyCompletedFilterChange', handleMjpFullyCompletedFilterChange as EventListener);
    window.addEventListener('statusFilterChange', handleStatusFilterChange as EventListener);
    
    return () => {
      window.removeEventListener('regionFilterChange', handleRegionFilterChange as EventListener);
      window.removeEventListener('mjpCommissionedFilterChange', handleMjpCommissionedFilterChange as EventListener);
      window.removeEventListener('mjpFullyCompletedFilterChange', handleMjpFullyCompletedFilterChange as EventListener);
      window.removeEventListener('statusFilterChange', handleStatusFilterChange as EventListener);
    };
  }, []);

  // Fetch all water scheme data
  const {
    data: allWaterSchemeData = [],
    isLoading: isLoadingSchemes,
    error: schemesError,
    refetch,
  } = useQuery<WaterSchemeData[]>({
    queryKey: ["/api/water-scheme-data", selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      const queryString = params.toString();
      const url = `/api/water-scheme-data${
        queryString ? `?${queryString}` : ""
      }`;

      console.log("Fetching LPCD data with URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch LPCD data");
      }

      const data = await response.json();
      console.log(`Received ${data.length} LPCD records`);
      return data;
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

  // Historical LPCD data query
  const {
    data: historicalLpcdData = [],
    isLoading: isLoadingHistorical,
    error: historicalError,
    refetch: refetchHistorical,
  } = useQuery<any[]>({
    queryKey: ["/api/water-scheme-data/historical", historicalStartDate, historicalEndDate, selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", historicalStartDate);
      params.append("endDate", historicalEndDate);
      
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      const url = `/api/water-scheme-data/historical?${params.toString()}`;
      console.log("Fetching historical LPCD data with URL:", url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch historical LPCD data");
      }

      const data = await response.json();
      console.log(`Received ${data.length} historical LPCD records`);
      return data;
    },
    enabled: showHistoricalData, // Only fetch when historical data is requested
  });

  // Get latest LPCD value
  const getLatestLpcdValue = (scheme: WaterSchemeData): number | null => {
    // Try to get the latest non-null value
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
      const value = scheme[`lpcd_value_day${day}` as keyof WaterSchemeData];
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

  // Get latest water supply value
  const getLatestWaterSupplyValue = (
    scheme: WaterSchemeData,
  ): number | null => {
    // Try to get the latest non-null water supply value
    for (const day of [6, 5, 4, 3, 2, 1]) {
      const value = scheme[`water_value_day${day}` as keyof WaterSchemeData];
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

  // Check if a scheme has zero water supply for the current day
  const hasNoCurrentWaterSupply = (scheme: WaterSchemeData): boolean => {
    // Get the most recent water supply value
    const currentWaterSupply = getLatestWaterSupplyValue(scheme);

    // Return true if it's explicitly 0
    return currentWaterSupply !== null && currentWaterSupply === 0;
  };

  // Extract all LPCD values
  const extractLpcdValues = (scheme: WaterSchemeData): number[] => {
    return [
      scheme.lpcd_value_day1,
      scheme.lpcd_value_day2,
      scheme.lpcd_value_day3,
      scheme.lpcd_value_day4,
      scheme.lpcd_value_day5,
      scheme.lpcd_value_day6,
      scheme.lpcd_value_day7,
    ]
      .filter((val) => val !== undefined && val !== null && !isNaN(Number(val)))
      .map((val) => Number(val));
  };

  // Check if all values are consistently above/below threshold
  const isConsistentlyAboveThreshold = (
    scheme: WaterSchemeData,
    threshold: number,
  ): boolean => {
    const values = extractLpcdValues(scheme);
    if (values.length === 0) return false;
    return values.every((val) => val > threshold);
  };

  const isConsistentlyBelowThreshold = (
    scheme: WaterSchemeData,
    threshold: number,
  ): boolean => {
    const values = extractLpcdValues(scheme);
    if (values.length === 0) return false;
    return values.every((val) => val < threshold);
  };

  // Get globally filtered data for card statistics
  const getGloballyFilteredSchemes = () => {
    if (!allWaterSchemeData) return [];

    let filtered = [...allWaterSchemeData];

    // Apply search query filter (for scheme name or village name)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (scheme) =>
          scheme.scheme_name?.toLowerCase().includes(query) ||
          scheme.village_name?.toLowerCase().includes(query),
      );
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
      filtered = filtered.filter((scheme) => {
        // Get scheme status from the map using scheme_id
        const status = schemeStatusMap.get(scheme.scheme_id);
        return status && status.mjp_commissioned === commissionedFilter;
      });
    }

    // Apply fully completed filter
    if (fullyCompletedFilter !== "all") {
      filtered = filtered.filter((scheme) => {
        // Get scheme status from the map using scheme_id
        const status = schemeStatusMap.get(scheme.scheme_id);
        return status && status.mjp_fully_completed === fullyCompletedFilter;
      });
    }

    // Apply scheme status filter
    if (schemeStatusFilter !== "all") {
      filtered = filtered.filter((scheme) => {
        // Get scheme status from the map using scheme_id
        const status = schemeStatusMap.get(scheme.scheme_id);
        if (!status) return false;

        if (schemeStatusFilter === "Connected") {
          return status.fully_completion_scheme_status !== "Not-Connected";
        }
        return status.fully_completion_scheme_status === schemeStatusFilter;
      });
    }

    return filtered;
  };

  // Apply filters for table display (global filters + card selection)
  const getFilteredSchemes = () => {
    // Start with globally filtered data
    let filtered = getGloballyFilteredSchemes();

    // Apply LPCD range filter based on card selection
    switch (currentFilter) {
      case "all":
        // No additional filtering needed
        break;
      case "above55":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue > 55;
        });
        break;
      case "below55":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue > 0 && lpcdValue < 55;
        });
        break;
      case "45to55":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 45 && lpcdValue < 55;
        });
        break;
      case "35to45":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 35 && lpcdValue < 45;
        });
        break;
      case "25to35":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 25 && lpcdValue < 35;
        });
        break;
      case "15to25":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 15 && lpcdValue < 25;
        });
        break;
      case "0to15":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 0 && lpcdValue < 15;
        });
        break;
      case "noSupply":
        filtered = filtered.filter((scheme) => hasNoCurrentWaterSupply(scheme));
        break;
      case "55to60":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 55 && lpcdValue < 60;
        });
        break;
      case "60to65":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 60 && lpcdValue < 65;
        });
        break;
      case "65to70":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 65 && lpcdValue < 70;
        });
        break;
      case "70to75":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 70 && lpcdValue < 75;
        });
        break;
      case "75to80":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 75 && lpcdValue < 80;
        });
        break;
      case "above80":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 80;
        });
        break;
      case "above70":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 70;
        });
        break;
      case "consistentlyAbove55":
        filtered = filtered.filter((scheme) =>
          isConsistentlyAboveThreshold(scheme, 55),
        );
        break;
      case "consistentlyBelow55":
        filtered = filtered.filter((scheme) =>
          isConsistentlyBelowThreshold(scheme, 55),
        );
        break;
    }

    return filtered;
  };

  // Calculate filter counts using globally filtered data with proper deduplication
  const getFilterCounts = () => {
    // Get the globally filtered data for calculating card statistics
    const globallyFilteredData = getGloballyFilteredSchemes();

    const counts = {
      total: 0,
      above55: 0,
      below55: 0,
      totalPopulation: 0,
      above55Population: 0,
      below55Population: 0,
      ranges: {
        "45to55": 0,
        "35to45": 0,
        "25to35": 0,
        "15to25": 0,
        "0to15": 0,
        "55to60": 0,
        "60to65": 0,
        "65to70": 0,
        "70to75": 0,
        "75to80": 0,
        above80: 0,
        above70: 0,
      },
      consistentlyAbove55: 0,
      consistentlyBelow55: 0,
    };

    if (globallyFilteredData.length === 0) return counts;

    // Create a map to track unique villages by scheme_id+village_name (correct unique key)
    const uniqueVillages = new Map();
    
    // First pass: deduplicate villages and collect unique entries
    globallyFilteredData.forEach((scheme) => {
      const villageKey = `${scheme.scheme_id}|${scheme.village_name}`;
      
      // Only keep the first occurrence of each unique village
      if (!uniqueVillages.has(villageKey)) {
        uniqueVillages.set(villageKey, scheme);
      }
    });

    // Set total to unique village count
    counts.total = uniqueVillages.size;

    // Count unique villages in each category
    uniqueVillages.forEach((scheme) => {
      const lpcdValue = getLatestLpcdValue(scheme);
      const population = scheme.population ? Number(scheme.population) : 0;

      // Add to total population
      counts.totalPopulation += population;

      // Count all entries into above/below categories
      // If lpcdValue > 55, it's above55, otherwise (null, 0, or < 55) it's below55
      if (lpcdValue !== null && lpcdValue > 55) {
        counts.above55++;
        counts.above55Population += population;
      } else {
        counts.below55++;
        counts.below55Population += population;
      }

      // Skip further categorization if null
      if (lpcdValue === null) return;

      // LPCD ranges (below 55)
      if (lpcdValue >= 45 && lpcdValue < 55) {
        counts.ranges["45to55"]++;
      } else if (lpcdValue >= 35 && lpcdValue < 45) {
        counts.ranges["35to45"]++;
      } else if (lpcdValue >= 25 && lpcdValue < 35) {
        counts.ranges["25to35"]++;
      } else if (lpcdValue >= 15 && lpcdValue < 25) {
        counts.ranges["15to25"]++;
      } else if (lpcdValue >= 0 && lpcdValue < 15) {
        counts.ranges["0to15"]++;
      }

      // LPCD ranges (above 55)
      if (lpcdValue >= 55 && lpcdValue < 60) {
        counts.ranges["55to60"]++;
      } else if (lpcdValue >= 60 && lpcdValue < 65) {
        counts.ranges["60to65"]++;
      } else if (lpcdValue >= 65 && lpcdValue < 70) {
        counts.ranges["65to70"]++;
      } else if (lpcdValue >= 70 && lpcdValue < 75) {
        counts.ranges["70to75"]++;
      } else if (lpcdValue >= 75 && lpcdValue < 80) {
        counts.ranges["75to80"]++;
      } else if (lpcdValue >= 80) {
        counts.ranges["above80"]++;
      }

      // Keep the above70 count for backward compatibility
      if (lpcdValue >= 70) {
        counts.ranges["above70"]++;
      }

      // Consistently above/below 55
      if (isConsistentlyAboveThreshold(scheme, 55)) {
        counts.consistentlyAbove55++;
      }
      if (isConsistentlyBelowThreshold(scheme, 55)) {
        counts.consistentlyBelow55++;
      }
    });

    return counts;
  };

  const filteredSchemes = getFilteredSchemes();
  const filterCounts = getFilterCounts();

  // Pagination
  const paginatedSchemes = filteredSchemes.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const totalPages = Math.ceil(filteredSchemes.length / itemsPerPage);

  // Handle filter change
  const handleFilterChange = (filter: LpcdRange) => {
    setCurrentFilter(filter);
    setPage(1); // Reset to first page when filter changes
  };

  // Handler for commissioned filter changes
  const handleCommissionedFilterChange = (value: string) => {
    setCommissionedFilter(value);

    // If "Not Commissioned", reset and disable "Fully Completed" filter
    if (value === "No") {
      setFullyCompletedFilter("all");
    }

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Handler for fully completed filter changes
  const handleFullyCompletedFilterChange = (value: string) => {
    setFullyCompletedFilter(value);

    // If "Fully Completed", set "Commissioned" to "Yes"
    if (value === "Fully Completed") {
      setCommissionedFilter("Yes");
    }

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Handler for scheme status filter changes
  const handleSchemeStatusFilterChange = (value: string) => {
    setSchemeStatusFilter(value);

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Get LPCD status badge color
  const getLpcdStatusColor = (lpcdValue: number | null): string => {
    if (lpcdValue === null) return "bg-gray-200 text-gray-700";
    if (lpcdValue > 80) return "bg-orange-500 text-white"; // High status (> 80L)
    if (lpcdValue > 70) return "bg-green-600 text-white"; // High status (> 70L)
    if (lpcdValue >= 55) return "bg-green-500 text-white"; // Good status (55-70L)
    if (lpcdValue >= 40) return "bg-yellow-500 text-black"; // Low but not critical
    if (lpcdValue >= 25) return "bg-orange-500 text-white"; // Very low
    if (lpcdValue > 0) return "bg-red-500 text-white"; // Critically low
    return "bg-gray-800 text-white"; // No water
  };

  // LPCD status text with High, Good, and Low categories
  const getLpcdStatusText = (lpcdValue: number | null): string => {
    if (lpcdValue === null) return "No Data";
    if (lpcdValue === 0) return "No Water";
    if (lpcdValue > 70) return "High";
    if (lpcdValue >= 55) return "Good";
    return "Low";
  };

  // Create LPCD badge component
  const LpcdBadge = ({ value }: { value: number | null }) => {
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${getLpcdStatusColor(
          value,
        )}`}
      >
        {value !== null ? `${value.toFixed(2)}L` : "N/A"}
      </span>
    );
  };

  // Export to Excel
  const exportToExcel = () => {
    // Create workbook
    import("xlsx")
      .then((XLSX) => {
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

        // Filter data based on current filters
        const dataToExport = filteredSchemes.map((scheme, index) => {
          const lpcdValue = getLatestLpcdValue(scheme);

          // Format dates for headers
          const date1 = formatDateForHeader(scheme.lpcd_date_day1);
          const date2 = formatDateForHeader(scheme.lpcd_date_day2);
          const date3 = formatDateForHeader(scheme.lpcd_date_day3);
          const date4 = formatDateForHeader(scheme.lpcd_date_day4);
          const date5 = formatDateForHeader(scheme.lpcd_date_day5);
          const date6 = formatDateForHeader(scheme.lpcd_date_day6);
          const date7 = formatDateForHeader(scheme.lpcd_date_day7);

          return {
            "No.": index + 1,
            Region: scheme.region,
            Circle: scheme.circle,
            Division: scheme.division,
            "Sub Division": scheme.sub_division,
            Block: scheme.block,
            "Scheme ID": scheme.scheme_id,
            "Scheme Name": scheme.scheme_name,
            "Village Name": scheme.village_name,
            Population: scheme.population,
            "Current LPCD": lpcdValue !== null ? lpcdValue.toFixed(2) : "N/A",
            Status: getLpcdStatusText(lpcdValue),
            "Days Above 55L": scheme.above_55_lpcd_count || 0,
            "Days Below 55L": scheme.below_55_lpcd_count || 0,

            // Water consumption values with dates as headers (only 6 days available)
            [`Water (${date1})`]:
              scheme.water_value_day1 !== null &&
              scheme.water_value_day1 !== undefined
                ? Number(scheme.water_value_day1).toFixed(4)
                : "N/A",
            [`Water (${date2})`]:
              scheme.water_value_day2 !== null &&
              scheme.water_value_day2 !== undefined
                ? Number(scheme.water_value_day2).toFixed(4)
                : "N/A",
            [`Water (${date3})`]:
              scheme.water_value_day3 !== null &&
              scheme.water_value_day3 !== undefined
                ? Number(scheme.water_value_day3).toFixed(4)
                : "N/A",
            [`Water (${date4})`]:
              scheme.water_value_day4 !== null &&
              scheme.water_value_day4 !== undefined
                ? Number(scheme.water_value_day4).toFixed(4)
                : "N/A",
            [`Water (${date5})`]:
              scheme.water_value_day5 !== null &&
              scheme.water_value_day5 !== undefined
                ? Number(scheme.water_value_day5).toFixed(4)
                : "N/A",
            [`Water (${date6})`]:
              scheme.water_value_day6 !== null &&
              scheme.water_value_day6 !== undefined
                ? Number(scheme.water_value_day6).toFixed(4)
                : "N/A",

            // LPCD values with dates as headers
            [`LPCD (${date1})`]:
              scheme.lpcd_value_day1 !== null &&
              scheme.lpcd_value_day1 !== undefined
                ? Number(scheme.lpcd_value_day1).toFixed(2)
                : "N/A",
            [`LPCD (${date2})`]:
              scheme.lpcd_value_day2 !== null &&
              scheme.lpcd_value_day2 !== undefined
                ? Number(scheme.lpcd_value_day2).toFixed(2)
                : "N/A",
            [`LPCD (${date3})`]:
              scheme.lpcd_value_day3 !== null &&
              scheme.lpcd_value_day3 !== undefined
                ? Number(scheme.lpcd_value_day3).toFixed(2)
                : "N/A",
            [`LPCD (${date4})`]:
              scheme.lpcd_value_day4 !== null &&
              scheme.lpcd_value_day4 !== undefined
                ? Number(scheme.lpcd_value_day4).toFixed(2)
                : "N/A",
            [`LPCD (${date5})`]:
              scheme.lpcd_value_day5 !== null &&
              scheme.lpcd_value_day5 !== undefined
                ? Number(scheme.lpcd_value_day5).toFixed(2)
                : "N/A",
            [`LPCD (${date6})`]:
              scheme.lpcd_value_day6 !== null &&
              scheme.lpcd_value_day6 !== undefined
                ? Number(scheme.lpcd_value_day6).toFixed(2)
                : "N/A",
            [`LPCD (${date7})`]:
              scheme.lpcd_value_day7 !== null &&
              scheme.lpcd_value_day7 !== undefined
                ? Number(scheme.lpcd_value_day7).toFixed(2)
                : "N/A",
          };
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(dataToExport);

        // Set column widths
        const columns = [
          { wch: 5 }, // No.
          { wch: 12 }, // Region
          { wch: 12 }, // Circle
          { wch: 15 }, // Division
          { wch: 15 }, // Sub Division
          { wch: 12 }, // Block
          { wch: 12 }, // Scheme ID
          { wch: 25 }, // Scheme Name
          { wch: 20 }, // Village Name
          { wch: 12 }, // Population
          { wch: 15 }, // Current LPCD
          { wch: 10 }, // Status
          { wch: 12 }, // LPCD Day 1
          { wch: 12 }, // LPCD Day 2
          { wch: 12 }, // LPCD Day 3
          { wch: 12 }, // LPCD Day 4
          { wch: 12 }, // LPCD Day 5
          { wch: 12 }, // LPCD Day 6
          { wch: 12 }, // LPCD Day 7
        ];
        ws["!cols"] = columns;

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "LPCD Data");

        // Generate filename
        let filename = "LPCD_Data";
        if (selectedRegion !== "all") {
          filename += `_${selectedRegion}`;
        }
        if (currentFilter !== "all") {
          filename += `_${currentFilter}`;
        }
        filename += `_${new Date().toISOString().split("T")[0]}.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);

        // Track the data export activity
        trackDataExport("village_lpcd_data", "xlsx", dataToExport.length, {
          region_filter: selectedRegion !== "all" ? selectedRegion : null,
          lpcd_filter: currentFilter !== "all" ? currentFilter : null,
          filename: filename
        });

        toast({
          title: "Export Successful",
          description: `${dataToExport.length} records exported to Excel`,
        });
      })
      .catch((error) => {
        console.error("Error exporting to Excel:", error);
        toast({
          title: "Export Failed",
          description:
            "There was an error exporting to Excel. Please try again.",
          variant: "destructive",
        });
      });
  };

  // Export historical LPCD data to Excel from water_scheme_data_history table
  const exportHistoricalData = async () => {
    try {
      // Build query parameters for the backend API that fetches from water_scheme_data_history
      const params = new URLSearchParams();
      params.append("startDate", historicalStartDate);
      params.append("endDate", historicalEndDate);
      params.append("format", "xlsx");
      
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      const queryString = params.toString();
      const url = `/api/water-scheme-data/download/village-lpcd-history?${queryString}`;

      console.log("Downloading historical LPCD data from water_scheme_data_history table:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export historical LPCD data");
      }

      // Get the filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `Village_LPCD_History_${historicalStartDate}_to_${historicalEndDate}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
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
        "Village LPCD Historical Data",
        filename,
        0, // We don't know the count from server response
        { 
          dateRange: `${historicalStartDate} to ${historicalEndDate}`,
          region: selectedRegion !== "all" ? selectedRegion : undefined 
        },
        {
          exportSource: "lpcd_historical_dashboard",
          startDate: historicalStartDate,
          endDate: historicalEndDate,
          dataSource: "water_scheme_data_history"
        }
      );

      toast({
        title: "Export Successful",
        description: `Historical LPCD data exported successfully from date range ${historicalStartDate} to ${historicalEndDate}`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export historical LPCD data",
        variant: "destructive",
      });
    }
  };

  const NoDataMessage = () => (
    <div className="text-center p-8">
      <h3 className="text-lg font-medium text-gray-600">
        No villages match the selected criteria
      </h3>
      <p className="text-gray-500 mt-2">
        {searchQuery ? "Try clearing your search query or " : "Try "}
        selecting a different filter or region
      </p>
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => {
          setCurrentFilter("all");
          setSelectedRegion("all");
          setSearchQuery("");
        }}
      >
        Reset All Filters
      </Button>
    </div>
  );

  // Check if there was an error loading the scheme data
  useEffect(() => {
    if (schemesError) {
      toast({
        title: "Error loading water scheme data",
        description:
          "There was a problem loading the water scheme data. Please try again.",
        variant: "destructive",
      });
    }
  }, [schemesError, toast]);

  // State for village details dialog
  const [selectedVillage, setSelectedVillage] =
    useState<WaterSchemeData | null>(null);
  const [villageDetailsOpen, setVillageDetailsOpen] = useState(false);

  // Chart visibility toggle
  const [showCharts, setShowCharts] = useState(true);

  // View village details
  const handleViewVillage = (scheme: WaterSchemeData) => {
    setSelectedVillage(scheme);
    setVillageDetailsOpen(true);
  };

  // Calculate weekly average LPCD function
  const calculateWeeklyAverageLpcd = (scheme: WaterSchemeData): number | null => {
    const lpcdValues: number[] = [];
    
    // Collect all LPCD values for the week
    for (let day = 1; day <= 7; day++) {
      const valueField = `lpcd_value_day${day}` as keyof WaterSchemeData;
      const value = scheme[valueField];
      
      if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
        lpcdValues.push(Number(value));
      }
    }
    
    // Calculate average if we have any values
    if (lpcdValues.length > 0) {
      const sum = lpcdValues.reduce((acc, val) => acc + val, 0);
      return sum / lpcdValues.length; // Divide by actual number of days with data for true average
    }
    
    return null;
  };

  // Village Details Component
  const VillageDetailsDialog = () => {
    if (!selectedVillage) return null;

    const lpcdValue = getLatestLpcdValue(selectedVillage);
    const weeklyAverageLpcd = calculateWeeklyAverageLpcd(selectedVillage);
    const lpcdValues = [
      {
        day: 1,
        value: selectedVillage.lpcd_value_day1,
        date: selectedVillage.lpcd_date_day1,
      },
      {
        day: 2,
        value: selectedVillage.lpcd_value_day2,
        date: selectedVillage.lpcd_date_day2,
      },
      {
        day: 3,
        value: selectedVillage.lpcd_value_day3,
        date: selectedVillage.lpcd_date_day3,
      },
      {
        day: 4,
        value: selectedVillage.lpcd_value_day4,
        date: selectedVillage.lpcd_date_day4,
      },
      {
        day: 5,
        value: selectedVillage.lpcd_value_day5,
        date: selectedVillage.lpcd_date_day5,
      },
      {
        day: 6,
        value: selectedVillage.lpcd_value_day6,
        date: selectedVillage.lpcd_date_day6,
      },
      {
        day: 7,
        value: selectedVillage.lpcd_value_day7,
        date: selectedVillage.lpcd_date_day7,
      },
    ];

    // Count days above and below 55 LPCD and check for consistent zero LPCD
    const calculateDaysAboveBelow = () => {
      const validValues = lpcdValues.filter(
        (item) => item.value !== undefined && item.value !== null,
      );

      // Special handling for all-zero values - check if ALL values are 0
      const allZeros = validValues.every((item) => Number(item.value) === 0);

      let daysAbove = 0;
      let daysBelow = 0;
      // Only mark as consistent zero if we have exactly 7 days of data and all are zero
      let isConsistentZero = allZeros && validValues.length === 7 ? 1 : 0;

      if (allZeros && validValues.length > 0) {
        // If all values are zero, count all days as "below 55"
        daysAbove = 0;
        daysBelow = validValues.length;
      } else {
        // Normal calculation for non-zero values
        daysAbove = validValues.filter(
          (item) => Number(item.value) >= 55,
        ).length;
        daysBelow = validValues.filter(
          (item) => Number(item.value) < 55,
        ).length;
      }

      return {
        daysAbove,
        daysBelow,
        isConsistentZero,
        // For UI display, ALWAYS use calculated values to ensure accuracy
        daysAboveCount: daysAbove,
        daysBelowCount: daysBelow,
        consistentZeroLpcd: isConsistentZero,
      };
    };

    const {
      daysAbove,
      daysBelow,
      daysAboveCount,
      daysBelowCount,
      consistentZeroLpcd,
    } = calculateDaysAboveBelow();

    return (
      <Dialog open={villageDetailsOpen} onOpenChange={setVillageDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] bg-gradient-to-b from-blue-50 to-white">
          <DialogHeader className="bg-white p-4 rounded-lg">
            <DialogTitle className="text-xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>{selectedVillage.village_name}</span>
                {selectedVillage.dashboard_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 text-xs"
                    onClick={() =>
                      window.open(selectedVillage.dashboard_url, "_blank")
                    }
                  >
                    <BarChart className="h-4 w-4 mr-1" /> PI Vision Dashboard
                  </Button>
                )}
              </div>
              <LpcdBadge value={weeklyAverageLpcd} />
            </DialogTitle>
            <DialogDescription>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-gray-500">Scheme:</span>{" "}
                  {selectedVillage.scheme_name}
                </div>
                <div>
                  <span className="text-gray-500">Scheme ID:</span>{" "}
                  {selectedVillage.scheme_id}
                </div>
                <div>
                  <span className="text-gray-500">Region:</span>{" "}
                  {selectedVillage.region}
                </div>
                <div>
                  <span className="text-gray-500">Population:</span>{" "}
                  {selectedVillage.population?.toLocaleString() || "N/A"}
                </div>
                <div>
                  <span className="text-gray-500">Block:</span>{" "}
                  {selectedVillage.block}
                </div>
                <div>
                  <span className="text-gray-500">ESR Count:</span>{" "}
                  {selectedVillage.number_of_esr || "N/A"}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="mt-4 max-h-[60vh]">
            <div className="space-y-6">
              {/* LPCD Values */}
              <div>
                <h3 className="text-lg font-semibold mb-3 bg-white p-2 rounded shadow-sm border border-blue-100">
                  LPCD Values (Last 7 Days)
                </h3>
                <div className="grid grid-cols-7 gap-2">
                  {lpcdValues.map((item, index) => {
                    const value =
                      item.value !== undefined && item.value !== null
                        ? Number(item.value)
                        : null;
                    return (
                      <div
                        key={`lpcd-day-${index + 1}`}
                        className={`p-3 rounded-md text-center ${
                          value !== null
                            ? getLpcdStatusColor(value)
                            : "bg-gray-100"
                        }`}
                      >
                        <p className="text-xs opacity-80">Day {item.day}</p>
                        <p className="text-lg font-semibold">
                          {value !== null ? value.toFixed(2) : "-"}
                        </p>
                        <p className="text-xs opacity-80">{item.date || "-"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Water Consumption Values */}
              <div>
                <h3 className="text-lg font-semibold mb-3 bg-white p-2 rounded shadow-sm border border-blue-100">
                  Water Consumption (LL)
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const waterValue =
                      selectedVillage[
                        `water_value_day${day}` as keyof WaterSchemeData
                      ];
                    const numValue =
                      waterValue !== undefined && waterValue !== null
                        ? Number(waterValue)
                        : null;
                    const dateValue =
                      selectedVillage[
                        `water_date_day${day}` as keyof WaterSchemeData
                      ];

                    return (
                      <div
                        key={`water-day-${day}`}
                        className="bg-white p-3 rounded-md text-center shadow-sm border border-blue-100"
                      >
                        <p className="text-xs text-blue-700">Day {day}</p>
                        <p className="text-lg font-semibold text-blue-700">
                          {numValue !== null ? numValue.toFixed(2) : "-"}
                        </p>
                        <p className="text-xs text-blue-700">
                          {dateValue || "-"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card
                  className={`${
                    daysBelowCount > 0 ? "bg-red-50" : "bg-gray-50"
                  } border border-red-100`}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-600">Days Below 55L LPCD</p>
                    <p
                      className={`text-2xl font-bold ${
                        daysBelowCount > 0 ? "text-red-600" : "text-gray-600"
                      }`}
                    >
                      {daysBelowCount}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`${
                    daysAboveCount > 0 ? "bg-green-50" : "bg-gray-50"
                  } border border-green-100`}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-600">Days Above 55L LPCD</p>
                    <p
                      className={`text-2xl font-bold ${
                        daysAboveCount > 0 ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {daysAboveCount}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`${
                    consistentZeroLpcd === 1 ? "bg-gray-800" : "bg-gray-50"
                  }`}
                >
                  <CardContent className="p-4 text-center">
                    <p
                      className={`text-sm ${
                        consistentZeroLpcd === 1
                          ? "text-gray-300"
                          : "text-gray-600"
                      }`}
                    >
                      Zero Water for Week
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        consistentZeroLpcd === 1
                          ? "text-white"
                          : "text-gray-600"
                      }`}
                    >
                      {consistentZeroLpcd === 1 ? "Yes" : "No"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="w-full py-6 container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg border-l-4 border-blue-600 shadow-sm">
          <h1 className="text-3xl font-bold text-blue-900">LPCD Dashboard</h1>
          <p className="text-blue-700 font-medium mt-1">
            Monitor water supply across villages (Litres Per Capita per Day)
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-64">
            <Input
              type="search"
              placeholder="Search scheme or village name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pr-8 border-blue-200 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Region Filter */}
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[180px] bg-white border border-blue-200 shadow-sm">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent className="border border-blue-100">
              <SelectItem value="all">All Regions</SelectItem>
              {regionsData.map((region) => (
                <SelectItem key={region.region_id} value={region.region_name}>
                  {region.region_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* MJP Civil Status Filter Box */}
          <div className="border border-blue-200 p-3 rounded-lg shadow-sm bg-white flex flex-col items-center">
            <span className="text-blue-700 font-semibold mb-2">
              MJP Civil Status
            </span>
            <div className="flex gap-2">
              {/* Commissioned Status Filter */}
              <Select
                value={commissionedFilter}
                onValueChange={handleCommissionedFilterChange}
              >
                <SelectTrigger className="w-[160px] bg-white border border-blue-200 shadow-sm">
                  <SelectValue placeholder="Commissioned Status" />
                </SelectTrigger>
                <SelectContent className="border border-blue-100">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Yes">Commissioned</SelectItem>
                  <SelectItem value="No">Not Commissioned</SelectItem>
                </SelectContent>
              </Select>

              {/* MJP Fully Completed Filter */}
              <Select
                value={fullyCompletedFilter}
                onValueChange={handleFullyCompletedFilterChange}
                disabled={commissionedFilter === "No"}
              >
                <SelectTrigger className="w-[160px] bg-white border border-blue-200 shadow-sm">
                  <SelectValue placeholder="Completion Status" />
                </SelectTrigger>
                <SelectContent className="border border-blue-100">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem
                    value="Fully Completed"
                    disabled={commissionedFilter === "No"}
                  >
                    Fully Completed
                  </SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* IoT Status Filter */}
          <Select
            value={schemeStatusFilter}
            onValueChange={handleSchemeStatusFilterChange}
          >
            <SelectTrigger className="w-[180px] bg-white border border-blue-200 shadow-sm">
              <SelectValue placeholder="IoT Status" />
            </SelectTrigger>
            <SelectContent className="border border-blue-100">
              <SelectItem value="all">All IoT Status</SelectItem>
              <SelectItem value="Connected">Connected</SelectItem>
              <SelectItem value="Fully Completed">Fully Completed</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Not-Connected">Not Connected</SelectItem>
            </SelectContent>
          </Select>

          {/* Historical Data Toggle */}
          <Button
            variant={showHistoricalData ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowHistoricalData(!showHistoricalData);
              if (!showHistoricalData) {
                trackFilterUsage("Historical Data View", "enabled");
              }
            }}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            {showHistoricalData ? "Current Data" : "Historical Data"}
          </Button>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              title="Refresh data"
              className="border-blue-200 shadow-sm text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={exportToExcel}
              title="Export to Excel"
              className="border-blue-200 shadow-sm text-blue-700 hover:bg-blue-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
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
              variant="outline"
              onClick={() => setShowCharts(!showCharts)}
              className="border-blue-200 shadow-sm text-blue-700 hover:bg-blue-50"
            >
              {showCharts ? (
                <>
                  <ChartBarOff className="h-4 w-4 mr-2" /> Hide Charts
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" /> Show Charts
                </>
              )}
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
                  Select Date Range for Historical LPCD Data
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
                  disabled={isLoadingHistorical || historicalLpcdData.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Export to Excel ({historicalLpcdData.length})
                </Button>
              </div>
            </div>

            {historicalLpcdData.length > 0 && (
              <div className="mt-3 text-sm text-green-700">
                Found {historicalLpcdData.length} historical records
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

      {/* Village details dialog */}
      <VillageDetailsDialog />

      {isLoadingSchemes || isLoadingRegions ? (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Main Dashboard Grid */}
          <div className="space-y-6">
            {/* Top Card - Total Villages */}
            <Card
              className="w-full max-w-md mx-auto cursor-pointer transition-all duration-300 transform hover:scale-[1.02] dashboard-card bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-2xl shadow-lg"
              onClick={() => {
                setCurrentFilter("all");
                setSearchQuery("");
              }}
            >
              <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-50 border-b border-blue-200 rounded-t-2xl pb-3">
                <CardTitle className="text-center text-2xl font-bold text-blue-900 tracking-wide">
                  Total Villages Covered Under LPCD
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-8 pb-6">
                <p className="text-6xl font-extrabold text-center text-blue-700 drop-shadow-sm">
                  {filterCounts.total}
                </p>

                <div className="flex justify-center mt-6">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-full shadow-md">
                    <span className="font-medium">Total Population: </span>
                    <span className="font-bold">
                      {filterCounts.totalPopulation.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="text-center mt-6 text-blue-800">
                  <span className="font-medium">
                    Population Receiving Water Supply:
                  </span>{" "}
                  <span className="font-bold">
                    {(() => {
                      const noSupplyVillages =
                        getGloballyFilteredSchemes().filter((scheme) =>
                          hasNoCurrentWaterSupply(scheme),
                        );
                      const suppliedPopulation =
                        filterCounts.totalPopulation -
                        noSupplyVillages.reduce(
                          (sum, village) =>
                            sum +
                            (village.population
                              ? Number(village.population)
                              : 0),
                          0,
                        );
                      return suppliedPopulation.toLocaleString("en-IN");
                    })()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Main Cards Row - LPCD Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Villages with LPCD > 55L */}
              <Card className="border-green-200 dashboard-card card-shadow bg-gradient-to-b from-white to-green-50">
                <CardHeader className="bg-gradient-to-r from-green-100 to-green-50 border-b border-green-200 pb-2">
                  <CardTitle className="text-center text-xl font-semibold text-green-800">
                    Villages with LPCD &gt; 55L
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <p className="text-5xl font-bold text-center text-green-600 drop-shadow-sm">
                    {filterCounts.above55}
                  </p>
                  <div className="flex justify-center mt-4">
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-sm border border-green-200">
                      <span className="font-medium">Population:</span>{" "}
                      <span className="font-bold">
                        {filterCounts.above55Population.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-6 text-green-700 hover:text-green-800 hover:bg-green-100 border border-green-300 shadow-sm"
                    onClick={() => handleFilterChange("above55")}
                  >
                    <Eye className="h-4 w-4 mr-2" /> View Villages
                  </Button>
                </CardContent>

                {/* Subcategory cards for LPCD > 55L */}
                {showCharts && (
                  <CardFooter className="pt-0 pb-4">
                    <div className="w-full grid grid-cols-1 gap-2">
                      <Card
                        className="border-green-100"
                        onClick={() => handleFilterChange("55to60")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                          <span className="text-sm text-green-700">
                            LPCD 55-60L
                          </span>
                          <span className="font-medium text-green-700">
                            {filterCounts.ranges["55to60"]}
                          </span>
                        </CardContent>
                      </Card>
                      <Card
                        className="border-green-100"
                        onClick={() => handleFilterChange("60to65")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                          <span className="text-sm text-green-700">
                            LPCD 60-65L
                          </span>
                          <span className="font-medium text-green-700">
                            {filterCounts.ranges["60to65"]}
                          </span>
                        </CardContent>
                      </Card>
                      <Card
                        className="border-green-100"
                        onClick={() => handleFilterChange("65to70")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                          <span className="text-sm text-green-700">
                            LPCD 65-70L
                          </span>
                          <span className="font-medium text-green-700">
                            {filterCounts.ranges["65to70"]}
                          </span>
                        </CardContent>
                      </Card>
                      <Card
                        className="border-green-100"
                        onClick={() => handleFilterChange("70to75")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                          <span className="text-sm text-green-700">
                            LPCD 70-75L
                          </span>
                          <span className="font-medium text-green-700">
                            {filterCounts.ranges["70to75"]}
                          </span>
                        </CardContent>
                      </Card>
                      <Card
                        className="border-green-100"
                        onClick={() => handleFilterChange("75to80")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                          <span className="text-sm text-green-700">
                            LPCD 75-80L
                          </span>
                          <span className="font-medium text-green-700">
                            {filterCounts.ranges["75to80"]}
                          </span>
                        </CardContent>
                      </Card>
                      <Card
                        className="border-orange-100 rounded-lg overflow-hidden"
                        onClick={() => handleFilterChange("above80")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer bg-orange-500">
                          <span className="text-sm text-green-700">
                            LPCD &gt; 80L
                          </span>
                          <span className="font-medium text-green-700">
                            {filterCounts.ranges["above80"]}
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  </CardFooter>
                )}
              </Card>

              {/* Villages with LPCD < 55L (but > 0) */}
              <Card className="border-yellow-200 dashboard-card card-shadow bg-gradient-to-b from-white to-yellow-50">
                <CardHeader className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-b border-yellow-200 pb-2">
                  <CardTitle className="text-center text-xl font-semibold text-yellow-800">
                    Villages with LPCD &lt; 55L
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <p className="text-5xl font-bold text-center text-yellow-600 drop-shadow-sm">
                    {(() => {
                      // Calculate villages with LPCD < 55 but > 0 (excluding zero supply)
                      const below55ExcludingZero = getGloballyFilteredSchemes().filter((scheme) => {
                        const lpcd = getLatestLpcdValue(scheme);
                        return lpcd !== null && lpcd > 0 && lpcd < 55;
                      });
                      return below55ExcludingZero.length;
                    })()}
                  </p>
                  <div className="flex justify-center mt-4">
                    <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg shadow-sm border border-yellow-200">
                      <span className="font-medium">Population:</span>{" "}
                      <span className="font-bold">
                        {(() => {
                          const below55ExcludingZero = getGloballyFilteredSchemes().filter((scheme) => {
                            const lpcd = getLatestLpcdValue(scheme);
                            return lpcd !== null && lpcd > 0 && lpcd < 55;
                          });
                          const population = below55ExcludingZero.reduce((sum, scheme) => 
                            sum + (scheme.population ? Number(scheme.population) : 0), 0
                          );
                          return population.toLocaleString("en-IN");
                        })()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-6 text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100 border border-yellow-300 shadow-sm"
                    onClick={() => handleFilterChange("below55")}
                  >
                    <Eye className="h-4 w-4 mr-2" /> View Villages
                  </Button>
                </CardContent>

                {/* Subcategory cards for LPCD < 55L */}
                {showCharts && (
                  <CardFooter className="pt-0 pb-4">
                    <div className="w-full grid grid-cols-1 gap-2">
                      <Card
                        className="border border-red-300 bg-red-50 hover:bg-red-100 transition"
                        onClick={() => handleFilterChange("noSupply")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer">
                          <span className="text-sm text-[#8B0000]">
                            No Water Supply for Village
                          </span>

                          <span className="font-medium text-red-900">
                            {(() => {
                              const noSupplyVillages =
                                getGloballyFilteredSchemes().filter((scheme) =>
                                  hasNoCurrentWaterSupply(scheme),
                                );
                              const totalPopulation = noSupplyVillages.reduce(
                                (sum, village) =>
                                  sum +
                                  (village.population
                                    ? Number(village.population)
                                    : 0),
                                0,
                              );
                              return `${
                                noSupplyVillages.length
                              } (Pop: ${totalPopulation.toLocaleString(
                                "en-IN",
                              )})`;
                            })()}
                          </span>
                        </CardContent>
                      </Card>

                      <Card
                        className="border-red-100"
                        onClick={() => handleFilterChange("45to55")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                          <span className="text-sm text-red-700">
                            LPCD 45-55L
                          </span>
                          <span className="font-medium text-red-700">
                            {filterCounts.ranges["45to55"]}
                          </span>
                        </CardContent>
                      </Card>
                      <Card
                        className="border-red-100"
                        onClick={() => handleFilterChange("35to45")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                          <span className="text-sm text-red-700">
                            LPCD 35-45L
                          </span>
                          <span className="font-medium text-red-700">
                            {filterCounts.ranges["35to45"]}
                          </span>
                        </CardContent>
                      </Card>
                      <Card
                        className="border-red-100"
                        onClick={() => handleFilterChange("25to35")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                          <span className="text-sm text-red-700">
                            LPCD 25-35L
                          </span>
                          <span className="font-medium text-red-700">
                            {filterCounts.ranges["25to35"]}
                          </span>
                        </CardContent>
                      </Card>
                      <Card
                        className="border-red-100"
                        onClick={() => handleFilterChange("15to25")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                          <span className="text-sm text-red-700">
                            LPCD 15-25L
                          </span>
                          <span className="font-medium text-red-700">
                            {filterCounts.ranges["15to25"]}
                          </span>
                        </CardContent>
                      </Card>
                      <Card
                        className="border-red-100"
                        onClick={() => handleFilterChange("0to15")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                          <span className="text-sm text-red-700">
                            LPCD 0-15L
                          </span>
                          <span className="font-medium text-red-700">
                            {filterCounts.ranges["0to15"]}
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  </CardFooter>
                )}
              </Card>

              {/* No Water Supply for Village */}
              <Card className="border-gray-200 dashboard-card card-shadow bg-gradient-to-b from-white to-gray-50">
                <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200 pb-2">
                  <CardTitle className="text-center text-xl font-semibold text-gray-800">
                    No Water Supply for Village
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <p className="text-5xl font-bold text-center text-gray-600 drop-shadow-sm">
                    {(() => {
                      const noSupplyVillages = getGloballyFilteredSchemes().filter((scheme) =>
                        hasNoCurrentWaterSupply(scheme),
                      );
                      return noSupplyVillages.length;
                    })()}
                  </p>
                  <div className="flex justify-center mt-4">
                    <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                      <span className="font-medium">Population:</span>{" "}
                      <span className="font-bold">
                        {(() => {
                          const noSupplyVillages = getGloballyFilteredSchemes().filter((scheme) =>
                            hasNoCurrentWaterSupply(scheme),
                          );
                          const population = noSupplyVillages.reduce((sum, scheme) => 
                            sum + (scheme.population ? Number(scheme.population) : 0), 0
                          );
                          return population.toLocaleString("en-IN");
                        })()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-6 text-gray-700 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 shadow-sm"
                    onClick={() => handleFilterChange("noSupply")}
                  >
                    <Eye className="h-4 w-4 mr-2" /> View Villages
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Cards Row - Consistent Trends */}
            {showCharts && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Consistently Above 55L LPCD */}
                <Card
                  className="border-blue-200 dashboard-card card-shadow bg-gradient-to-b from-white to-blue-50"
                  onClick={() => handleFilterChange("consistentlyAbove55")}
                >
                  <CardContent className="p-5 flex items-center cursor-pointer hover:bg-blue-50 transition-all">
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                      <BarChart3 className="h-6 w-6 text-blue-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-800 mb-1">
                        Consistent High Performance
                      </h3>
                      <p className="text-blue-700 text-sm">
                        Villages consistently above 55L LPCD for the week
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-blue-700 bg-blue-100 px-4 py-2 rounded-lg">
                      {filterCounts.consistentlyAbove55}
                    </div>
                  </CardContent>
                </Card>

                {/* Consistently Below 55L LPCD */}
                <Card
                  className="border-orange-200 dashboard-card card-shadow bg-gradient-to-b from-white to-orange-50"
                  onClick={() => handleFilterChange("consistentlyBelow55")}
                >
                  <CardContent className="p-5 flex items-center cursor-pointer hover:bg-orange-50 transition-all">
                    <div className="bg-orange-100 p-3 rounded-full mr-4">
                      <ChartBarOff className="h-6 w-6 text-orange-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-800 mb-1">
                        Needs Improvement
                      </h3>
                      <p className="text-orange-700 text-sm">
                        Villages consistently below 55L LPCD for the week
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-orange-700 bg-orange-100 px-4 py-2 rounded-lg">
                      {filterCounts.consistentlyBelow55}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Results Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {currentFilter === "all"
                      ? "All Villages"
                      : `Filtered Villages (${filteredSchemes.length})`}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="itemsPerPage">Show</Label>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px]" id="itemsPerPage">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="ml-1">entries</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredSchemes.length > 0 ? (
                  <>
                    <div className="rounded-md border border-blue-200 overflow-hidden shadow-sm">
                      <Table className="border-collapse">
                        <TableHeader>
                          <TableRow className="bg-blue-600 hover:bg-blue-700">
                            <TableHead className="w-[50px] text-white font-semibold">
                              #
                            </TableHead>
                            <TableHead className="text-white font-semibold">
                              Region
                            </TableHead>
                            <TableHead className="text-white font-semibold">
                              Scheme Name
                            </TableHead>
                            <TableHead className="text-white font-semibold">
                              Village
                            </TableHead>
                            <TableHead className="text-white font-semibold text-center">
                              Population
                            </TableHead>
                            <TableHead className="text-white font-semibold">
                              Current LPCD
                            </TableHead>
                            <TableHead className="text-white font-semibold">
                              Status
                            </TableHead>
                            <TableHead className="w-[120px] text-white font-semibold">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSchemes.map((scheme, index) => {
                            const lpcdValue = getLatestLpcdValue(scheme);
                            const isEven = index % 2 === 0;
                            return (
                              <TableRow
                                key={`${scheme.scheme_id}-${scheme.village_name}`}
                                className={`village-item ${
                                  isEven ? "bg-blue-50" : "bg-white"
                                } hover:bg-blue-100 transition-all`}
                              >
                                <TableCell className="font-medium border-b border-blue-200 text-center align-middle">
                                  {(page - 1) * itemsPerPage + index + 1}
                                </TableCell>
                                <TableCell className="border-b border-blue-200 font-medium text-left align-middle">
                                  {scheme.region}
                                </TableCell>
                                <TableCell className="border-b border-blue-200 text-left align-middle">
                                  <div className="font-medium text-blue-800">
                                    {scheme.scheme_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {scheme.scheme_id}
                                  </div>
                                </TableCell>
                                <TableCell className="border-b border-blue-200 font-medium text-gray-800 text-left align-middle">
                                  {scheme.village_name}
                                </TableCell>
                                <TableCell className="border-b border-blue-200 text-center font-mono font-medium align-middle">
                                  {scheme.population?.toLocaleString("en-IN") ||
                                    "N/A"}
                                </TableCell>
                                <TableCell className="border-b border-blue-200 text-center align-middle">
                                  <LpcdBadge value={lpcdValue} />
                                </TableCell>
                                <TableCell className="border-b border-blue-200 text-center align-middle">
                                  <Badge
                                    variant="outline"
                                    className={`${getLpcdStatusColor(
                                      lpcdValue,
                                    )} border-0`}
                                  >
                                    {getLpcdStatusText(lpcdValue)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="border-b border-blue-200 text-center align-middle">
                                  <div className="flex space-x-2 justify-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewVillage(scheme)}
                                      title="View Details"
                                      className="rounded-md bg-blue-50 hover:bg-blue-100 border-blue-200"
                                    >
                                      <Eye className="h-4 w-4 mr-1" /> View
                                    </Button>
                                    {scheme.dashboard_url && (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                          window.open(
                                            scheme.dashboard_url,
                                            "_blank",
                                          )
                                        }
                                        title="Open PI Vision Dashboard"
                                        className="rounded-md bg-blue-50 hover:bg-blue-100 border-blue-200"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-6 gap-4">
                        <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-md border border-blue-100 shadow-sm">
                          Showing{" "}
                          <span className="font-semibold text-blue-700">
                            {(page - 1) * itemsPerPage + 1}
                          </span>{" "}
                          to{" "}
                          <span className="font-semibold text-blue-700">
                            {Math.min(
                              page * itemsPerPage,
                              filteredSchemes.length,
                            )}
                          </span>{" "}
                          of{" "}
                          <span className="font-semibold text-blue-700">
                            {filteredSchemes.length}
                          </span>{" "}
                          entries
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-2 rounded-md border border-blue-100 shadow-sm">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                          </Button>
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              // Show pages around the current page
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (page <= 3) {
                                pageNum = i + 1;
                              } else if (page >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = page - 2 + i;
                              }

                              return (
                                <Button
                                  key={pageNum}
                                  variant={
                                    page === pageNum ? "default" : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setPage(pageNum)}
                                  className={
                                    page === pageNum
                                      ? "bg-blue-600 hover:bg-blue-700"
                                      : "border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                  }
                                >
                                  {pageNum}
                                </Button>
                              );
                            },
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page + 1)}
                            disabled={page === totalPages}
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                          >
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <NoDataMessage />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedLpcdDashboard;
