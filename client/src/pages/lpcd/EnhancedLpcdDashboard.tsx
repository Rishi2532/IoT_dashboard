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
  ExternalLink,
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
  consistent_zero_lpcd_for_a_week: number;
  below_55_lpcd_count: number;
  above_55_lpcd_count: number;
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
  | "consistentlyAbove55"
  | "consistentlyBelow55";

const EnhancedLpcdDashboard = () => {
  const { toast } = useToast();

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [currentFilter, setCurrentFilter] = useState<LpcdRange>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      
      if (selectedRegion && selectedRegion !== 'all') {
        params.append('region', selectedRegion);
      }
      
      const queryString = params.toString();
      const url = `/api/water-scheme-data${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching LPCD data with URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch LPCD data');
      }
      
      const data = await response.json();
      console.log(`Received ${data.length} LPCD records`);
      return data;
    }
  });

  // Fetch region data
  const { data: regionsData = [], isLoading: isLoadingRegions } = useQuery<
    RegionData[]
  >({
    queryKey: ["/api/regions"],
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
  const getLatestWaterSupplyValue = (scheme: WaterSchemeData): number | null => {
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

  // Apply filters
  const getFilteredSchemes = () => {
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

  // Calculate filter counts
  const getFilterCounts = () => {
    const counts = {
      total: allWaterSchemeData.length,
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
        above70: 0,
      },
      consistentlyAbove55: 0,
      consistentlyBelow55: 0,
    };

    if (!allWaterSchemeData) return counts;

    // Update total count
    counts.total = allWaterSchemeData.length;

    // Count schemes in each category
    allWaterSchemeData.forEach((scheme) => {
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
      } else if (lpcdValue >= 70) {
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

  // Get LPCD status badge color
  const getLpcdStatusColor = (lpcdValue: number | null): string => {
    if (lpcdValue === null) return "bg-gray-200 text-gray-700";
    if (lpcdValue >= 70) return "bg-green-700 text-white";
    if (lpcdValue >= 65) return "bg-green-600 text-white";
    if (lpcdValue >= 60) return "bg-green-500 text-white";
    if (lpcdValue >= 55) return "bg-green-400 text-white";
    if (lpcdValue >= 45) return "bg-yellow-400 text-black";
    if (lpcdValue >= 35) return "bg-yellow-500 text-black";
    if (lpcdValue >= 25) return "bg-orange-400 text-white";
    if (lpcdValue >= 15) return "bg-orange-500 text-white";
    if (lpcdValue > 0) return "bg-red-500 text-white";
    return "bg-gray-800 text-white";
  };

  // Simplified status text (only High or Low)
  const getLpcdStatusText = (lpcdValue: number | null): string => {
    if (lpcdValue === null) return "No Data";
    if (lpcdValue === 0) return "No Water";
    if (lpcdValue >= 55) return "High";
    return "Low";
  };

  // Create LPCD badge component
  const LpcdBadge = ({ value }: { value: number | null }) => {
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${getLpcdStatusColor(value)}`}
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
            "Village Name": scheme.village_name,
            Population: scheme.population,
            "Current LPCD": lpcdValue !== null ? lpcdValue.toFixed(2) : "N/A",
            Status: getLpcdStatusText(lpcdValue),
            "Days Above 55L": scheme.above_55_lpcd_count || 0,
            "Days Below 55L": scheme.below_55_lpcd_count || 0,
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
            "LPCD Day 4":
              scheme.lpcd_value_day4 !== null &&
              scheme.lpcd_value_day4 !== undefined
                ? Number(scheme.lpcd_value_day4).toFixed(2)
                : "N/A",
            "LPCD Day 5":
              scheme.lpcd_value_day5 !== null &&
              scheme.lpcd_value_day5 !== undefined
                ? Number(scheme.lpcd_value_day5).toFixed(2)
                : "N/A",
            "LPCD Day 6":
              scheme.lpcd_value_day6 !== null &&
              scheme.lpcd_value_day6 !== undefined
                ? Number(scheme.lpcd_value_day6).toFixed(2)
                : "N/A",
            "LPCD Day 7":
              scheme.lpcd_value_day7 !== null &&
              scheme.lpcd_value_day7 !== undefined
                ? Number(scheme.lpcd_value_day7).toFixed(2)
                : "N/A",
            "Date Day 1": scheme.lpcd_date_day1 || "N/A",
            "Date Day 2": scheme.lpcd_date_day2 || "N/A",
            "Date Day 3": scheme.lpcd_date_day3 || "N/A",
            "Date Day 4": scheme.lpcd_date_day4 || "N/A",
            "Date Day 5": scheme.lpcd_date_day5 || "N/A",
            "Date Day 6": scheme.lpcd_date_day6 || "N/A",
            "Date Day 7": scheme.lpcd_date_day7 || "N/A",
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

  // Village Details Component
  const VillageDetailsDialog = () => {
    if (!selectedVillage) return null;

    const lpcdValue = getLatestLpcdValue(selectedVillage);
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
                    onClick={() => window.open(selectedVillage.dashboard_url, '_blank')}
                  >
                    <BarChart className="h-4 w-4 mr-1" /> PI Vision Dashboard
                  </Button>
                )}
              </div>
              <LpcdBadge value={lpcdValue} />
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
                        className={`p-3 rounded-md text-center ${value !== null ? getLpcdStatusColor(value) : "bg-gray-100"}`}
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
                  Water Consumption (MLD)
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((day) => {
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
                  className={`${daysBelowCount > 0 ? "bg-red-50" : "bg-gray-50"} border border-red-100`}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-600">Days Below 55L LPCD</p>
                    <p
                      className={`text-2xl font-bold ${daysBelowCount > 0 ? "text-red-600" : "text-gray-600"}`}
                    >
                      {daysBelowCount}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`${daysAboveCount > 0 ? "bg-green-50" : "bg-gray-50"} border border-green-100`}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-600">Days Above 55L LPCD</p>
                    <p
                      className={`text-2xl font-bold ${daysAboveCount > 0 ? "text-green-600" : "text-gray-600"}`}
                    >
                      {daysAboveCount}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`${consistentZeroLpcd === 1 ? "bg-gray-800" : "bg-gray-50"}`}
                >
                  <CardContent className="p-4 text-center">
                    <p
                      className={`text-sm ${consistentZeroLpcd === 1 ? "text-gray-300" : "text-gray-600"}`}
                    >
                      Zero Water for Week
                    </p>
                    <p
                      className={`text-2xl font-bold ${consistentZeroLpcd === 1 ? "text-white" : "text-gray-600"}`}
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">LPCD Dashboard</h1>
          <p className="text-gray-600">
            Monitor water supply across villages (Litres Per Capita per Day)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Input
              type="search"
              placeholder="Search scheme or village name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1); // Reset page on search
              }}
              className="pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[180px] bg-white border-2 border-gray-300 shadow-sm">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regionsData.map((region) => (
                <SelectItem key={region.region_id} value={region.region_name}>
                  {region.region_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={exportToExcel}
            title="Export to Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setShowCharts(!showCharts)}>
            {showCharts ? "Hide Charts" : "Show Charts"}
          </Button>
        </div>
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
              className="w-full max-w-md mx-auto cursor-pointer hover:shadow-md transition-shadow duration-300"
              onClick={() => {
                setCurrentFilter("all");
                setSearchQuery("");
              }}
            >
              <CardHeader className="bg-primary/10 pb-2">
                <CardTitle className="text-center text-xl">
                  Total Villages Covered Under LPCD till date
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-4">
                <p className="text-5xl font-bold text-center text-primary">
                  {filterCounts.total}
                </p>
                <div className="flex justify-center mt-2">
                  <p className="text-lg font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-md">
                    Total Population:{" "}
                    {filterCounts.totalPopulation.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Main Cards Row - Above/Below 55L */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Villages with LPCD > 55L */}
              <Card className="border-green-200">
                <CardHeader className="bg-green-50 pb-2">
                  <CardTitle className="text-center text-xl text-green-800">
                    Villages with LPCD &gt; 55L
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <p className="text-5xl font-bold text-center text-green-600">
                    {filterCounts.above55}
                  </p>
                  <p className="text-sm text-center text-gray-600 mt-2">
                    Population:{" "}
                    {filterCounts.above55Population.toLocaleString()}
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-green-700 hover:text-green-800 hover:bg-green-100"
                    onClick={() => handleFilterChange("above55")}
                  >
                    View Villages
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
                        onClick={() => handleFilterChange("above70")}
                      >
                        <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                          <span className="text-sm text-green-700">
                            LPCD &gt; 70L
                          </span>
                          <span className="font-medium text-green-700">
                            {filterCounts.ranges["above70"]}
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  </CardFooter>
                )}
              </Card>

              {/* Villages with LPCD < 55L */}
              <Card className="border-red-200">
                <CardHeader className="bg-red-50 pb-2">
                  <CardTitle className="text-center text-xl text-red-800">
                    Villages with LPCD &lt; 55L
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <p className="text-5xl font-bold text-center text-red-600">
                    {filterCounts.below55}
                  </p>
                  <p className="text-sm text-center text-gray-600 mt-2">
                    Population:{" "}
                    {filterCounts.below55Population.toLocaleString()}
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-red-700 hover:text-red-800 hover:bg-red-100"
                    onClick={() => handleFilterChange("below55")}
                  >
                    View Villages
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
                            {
                              allWaterSchemeData.filter(scheme => hasNoCurrentWaterSupply(scheme)).length
                            }
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
            </div>

            {/* Bottom Cards Row - Consistent Trends */}
            {showCharts && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Consistently Above 55L LPCD */}
                <Card
                  className="border-blue-200"
                  onClick={() => handleFilterChange("consistentlyAbove55")}
                >
                  <CardContent className="p-4 flex justify-between items-center cursor-pointer hover:bg-blue-50">
                    <span className="text-blue-700">
                      Villages consistently above 55L LPCD for the week
                    </span>
                    <span className="text-xl font-bold text-blue-700">
                      {filterCounts.consistentlyAbove55}
                    </span>
                  </CardContent>
                </Card>

                {/* Consistently Below 55L LPCD */}
                <Card
                  className="border-orange-200"
                  onClick={() => handleFilterChange("consistentlyBelow55")}
                >
                  <CardContent className="p-4 flex justify-between items-center cursor-pointer hover:bg-orange-50">
                    <span className="text-orange-700">
                      Villages consistently below 55L LPCD for the week
                    </span>
                    <span className="text-xl font-bold text-orange-700">
                      {filterCounts.consistentlyBelow55}
                    </span>
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
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Region</TableHead>
                            <TableHead>Scheme Name</TableHead>
                            <TableHead>Village</TableHead>
                            <TableHead>Population</TableHead>
                            <TableHead>Current LPCD</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[120px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSchemes.map((scheme, index) => {
                            const lpcdValue = getLatestLpcdValue(scheme);
                            return (
                              <TableRow
                                key={`${scheme.scheme_id}-${scheme.village_name}`}
                              >
                                <TableCell className="font-medium">
                                  {(page - 1) * itemsPerPage + index + 1}
                                </TableCell>
                                <TableCell>{scheme.region}</TableCell>
                                <TableCell>{scheme.scheme_name}</TableCell>
                                <TableCell>{scheme.village_name}</TableCell>
                                <TableCell>
                                  {scheme.population?.toLocaleString() || "N/A"}
                                </TableCell>
                                <TableCell>
                                  <LpcdBadge value={lpcdValue} />
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`${getLpcdStatusColor(lpcdValue)} border-0`}
                                  >
                                    {getLpcdStatusText(lpcdValue)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewVillage(scheme)}
                                      title="View Details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {scheme.dashboard_url && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(scheme.dashboard_url, '_blank')}
                                        title="Open PI Vision Dashboard"
                                      >
                                        <BarChart className="h-4 w-4" />
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
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                          Showing {(page - 1) * itemsPerPage + 1} to{" "}
                          {Math.min(
                            page * itemsPerPage,
                            filteredSchemes.length,
                          )}{" "}
                          of {filteredSchemes.length} entries
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                          >
                            Previous
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
                          >
                            Next
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
