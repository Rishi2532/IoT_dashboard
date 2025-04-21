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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Filter, MoreHorizontal, ChevronDown } from 'lucide-react';

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
type LpcdFilterType = 'all' | 'above55' | 'below55' | '40to55' | 'zerosupply';

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

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Simple LPCD Dashboard</CardTitle>
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
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    View Details
                                  </DropdownMenuItem>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader className="bg-blue-100 p-4 rounded-t-lg">
                                    <DialogTitle className="text-blue-800">
                                      {scheme.village_name} - {scheme.scheme_name}
                                    </DialogTitle>
                                    <DialogDescription className="text-blue-700">
                                      Scheme ID: {scheme.scheme_id.split('-')[0]}
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="p-4">
                                    <h3 className="text-lg font-semibold mb-2">Water Scheme Details</h3>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <p className="text-sm text-gray-500">Region</p>
                                        <p className="font-medium">{scheme.region || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-500">Circle</p>
                                        <p className="font-medium">{scheme.circle || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-500">Division</p>
                                        <p className="font-medium">{scheme.division || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-500">Sub Division</p>
                                        <p className="font-medium">{scheme.sub_division || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-500">Block</p>
                                        <p className="font-medium">{scheme.block || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-500">Population</p>
                                        <p className="font-medium">{scheme.population || 'N/A'}</p>
                                      </div>
                                    </div>
                                    
                                    <Separator className="my-4" />
                                    
                                    <h3 className="text-lg font-semibold mb-2">LPCD Statistics</h3>
                                    
                                    {(() => {
                                      const { daysAbove55, daysBelow55, hasConsistentZeroSupply } = calculateLpcdCounts(scheme);
                                      
                                      return (
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                          <div>
                                            <p className="text-sm text-gray-500">Days above 55 LPCD</p>
                                            <p className="font-medium">{daysAbove55}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-gray-500">Days below 55 LPCD</p>
                                            <p className="font-medium">{daysBelow55}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-gray-500">Zero supply for a week</p>
                                            <p className="font-medium">{hasConsistentZeroSupply ? 'Yes' : 'No'}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-gray-500">Current Status</p>
                                            <div className="font-medium">{getLpcdStatusBadge(latestLpcd)}</div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                    
                                    <Separator className="my-4" />
                                    
                                    <h3 className="text-lg font-semibold mb-2">LPCD Values & Water Consumption (Last 7 Days)</h3>
                                    
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Water Consumption</TableHead>
                                            <TableHead className="text-right">LPCD Value</TableHead>
                                            <TableHead>Status</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                                            const lpcdValue = scheme[`lpcd_value_day${day}` as keyof WaterSchemeData];
                                            const waterValue = day <= 6 ? scheme[`water_value_day${day}` as keyof WaterSchemeData] : null;
                                            const lpcdDate = scheme[`lpcd_date_day${day}` as keyof WaterSchemeData];
                                            const waterDate = day <= 6 ? scheme[`water_date_day${day}` as keyof WaterSchemeData] : null;
                                            
                                            // Format date if it exists
                                            const formattedDate = lpcdDate 
                                              ? new Date(lpcdDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                              : (waterDate 
                                                ? new Date(waterDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                                : `Day ${day}`);
                                            
                                            const numericLpcdValue = lpcdValue !== undefined && lpcdValue !== null && lpcdValue !== '' && !isNaN(Number(lpcdValue)) 
                                              ? Number(lpcdValue) 
                                              : null;
                                              
                                            const numericWaterValue = waterValue !== undefined && waterValue !== null && waterValue !== '' && !isNaN(Number(waterValue)) 
                                              ? Number(waterValue) 
                                              : null;
                                            
                                            return (
                                              <TableRow key={`lpcd-day-${day}`}>
                                                <TableCell>{formattedDate}</TableCell>
                                                <TableCell className="text-right">
                                                  {numericWaterValue !== null ? numericWaterValue : (
                                                    <Badge variant="outline" className="bg-gray-100">
                                                      <span className="text-gray-600 text-sm">No data</span>
                                                    </Badge>
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  {numericLpcdValue !== null ? numericLpcdValue : (
                                                    <Badge variant="outline" className="bg-gray-100">
                                                      <span className="text-gray-600 text-sm">No data</span>
                                                    </Badge>
                                                  )}
                                                </TableCell>
                                                <TableCell>{getLpcdStatusBadge(numericLpcdValue)}</TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => setPage(page => Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                  </div>
                  <div className="text-sm">
                    Page {page} of {totalPages}
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => setPage(page => Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
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