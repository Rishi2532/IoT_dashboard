import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
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
import { ArrowUpDown, Filter, RefreshCw } from "lucide-react";
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
}

export interface RegionData {
  region_id: number;
  region_name: string;
}

type LpcdRange = 
  | 'all'
  | 'above55'
  | 'below55'
  | '45to55'
  | '35to45'
  | '25to35'
  | '15to25'
  | '0to15'
  | '55to60'
  | '60to65'
  | '65to70'
  | 'above70'
  | 'consistentlyAbove55'
  | 'consistentlyBelow55';

const EnhancedLpcdDashboard: React.FC = () => {
  const { toast } = useToast();
  
  // Filter state
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [currentFilter, setCurrentFilter] = useState<LpcdRange>('all');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Fetch all water scheme data
  const { 
    data: allWaterSchemeData = [], 
    isLoading: isLoadingSchemes, 
    error: schemesError,
    refetch
  } = useQuery<WaterSchemeData[]>({
    queryKey: ['/api/water-scheme-data'],
  });
  
  // Fetch region data
  const { 
    data: regionsData = [], 
    isLoading: isLoadingRegions 
  } = useQuery<RegionData[]>({
    queryKey: ['/api/regions'],
  });
  
  // Get latest LPCD value
  const getLatestLpcdValue = (scheme: WaterSchemeData): number | null => {
    // Try to get the latest non-null value
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
      const value = scheme[`lpcd_value_day${day}` as keyof WaterSchemeData];
      if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
        return Number(value);
      }
    }
    return null;
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
      scheme.lpcd_value_day7
    ].filter(val => val !== undefined && val !== null && !isNaN(Number(val)))
     .map(val => Number(val));
  };
  
  // Check if all values are consistently above/below threshold
  const isConsistentlyAboveThreshold = (scheme: WaterSchemeData, threshold: number): boolean => {
    const values = extractLpcdValues(scheme);
    if (values.length === 0) return false;
    return values.every(val => val > threshold);
  };
  
  const isConsistentlyBelowThreshold = (scheme: WaterSchemeData, threshold: number): boolean => {
    const values = extractLpcdValues(scheme);
    if (values.length === 0) return false;
    return values.every(val => val < threshold && val > 0);
  };
  
  // Apply filters
  const getFilteredSchemes = () => {
    if (!allWaterSchemeData) return [];
    
    let filtered = [...allWaterSchemeData];
    
    // Filter by region
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(scheme => scheme.region === selectedRegion);
    }
    
    // Apply LPCD range filter
    switch (currentFilter) {
      case 'all':
        // No additional filtering needed
        break;
      case 'above55':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue > 55;
        });
        break;
      case 'below55':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue > 0 && lpcdValue < 55;
        });
        break;
      case '45to55':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 45 && lpcdValue < 55;
        });
        break;
      case '35to45':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 35 && lpcdValue < 45;
        });
        break;
      case '25to35':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 25 && lpcdValue < 35;
        });
        break;
      case '15to25':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 15 && lpcdValue < 25;
        });
        break;
      case '0to15':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue > 0 && lpcdValue < 15;
        });
        break;
      case '55to60':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 55 && lpcdValue < 60;
        });
        break;
      case '60to65':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 60 && lpcdValue < 65;
        });
        break;
      case '65to70':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 65 && lpcdValue < 70;
        });
        break;
      case 'above70':
        filtered = filtered.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 70;
        });
        break;
      case 'consistentlyAbove55':
        filtered = filtered.filter(scheme => isConsistentlyAboveThreshold(scheme, 55));
        break;
      case 'consistentlyBelow55':
        filtered = filtered.filter(scheme => isConsistentlyBelowThreshold(scheme, 55));
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
      ranges: {
        '45to55': 0,
        '35to45': 0,
        '25to35': 0,
        '15to25': 0,
        '0to15': 0,
        '55to60': 0,
        '60to65': 0,
        '65to70': 0,
        'above70': 0
      },
      consistentlyAbove55: 0,
      consistentlyBelow55: 0
    };
    
    if (!allWaterSchemeData) return counts;
    
    // Apply region filter first
    let regionFiltered = [...allWaterSchemeData];
    if (selectedRegion !== 'all') {
      regionFiltered = regionFiltered.filter(scheme => scheme.region === selectedRegion);
    }
    
    // Count schemes in each category
    regionFiltered.forEach(scheme => {
      const lpcdValue = getLatestLpcdValue(scheme);
      if (lpcdValue === null) return;
      
      // Above/Below 55
      if (lpcdValue > 55) {
        counts.above55++;
      } else if (lpcdValue > 0) {
        counts.below55++;
      }
      
      // LPCD ranges (below 55)
      if (lpcdValue >= 45 && lpcdValue < 55) {
        counts.ranges['45to55']++;
      } else if (lpcdValue >= 35 && lpcdValue < 45) {
        counts.ranges['35to45']++;
      } else if (lpcdValue >= 25 && lpcdValue < 35) {
        counts.ranges['25to35']++;
      } else if (lpcdValue >= 15 && lpcdValue < 25) {
        counts.ranges['15to25']++;
      } else if (lpcdValue > 0 && lpcdValue < 15) {
        counts.ranges['0to15']++;
      }
      
      // LPCD ranges (above 55)
      if (lpcdValue >= 55 && lpcdValue < 60) {
        counts.ranges['55to60']++;
      } else if (lpcdValue >= 60 && lpcdValue < 65) {
        counts.ranges['60to65']++;
      } else if (lpcdValue >= 65 && lpcdValue < 70) {
        counts.ranges['65to70']++;
      } else if (lpcdValue >= 70) {
        counts.ranges['above70']++;
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
    page * itemsPerPage
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
  
  const getLpcdStatusText = (lpcdValue: number | null): string => {
    if (lpcdValue === null) return "No Data";
    if (lpcdValue === 0) return "No Water";
    if (lpcdValue >= 55) return "Good";
    if (lpcdValue >= 40) return "Moderate";
    if (lpcdValue > 0) return "Low";
    return "Unknown";
  };
  
  // Create LPCD badge component
  const LpcdBadge = ({ value }: { value: number | null }) => {
    return (
      <span 
        className={`px-2 py-1 rounded-full text-xs font-medium ${getLpcdStatusColor(value)}`}
      >
        {value !== null ? `${value.toFixed(1)}L` : 'N/A'}
      </span>
    );
  };
  
  const NoDataMessage = () => (
    <div className="text-center p-8">
      <h3 className="text-lg font-medium text-gray-600">No villages match the selected criteria</h3>
      <p className="text-gray-500 mt-2">Try selecting a different filter or region</p>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => {
          setCurrentFilter('all');
          setSelectedRegion('all');
        }}
      >
        Reset Filters
      </Button>
    </div>
  );

  // Check if there was an error loading the scheme data
  useEffect(() => {
    if (schemesError) {
      toast({
        title: "Error loading water scheme data",
        description: "There was a problem loading the water scheme data. Please try again.",
        variant: "destructive",
      });
    }
  }, [schemesError, toast]);

  return (
    <div className="w-full py-6 container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">LPCD Dashboard</h1>
          <p className="text-gray-600">Monitor water supply across villages (Litres Per Capita per Day)</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[180px]">
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
        </div>
      </div>
      
      {isLoadingSchemes || isLoadingRegions ? (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Main Dashboard Grid */}
          <div className="space-y-6">
            {/* Top Card - Total Villages */}
            <Card className="w-full max-w-md mx-auto">
              <CardHeader className="bg-primary/10 pb-2">
                <CardTitle className="text-center text-xl">Total Villages Under LPCD</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-4">
                <p className="text-5xl font-bold text-center text-primary">
                  {filterCounts.total}
                </p>
              </CardContent>
            </Card>
            
            {/* Main Cards Row - Above/Below 55L */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Villages with LPCD > 55L */}
              <Card className="border-green-200">
                <CardHeader className="bg-green-50 pb-2">
                  <CardTitle className="text-center text-xl text-green-800">Villages with LPCD &gt; 55L</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <p className="text-5xl font-bold text-center text-green-600">
                    {filterCounts.above55}
                  </p>
                  <Button 
                    variant="ghost" 
                    className="w-full mt-4 text-green-700 hover:text-green-800 hover:bg-green-100"
                    onClick={() => handleFilterChange('above55')}
                  >
                    View Villages
                  </Button>
                </CardContent>
                
                {/* Subcategory cards for LPCD > 55L */}
                <CardFooter className="pt-0 pb-4">
                  <div className="w-full grid grid-cols-1 gap-2">
                    <Card className="border-green-100" onClick={() => handleFilterChange('55to60')}>
                      <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                        <span className="text-sm text-green-700">LPCD 55-60L</span>
                        <span className="font-medium text-green-700">{filterCounts.ranges['55to60']}</span>
                      </CardContent>
                    </Card>
                    <Card className="border-green-100" onClick={() => handleFilterChange('60to65')}>
                      <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                        <span className="text-sm text-green-700">LPCD 60-65L</span>
                        <span className="font-medium text-green-700">{filterCounts.ranges['60to65']}</span>
                      </CardContent>
                    </Card>
                    <Card className="border-green-100" onClick={() => handleFilterChange('65to70')}>
                      <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                        <span className="text-sm text-green-700">LPCD 65-70L</span>
                        <span className="font-medium text-green-700">{filterCounts.ranges['65to70']}</span>
                      </CardContent>
                    </Card>
                    <Card className="border-green-100" onClick={() => handleFilterChange('above70')}>
                      <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                        <span className="text-sm text-green-700">LPCD &gt; 70L</span>
                        <span className="font-medium text-green-700">{filterCounts.ranges['above70']}</span>
                      </CardContent>
                    </Card>
                  </div>
                </CardFooter>
              </Card>
              
              {/* Villages with LPCD < 55L */}
              <Card className="border-red-200">
                <CardHeader className="bg-red-50 pb-2">
                  <CardTitle className="text-center text-xl text-red-800">Villages with LPCD &lt; 55L</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <p className="text-5xl font-bold text-center text-red-600">
                    {filterCounts.below55}
                  </p>
                  <Button 
                    variant="ghost" 
                    className="w-full mt-4 text-red-700 hover:text-red-800 hover:bg-red-100"
                    onClick={() => handleFilterChange('below55')}
                  >
                    View Villages
                  </Button>
                </CardContent>
                
                {/* Subcategory cards for LPCD < 55L */}
                <CardFooter className="pt-0 pb-4">
                  <div className="w-full grid grid-cols-1 gap-2">
                    <Card className="border-red-100" onClick={() => handleFilterChange('45to55')}>
                      <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                        <span className="text-sm text-red-700">LPCD 45-55L</span>
                        <span className="font-medium text-red-700">{filterCounts.ranges['45to55']}</span>
                      </CardContent>
                    </Card>
                    <Card className="border-red-100" onClick={() => handleFilterChange('35to45')}>
                      <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                        <span className="text-sm text-red-700">LPCD 35-45L</span>
                        <span className="font-medium text-red-700">{filterCounts.ranges['35to45']}</span>
                      </CardContent>
                    </Card>
                    <Card className="border-red-100" onClick={() => handleFilterChange('25to35')}>
                      <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                        <span className="text-sm text-red-700">LPCD 25-35L</span>
                        <span className="font-medium text-red-700">{filterCounts.ranges['25to35']}</span>
                      </CardContent>
                    </Card>
                    <Card className="border-red-100" onClick={() => handleFilterChange('15to25')}>
                      <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                        <span className="text-sm text-red-700">LPCD 15-25L</span>
                        <span className="font-medium text-red-700">{filterCounts.ranges['15to25']}</span>
                      </CardContent>
                    </Card>
                    <Card className="border-red-100" onClick={() => handleFilterChange('0to15')}>
                      <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                        <span className="text-sm text-red-700">LPCD 0-15L</span>
                        <span className="font-medium text-red-700">{filterCounts.ranges['0to15']}</span>
                      </CardContent>
                    </Card>
                  </div>
                </CardFooter>
              </Card>
            </div>
            
            {/* Bottom Cards Row - Consistent Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Consistently Above 55L LPCD */}
              <Card className="border-blue-200" onClick={() => handleFilterChange('consistentlyAbove55')}>
                <CardContent className="p-4 flex justify-between items-center cursor-pointer hover:bg-blue-50">
                  <span className="text-blue-700">Villages consistently above 55L LPCD for the week</span>
                  <span className="text-xl font-bold text-blue-700">{filterCounts.consistentlyAbove55}</span>
                </CardContent>
              </Card>
              
              {/* Consistently Below 55L LPCD */}
              <Card className="border-orange-200" onClick={() => handleFilterChange('consistentlyBelow55')}>
                <CardContent className="p-4 flex justify-between items-center cursor-pointer hover:bg-orange-50">
                  <span className="text-orange-700">Villages consistently below 55L LPCD for the week</span>
                  <span className="text-xl font-bold text-orange-700">{filterCounts.consistentlyBelow55}</span>
                </CardContent>
              </Card>
            </div>
            
            {/* Results Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {currentFilter === 'all' 
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSchemes.map((scheme, index) => {
                            const lpcdValue = getLatestLpcdValue(scheme);
                            return (
                              <TableRow key={`${scheme.scheme_id}-${scheme.village_name}`}>
                                <TableCell className="font-medium">{(page - 1) * itemsPerPage + index + 1}</TableCell>
                                <TableCell>{scheme.region}</TableCell>
                                <TableCell>{scheme.scheme_name}</TableCell>
                                <TableCell>{scheme.village_name}</TableCell>
                                <TableCell>{scheme.population?.toLocaleString() || 'N/A'}</TableCell>
                                <TableCell>
                                  <LpcdBadge value={lpcdValue} />
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`${getLpcdStatusColor(lpcdValue)} border-0`}>
                                    {getLpcdStatusText(lpcdValue)}
                                  </Badge>
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
                          Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredSchemes.length)} of {filteredSchemes.length} entries
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
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                                variant={page === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
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