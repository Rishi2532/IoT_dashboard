import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, ChevronDown, Filter, Info } from 'lucide-react';

// Define TypeScript interfaces
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
  consistent_zero_lpcd_for_a_week?: number | boolean;
  below_55_lpcd_count?: number;
  above_55_lpcd_count?: number;
}

interface RegionData {
  region_id: number;
  region_name: string;
}

const LpcdDashboard: React.FC = () => {
  const { toast } = useToast();
  
  // Filter state
  const [filters, setFilters] = useState({
    region: '',
    minLpcd: '',
    maxLpcd: '',
    zeroSupplyForWeek: false
  });
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Water scheme data query
  const { 
    data: waterSchemeData = [], 
    isLoading: isLoadingSchemes, 
    isError: isSchemesError, 
    error: schemesError,
    refetch
  } = useQuery<WaterSchemeData[]>({
    queryKey: ['/api/water-scheme-data'],
    queryFn: async () => {
      // Build query params for filtering
      const params = new URLSearchParams();
      
      if (filters.region && filters.region !== 'all') {
        params.append('region', filters.region);
      }
      
      if (filters.minLpcd) {
        params.append('minLpcd', filters.minLpcd);
      }
      
      if (filters.maxLpcd) {
        params.append('maxLpcd', filters.maxLpcd);
      }
      
      if (filters.zeroSupplyForWeek) {
        params.append('zeroSupplyForWeek', 'true');
      }
      
      const queryString = params.toString();
      const url = `/api/water-scheme-data${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch water scheme data');
      }
      
      return response.json();
    }
  });
  
  // Regions data query
  const { 
    data: regionsData = [], 
    isLoading: isLoadingRegions 
  } = useQuery<RegionData[]>({
    queryKey: ['/api/regions'],
  });
  
  // Handle filter changes
  const handleFilterChange = (field: string, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset to first page when filters change
    setPage(1);
    
    // Refetch data with new filters
    setTimeout(() => {
      refetch();
    }, 0);
  };
  
  // LPCD range selection
  const handleLpcdRangeSelect = (range: string) => {
    if (range === 'above55') {
      setFilters(prev => ({ ...prev, minLpcd: '55', maxLpcd: '' }));
    } else if (range === 'below55') {
      setFilters(prev => ({ ...prev, minLpcd: '', maxLpcd: '55' }));
    } else if (range === '40to55') {
      setFilters(prev => ({ ...prev, minLpcd: '40', maxLpcd: '55' }));
    } else {
      setFilters(prev => ({ ...prev, minLpcd: '', maxLpcd: '' }));
    }
    setPage(1);
    
    // Refetch data with new filters
    setTimeout(() => {
      refetch();
    }, 0);
  };
  
  // Calculate pagination data
  const paginationData = useMemo(() => {
    const totalItems = waterSchemeData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentPageData = waterSchemeData.slice(startIndex, endIndex);
    
    return { totalItems, totalPages, startIndex, endIndex, currentPageData };
  }, [waterSchemeData, page, itemsPerPage]);
  
  const { totalItems, totalPages, startIndex, endIndex, currentPageData } = paginationData;
  
  // Get status badge for LPCD value
  const getLpcdStatusBadge = (lpcdValue?: number | string | null) => {
    if (lpcdValue === undefined || lpcdValue === null || lpcdValue === '' || isNaN(Number(lpcdValue))) 
      return <Badge variant="outline">No data</Badge>;
    
    const numValue = Number(lpcdValue);
    
    if (numValue >= 55) {
      return <Badge className="bg-green-500">Good ({'>'}55L)</Badge>;
    } else if (numValue >= 40) {
      return <Badge className="bg-yellow-500">Average (40-55L)</Badge>;
    } else if (numValue > 0) {
      return <Badge className="bg-red-500">Low ({'<'}40L)</Badge>;
    } else {
      return <Badge className="bg-gray-500">Zero Supply</Badge>;
    }
  };
  
  // Refresh data when filters change
  useEffect(() => {
    refetch();
  }, [filters, refetch]);
  
  // Show error toast if data fetching fails
  useEffect(() => {
    if (isSchemesError && schemesError) {
      toast({
        title: "Error fetching water scheme data",
        description: (schemesError as Error)?.message || "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [isSchemesError, schemesError, toast]);

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>LPCD Dashboard</CardTitle>
          <CardDescription>View and analyze LPCD (Liters Per Capita per Day) metrics for water schemes</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Select 
                value={filters.region}
                onValueChange={(value) => handleFilterChange('region', value)}
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
                  <DropdownMenuItem onClick={() => handleLpcdRangeSelect('all')}>
                    All LPCD values
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLpcdRangeSelect('above55')}>
                    Above 55 LPCD
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLpcdRangeSelect('below55')}>
                    Below 55 LPCD
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLpcdRangeSelect('40to55')}>
                    Between 40-55 LPCD
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="zeroSupply"
                  checked={filters.zeroSupplyForWeek}
                  onCheckedChange={(checked) => handleFilterChange('zeroSupplyForWeek', !!checked)}
                />
                <label htmlFor="zeroSupply" className="text-sm">
                  Zero supply for a week
                </label>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="w-28">
                <Input 
                  type="number"
                  placeholder="Min LPCD" 
                  value={filters.minLpcd}
                  onChange={(e) => handleFilterChange('minLpcd', e.target.value)}
                />
              </div>
              <div className="w-28">
                <Input 
                  type="number"
                  placeholder="Max LPCD" 
                  value={filters.maxLpcd}
                  onChange={(e) => handleFilterChange('maxLpcd', e.target.value)}
                />
              </div>
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
                  {currentPageData.map((scheme) => (
                    <TableRow key={`${scheme.scheme_id}-${scheme.village_name || 'unknown'}`}>
                      <TableCell>{scheme.region || 'N/A'}</TableCell>
                      <TableCell>{scheme.scheme_id.split('-')[0]}</TableCell>
                      <TableCell>{scheme.scheme_name || 'N/A'}</TableCell>
                      <TableCell>{scheme.village_name || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        {scheme.water_value_day6 !== null && scheme.water_value_day6 !== undefined && scheme.water_value_day6 !== '' 
                          ? parseFloat(String(scheme.water_value_day6)).toFixed(1) 
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {scheme.lpcd_value_day7 !== null && scheme.lpcd_value_day7 !== undefined && scheme.lpcd_value_day7 !== '' 
                          ? parseFloat(String(scheme.lpcd_value_day7)).toFixed(1) 
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day7)}</TableCell>
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
                                  View Weekly Data
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl bg-blue-50">
                                <DialogHeader className="bg-blue-100 p-4 rounded-t-lg">
                                  <DialogTitle className="text-blue-800">
                                    {scheme.scheme_name || scheme.scheme_id.split('-')[0]} - {scheme.village_name} Weekly LPCD Data
                                  </DialogTitle>
                                  <DialogDescription className="text-blue-600">
                                    Water consumption and LPCD data for the past week (April 11-17, 2025)
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="mt-4">
                                  <Table>
                                    <TableHeader className="bg-blue-100">
                                      <TableRow>
                                        <TableHead className="text-blue-800">Metric</TableHead>
                                        <TableHead className="text-blue-800">Day 1 (Apr 11)</TableHead>
                                        <TableHead className="text-blue-800">Day 2 (Apr 12)</TableHead>
                                        <TableHead className="text-blue-800">Day 3 (Apr 13)</TableHead>
                                        <TableHead className="text-blue-800">Day 4 (Apr 14)</TableHead>
                                        <TableHead className="text-blue-800">Day 5 (Apr 15)</TableHead>
                                        <TableHead className="text-blue-800">Day 6 (Apr 16)</TableHead>
                                        <TableHead className="text-blue-800">Day 7 (Apr 17)</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody className="bg-white">
                                      <TableRow className="hover:bg-blue-50">
                                        <TableCell className="font-medium text-blue-800">Water Consumption</TableCell>
                                        <TableCell>
                                          {scheme.water_value_day1 !== null && scheme.water_value_day1 !== undefined && scheme.water_value_day1 !== '' 
                                            ? parseFloat(String(scheme.water_value_day1)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.water_value_day2 !== null && scheme.water_value_day2 !== undefined && scheme.water_value_day2 !== '' 
                                            ? parseFloat(String(scheme.water_value_day2)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.water_value_day3 !== null && scheme.water_value_day3 !== undefined && scheme.water_value_day3 !== '' 
                                            ? parseFloat(String(scheme.water_value_day3)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.water_value_day4 !== null && scheme.water_value_day4 !== undefined && scheme.water_value_day4 !== '' 
                                            ? parseFloat(String(scheme.water_value_day4)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.water_value_day5 !== null && scheme.water_value_day5 !== undefined && scheme.water_value_day5 !== '' 
                                            ? parseFloat(String(scheme.water_value_day5)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.water_value_day6 !== null && scheme.water_value_day6 !== undefined && scheme.water_value_day6 !== '' 
                                            ? parseFloat(String(scheme.water_value_day6)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>N/A</TableCell>
                                      </TableRow>
                                      <TableRow className="hover:bg-blue-50">
                                        <TableCell className="font-medium text-blue-800">LPCD</TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day1 !== null && scheme.lpcd_value_day1 !== undefined && scheme.lpcd_value_day1 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day1)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day2 !== null && scheme.lpcd_value_day2 !== undefined && scheme.lpcd_value_day2 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day2)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day3 !== null && scheme.lpcd_value_day3 !== undefined && scheme.lpcd_value_day3 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day3)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day4 !== null && scheme.lpcd_value_day4 !== undefined && scheme.lpcd_value_day4 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day4)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day5 !== null && scheme.lpcd_value_day5 !== undefined && scheme.lpcd_value_day5 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day5)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day6 !== null && scheme.lpcd_value_day6 !== undefined && scheme.lpcd_value_day6 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day6)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day7 !== null && scheme.lpcd_value_day7 !== undefined && scheme.lpcd_value_day7 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day7)).toFixed(1) 
                                            : 'N/A'}
                                        </TableCell>
                                      </TableRow>
                                      <TableRow className="hover:bg-blue-50">
                                        <TableCell className="font-medium text-blue-800">Status</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day1)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day2)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day3)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day4)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day5)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day6)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day7)}</TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                  
                                  <div className="mt-6 flex justify-between bg-blue-100 p-4 rounded-lg">
                                    <div className="text-blue-800">
                                      <p className="mb-2"><strong>Village:</strong> {scheme.village_name}</p>
                                      <p className="mb-2"><strong>Region:</strong> {scheme.region}</p>
                                      <p className="mb-2"><strong>Population:</strong> {scheme.population || 'N/A'}</p>
                                    </div>
                                    <div className="text-blue-800">
                                      <p className="mb-2">
                                        <strong>Days above 55 LPCD:</strong> <span className="text-green-600 font-semibold">{scheme.above_55_lpcd_count || 0}</span>
                                      </p>
                                      <p className="mb-2">
                                        <strong>Days below 55 LPCD:</strong> <span className="text-red-600 font-semibold">{scheme.below_55_lpcd_count || 0}</span>
                                      </p>
                                      <p className="mb-2">
                                        <strong>Zero supply for a week:</strong> <span className={scheme.consistent_zero_lpcd_for_a_week ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                          {scheme.consistent_zero_lpcd_for_a_week ? 'Yes' : 'No'}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum: number;
                      
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                        if (i === 4) pageNum = totalPages;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                        if (i === 0) pageNum = 1;
                      } else {
                        pageNum = page - 2 + i;
                        if (i === 0) pageNum = 1;
                        if (i === 4) pageNum = totalPages;
                      }
                      
                      if ((i === 1 && pageNum !== 2) || (i === 3 && pageNum !== totalPages - 1)) {
                        return (
                          <PaginationItem key={i}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={page === pageNum}
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                        className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LpcdDashboard;