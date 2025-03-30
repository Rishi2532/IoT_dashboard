import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Region } from "@/types";
import { FileDown, AlertCircle } from "lucide-react";
import { utils, writeFile } from "xlsx";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Reports() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportError, setExportError] = useState("");

  // Fetch region data
  const { data: regions, isLoading: isRegionsLoading, isError: isRegionsError } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });
  
  // Fetch component integration data
  const { 
    data: componentData, 
    isLoading: isComponentsLoading, 
    isError: isComponentsError 
  } = useQuery<any[]>({
    queryKey: ["/api/reports/component-integration"],
  });
  
  // Combined loading and error states
  const isLoading = isRegionsLoading || isComponentsLoading;
  const isError = isRegionsError || isComponentsError;

  // Function to generate and download Excel report
  const generateExcelReport = async () => {
    if (!regions || regions.length === 0 || !componentData) return;
    
    try {
      setIsGenerating(true);
      setExportError("");

      // Create worksheet data by combining region data with component data
      const worksheetData = regions.map(region => {
        // Find component data for this region
        const regionComponents = componentData.find(c => c.region_name === region.region_name) || {
          flow_meter_integrated: 0,
          rca_integrated: 0,
          pressure_transmitter_integrated: 0
        };
        
        return {
          "Region": region.region_name,
          "Fully Completed schemes": region.fully_completed_schemes || 0,
          "Fully Completed Villages": region.fully_completed_villages || 0,
          "Fully Completed ESR": region.fully_completed_esr || 0,
          "Partially Completed schemes": 
            (region.total_schemes_integrated || 0) - (region.fully_completed_schemes || 0),
          "Partially Completed Villages": 
            (region.total_villages_integrated || 0) - (region.fully_completed_villages || 0),
          "Partially Completed ESR": region.partial_esr || 0,
          "Nos of Flow meter integrated": regionComponents.flow_meter_integrated,
          "Nos of RCA integrated": regionComponents.rca_integrated,
          "Nos of Pressure Transmitter integrated": regionComponents.pressure_transmitter_integrated,
        };
      });

      // Calculate totals for all columns
      const totalRow = {
        "Region": "Total",
        "Fully Completed schemes": regions.reduce((sum, r) => sum + (r.fully_completed_schemes || 0), 0),
        "Fully Completed Villages": regions.reduce((sum, r) => sum + (r.fully_completed_villages || 0), 0),
        "Fully Completed ESR": regions.reduce((sum, r) => sum + (r.fully_completed_esr || 0), 0),
        "Partially Completed schemes": regions.reduce((sum, r) => 
          sum + ((r.total_schemes_integrated || 0) - (r.fully_completed_schemes || 0)), 0),
        "Partially Completed Villages": regions.reduce((sum, r) => 
          sum + ((r.total_villages_integrated || 0) - (r.fully_completed_villages || 0)), 0),
        "Partially Completed ESR": regions.reduce((sum, r) => sum + (r.partial_esr || 0), 0),
        "Nos of Flow meter integrated": componentData.reduce((sum, c) => sum + c.flow_meter_integrated, 0),
        "Nos of RCA integrated": componentData.reduce((sum, c) => sum + c.rca_integrated, 0),
        "Nos of Pressure Transmitter integrated": componentData.reduce((sum, c) => sum + c.pressure_transmitter_integrated, 0),
      };
      worksheetData.push(totalRow);

      // Create workbook and worksheet
      const wb = utils.book_new();
      const ws = utils.json_to_sheet(worksheetData);

      // Add worksheet to workbook
      utils.book_append_sheet(wb, ws, "Regional Status");

      // Generate current date for filename
      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2, '0')}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getFullYear()}`;
      
      // Write to file and download
      writeFile(wb, `Online_status_${dateStr}.xlsx`);
      setIsGenerating(false);
    } catch (error) {
      console.error("Error generating Excel report:", error);
      setExportError("Failed to generate report. Please try again.");
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Reports</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Generate and view reports about scheme implementation
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Regional Implementation Status Report</CardTitle>
          <CardDescription>
            Download a comprehensive Excel report of the current regional implementation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load region data. Please refresh the page and try again.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p className="text-neutral-700 mb-4">
                The report includes the following data for each region:
              </p>
              <ul className="list-disc pl-5 mt-2 mb-6 space-y-1 text-neutral-600">
                <li>Fully and partially completed schemes</li>
                <li>Village integration status</li>
                <li>ESR integration status</li>
                <li>Component integration details (Flow meters, RCA, Pressure Transmitters)</li>
              </ul>
              
              {exportError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Export Failed</AlertTitle>
                  <AlertDescription>{exportError}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={generateExcelReport} 
                disabled={isGenerating || !regions || regions.length === 0 || !componentData}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileDown className="mr-2 h-4 w-4" />
                {isGenerating ? "Generating..." : "Download Excel Report"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
            Additional Reports Coming Soon
          </CardTitle>
          <CardDescription>
            More report types are under development and will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-700">
            Future reports will include:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-neutral-600">
            <li>Scheme completion timelines</li>
            <li>Historical completion rates</li>
            <li>Performance metrics by region and agency</li>
            <li>Detailed component status reports</li>
          </ul>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
