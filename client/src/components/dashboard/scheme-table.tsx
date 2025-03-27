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
      <CardHeader className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <CardTitle className="text-lg font-medium text-neutral-900">Scheme Status</CardTitle>
          <CardDescription className="mt-1 max-w-2xl text-sm text-neutral-500">
            Details of water schemes and their current status
          </CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              id="schemeSearch"
              placeholder="Search schemes..."
              className="pl-8 w-full sm:w-auto"
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
            <SelectTrigger className="w-full sm:w-[180px]">
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
                  <TableHead className="w-[30%]">Scheme Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Villages</TableHead>
                  <TableHead>ESR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={6}>
                        <div className="animate-pulse h-6 bg-gray-200 rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-neutral-500">
                      No schemes found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((scheme) => (
                    <TableRow key={scheme.scheme_id} className="hover:bg-neutral-50">
                      <TableCell className="font-medium">
                        {scheme.scheme_name}
                      </TableCell>
                      <TableCell>{scheme.region_name}</TableCell>
                      <TableCell>
                        <span className="font-medium">{scheme.fully_completed_villages || 0}</span> / {scheme.total_villages_in_scheme || 0}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{scheme.fully_completed_esr || 0}</span> / {scheme.total_esr_in_scheme || 0}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColorClass(scheme.scheme_completion_status as SchemeCompletionStatus)}`}>
                          {getStatusDisplayName(scheme.scheme_completion_status as SchemeCompletionStatus)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          className="text-primary-600 hover:text-primary-800"
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
            <div className="py-4 px-6 flex items-center justify-between border-t border-neutral-200">
              <div className="hidden sm:block">
                <p className="text-sm text-neutral-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredSchemes.length)}
                  </span> of{" "}
                  <span className="font-medium">{filteredSchemes.length}</span> results
                </p>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) handlePageChange(currentPage - 1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
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
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) handlePageChange(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
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
