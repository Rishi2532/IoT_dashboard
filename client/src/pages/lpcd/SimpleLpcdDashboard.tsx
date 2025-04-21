import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Filter, Download, FileSpreadsheet, MoreHorizontal, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

// Import the Village Detail Dialog component
import VillageDetailDialog from './VillageDetailDialog';

// Define interface for water scheme data
interface WaterSchemeData {
  scheme_id: string;
  region?: string;
  circle?: string;
  division?: string;
  sub_division?: string;
  block?: string;
  scheme_name?: string;
  village_name?: string;
  population?: number;
  number_of_esr?: number;
  water_value_day1?: number | string;
  water_value_day2?: number | string;
  water_value_day3?: number | string;
  water_value_day4?: number | string;
  water_value_day5?: number | string;
  water_value_day6?: number | string;
  lpcd_value_day1?: number | string;
  lpcd_value_day2?: number | string;
  lpcd_value_day3?: number | string;
  lpcd_value_day4?: number | string;
  lpcd_value_day5?: number | string;
  lpcd_value_day6?: number | string;
  lpcd_value_day7?: number | string;
  // Date fields
  water_date_day1?: string;
  water_date_day2?: string;
  water_date_day3?: string;
  water_date_day4?: string;
  water_date_day5?: string;
  water_date_day6?: string;
  lpcd_date_day1?: string;
  lpcd_date_day2?: string;
  lpcd_date_day3?: string;
  lpcd_date_day4?: string;
  lpcd_date_day5?: string;
  lpcd_date_day6?: string;
  lpcd_date_day7?: string;
  consistent_zero_lpcd_for_a_week?: number | boolean;
  below_55_lpcd_count?: number;
  above_55_lpcd_count?: number;
}

// Define interface for region data
interface RegionData {
  region_id: number;
  region_name: string;
}

// Define filter types
type LpcdFilterType = 'all' | 'above55' | 'below55' | '40to55' | 'zerosupply' | 'below40';

const SimpleLpcdDashboard: React.FC = () => {
  const { toast } = useToast();
  
  // Filter state
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [currentFilter, setCurrentFilter] = useState<LpcdFilterType>('all');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Fetch all water scheme data
  const { 
    data: allWaterSchemeData = [], 
    isLoading: isLoadingSchemes, 
    error: schemesError
  } = useQuery<WaterSchemeData[]>({
    queryKey: ['/api/water-scheme-data'],
  });
  
  // Fetch region data
  const { 
    data: regionsData = []
  } = useQuery<RegionData[]>({
    queryKey: ['/api/regions'],
  });
  
  // Helper function to get the latest LPCD value
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
  
  // Helper function to get the latest water value
  const getLatestWaterValue = (scheme: WaterSchemeData): number | null => {
    // Try to get the latest non-null value
    for (const day of [6, 5, 4, 3, 2, 1]) {
      const value = scheme[`water_value_day${day}` as keyof WaterSchemeData];
      if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
        return Number(value);
      }
    }
    return null;
  };
  
  // Apply different filter types to the data
  const filteredData = useMemo(() => {
    console.log('Current filter:', currentFilter);
    let result = [...allWaterSchemeData];
    
    // Apply region filter
    if (selectedRegion !== 'all') {
      result = result.filter(scheme => scheme.region === selectedRegion);
    }
    
    // Apply LPCD filters
    switch (currentFilter) {
      case 'above55':
        // Only include schemes with latest LPCD value >= 55
        result = result.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 55;
        });
        break;
        
      case 'below55':
        // Only include schemes with latest LPCD value < 55 and > 0
        result = result.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue > 0 && lpcdValue < 55;
        });
        break;
        
      case 'below40':
        // Only include schemes with latest LPCD value < 40 and > 0
        result = result.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue > 0 && lpcdValue < 40;
        });
        break;
        
      case '40to55':
        // Only include schemes with latest LPCD value between 40-55
        result = result.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 40 && lpcdValue <= 55;
        });
        break;
        
      case 'zerosupply':
        // Only include schemes with latest LPCD value = 0
        result = result.filter(scheme => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue === 0;
        });
        break;
        
      case 'all':
      default:
        // No additional filtering
        break;
    }
    
    console.log(`After applying filter ${currentFilter}, results:`, result.length);
    return result;
  }, [allWaterSchemeData, selectedRegion, currentFilter]);
  
  // Calculate pagination data
  const paginationData = useMemo(() => {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentPageData = filteredData.slice(startIndex, endIndex);
    
    return { totalItems, totalPages, startIndex, endIndex, currentPageData };
  }, [filteredData, page, itemsPerPage]);
  
  const { totalItems, totalPages, startIndex, endIndex, currentPageData } = paginationData;
  
  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedRegion, currentFilter]);
  
  // Handle filter changes
  const handleRegionChange = (value: string) => {
    setSelectedRegion(value);
  };
  
  const handleFilterChange = (filter: LpcdFilterType) => {
    setCurrentFilter(filter);
  };
  
  // Extract LPCD values function
  const extractLpcdValues = (scheme: WaterSchemeData): number[] => {
    return [
      scheme.lpcd_value_day1,
      scheme.lpcd_value_day2,
      scheme.lpcd_value_day3,
      scheme.lpcd_value_day4,
      scheme.lpcd_value_day5,
      scheme.lpcd_value_day6,
      scheme.lpcd_value_day7
    ].map(val => {
      if (val === undefined || val === null || val === '' || isNaN(Number(val))) {
        return 0;
      }
      return Number(val);
    });
  };
  
  // Calculate LPCD counts for detail view
  const calculateLpcdCounts = (scheme: WaterSchemeData) => {
    const lpcdValues = extractLpcdValues(scheme);
    
    // Count days above and below 55 LPCD, exclude zero values
    const daysAbove55 = lpcdValues.filter(val => val > 0 && val >= 55).length;
    const daysBelow55 = lpcdValues.filter(val => val > 0 && val < 55).length;
    
    // Check for consistent zero supply
    const zeroCount = lpcdValues.filter(val => val === 0).length;
    const hasConsistentZeroSupply = zeroCount === 7;
    
    return {
      daysAbove55,
      daysBelow55,
      hasConsistentZeroSupply
    };
  };
  
  // Get status badge for LPCD value
  const getLpcdStatusBadge = (lpcdValue: number | null) => {
    if (lpcdValue === null) 
      return <Badge variant="outline">No data</Badge>;
    
    if (lpcdValue >= 55) {
      return <Badge className="bg-green-500">Good (&gt;55L)</Badge>;
    } else if (lpcdValue >= 40) {
      return <Badge className="bg-yellow-500">Average (40-55L)</Badge>;
    } else if (lpcdValue > 0) {
      return <Badge className="bg-red-500">Low (&lt;40L)</Badge>;
    } else {
      return <Badge className="bg-gray-500">Zero Supply</Badge>;
    }
  };
  
  // Show error toast if data fetching fails
  useEffect(() => {
    if (schemesError) {
      toast({
        title: "Error fetching water scheme data",
        description: (schemesError as Error)?.message || "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [schemesError, toast]);
  
  // Function to export data to Excel
  const exportToExcel = (data: WaterSchemeData[], filename: string) => {
    try {
      // Format data for Excel
      const worksheetData = data.map((scheme) => {
        const latestLpcd = getLatestLpcdValue(scheme);
        const latestWater = getLatestWaterValue(scheme);
        const { daysAbove55, daysBelow55, hasConsistentZeroSupply } = calculateLpcdCounts(scheme);
        
        return {
          'Scheme ID': scheme.scheme_id,
          'Village Name': scheme.village_name || 'N/A',
          'Scheme Name': scheme.scheme_name || 'N/A',
          'Region': scheme.region || 'N/A',
          'Circle': scheme.circle || 'N/A',
          'Division': scheme.division || 'N/A',
          'Sub Division': scheme.sub_division || 'N/A',
          'Block': scheme.block || 'N/A',
          'Population': scheme.population || 0,
          'Latest LPCD Value': latestLpcd !== null ? latestLpcd : 'No data',
          'Latest Water Consumption': latestWater !== null ? latestWater : 'No data',
          'Days Above 55 LPCD': daysAbove55,
          'Days Below 55 LPCD': daysBelow55,
          'Zero Supply for a Week': hasConsistentZeroSupply ? 'Yes' : 'No',
          'LPCD Status': latestLpcd !== null 
            ? (latestLpcd >= 55 
                ? 'Good (>55L)' 
                : latestLpcd >= 40 
                  ? 'Average (40-55L)' 
                  : latestLpcd > 0 
                    ? 'Low (<40L)' 
                    : 'Zero Supply')
            : 'No data'
        };
      });
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Create workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'LPCD Data');
      
      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      
      toast({
        title: "Export Successful",
        description: `${worksheetData.length} records exported to Excel`,
        duration: 3000
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full py-6">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>LPCD Dashboard</CardTitle>
          <CardDescription>View and analyze LPCD (Liters Per Capita per Day) metrics for water schemes</CardDescription>
        </CardHeader>
        <CardContent>
          {/* LPCD Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Villages with LPCD > 55L */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-green-700">Villages with LPCD &gt; 55L</h3>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {allWaterSchemeData.filter(scheme => {
                      const lpcdValue = getLatestLpcdValue(scheme);
                      return lpcdValue !== null && lpcdValue > 55;
                    }).length}
                  </p>
                  <Button 
                    variant="ghost" 
                    className="mt-2 text-green-700 hover:text-green-800 hover:bg-green-100"
                    onClick={() => handleFilterChange('above55')}
                  >
                    View Villages
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Villages with LPCD between 40-55L */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-yellow-700">Villages with LPCD 40-55L</h3>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">
                    {allWaterSchemeData.filter(scheme => {
                      const lpcdValue = getLatestLpcdValue(scheme);
                      return lpcdValue !== null && lpcdValue >= 40 && lpcdValue <= 55;
                    }).length}
                  </p>
                  <Button 
                    variant="ghost" 
                    className="mt-2 text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100"
                    onClick={() => handleFilterChange('40to55')}
                  >
                    View Villages
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Villages with LPCD < 40L */}
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-red-700">Villages with LPCD &lt; 40L</h3>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {allWaterSchemeData.filter(scheme => {
                      const lpcdValue = getLatestLpcdValue(scheme);
                      return lpcdValue !== null && lpcdValue > 0 && lpcdValue < 40;
                    }).length}
                  </p>
                  <Button 
                    variant="ghost" 
                    className="mt-2 text-red-700 hover:text-red-800 hover:bg-red-100"
                    onClick={() => handleFilterChange('below55')}
                  >
                    View Villages
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Filters Section */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Select 
                value={selectedRegion}
                onValueChange={handleRegionChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Region" />
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
            </div>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    LPCD Range
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by LPCD</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                    All LPCD values
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange('above55')}>
                    Above 55 LPCD
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange('below55')}>
                    Below 55 LPCD
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange('40to55')}>
                    Between 40-55 LPCD
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleFilterChange('zerosupply')}>
                    Zero supply for a week
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Excel Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export Excel
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => exportToExcel(filteredData, `LPCD_Data_${currentFilter}_${selectedRegion}_${new Date().toISOString().split('T')[0]}`)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Filtered Data
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => exportToExcel(allWaterSchemeData, `LPCD_All_Villages_${new Date().toISOString().split('T')[0]}`)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export All Villages
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Data Table Section */}
          {isLoadingSchemes ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-full h-12" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableCaption>
                  {totalItems === 0 ? 'No water scheme data available' : `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} water schemes`}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Scheme ID</TableHead>
                    <TableHead>Scheme Name</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead className="text-right">Water Consumption (Latest)</TableHead>
                    <TableHead className="text-right">LPCD (Latest)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageData.map((scheme) => {
                    const latestLpcd = getLatestLpcdValue(scheme);
                    const latestWater = getLatestWaterValue(scheme);
                    
                    return (
                      <TableRow key={`${scheme.scheme_id}-${scheme.village_name || 'unknown'}`}>
                        <TableCell>{scheme.region || 'N/A'}</TableCell>
                        <TableCell>{scheme.scheme_id.split('-')[0]}</TableCell>
                        <TableCell>{scheme.scheme_name || 'N/A'}</TableCell>
                        <TableCell>{scheme.village_name || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          {latestWater !== null ? latestWater : (
                            <Badge variant="outline" className="bg-gray-100">
                              <span className="text-gray-600 text-sm">No data</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {latestLpcd !== null ? latestLpcd : (
                            <Badge variant="outline" className="bg-gray-100">
                              <span className="text-gray-600 text-sm">No data</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getLpcdStatusBadge(latestLpcd)}</TableCell>
                        <TableCell>
                          <VillageDetailDialog 
                            scheme={scheme}
                            latestLpcd={latestLpcd}
                            getLatestLpcdValue={getLatestLpcdValue}
                            calculateLpcdCounts={calculateLpcdCounts}
                            getLpcdStatusBadge={getLpcdStatusBadge}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {/* Enhanced Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center mt-6 space-y-4">
                  <div className="flex justify-center items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page => Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {(() => {
                        const pageButtons = [];
                        const maxVisiblePages = 5;
                        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                        
                        // Adjust start page if we're near the end
                        if (endPage - startPage < maxVisiblePages - 1) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }
                        
                        // Show ellipsis for first pages if needed
                        if (startPage > 1) {
                          pageButtons.push(
                            <Button
                              key="first-ellipsis"
                              variant="ghost"
                              size="sm"
                              className="w-9 px-0"
                              onClick={() => setPage(1)}
                            >
                              1
                            </Button>
                          );
                          
                          if (startPage > 2) {
                            pageButtons.push(
                              <span key="ellipsis-1" className="mx-1">...</span>
                            );
                          }
                        }
                        
                        // Create number buttons
                        for (let i = startPage; i <= endPage; i++) {
                          pageButtons.push(
                            <Button
                              key={`page-${i}`}
                              variant={page === i ? "default" : "outline"}
                              size="sm"
                              className="w-9 px-0"
                              onClick={() => setPage(i)}
                            >
                              {i}
                            </Button>
                          );
                        }
                        
                        // Show ellipsis for last pages if needed
                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) {
                            pageButtons.push(
                              <span key="ellipsis-2" className="mx-1">...</span>
                            );
                          }
                          
                          pageButtons.push(
                            <Button
                              key="last-page"
                              variant="ghost"
                              size="sm"
                              className="w-9 px-0"
                              onClick={() => setPage(totalPages)}
                            >
                              {totalPages}
                            </Button>
                          );
                        }
                        
                        return pageButtons;
                      })()}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page => Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {endIndex} of {totalItems} villages
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleLpcdDashboard;