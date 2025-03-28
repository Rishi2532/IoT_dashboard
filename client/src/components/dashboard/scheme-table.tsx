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
  const [localStatusFilter, setLocalStatusFilter] = useState<string>(statusFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // If statusFilter prop changes, update local state
  useEffect(() => {
    setLocalStatusFilter(statusFilter);
  }, [statusFilter]);
  
  // Filter schemes only by search (status is now filtered server-side)
  const filteredSchemes = schemes.filter(scheme => {
    const matchesSearch = searchTerm === "" || 
      scheme.scheme_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });
  
  const totalPages = Math.ceil(filteredSchemes.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSchemes.slice(indexOfFirstItem, indexOfLastItem);
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  return (
    <Card className="bg-white shadow mb-8">
      <CardHeader className="px-3 py-3 sm:px-4 sm:py-5 flex flex-col justify-between items-start space-y-3">
        <div>
          <CardTitle className="text-base sm:text-lg font-medium text-neutral-900">Scheme Status</CardTitle>
          <CardDescription className="mt-1 max-w-2xl text-xs sm:text-sm text-neutral-500">
            Details of water schemes and their current status
          </CardDescription>
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
            <Input
              id="schemeSearch"
              placeholder="Search schemes..."
              className="pl-7 sm:pl-8 w-full text-xs sm:text-sm h-8 sm:h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
            <SelectTrigger className="w-full h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Fully-Completed">Fully Completed</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
              <SelectItem value="Not-Connected">Not Connected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-0 py-0">
        <div className="border-t border-neutral-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-50">
                <TableRow>
                  <TableHead className="w-[35%] text-xs sm:text-sm p-2 sm:p-3">Scheme Name</TableHead>
                  <TableHead className="text-xs sm:text-sm p-2 sm:p-3">Region</TableHead>
                  <TableHead className="text-xs sm:text-sm p-2 sm:p-3">Villages</TableHead>
                  <TableHead className="text-xs sm:text-sm p-2 sm:p-3">ESR</TableHead>
                  <TableHead className="text-xs sm:text-sm p-2 sm:p-3">Status</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm p-2 sm:p-3">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={6}>
                        <div className="animate-pulse h-4 sm:h-6 bg-gray-200 rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 sm:py-6 text-xs sm:text-sm text-neutral-500">
                      No schemes found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((scheme) => (
                    <TableRow key={scheme.scheme_id} className="hover:bg-neutral-50">
                      <TableCell className="font-medium p-2 sm:p-3 text-xs sm:text-sm">
                        {scheme.scheme_name}
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 text-xs sm:text-sm">
                        {scheme.region_name}
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 text-xs sm:text-sm">
                        <span className="font-medium">{scheme.fully_completed_villages || 0}</span>/{scheme.total_villages_in_scheme || 0}
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 text-xs sm:text-sm">
                        <span className="font-medium">{scheme.fully_completed_esr || 0}</span>/{scheme.total_esr_in_scheme || 0}
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 text-xs sm:text-sm">
                        <span className={`px-1 sm:px-2 py-0.5 inline-flex text-[10px] sm:text-xs leading-4 sm:leading-5 font-semibold rounded-full ${getStatusColorClass(scheme.scheme_completion_status as SchemeCompletionStatus)}`}>
                          {getStatusDisplayName(scheme.scheme_completion_status as SchemeCompletionStatus)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right p-1 sm:p-3">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-primary-600 hover:text-primary-800 text-xs h-7 sm:h-8 px-2 sm:px-3"
                          onClick={() => onViewDetails(scheme)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="py-3 sm:py-4 px-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-center sm:justify-between border-t border-neutral-200">
              <div className="hidden sm:block">
                <p className="text-xs sm:text-sm text-neutral-700">
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
                      className={`h-8 w-8 sm:h-9 sm:w-auto p-0 sm:p-2 flex items-center justify-center ${currentPage === 1 ? "pointer-events-none opacity-50" : ""}`}
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
                      
                      // Show first page, current page, last page, and one page before and after current page
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(pageNumber);
                              }}
                              isActive={pageNumber === currentPage}
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
                            <PaginationEllipsis />
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
                      className={`h-8 w-8 sm:h-9 sm:w-auto p-0 sm:p-2 flex items-center justify-center ${currentPage === totalPages ? "pointer-events-none opacity-50" : ""}`}
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
