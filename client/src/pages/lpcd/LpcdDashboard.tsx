import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, ChevronDown, Filter } from 'lucide-react';

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
  water_value_day1?: number;
  lpcd_value_day1?: number;
  consistent_zero_lpcd_for_a_week?: boolean;
  below_55_lpcd_count?: number;
  above_55_lpcd_count?: number;
}

const LpcdDashboard = () => {
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
  
  // Query to fetch water scheme data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['/api/water-scheme-data', filters],
    queryFn: async () => {
      // Build query params for filtering
      const queryParams = new URLSearchParams();
      if (filters.region && filters.region !== 'all') {
        queryParams.append('region', filters.region);
      }
      if (filters.minLpcd) {
        queryParams.append('minLpcd', filters.minLpcd);
      }
      if (filters.maxLpcd) {
        queryParams.append('maxLpcd', filters.maxLpcd);
      }
      if (filters.zeroSupplyForWeek) {
        queryParams.append('zeroSupplyForWeek', 'true');
      }
      
      // Fetch water scheme data with filters
      const url = `/api/water-scheme-data?${queryParams.toString()}`;
      return apiRequest<WaterSchemeData[]>(url);
    }
  });
  
  // Query to fetch regions for filter dropdown
  const { data: regions } = useQuery({
    queryKey: ['/api/regions'],
    queryFn: async () => {
      return apiRequest('/api/regions');
    }
  });
  
  // Handle filter changes
  const handleFilterChange = (field: string, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset to first page when filters change
    setPage(1);
  };
  
  // Select specific filters for LPCD range
  const handleLpcdRangeSelect = (range: string) => {
    if (range === 'above55') {
      setFilters(prev => ({
        ...prev,
        minLpcd: '55',
        maxLpcd: ''
      }));
    } else if (range === 'below55') {
      setFilters(prev => ({
        ...prev,
        minLpcd: '',
        maxLpcd: '55'
      }));
    } else if (range === '40to55') {
      setFilters(prev => ({
        ...prev,
        minLpcd: '40',
        maxLpcd: '55'
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        minLpcd: '',
        maxLpcd: ''
      }));
    }
    setPage(1);
  };
  
  // Calculate pagination
  const totalItems = data?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPageData = data?.slice(startIndex, endIndex) || [];
  
  // Get status badge for LPCD value
  const getLpcdStatusBadge = (lpcdValue?: number) => {
    if (!lpcdValue && lpcdValue !== 0) return <Badge variant="outline">No data</Badge>;
    
    if (lpcdValue >= 55) {
      return <Badge className="bg-green-500">Good (>55L)</Badge>;
    } else if (lpcdValue >= 40) {
      return <Badge className="bg-yellow-500">Average (40-55L)</Badge>;
    } else {
      return <Badge className="bg-red-500">Low (<40L)</Badge>;
    }
  };
  
  // Show error toast if query fails
  if (isError) {
    toast({
      title: "Error fetching water scheme data",
      description: (error as Error)?.message || "Unknown error occurred",
      variant: "destructive"
    });
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>LPCD Dashboard</CardTitle>
          <CardDescription>View and analyze LPCD (Liters Per Capita per Day) metrics for water schemes</CardDescription>
        </CardHeader>
        <CardContent>
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
                  {regions?.map((region: any) => (
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
          
          {isLoading ? (
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
                    <TableHead className="text-right">Water Consumption (Day 1)</TableHead>
                    <TableHead className="text-right">LPCD (Day 1)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageData.map((scheme) => (
                    <TableRow key={`${scheme.scheme_id}-${scheme.village_name}`}>
                      <TableCell>{scheme.region}</TableCell>
                      <TableCell>{scheme.scheme_id}</TableCell>
                      <TableCell>{scheme.scheme_name}</TableCell>
                      <TableCell>{scheme.village_name || 'N/A'}</TableCell>
                      <TableCell className="text-right">{scheme.water_value_day1?.toFixed(1) || 'N/A'}</TableCell>
                      <TableCell className="text-right">{scheme.lpcd_value_day1?.toFixed(1) || 'N/A'}</TableCell>
                      <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day1)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
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
                        // Show all pages if 5 or fewer
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        // Near the start
                        pageNum = i + 1;
                        if (i === 4) pageNum = totalPages;
                      } else if (page >= totalPages - 2) {
                        // Near the end
                        pageNum = totalPages - 4 + i;
                        if (i === 0) pageNum = 1;
                      } else {
                        // In the middle
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