import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusColorClass, getStatusDisplayName, SchemeCompletionStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SchemeStatus } from "@/types";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface SchemeTableProps {
  schemes: SchemeStatus[];
  isLoading: boolean;
  onViewDetails: (scheme: SchemeStatus) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

export default function SchemeTable({ 
  schemes, 
  isLoading, 
  onViewDetails,
  statusFilter = "all",
  onStatusFilterChange
}: SchemeTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [schemeIdSearch, setSchemeIdSearch] = useState("");
  const [localStatusFilter, setLocalStatusFilter] = useState<string>(statusFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // If statusFilter prop changes, update local state
  useEffect(() => {
    setLocalStatusFilter(statusFilter);
  }, [statusFilter]);
  
  // Ensure schemes is an array before filtering
  const schemesArray = Array.isArray(schemes) ? schemes : [];
  
  // Filter schemes by scheme name and scheme ID
  const filteredSchemes = schemesArray.filter(scheme => {
    const matchesNameSearch = searchTerm === "" || 
      scheme.scheme_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesIdSearch = schemeIdSearch === "" || 
      (scheme.scheme_id && scheme.scheme_id.toLowerCase().includes(schemeIdSearch.toLowerCase()));
    
    return matchesNameSearch && matchesIdSearch;
  });
  
  const totalPages = Math.ceil(filteredSchemes.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSchemes.slice(indexOfFirstItem, indexOfLastItem);
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  // Helper function to calculate percentage
  const calcPercentage = (value: number | undefined | null, total: number | undefined | null): number => {
    if (!value || !total || total === 0) return 0;
    return Number(((value / total) * 100).toFixed(2));
  };
  
  return (
    <Card className="bg-white shadow mb-8">
      <CardHeader className="px-3 py-3 sm:px-4 sm:py-5 lg:px-6 lg:py-6 xl:px-8 xl:py-6 flex flex-col sm:flex-row justify-between items-start space-y-3 sm:space-y-0 sm:space-x-4">
        <div>
          <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl font-medium text-neutral-900">Scheme Status</CardTitle>
          <CardDescription className="mt-1 max-w-2xl text-xs sm:text-sm lg:text-base text-neutral-500">
            Details of water schemes and their current status
          </CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full">
            <div className="relative w-full sm:w-64 xl:w-60">
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-gray-400" />
              <Input
                id="schemeSearch"
                placeholder="Search scheme name..."
                className="pl-7 sm:pl-8 lg:pl-10 w-full text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10 xl:h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative w-full sm:w-36 xl:w-40">
              <Input
                id="schemeIdSearch"
                placeholder="Scheme ID..."
                className="w-full text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10 xl:h-11 font-mono"
                value={schemeIdSearch}
                onChange={(e) => setSchemeIdSearch(e.target.value)}
              />
            </div>
          </div>
          
          <Select 
            value={localStatusFilter} 
            onValueChange={(value) => {
              setLocalStatusFilter(value);
              if (onStatusFilterChange) {
                onStatusFilterChange(value);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-44 xl:w-52 h-8 sm:h-9 lg:h-10 xl:h-11 text-xs sm:text-sm lg:text-base">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="text-xs sm:text-sm lg:text-base">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Fully-Completed">Fully Completed</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Not-Connected">Not Connected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-0 py-0">
        <div className="border-t border-neutral-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-blue-50">
                <TableRow>
                  <TableHead className="w-[15%] text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-700 font-medium">Scheme ID</TableHead>
                  <TableHead className="w-[30%] text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-700 font-medium">Scheme Name</TableHead>
                  <TableHead className="text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-700 font-medium text-center">Region</TableHead>
                  <TableHead className="text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-700 font-medium text-center">Fully Completed Villages</TableHead>
                  <TableHead className="text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-700 font-medium text-center">ESR</TableHead>
                  <TableHead className="text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-700 font-medium text-center">Status</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-700 font-medium">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}>
                        <div className="animate-pulse h-4 sm:h-6 lg:h-8 bg-gray-200 rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 sm:py-6 lg:py-8 text-xs sm:text-sm lg:text-base text-neutral-500">
                      No schemes found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((scheme) => (
                    <TableRow key={scheme.scheme_id} className="hover:bg-blue-50 transition-colors duration-150">
                      <TableCell className="font-medium p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base border-b border-gray-100">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-mono">
                          {scheme.scheme_id}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base border-b border-gray-100">
                        {scheme.scheme_name}
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base text-center border-b border-gray-100">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                          {scheme.region_name}
                        </span>
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base text-center border-b border-gray-100">
                        <div className="flex items-center justify-center">
                          <span className="font-medium">{scheme.fully_completed_villages || 0}</span>
                          <span className="text-neutral-400 mx-1">/</span>
                          <span>{scheme.total_villages || scheme.total_villages_in_scheme || 0}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${calcPercentage(scheme.fully_completed_villages, scheme.total_villages || scheme.total_villages_in_scheme)}%` }}
                          ></div>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base text-center border-b border-gray-100">
                        <div className="flex items-center justify-center">
                          <span className="font-medium">{scheme.fully_completed_esr || 0}</span>
                          <span className="text-neutral-400 mx-1">/</span>
                          <span className="text-purple-600 font-medium">{scheme.total_esr || scheme.total_esr_in_scheme || 0}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-purple-500 h-1.5 rounded-full" 
                            style={{ width: `${calcPercentage(scheme.fully_completed_esr, scheme.total_esr || scheme.total_esr_in_scheme)}%` }}
                          ></div>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base text-center border-b border-gray-100">
                        <span className={`px-3 py-1.5 inline-flex items-center justify-center text-xs lg:text-sm font-medium rounded-md ${getStatusColorClass((scheme.scheme_status || scheme.scheme_completion_status || 'Not-Connected') as SchemeCompletionStatus)}`}>
                          {getStatusDisplayName((scheme.scheme_status || scheme.scheme_completion_status || 'Not-Connected') as SchemeCompletionStatus)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center p-1 sm:p-3 lg:p-4 xl:p-5 border-b border-gray-100">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border-blue-200 hover:border-blue-300 transition-colors duration-150 text-xs sm:text-sm h-8 sm:h-9 font-medium"
                          onClick={() => onViewDetails(scheme)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="py-3 sm:py-4 lg:py-5 xl:py-6 px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-center sm:justify-between border-t border-neutral-200">
              <div className="hidden sm:block">
                <p className="text-xs sm:text-sm lg:text-base text-neutral-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredSchemes.length)}
                  </span> of{" "}
                  <span className="font-medium">{filteredSchemes.length}</span> results
                </p>
              </div>
              <div className="text-xs sm:text-sm text-center sm:text-left mt-2 sm:mt-0 block sm:hidden">
                Page {currentPage} of {totalPages}
              </div>
              <Pagination className="mt-2 sm:mt-0">
                <PaginationContent className="flex items-center gap-1 sm:gap-0">
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) handlePageChange(currentPage - 1);
                      }}
                      className={`h-8 w-8 sm:h-9 sm:w-auto lg:h-10 xl:h-12 p-0 sm:p-2 lg:p-3 flex items-center justify-center text-xs sm:text-sm lg:text-base ${currentPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                    />
                  </PaginationItem>
                  
                  {/* On mobile, simplify to just show current page indicator */}
                  <div className="sm:hidden flex items-center justify-center">
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        isActive={true}
                        className="h-8 w-8 p-0 flex items-center justify-center"
                      >
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>
                  </div>
                  
                  {/* On desktop, show more page numbers */}
                  <div className="hidden sm:flex">
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      
                      // For large screens, show more page numbers
                      const shouldShowOnLarge = pageNumber === 1 || 
                        pageNumber === totalPages || 
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1);
                      
                      // Add more page numbers for 2xl screens with a CSS approach instead of JS
                      const shouldShowOnExtraLarge = pageNumber === 1 || 
                        pageNumber === totalPages || 
                        (pageNumber >= currentPage - 3 && pageNumber <= currentPage + 3);
                      
                      // Show first page, current page, last page, and pages around current page
                      if (shouldShowOnLarge || (shouldShowOnExtraLarge && !shouldShowOnLarge)) {
                        const isExtraLargeOnly = shouldShowOnExtraLarge && !shouldShowOnLarge;
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(pageNumber);
                              }}
                              isActive={pageNumber === currentPage}
                              className={`h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 xl:h-12 xl:w-12 flex items-center justify-center text-xs sm:text-sm lg:text-base ${isExtraLargeOnly ? 'hidden 2xl:flex' : ''}`}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      // Show ellipsis after first page and before last page if there are more pages
                      if (
                        (pageNumber === 2 && currentPage > 3) ||
                        (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                      ) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationEllipsis className="h-8 sm:h-9 lg:h-10 xl:h-12 text-xs sm:text-sm lg:text-base" />
                          </PaginationItem>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) handlePageChange(currentPage + 1);
                      }}
                      className={`h-8 w-8 sm:h-9 sm:w-auto lg:h-10 xl:h-12 p-0 sm:p-2 lg:p-3 flex items-center justify-center text-xs sm:text-sm lg:text-base ${currentPage === totalPages ? "pointer-events-none opacity-50" : ""}`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
