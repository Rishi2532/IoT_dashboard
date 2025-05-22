import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ReportFileUploader from "@/components/admin/ReportFileUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Download, FileSpreadsheet, AlertTriangle, ChevronLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ReportFile = {
  id: number;
  file_name: string;
  original_name: string;
  file_path: string;
  report_type: string;
  upload_date: string;
  uploaded_by: number;
  file_size: number;
  is_active: boolean;
};

export default function ManageReportsPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { toast } = useToast();
  
  // Check if user is admin
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const response = await fetch("/api/auth/status");
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    }
    
    checkAdminStatus();
  }, []);

  // Fetch report files
  const { 
    data: reports, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ["/api/reports"],
    queryFn: async () => {
      const response = await fetch("/api/reports");
      if (!response.ok) {
        throw new Error("Failed to fetch report files");
      }
      return response.json() as Promise<ReportFile[]>;
    }
  });

  // Delete a report file
  const handleDeleteReport = async (id: number) => {
    if (!confirm("Are you sure you want to delete this report?")) {
      return;
    }
    
    try {
      await apiRequest(`/api/reports/${id}`, {
        method: "DELETE",
      });
      
      toast({
        title: "Report Deleted",
        description: "The report has been successfully deleted.",
        variant: "default",
      });
      
      // Refresh the reports list
      refetch();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "An error occurred while deleting the report",
        variant: "destructive",
      });
    }
  };

  // Get friendly name for report type
  const getReportTypeName = (type: string) => {
    const reportTypeMap: Record<string, string> = {
      "esr_level": "ESR Level Datalink Report",
      "water_consumption": "Water Consumption Datalink Report",
      "lpcd_village": "LPCD Village Level Datalink Report",
      "chlorine": "Chlorine Datalink Report",
      "pressure": "Pressure Datalink Report",
      "village_level": "Village Level Datalink Report",
      "scheme_level": "Scheme Level Datalink Report"
    };
    
    return reportTypeMap[type] || type;
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // If admin status is still loading
  if (isAdmin === null) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking access...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not admin, show access denied
  if (isAdmin === false) {
    return (
      <div className="container py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this page. This page is for administrators only.
          </AlertDescription>
        </Alert>
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Reports</h1>
          <p className="text-muted-foreground">
            Upload and manage Excel report files for the Maharashtra Water Dashboard
          </p>
        </div>
        <Link href="/reports">
          <Button variant="outline" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            View Reports Page
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload New Report</TabsTrigger>
          <TabsTrigger value="manage">Manage Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ReportFileUploader />
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Upload Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium">Report Types</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Select the appropriate report type from the dropdown menu. This ensures that users can easily find the reports they need.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">File Requirements</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Only Excel files (.xlsx, .xls) are accepted. The maximum file size is 15MB. Reports should be properly formatted according to the established templates.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Update Process</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      When you upload a new version of a report, the previous version will be automatically archived and the new one will be made available to users.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">All Report Files</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load report files. Please try refreshing the page.
                  </AlertDescription>
                </Alert>
              ) : reports && reports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Type</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                            <span>{getReportTypeName(report.report_type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{report.original_name}</TableCell>
                        <TableCell>{format(new Date(report.upload_date), "MMM d, yyyy h:mm a")}</TableCell>
                        <TableCell>{formatFileSize(report.file_size)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.location.href = `/api/reports/${report.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteReport(report.id)}
                              className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Reports Available</h3>
                  <p className="text-gray-500 mt-1">
                    Upload your first report by going to the "Upload New Report" tab.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}