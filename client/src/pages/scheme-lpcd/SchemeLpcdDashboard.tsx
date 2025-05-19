import React, { useState, useEffect } from "react";
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

// Types
export interface SchemeLpcdData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  total_population: number;
  total_villages: number;
  villages_below_55: number;
  villages_above_55: number;
  villages_zero_supply: number;
  total_water_day1: number;
  total_water_day2: number;
  total_water_day3: number;
  total_water_day4: number;
  total_water_day5: number;
  total_water_day6: number;
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
  lpcd_date_day1: string;
  lpcd_date_day2: string;
  lpcd_date_day3: string;
  lpcd_date_day4: string;
  lpcd_date_day5: string;
  lpcd_date_day6: string;
  lpcd_date_day7: string;
  mjp_commissioned: string;
  mjp_fully_completed?: string;
  fully_completion_scheme_status?: string;
  dashboard_url?: string;
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
  | "above70"
  | "mjpYes"
  | "mjpNo";

const SchemeLpcdDashboard = () => {
  const { toast } = useToast();

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [currentFilter, setCurrentFilter] = useState<LpcdRange>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [commissionedFilter, setCommissionedFilter] = useState<string>("all");
  const [fullyCompletedFilter, setFullyCompletedFilter] = useState<string>("all");
  const [schemeStatusFilter, setSchemeStatusFilter] = useState<string>("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch all scheme LPCD data
  const {
    data: allSchemeLpcdData = [],
    isLoading: isLoadingSchemes,
    error: schemesError,
    refetch,
  } = useQuery<SchemeLpcdData[]>({
    queryKey: ["/api/scheme-lpcd-data", selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      const queryString = params.toString();
      const url = `/api/scheme-lpcd-data${queryString ? `?${queryString}` : ""}`;

      console.log("Fetching Scheme LPCD data with URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch Scheme LPCD data");
      }

      const data = await response.json();
      console.log(`Received ${data.length} Scheme LPCD records`);
      return data;
    },
  });

  // Fetch region data
  const { data: regionsData = [], isLoading: isLoadingRegions } = useQuery<
    RegionData[]
  >({
    queryKey: ["/api/regions"],
  });

  // Get latest LPCD value
  const getLatestLpcdValue = (scheme: SchemeLpcdData): number | null => {
    // Try to get the latest non-null value
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
      const value = scheme[`lpcd_value_day${day}` as keyof SchemeLpcdData];
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
    scheme: SchemeLpcdData,
  ): number | null => {
    // Try to get the latest non-null water supply value
    for (const day of [6, 5, 4, 3, 2, 1]) {
      const value = scheme[`total_water_day${day}` as keyof SchemeLpcdData];
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
  const hasNoCurrentWaterSupply = (scheme: SchemeLpcdData): boolean => {
    // Get the most recent water supply value
    const currentWaterSupply = getLatestWaterSupplyValue(scheme);

    // Return true if it's explicitly 0
    return currentWaterSupply !== null && currentWaterSupply === 0;
  };

  // Extract all LPCD values
  const extractLpcdValues = (scheme: SchemeLpcdData): number[] => {
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
    scheme: SchemeLpcdData,
    threshold: number,
  ): boolean => {
    const values = extractLpcdValues(scheme);
    if (values.length === 0) return false;
    return values.every((val) => val > threshold);
  };

  const isConsistentlyBelowThreshold = (
    scheme: SchemeLpcdData,
    threshold: number,
  ): boolean => {
    const values = extractLpcdValues(scheme);
    if (values.length === 0) return false;
    return values.every((val) => val < threshold);
  };

  // Apply filters
  const getFilteredSchemes = () => {
    if (!allSchemeLpcdData) return [];

    let filtered = [...allSchemeLpcdData];

    // Apply search query filter (for scheme name)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (scheme) =>
          scheme.scheme_name?.toLowerCase().includes(query) ||
          scheme.scheme_id?.toLowerCase().includes(query),
      );
    }
    
    // Apply commissioned status filter
    if (commissionedFilter !== "all") {
      filtered = filtered.filter((scheme) => {
        return 'mjp_commissioned' in scheme && scheme.mjp_commissioned === commissionedFilter;
      });
    }
    
    // Apply fully completed filter
    if (fullyCompletedFilter !== "all") {
      filtered = filtered.filter((scheme) => {
        return 'mjp_fully_completed' in scheme && scheme.mjp_fully_completed === fullyCompletedFilter;
      });
    }
    
    // Apply scheme status filter
    if (schemeStatusFilter !== "all") {
      filtered = filtered.filter((scheme) => {
        if (!('fully_completion_scheme_status' in scheme)) return false;
        
        if (schemeStatusFilter === "Connected") {
          return scheme.fully_completion_scheme_status !== "Not-Connected";
        }
        return scheme.fully_completion_scheme_status === schemeStatusFilter;
      });
    }

    // Apply LPCD range filter
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
          return lpcdValue !== null && lpcdValue < 55;
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
      case "above70":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 70;
        });
        break;
      case "mjpYes":
        filtered = filtered.filter((scheme) => scheme.mjp_commissioned === "Yes");
        break;
      case "mjpNo":
        filtered = filtered.filter((scheme) => scheme.mjp_commissioned === "No");
        break;
    }

    return filtered;
  };

  // Calculate filter counts
  const getFilterCounts = () => {
    const counts = {
      total: allSchemeLpcdData.length,
      above55: 0,
      below55: 0,
      totalPopulation: 0,
      above55Population: 0,
      below55Population: 0,
      mjpCommissioned: 0,
      mjpNotCommissioned: 0,
      ranges: {
        "45to55": 0,
        "35to45": 0,
        "25to35": 0,
        "15to25": 0,
        "0to15": 0,
        "55to60": 0,
        "60to65": 0,
        "65to70": 0,
        above70: 0,
      },
    };

    if (!allSchemeLpcdData) return counts;

    // Update total count
    counts.total = allSchemeLpcdData.length;

    // Count schemes in each category
    allSchemeLpcdData.forEach((scheme) => {
      const lpcdValue = getLatestLpcdValue(scheme);
      const population = scheme.total_population ? Number(scheme.total_population) : 0;

      // Add to total population
      counts.totalPopulation += population;

      // Count MJP commissioned schemes
      if (scheme.mjp_commissioned === "Yes") {
        counts.mjpCommissioned++;
      } else {
        counts.mjpNotCommissioned++;
      }

      // Count all entries into above/below categories
      // If lpcdValue > 55, it's above55, otherwise (null, 0, or < 55) it's below55
      if (lpcdValue !== null && lpcdValue > 55) {
        counts.above55++;
        counts.above55Population += population;
      } else if (lpcdValue !== null) { // Only count defined values, not nulls
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
      } else if (lpcdValue >= 70) {
        counts.ranges["above70"]++;
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

  // Get LPCD status badge color
  const getLpcdStatusColor = (lpcdValue: number | null): string => {
    if (lpcdValue === null) return "bg-gray-200 text-gray-700";
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
  
  // Format LPCD date values (handle old date formats)
  const formatLpcdDate = (dateString: string): string => {
    // If the date already has slashes (e.g., "5/10/2025"), return it as is
    if (dateString.includes("/")) {
      // Replace 2001 with 2025 if needed
      if (dateString.includes("2001")) {
        return dateString.replace("2001", "2025");
      }
      return dateString;
    }
    
    // Handle dates like "29-Apr", "30-Apr", etc.
    if (dateString.includes("-")) {
      const parts = dateString.split("-");
      if (parts.length === 2) {
        const day = parts[0];
        const month = parts[1];
        
        // Map of month abbreviations to month numbers
        const monthMap: {[key: string]: string} = {
          "Jan": "1", "Feb": "2", "Mar": "3", "Apr": "4",
          "May": "5", "Jun": "6", "Jul": "7", "Aug": "8",
          "Sep": "9", "Oct": "10", "Nov": "11", "Dec": "12"
        };
        
        if (monthMap[month]) {
          return `${monthMap[month]}/${day}/2025`;
        }
      }
    }
    
    // For any other format, try to parse it or return with current year
    try {
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        // Set the year to current year (2025)
        parsedDate.setFullYear(2025);
        return parsedDate.toLocaleDateString();
      }
      
      // If all else fails, return with current date
      const currentDate = new Date();
      return currentDate.toLocaleDateString();
    } catch (e) {
      // If parsing fails, return with current date
      const currentDate = new Date();
      return currentDate.toLocaleDateString();
    }
  };
  
  // Get correct dashboard URL based on scheme details
  const getDashboardUrlForScheme = (scheme: SchemeLpcdData) => {
    // Check if it's the 105 Villages RRWSS scheme
    if (scheme.scheme_name === "105 Villages RRWSS" && scheme.scheme_id === "20003791") {
      // Base URL for PI Vision dashboard
      const BASE_URL = 'https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
      
      // Standard parameters for the dashboard
      const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';
      
      // Handle the special case for Amravati region (change to Amaravati in the URL)
      const regionDisplay = scheme.region === 'Amravati' ? 'Amaravati' : scheme.region;
      
      // Create the path without URL encoding
      const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block-${scheme.block}\\Scheme-${scheme.scheme_id} - ${scheme.scheme_name}`;
      
      // URL encode the path
      const encodedPath = encodeURIComponent(path);
      
      // Combine all parts to create the complete URL
      return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
    }
    
    // Return the original dashboard URL for other schemes
    return scheme.dashboard_url || '';
  };

  // Create LPCD badge component
  const LpcdBadge = ({ value }: { value: number | null }) => {
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${getLpcdStatusColor(value)}`}
      >
        {value === null ? "N/A" : 
         value === 0 ? "0L" : 
         `${Number(value).toFixed(2)}L`}
      </span>
    );
  };

  // Export to Excel
  const exportToExcel = () => {
    // Create workbook
    import("xlsx")
      .then((XLSX) => {
        // Filter data based on current filters
        const dataToExport = filteredSchemes.map((scheme, index) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return {
            "No.": index + 1,
            Region: scheme.region,
            Circle: scheme.circle,
            Division: scheme.division,
            "Sub Division": scheme.sub_division,
            Block: scheme.block,
            "Scheme ID": scheme.scheme_id,
            "Scheme Name": scheme.scheme_name,
            "Total Villages": scheme.total_villages,
            "Villages Above 55L": scheme.villages_above_55,
            "Villages Below 55L": scheme.villages_below_55,
            "Total Population": scheme.total_population,
            "MJP Commissioned": scheme.mjp_commissioned || "Unknown",
            "Current LPCD": lpcdValue !== null ? Number(lpcdValue).toFixed(2) : "N/A",
            Status: getLpcdStatusText(lpcdValue),
            "LPCD Day 1":
              scheme.lpcd_value_day1 !== null &&
              scheme.lpcd_value_day1 !== undefined
                ? Number(scheme.lpcd_value_day1).toFixed(2)
                : "N/A",
            "LPCD Day 2":
              scheme.lpcd_value_day2 !== null &&
              scheme.lpcd_value_day2 !== undefined
                ? Number(scheme.lpcd_value_day2).toFixed(2)
                : "N/A",
            "LPCD Day 3":
              scheme.lpcd_value_day3 !== null &&
              scheme.lpcd_value_day3 !== undefined
                ? Number(scheme.lpcd_value_day3).toFixed(2)
                : "N/A",
          };
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(dataToExport);

        // Create workbook and add the worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Scheme LPCD Data");

        // Create filename with region and current date
        const region = selectedRegion === "all" ? "All_Regions" : selectedRegion;
        const today = new Date().toISOString().split("T")[0];
        const filename = `Scheme_LPCD_${region}_${today}.xlsx`;

        // Save the file
        XLSX.writeFile(wb, filename);

        toast({
          title: "Export Successful",
          description: `Data exported to ${filename}`,
          variant: "default",
        });
      })
      .catch((error) => {
        console.error("Export error:", error);
        toast({
          title: "Export Failed",
          description: "There was an error exporting the data",
          variant: "destructive",
        });
      });
  };

  // Render the summary cards section
  const renderSummaryCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card 
          className="bg-blue-50 border-blue-100 shadow-sm hover:shadow-md cursor-pointer transition-all"
          onClick={() => handleFilterChange("all")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-900 text-lg">Schemes</CardTitle>
            <CardDescription className="text-blue-700">
              Total schemes in {selectedRegion === "all" ? "all regions" : selectedRegion}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold text-blue-900">
                {filterCounts.total}
              </span>
              <span className="text-sm text-blue-600">
                {isLoadingSchemes ? "Loading..." : "Schemes"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-green-50 border-green-100 shadow-sm hover:shadow-md cursor-pointer transition-all"
          onClick={() => handleFilterChange("above55")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-green-900 text-lg">
              Above 55 LPCD
            </CardTitle>
            <CardDescription className="text-green-700">
              Schemes with good water supply
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold text-green-900">
                {filterCounts.above55}
              </span>
              <span className="text-sm text-green-600">
                {Math.round((filterCounts.above55 / filterCounts.total) * 100) || 0}% of total
              </span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-red-50 border-red-100 shadow-sm hover:shadow-md cursor-pointer transition-all"
          onClick={() => handleFilterChange("below55")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-red-900 text-lg">Below 55 LPCD</CardTitle>
            <CardDescription className="text-red-700">
              Schemes needing attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold text-red-900">
                {filterCounts.below55}
              </span>
              <span className="text-sm text-red-600">
                {Math.round((filterCounts.below55 / filterCounts.total) * 100) || 0}% of total
              </span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-purple-50 border-purple-100 shadow-sm hover:shadow-md cursor-pointer transition-all"
          onClick={() => handleFilterChange("mjpYes")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-900 text-lg">
              MJP Commissioned
            </CardTitle>
            <CardDescription className="text-purple-700">
              Schemes with MJP commissioned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold text-purple-900">
                {filterCounts.mjpCommissioned}
              </span>
              <span className="text-sm text-purple-600">
                {Math.round((filterCounts.mjpCommissioned / filterCounts.total) * 100) || 0}% of total
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render filter buttons
  const renderFilterButtons = () => {
    return (
      <div className="mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={currentFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("all")}
              className="whitespace-nowrap"
            >
              All Schemes ({filterCounts.total})
            </Button>
            <Button
              variant={currentFilter === "above55" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("above55")}
              className="whitespace-nowrap"
            >
              Above 55 LPCD ({filterCounts.above55})
            </Button>
            <Button
              variant={currentFilter === "below55" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("below55")}
              className="whitespace-nowrap"
            >
              Below 55 LPCD ({filterCounts.below55})
            </Button>
            <Button
              variant={currentFilter === "noSupply" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("noSupply")}
              className="whitespace-nowrap"
            >
              No Water Supply
            </Button>
            <Button
              variant={currentFilter === "mjpYes" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("mjpYes")}
              className="whitespace-nowrap"
            >
              MJP Commissioned ({filterCounts.mjpCommissioned})
            </Button>
            <Button
              variant={currentFilter === "mjpNo" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("mjpNo")}
              className="whitespace-nowrap"
            >
              MJP Not Commissioned ({filterCounts.mjpNotCommissioned})
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="w-full py-6 container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg border-l-4 border-blue-600 shadow-sm">
          <h1 className="text-3xl font-bold text-blue-900">Scheme LPCD Dashboard</h1>
          <p className="text-blue-700 font-medium mt-1">
            Monitor water supply at scheme level (Litres Per Capita per Day)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Input
              type="search"
              placeholder="Search scheme name or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1); // Reset page on search
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
          
          {/* Commissioned Status Filter */}
          <Select
            value={commissionedFilter}
            onValueChange={(value) => {
              setCommissionedFilter(value);
              setPage(1);
              if (value === "No" && fullyCompletedFilter === "Fully Completed") {
                setFullyCompletedFilter("In Progress");
              }
            }}
          >
            <SelectTrigger className="w-[180px] bg-white border border-blue-200 shadow-sm">
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
            onValueChange={(value) => {
              setFullyCompletedFilter(value);
              setPage(1);
              if (value === "Fully Completed" && commissionedFilter !== "Yes") {
                setCommissionedFilter("Yes");
              }
            }}
          >
            <SelectTrigger className="w-[180px] bg-white border border-blue-200 shadow-sm">
              <SelectValue placeholder="Completion Status" />
            </SelectTrigger>
            <SelectContent className="border border-blue-100">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Fully Completed" disabled={commissionedFilter === "No"}>
                Fully Completed
              </SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
            </SelectContent>
          </Select>

          {/* Scheme Status Filter */}
          <Select
            value={schemeStatusFilter}
            onValueChange={(value) => {
              setSchemeStatusFilter(value);
              setPage(1);
            }}
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

      {/* Loading state */}
      {isLoadingSchemes && (
        <div className="flex justify-center my-12">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-blue-700">Loading scheme data...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {schemesError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md my-6">
          <h3 className="text-red-800 font-medium">Error loading data</h3>
          <p className="text-red-600 mt-1">
            {schemesError instanceof Error ? schemesError.message : "Unknown error"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-2 text-red-700 border-red-300 hover:bg-red-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      )}

      {/* Content - only show if not loading and no error */}
      {!isLoadingSchemes && !schemesError && (
        <>
          {/* Summary cards */}
          {renderSummaryCards()}

          {/* Filter buttons */}
          {renderFilterButtons()}

          {/* Data table */}
          <Card className="shadow-sm border-blue-100">
            <CardHeader className="bg-blue-50/50 px-6 py-4 border-b border-blue-100">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                <CardTitle className="text-blue-900">
                  {filteredSchemes.length} Scheme{filteredSchemes.length !== 1 ? 's' : ''} {currentFilter !== 'all' ? `• ${currentFilter}` : ''}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <Label htmlFor="rowsPerPage" className="text-sm text-blue-700">
                    Rows:
                  </Label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setPage(1); // Reset to first page
                    }}
                  >
                    <SelectTrigger
                      id="rowsPerPage"
                      className="w-[70px] h-8 text-sm bg-white"
                    >
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative overflow-x-auto rounded-md">
                <Table>
                  <TableHeader className="bg-blue-50/50">
                    <TableRow className="hover:bg-blue-50/80">
                      <TableHead className="w-[60px] font-medium">No.</TableHead>
                      <TableHead className="font-medium">Scheme Name</TableHead>
                      <TableHead className="font-medium">Region</TableHead>
                      <TableHead className="font-medium">Block</TableHead>
                      <TableHead className="font-medium">Villages</TableHead>
                      <TableHead className="font-medium">Population</TableHead>
                      <TableHead className="font-medium">LPCD</TableHead>
                      <TableHead className="font-medium">MJP</TableHead>
                      <TableHead className="font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSchemes.length > 0 ? (
                      paginatedSchemes.map((scheme, index) => {
                        const lpcdValue = getLatestLpcdValue(scheme);
                        const currentIndex = (page - 1) * itemsPerPage + index + 1;

                        return (
                          <TableRow
                            key={`${scheme.scheme_id}-${index}`}
                            className="hover:bg-blue-50/50"
                          >
                            <TableCell className="text-gray-500 font-medium">
                              {currentIndex}
                            </TableCell>
                            <TableCell className="font-medium text-blue-800">
                              {scheme.scheme_name || "Unnamed Scheme"}
                              <div className="text-gray-500 text-xs mt-1">
                                ID: {scheme.scheme_id || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{scheme.region || "N/A"}</span>
                              <div className="text-xs text-gray-500 mt-1">
                                {scheme.circle || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>{scheme.block || "N/A"}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{scheme.total_villages || "0"}</span>
                                <div className="text-xs flex gap-1 mt-1">
                                  <span className="text-green-600">↑{scheme.villages_above_55}</span>
                                  <span className="text-red-600">↓{scheme.villages_below_55}</span>
                                  {scheme.villages_zero_supply > 0 && 
                                    <span className="text-gray-500">0:{scheme.villages_zero_supply}</span>
                                  }
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {scheme.total_population?.toLocaleString() || "0"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <LpcdBadge value={lpcdValue} />
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`${
                                  scheme.mjp_commissioned === "Yes"
                                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                }`}
                              >
                                {scheme.mjp_commissioned || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle className="text-xl">
                                        {scheme.scheme_name}
                                      </DialogTitle>
                                      <DialogDescription className="text-sm">
                                        Scheme ID: {scheme.scheme_id} • Region: {scheme.region} • Block: {scheme.block}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                      <div className="space-y-4">
                                        <div>
                                          <h3 className="font-medium text-gray-700 mb-1">Location Details</h3>
                                          <p><span className="font-medium">Region:</span> {scheme.region || "N/A"}</p>
                                          <p><span className="font-medium">Circle:</span> {scheme.circle || "N/A"}</p>
                                          <p><span className="font-medium">Division:</span> {scheme.division || "N/A"}</p>
                                          <p><span className="font-medium">Sub Division:</span> {scheme.sub_division || "N/A"}</p>
                                          <p><span className="font-medium">Block:</span> {scheme.block || "N/A"}</p>
                                        </div>
                                        <div>
                                          <h3 className="font-medium text-gray-700 mb-1">Key Metrics</h3>
                                          <p><span className="font-medium">Total Population:</span> {scheme.total_population?.toLocaleString() || "0"}</p>
                                          <p><span className="font-medium">Total Villages:</span> {scheme.total_villages}</p>
                                          <p><span className="font-medium">Villages Above 55 LPCD:</span> {scheme.villages_above_55}</p>
                                          <p><span className="font-medium">Villages Below 55 LPCD:</span> {scheme.villages_below_55}</p>
                                        </div>
                                        <div>
                                          <h3 className="font-medium text-gray-700 mb-1">Current Status</h3>
                                          <p><span className="font-medium">MJP Commissioned:</span> {scheme.mjp_commissioned || "Unknown"}</p>
                                          <p><span className="font-medium">Current LPCD:</span> {lpcdValue !== null ? Number(lpcdValue).toFixed(2) + "L" : "N/A"}</p>
                                          <p><span className="font-medium">Water Supply Status:</span> {getLpcdStatusText(lpcdValue)}</p>
                                        </div>
                                      </div>
                                      <div className="space-y-4">
                                        <div>
                                          <h3 className="font-medium text-gray-700 mb-2">LPCD History</h3>
                                          <div className="space-y-2">
                                            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                                              const value = scheme[`lpcd_value_day${day}` as keyof SchemeLpcdData] as number;
                                              const date = scheme[`lpcd_date_day${day}` as keyof SchemeLpcdData] as string;
                                              if (value === undefined || value === null) return null;
                                              
                                              return (
                                                <div key={`day-${day}`} className="flex justify-between items-center p-2 rounded bg-blue-50">
                                                  <span className="text-sm text-gray-600">
                                                    {date ? formatLpcdDate(date) : `Day ${day}`}
                                                  </span>
                                                  <LpcdBadge value={value} />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        
                                        {scheme.dashboard_url && (
                                          <div className="mt-4">
                                            <h3 className="font-medium text-gray-700 mb-2">PI Vision Dashboard</h3>
                                            <a
                                              href={getDashboardUrlForScheme(scheme)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                                            >
                                              <ExternalLink className="h-4 w-4 mr-2" />
                                              Open PI Vision Dashboard
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                {scheme.dashboard_url && (
                                  <a
                                    href={scheme.dashboard_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="Open PI Vision Dashboard"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-gray-500"
                        >
                          {searchQuery
                            ? "No schemes match the search criteria"
                            : "No schemes available for the selected filter"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            
            {/* Pagination */}
            {filteredSchemes.length > 0 && (
              <CardFooter className="flex justify-between px-6 py-4 border-t border-blue-100">
                <div className="text-sm text-blue-600">
                  Showing {(page - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(page * itemsPerPage, filteredSchemes.length)} of{" "}
                  {filteredSchemes.length} schemes
                </div>
                <Pagination>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-800">
                      Page {page} of {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Pagination>
              </CardFooter>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default SchemeLpcdDashboard;