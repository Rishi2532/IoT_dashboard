import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Search, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

// Define types for Chlorine Data
interface ChlorineData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  village_name: string;
  esr_name: string;
  sensor_id?: string;
  chlorine_value_day1?: number | null;
  chlorine_date_day1?: string | null;
  chlorine_value_day2?: number | null;
  chlorine_date_day2?: string | null;
  chlorine_value_day3?: number | null;
  chlorine_date_day3?: string | null;
  chlorine_value_day4?: number | null;
  chlorine_date_day4?: string | null;
  chlorine_value_day5?: number | null;
  chlorine_date_day5?: string | null;
  chlorine_value_day6?: number | null;
  chlorine_date_day6?: string | null;
  chlorine_value_day7?: number | null;
  chlorine_date_day7?: string | null;
  chlorine_status?: string | null;
  last_updated?: string | null;
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
}

type ChlorineRange = 'all' | 'below_0.2' | 'between_0.2_0.5' | 'above_0.5';

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
      
      if (selectedRegion && selectedRegion !== 'all') {
        params.append('region', selectedRegion);
      }
      
      if (currentFilter && currentFilter !== 'all') {
        params.append('chlorineRange', currentFilter);
      }
      
      const queryString = params.toString();
      const url = `/api/chlorine${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch chlorine data');
      }
      
      return response.json();
    }
  });

  // Fetch dashboard stats
  const { 
    data: dashboardStats,
    isLoading: isLoadingStats 
  } = useQuery<ChlorineDashboardStats>({
    queryKey: ["/api/chlorine/dashboard-stats", selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (selectedRegion && selectedRegion !== 'all') {
        params.append('region', selectedRegion);
      }
      
      const queryString = params.toString();
      const url = `/api/chlorine/dashboard-stats${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      
      return response.json();
    }
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
      const value = data[`chlorine_value_day${day}` as keyof ChlorineData];
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
    if (value === null) return { className: "bg-gray-100", statusText: "No Data" };
    
    if (value < 0.2) return { 
      className: "bg-red-50 border-red-200", 
      statusText: "Below Range", 
      textColor: "text-red-800",
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />
    };
    
    if (value >= 0.2 && value <= 0.5) return { 
      className: "bg-green-50 border-green-200", 
      statusText: "Optimal", 
      textColor: "text-green-800",
      icon: <CheckCircle className="h-5 w-5 text-green-600" />
    };
    
    return { 
      className: "bg-orange-50 border-orange-200", 
      statusText: "Above Range", 
      textColor: "text-orange-800",
      icon: <AlertCircle className="h-5 w-5 text-orange-600" />
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
          item.esr_name?.toLowerCase().includes(query) ||
          item.sensor_id?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allChlorineData, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, page, itemsPerPage]);
  
  // Get status filter title
  const getFilterTitle = (filter: ChlorineRange) => {
    switch(filter) {
      case 'below_0.2': return 'Below Range (<0.2mg/l)';
      case 'between_0.2_0.5': return 'Optimal Range (0.2-0.5mg/l)';
      case 'above_0.5': return 'Above Range (>0.5mg/l)';
      default: return 'All ESRs';
    }
  };
  
  // Handler for dashboard card clicks
  const handleCardClick = (range: ChlorineRange) => {
    setCurrentFilter(range);
    setPage(1); // Reset to first page when filter changes
  };

  // Loading state for dashboard
  if (isLoadingChlorine || isLoadingStats || isLoadingRegions) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Chlorine Monitoring Dashboard</h1>
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">Failed to load chlorine data. Please try again later.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Chlorine Monitoring Dashboard</h1>
      
      {/* Region Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        <div className="w-full md:w-64">
          <Select value={selectedRegion} onValueChange={(value) => { setSelectedRegion(value); setPage(1); }}>
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
        
        <div className="w-full md:w-96 relative">
          <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by scheme, village or ESR name..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1); // Reset to first page on search
            }}
          />
        </div>
        
        <div className="ml-auto">
          <Button onClick={() => refetch()} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>
      
      {/* Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {/* Total Sensors Card */}
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${currentFilter === 'all' ? 'border-blue-500' : ''}`}
          onClick={() => handleCardClick('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Connected ESRs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{dashboardStats?.totalSensors || 0}</p>
            <p className="text-sm text-gray-500 mt-2">Total chlorine sensors connected</p>
          </CardContent>
        </Card>
        
        {/* Below Range Card */}
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${currentFilter === 'below_0.2' ? 'border-red-500' : ''} bg-red-50`}
          onClick={() => handleCardClick('below_0.2')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              Below Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-red-600">{dashboardStats?.belowRangeSensors || 0}</p>
            <p className="text-sm text-gray-500 mt-2">ESRs with chlorine &lt;0.2mg/l</p>
          </CardContent>
        </Card>
        
        {/* Optimal Range Card */}
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${currentFilter === 'between_0.2_0.5' ? 'border-green-500' : ''} bg-green-50`}
          onClick={() => handleCardClick('between_0.2_0.5')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Optimal Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">{dashboardStats?.optimalRangeSensors || 0}</p>
            <p className="text-sm text-gray-500 mt-2">ESRs with chlorine 0.2-0.5mg/l</p>
          </CardContent>
        </Card>
        
        {/* Above Range Card */}
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${currentFilter === 'above_0.5' ? 'border-orange-500' : ''} bg-orange-50`}
          onClick={() => handleCardClick('above_0.5')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
              Above Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-orange-600">{dashboardStats?.aboveRangeSensors || 0}</p>
            <p className="text-sm text-gray-500 mt-2">ESRs with chlorine &gt;0.5mg/l</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Data Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{getFilterTitle(currentFilter)} - {filteredData.length} ESRs</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500">No ESR data found matching the selected criteria.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region</TableHead>
                      <TableHead>Scheme Name</TableHead>
                      <TableHead>Village</TableHead>
                      <TableHead>ESR Name</TableHead>
                      <TableHead>Latest Chlorine (mg/l)</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, index) => {
                      const latestValue = getLatestChlorineValue(item);
                      const { className, statusText, textColor, icon } = getChlorineStatusInfo(latestValue);
                      
                      // Get the latest date
                      let latestDate = null;
                      for (const day of [7, 6, 5, 4, 3, 2, 1]) {
                        const dateValue = item[`chlorine_date_day${day}` as keyof ChlorineData];
                        if (dateValue) {
                          latestDate = dateValue;
                          break;
                        }
                      }
                      
                      return (
                        <TableRow key={`${item.scheme_id}-${item.village_name}-${item.esr_name}-${index}`}>
                          <TableCell>{item.region}</TableCell>
                          <TableCell>{item.scheme_name}</TableCell>
                          <TableCell>{item.village_name}</TableCell>
                          <TableCell>{item.esr_name}</TableCell>
                          <TableCell>
                            {latestValue !== null ? latestValue.toFixed(2) : "-"}
                          </TableCell>
                          <TableCell>{latestDate || "-"}</TableCell>
                          <TableCell>
                            <Badge className={`${className} ${textColor} flex items-center gap-1 w-fit`}>
                              {icon} {statusText}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedESR(item)}
                                >
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                {selectedESR && (
                                  <>
                                    <DialogHeader>
                                      <DialogTitle>
                                        {selectedESR.esr_name} - {selectedESR.village_name}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="py-4">
                                      <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                          <h3 className="font-medium">Region:</h3>
                                          <p>{selectedESR.region}</p>
                                        </div>
                                        <div>
                                          <h3 className="font-medium">Scheme:</h3>
                                          <p>{selectedESR.scheme_name}</p>
                                        </div>
                                        <div>
                                          <h3 className="font-medium">Sensor ID:</h3>
                                          <p>{selectedESR.sensor_id || "N/A"}</p>
                                        </div>
                                        <div>
                                          <h3 className="font-medium">Status:</h3>
                                          <Badge className={`${getChlorineStatusInfo(getLatestChlorineValue(selectedESR)).className} ${getChlorineStatusInfo(getLatestChlorineValue(selectedESR)).textColor} flex items-center gap-1 w-fit mt-1`}>
                                            {getChlorineStatusInfo(getLatestChlorineValue(selectedESR)).icon} 
                                            {getChlorineStatusInfo(getLatestChlorineValue(selectedESR)).statusText}
                                          </Badge>
                                        </div>
                                      </div>
                                      
                                      <h3 className="font-medium text-lg mb-3">7-Day Chlorine History</h3>
                                      <div className="grid grid-cols-7 gap-2">
                                        {[7, 6, 5, 4, 3, 2, 1].map((day) => {
                                          const value = selectedESR[`chlorine_value_day${day}` as keyof ChlorineData];
                                          const numValue = value !== undefined && value !== null ? Number(value) : null;
                                          const dateValue = selectedESR[`chlorine_date_day${day}` as keyof ChlorineData];
                                          const { className: dayClassName } = getChlorineStatusInfo(numValue);
                                          
                                          return (
                                            <div
                                              key={`chlorine-day-${day}`}
                                              className={`${dayClassName} p-3 rounded-md text-center shadow-sm border`}
                                            >
                                              <p className="text-xs text-gray-700">Day {day}</p>
                                              <p className="text-lg font-semibold">
                                                {numValue !== null ? numValue.toFixed(2) : "-"}
                                              </p>
                                              <p className="text-xs text-gray-700">
                                                {dateValue || "-"}
                                              </p>
                                            </div>
                                          );
                                        })}
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
                          className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                      })}
                      
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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