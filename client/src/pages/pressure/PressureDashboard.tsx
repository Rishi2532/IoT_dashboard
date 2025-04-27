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
import { Search, AlertTriangle, CheckCircle, AlertCircle, X, RefreshCw, Gauge, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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

    // Note: We don't need to filter by region or range here because
    // that filtering is already applied at the API level in the useQuery hook
    // where we send the selectedRegion and currentFilter parameters.
    // The 'allPressureData' already contains the filtered data from the API.

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
  
  // Function to export data to Excel
  const exportToExcel = (data: PressureData[], filename: string) => {
    try {
      // Format data for Excel
      const worksheetData = data.map((item) => {
        const latestPressure = getLatestPressureValue(item);
        const { statusText } = getPressureStatusInfo(latestPressure);
        
        // Get the latest date
        let latestDate = null;
        for (const day of [7, 6, 5, 4, 3, 2, 1]) {
          const dateValue = item[`pressure_date_day_${day}` as keyof PressureData];
          if (dateValue) {
            latestDate = dateValue;
            break;
          }
        }
        
        return {
          'Scheme ID': item.scheme_id,
          'Scheme Name': item.scheme_name || 'N/A',
          'Region': item.region || 'N/A',
          'Village Name': item.village_name || 'N/A',
          'ESR Name': item.esr_name || 'N/A',
          'Sensor ID': item.sensor_id || 'N/A',
          'Latest Pressure Value (bar)': latestPressure !== null ? latestPressure.toFixed(2) : 'No data',
          'Last Updated': latestDate || 'No data',
          'Status': statusText,
          'Days Below Range (<0.2 bar)': item.pressure_less_than_02_bar || 0,
          'Days Optimal Range (0.2-0.7 bar)': item.pressure_between_02_07_bar || 0,
          'Days Above Range (>0.7 bar)': item.pressure_greater_than_07_bar || 0,
          'Consistent Zero for 7 Days': item.number_of_consistent_zero_value_in_pressure === 7 ? 'Yes' : 'No'
        };
      });
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Create workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pressure Data');
      
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
          
          <div className="ml-auto self-end flex gap-2">
            <Button 
              onClick={() => exportToExcel(filteredData, `Pressure_Data_${selectedRegion}_${currentFilter}_${new Date().toISOString().split('T')[0]}`)} 
              variant="outline"
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Excel
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
                          <DialogContent className="max-w-4xl bg-white">
                            {selectedESR && (
                              <>
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Gauge className="h-5 w-5 text-blue-600" />
                                    </div>
                                    {selectedESR.esr_name} - {selectedESR.village_name}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Detailed pressure monitoring data for this ESR
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="py-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                                      <h3 className="text-sm font-medium text-blue-800 mb-3">ESR Information</h3>
                                      
                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                          <span className="text-sm text-blue-700">Region</span>
                                          <span className="font-medium">{selectedESR.region}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                          <span className="text-sm text-blue-700">Scheme ID</span>
                                          <span className="font-medium font-mono">{selectedESR.scheme_id}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                          <span className="text-sm text-blue-700">Scheme</span>
                                          <span className="font-medium">{selectedESR.scheme_name}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                          <span className="text-sm text-blue-700">Village</span>
                                          <span className="font-medium">{selectedESR.village_name}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                          <span className="text-sm text-blue-700">Sensor ID</span>
                                          <span className="font-medium">{selectedESR.sensor_id || "N/A"}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-100 flex flex-col">
                                      <h3 className="text-sm font-medium text-blue-800 mb-3">Current Status</h3>
                                      
                                      {(() => {
                                        const latestValue = getLatestPressureValue(selectedESR);
                                        const statusInfo = getPressureStatusInfo(latestValue);
                                        
                                        let statusBgClass = "bg-gray-100";
                                        let statusTextClass = "text-gray-800";
                                        
                                        if (latestValue !== null) {
                                          if (latestValue < 0.2) {
                                            statusBgClass = "bg-red-100";
                                            statusTextClass = "text-red-800";
                                          } else if (latestValue >= 0.2 && latestValue <= 0.7) {
                                            statusBgClass = "bg-green-100";
                                            statusTextClass = "text-green-800";
                                          } else {
                                            statusBgClass = "bg-orange-100";
                                            statusTextClass = "text-orange-800";
                                          }
                                        }
                                        
                                        return (
                                          <div className={`${statusBgClass} rounded-lg p-4 flex-1 flex flex-col justify-center items-center`}>
                                            <div className="flex items-center gap-2 mb-2">
                                              {statusInfo.icon}
                                              <span className={`text-lg font-bold ${statusTextClass}`}>{statusInfo.statusText}</span>
                                            </div>
                                            
                                            <div className="text-4xl font-bold mb-2">
                                              {latestValue !== null ? (
                                                <span className={statusTextClass}>{latestValue.toFixed(2)}</span>
                                              ) : "—"}
                                            </div>
                                            
                                            <div className={`text-sm ${statusTextClass}`}>
                                              bar
                                            </div>
                                            
                                            <div className="mt-4 text-xs text-gray-600">
                                              Target Range: 0.2-0.7 bar
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
                                      7-Day Pressure History
                                    </h3>
                                    <div className="grid grid-cols-7 gap-3">
                                      {[7, 6, 5, 4, 3, 2, 1].map((day) => {
                                        const value = selectedESR[`pressure_value_${day}` as keyof PressureData];
                                        const numValue = value !== undefined && value !== null ? Number(value) : null;
                                        const dateValue = selectedESR[`pressure_date_day_${day}` as keyof PressureData];
                                        const { className: dayClassName } = getPressureStatusInfo(numValue);
                                        
                                        let cardBgClass = "bg-white border-gray-200";
                                        let valueTextClass = "text-gray-400";
                                        
                                        if (numValue !== null) {
                                          if (numValue < 0.2) {
                                            cardBgClass = "bg-gradient-to-br from-red-50 to-white border-red-200";
                                            valueTextClass = "text-red-600";
                                          } else if (numValue >= 0.2 && numValue <= 0.7) {
                                            cardBgClass = "bg-gradient-to-br from-green-50 to-white border-green-200";
                                            valueTextClass = "text-green-600";
                                          } else {
                                            cardBgClass = "bg-gradient-to-br from-orange-50 to-white border-orange-200";
                                            valueTextClass = "text-orange-600";
                                          }
                                        }
                                        
                                        return (
                                          <div
                                            key={`pressure-day-${day}`}
                                            className={`${cardBgClass} p-3 rounded-md text-center shadow-sm border relative overflow-hidden`}
                                          >
                                            <div className="relative">
                                              <p className="text-xs text-gray-700 font-medium">
                                                {day === 1 ? "Today" : day === 2 ? "Yesterday" : `Day ${day}`}
                                              </p>
                                              <p className={`text-xl font-bold ${valueTextClass}`}>
                                                {numValue !== null ? numValue.toFixed(2) : "—"}
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
                                  
                                  <div className="mt-6 bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                                    <h4 className="font-medium text-blue-800 mb-3">7-Day Analysis</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div className="bg-white p-3 rounded border border-red-100">
                                        <p className="text-sm text-red-700 mb-1">Below Range Days</p>
                                        <p className="text-xl font-bold text-red-600">
                                          {selectedESR.pressure_less_than_02_bar || 0}
                                        </p>
                                      </div>
                                      <div className="bg-white p-3 rounded border border-green-100">
                                        <p className="text-sm text-green-700 mb-1">Optimal Range Days</p>
                                        <p className="text-xl font-bold text-green-600">
                                          {selectedESR.pressure_between_02_07_bar || 0}
                                        </p>
                                      </div>
                                      <div className="bg-white p-3 rounded border border-orange-100">
                                        <p className="text-sm text-orange-700 mb-1">Above Range Days</p>
                                        <p className="text-xl font-bold text-orange-600">
                                          {selectedESR.pressure_greater_than_07_bar || 0}
                                        </p>
                                      </div>
                                      <div className="bg-white p-3 rounded border border-gray-200">
                                        <p className="text-sm text-gray-700 mb-1">Zero Pressure Days</p>
                                        <p className="text-xl font-bold text-gray-600">
                                          {selectedESR.number_of_consistent_zero_value_in_pressure || 0}
                                        </p>
                                      </div>
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
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
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