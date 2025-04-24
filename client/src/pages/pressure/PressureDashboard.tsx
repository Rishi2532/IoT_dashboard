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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Search, AlertTriangle, CheckCircle, AlertCircle, X, RefreshCw, Gauge } from 'lucide-react';

// Define types for Pressure Data
interface PressureData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  village_name: string;
  esr_name: string;
  sensor_id?: string;
  pressure_value_1?: number | null;
  pressure_date_day_1?: string | null;
  pressure_value_2?: number | null;
  pressure_date_day_2?: string | null;
  pressure_value_3?: number | null;
  pressure_date_day_3?: string | null;
  pressure_value_4?: number | null;
  pressure_date_day_4?: string | null;
  pressure_value_5?: number | null;
  pressure_date_day_5?: string | null;
  pressure_value_6?: number | null;
  pressure_date_day_6?: string | null;
  pressure_value_7?: number | null;
  pressure_date_day_7?: string | null;
  // Additional analysis fields
  number_of_consistent_zero_value_in_pressure?: number | null;
  pressure_less_than_02_bar?: number | null;
  pressure_between_02_07_bar?: number | null;
  pressure_greater_than_07_bar?: number | null;
}

interface RegionData {
  region_id: number;
  region_name: string;
}

interface PressureDashboardStats {
  totalSensors: number;
  belowRangeSensors: number;
  optimalRangeSensors: number;
  aboveRangeSensors: number;
  consistentZeroSensors: number;
  consistentBelowRangeSensors: number;
  consistentOptimalSensors: number;
  consistentAboveRangeSensors: number;
}

type PressureRange = 'all' | 'below_0.2' | 'between_0.2_0.7' | 'above_0.7' | 'consistent_zero' | 'consistent_below' | 'consistent_optimal' | 'consistent_above';

const PressureDashboard: React.FC = () => {
  const { toast } = useToast();

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [currentFilter, setCurrentFilter] = useState<PressureRange>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected ESR for detailed view
  const [selectedESR, setSelectedESR] = useState<PressureData | null>(null);

  // Fetch all pressure data
  const {
    data: allPressureData = [],
    isLoading: isLoadingPressure,
    error: pressureError,
    refetch,
  } = useQuery<PressureData[]>({
    queryKey: ["/api/pressure", selectedRegion, currentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (selectedRegion && selectedRegion !== 'all') {
        params.append('region', selectedRegion);
      }
      
      if (currentFilter && currentFilter !== 'all') {
        params.append('pressureRange', currentFilter);
      }
      
      const queryString = params.toString();
      const url = `/api/pressure${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching pressure data with URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch pressure data');
      }
      
      const data = await response.json();
      console.log(`Received ${data.length} pressure records`);
      return data;
    }
  });

  // Fetch dashboard stats
  const { 
    data: dashboardStats,
    isLoading: isLoadingStats 
  } = useQuery<PressureDashboardStats>({
    queryKey: ["/api/pressure/dashboard-stats", selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (selectedRegion && selectedRegion !== 'all') {
        params.append('region', selectedRegion);
      }
      
      const queryString = params.toString();
      const url = `/api/pressure/dashboard-stats${queryString ? `?${queryString}` : ''}`;
      
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

  // Get latest pressure value
  const getLatestPressureValue = (data: PressureData): number | null => {
    // Try to get the latest non-null value
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
      const value = data[`pressure_value_${day}` as keyof PressureData];
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

  // Get the CSS class and status text based on pressure value
  const getPressureStatusInfo = (value: number | null) => {
    if (value === null) return { className: "bg-gray-100", statusText: "No Data" };
    
    if (value < 0.2) return { 
      className: "bg-red-50 border-red-200", 
      statusText: "Below Range", 
      textColor: "text-red-800",
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />
    };
    
    if (value >= 0.2 && value <= 0.7) return { 
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
    let filtered = [...allPressureData];

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
  }, [allPressureData, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, page, itemsPerPage]);
  
  // Get status filter title
  const getFilterTitle = (filter: PressureRange) => {
    switch(filter) {
      case 'below_0.2': return 'Below Range (<0.2 bar)';
      case 'between_0.2_0.7': return 'Optimal Range (0.2-0.7 bar)';
      case 'above_0.7': return 'Above Range (>0.7 bar)';
      case 'consistent_zero': return 'Consistent Zero Pressure (7 days)';
      case 'consistent_below': return 'Consistent Below Range (7 days)';
      case 'consistent_optimal': return 'Consistent Optimal Range (7 days)';
      case 'consistent_above': return 'Consistent Above Range (7 days)';
      default: return 'All ESRs';
    }
  };
  
  // Handler for dashboard card clicks
  const handleCardClick = (range: PressureRange) => {
    setCurrentFilter(range);
    setPage(1); // Reset to first page when filter changes
  };

  // Loading state for dashboard
  if (isLoadingPressure || isLoadingStats || isLoadingRegions) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Pressure Monitoring Dashboard</h1>
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
  if (pressureError) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">Failed to load pressure data. Please try again later.</span>
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
              onValueChange={(value) => { setSelectedRegion(value); setPage(1); }}
            >
              <SelectTrigger className="bg-white border border-blue-200 shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-medium">All Regions</SelectItem>
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
          
          <div className="ml-auto self-end">
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
            currentFilter === 'all' ? 'ring-2 ring-blue-500 ring-offset-2' : ''
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick('all')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white"></div>
          <div className="absolute bottom-0 right-0 opacity-10">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600">
              <path d="M19 5L5 19M5 5L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg font-bold text-blue-800">Total Connected ESRs</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-5xl font-bold text-blue-700">{dashboardStats?.totalSensors || 0}</p>
            <p className="text-sm text-blue-600/80 mt-2 font-medium">Total pressure sensors connected</p>
          </CardContent>
        </Card>
        
        {/* Below Range Card */}
        <Card 
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === 'below_0.2' ? 'ring-2 ring-red-500 ring-offset-2' : ''
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick('below_0.2')}
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
            <p className="text-5xl font-bold text-red-600">{dashboardStats?.belowRangeSensors || 0}</p>
            <div className="flex items-center mt-2">
              <p className="text-sm text-red-600/80 font-medium">ESRs with pressure {"<"}0.2 bar</p>
              <span className="ml-auto px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                Action Required
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Optimal Range Card */}
        <Card 
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === 'between_0.2_0.7' ? 'ring-2 ring-green-500 ring-offset-2' : ''
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick('between_0.2_0.7')}
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
            <p className="text-5xl font-bold text-green-600">{dashboardStats?.optimalRangeSensors || 0}</p>
            <div className="flex items-center mt-2">
              <p className="text-sm text-green-600/80 font-medium">ESRs with pressure 0.2-0.7 bar</p>
              <span className="ml-auto px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                Good Quality
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Above Range Card */}
        <Card 
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === 'above_0.7' ? 'ring-2 ring-orange-500 ring-offset-2' : ''
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick('above_0.7')}
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
            <p className="text-5xl font-bold text-orange-600">{dashboardStats?.aboveRangeSensors || 0}</p>
            <div className="flex items-center mt-2">
              <p className="text-sm text-orange-600/80 font-medium">ESRs with pressure &gt;0.7 bar</p>
              <span className="ml-auto px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                Attention Needed
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Additional stats cards for the consistency metrics */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        {/* Consistent Zero Pressure Card */}
        <Card 
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === 'consistent_zero' ? 'ring-2 ring-gray-500 ring-offset-2' : ''
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick('consistent_zero')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white"></div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg font-bold text-gray-800">Consistent Zero</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-5xl font-bold text-gray-700">{dashboardStats?.consistentZeroSensors || 0}</p>
            <p className="text-sm text-gray-600/80 mt-2 font-medium">ESRs with zero pressure for 7 days</p>
          </CardContent>
        </Card>
        
        {/* Consistent Below Range Card */}
        <Card 
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === 'consistent_below' ? 'ring-2 ring-red-500 ring-offset-2' : ''
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick('consistent_below')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-white"></div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg font-bold text-red-800">Consistent Below</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-5xl font-bold text-red-700">{dashboardStats?.consistentBelowRangeSensors || 0}</p>
            <p className="text-sm text-red-600/80 mt-2 font-medium">ESRs with pressure {"<"}0.2 bar for 7 days</p>
          </CardContent>
        </Card>
        
        {/* Consistent Optimal Range Card */}
        <Card 
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === 'consistent_optimal' ? 'ring-2 ring-green-500 ring-offset-2' : ''
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick('consistent_optimal')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-white"></div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg font-bold text-green-800">Consistent Optimal</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-5xl font-bold text-green-700">{dashboardStats?.consistentOptimalSensors || 0}</p>
            <p className="text-sm text-green-600/80 mt-2 font-medium">ESRs with pressure 0.2-0.7 bar for 7 days</p>
          </CardContent>
        </Card>
        
        {/* Consistent Above Range Card */}
        <Card 
          className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative ${
            currentFilter === 'consistent_above' ? 'ring-2 ring-orange-500 ring-offset-2' : ''
          } transform hover:scale-[1.02]`}
          onClick={() => handleCardClick('consistent_above')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white"></div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg font-bold text-orange-800">Consistent Above</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-5xl font-bold text-orange-700">{dashboardStats?.consistentAboveRangeSensors || 0}</p>
            <p className="text-sm text-orange-600/80 mt-2 font-medium">ESRs with pressure {">"}0.7 bar for 7 days</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Current Filter Label */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {getFilterTitle(currentFilter)}
          <Badge variant="outline" className="ml-2 text-blue-600 border-blue-200 bg-blue-50">
            {filteredData.length} ESR Records
          </Badge>
        </h2>
      </div>
      
      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-blue-50">
              <TableRow>
                <TableHead className="font-bold text-blue-900">Region</TableHead>
                <TableHead className="font-bold text-blue-900">Scheme ID</TableHead>
                <TableHead className="font-bold text-blue-900">Scheme Name</TableHead>
                <TableHead className="font-bold text-blue-900">Village</TableHead>
                <TableHead className="font-bold text-blue-900">ESR</TableHead>
                <TableHead className="font-bold text-blue-900">Latest Pressure (bar)</TableHead>
                <TableHead className="font-bold text-blue-900">Status</TableHead>
                <TableHead className="font-bold text-blue-900 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => {
                  const latestPressure = getLatestPressureValue(item);
                  const statusInfo = getPressureStatusInfo(latestPressure);
                  
                  return (
                    <TableRow 
                      key={`${item.scheme_id}-${item.village_name}-${item.esr_name}-${idx}`}
                      className={`${statusInfo.className} hover:bg-gray-50 border-b border-gray-100`}
                    >
                      <TableCell className="font-medium">{item.region}</TableCell>
                      <TableCell className="font-mono text-sm">{item.scheme_id}</TableCell>
                      <TableCell>{item.scheme_name}</TableCell>
                      <TableCell>{item.village_name}</TableCell>
                      <TableCell>{item.esr_name}</TableCell>
                      <TableCell>
                        {latestPressure !== null ? (
                          <span className="font-semibold">{typeof latestPressure === 'number' ? latestPressure.toFixed(2) : latestPressure} bar</span>
                        ) : (
                          <span className="text-gray-400">No data</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {statusInfo.icon && statusInfo.icon}
                          <span className={`ml-1 ${statusInfo.textColor || 'text-gray-500'}`}>
                            {statusInfo.statusText}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => setSelectedESR(item)}
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Pressure Data History</DialogTitle>
                              <DialogDescription>
                                {item.scheme_name} - {item.village_name} - {item.esr_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              {selectedESR && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-7 gap-2">
                                    {[7, 6, 5, 4, 3, 2, 1].map((day) => {
                                      const value = selectedESR[`pressure_value_${day}` as keyof PressureData] as number | null;
                                      const date = selectedESR[`pressure_date_day_${day}` as keyof PressureData] as string | null;
                                      const statusInfo = getPressureStatusInfo(value);
                                      
                                      return (
                                        <div 
                                          key={`day-${day}`} 
                                          className={`rounded-lg p-3 text-center ${statusInfo.className} border`}
                                        >
                                          <p className="text-sm text-gray-600">Day {day}</p>
                                          <p className="font-semibold text-xl">
                                            {value !== null ? `${typeof value === 'number' ? value.toFixed(2) : value} bar` : '-'}
                                          </p>
                                          <p className="text-xs text-gray-500">{date || '-'}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h4 className="font-semibold mb-2">7-Day Analysis:</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <p className="text-sm text-gray-600">Below Range (&lt;0.2 bar):</p>
                                        <p className="font-semibold">
                                          {selectedESR.pressure_less_than_02_bar || 0} days
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-600">Optimal Range (0.2-0.7 bar):</p>
                                        <p className="font-semibold">
                                          {selectedESR.pressure_between_02_07_bar || 0} days
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-600">Above Range (&gt;0.7 bar):</p>
                                        <p className="font-semibold">
                                          {selectedESR.pressure_greater_than_07_bar || 0} days
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-600">Zero Pressure:</p>
                                        <p className="font-semibold">
                                          {selectedESR.number_of_consistent_zero_value_in_pressure === 7 
                                            ? 'All 7 days' 
                                            : `${selectedESR.number_of_consistent_zero_value_in_pressure || 0} days`}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {allPressureData.length === 0 ? (
                      <>No pressure data available for this region</>
                    ) : (
                      <>No results match your search criteria</>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Pagination */}
      {filteredData.length > itemsPerPage && (
        <div className="flex justify-center mb-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={page === 1 ? "opacity-50 pointer-events-none" : ""}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Logic to show 5 pages around the current page
                let pageNumber = page;
                if (page < 3) {
                  pageNumber = i + 1;
                } else if (page > totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = page - 2 + i;
                }
                
                // Ensure page number is within bounds
                if (pageNumber < 1) pageNumber = 1;
                if (pageNumber > totalPages) pageNumber = totalPages;
                
                return (
                  <PaginationItem key={`page-${pageNumber}`}>
                    <PaginationLink 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(pageNumber);
                      }}
                      isActive={page === pageNumber}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={page === totalPages ? "opacity-50 pointer-events-none" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default PressureDashboard;