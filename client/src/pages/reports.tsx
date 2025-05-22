import { useQuery } from '@tanstack/react-query';
import { File, FileDown, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import DashboardLayout from '@/components/dashboard/dashboard-layout';

// Report file types with friendly names and descriptions
const REPORT_TYPES = [
  {
    id: 'esr_level',
    name: 'ESR Level Datalink Report',
    description: 'Comprehensive data about ESR (Elevated Storage Reservoir) infrastructure and operations'
  },
  {
    id: 'water_consumption',
    name: 'Water Consumption Datalink Report',
    description: 'Detailed water consumption metrics across regions and schemes'
  },
  {
    id: 'lpcd_village',
    name: 'LPCD Village Level Datalink Report',
    description: 'Liters Per Capita Daily (LPCD) statistics at the village level'
  },
  {
    id: 'chlorine',
    name: 'Chlorine Datalink Report',
    description: 'Chlorine analyzer data from water treatment facilities'
  },
  {
    id: 'pressure',
    name: 'Pressure Datalink Report',
    description: 'Water pressure measurements across distribution networks'
  },
  {
    id: 'village_level',
    name: 'Village Level Datalink Report',
    description: 'Comprehensive water infrastructure metrics for villages'
  },
  {
    id: 'scheme_level',
    name: 'Scheme Level Datalink Report',
    description: 'Detailed statistics and metrics for water schemes'
  }
];

// Reports page for users to download Excel reports
function ReportsPage() {
  // Fetch all available report files
  const { data: reportFiles, isLoading, error } = useQuery({
    queryKey: ['/api/reports'],
    retry: 1,
  });

  // Get the most recent active report for each type
  const getLatestReportByType = (type: string) => {
    if (!reportFiles || !Array.isArray(reportFiles)) return null;
    
    const typeReports = reportFiles
      .filter((file: any) => file.report_type === type)
      .sort((a: any, b: any) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
    
    return typeReports.length > 0 ? typeReports[0] : null;
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports</h1>
          <p className="text-gray-600">
            Download the latest Excel report files with all formatting preserved
          </p>
        </div>
        {/* Admin-only link to manage reports */}
        <Link href="/admin/manage-reports">
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Manage Reports
          </Button>
        </Link>
      </div>

      <div className="py-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading reports...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-lg">
              There was an error loading the reports. Please try again later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REPORT_TYPES.map((type) => {
              const report = getLatestReportByType(type.id);
              return (
                <Card key={type.id} className="overflow-hidden">
                  <CardHeader className="bg-secondary/10">
                    <CardTitle className="flex items-center gap-2">
                      <File className="h-5 w-5" />
                      {type.name}
                    </CardTitle>
                    <CardDescription>{type.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {report ? (
                      <div>
                        <div className="mb-4">
                          <p className="text-sm font-medium">Filename:</p>
                          <p className="text-sm text-gray-500 truncate">{report.original_name}</p>
                        </div>
                        <div className="mb-4">
                          <p className="text-sm font-medium">Last Updated:</p>
                          <p className="text-sm text-gray-500">
                            {new Date(report.upload_date).toLocaleDateString()}
                          </p>
                        </div>
                        <a 
                          href={`/api/reports/${report.id}`} 
                          download
                          className="w-full"
                        >
                          <Button className="w-full">
                            <FileDown className="h-4 w-4 mr-2" />
                            Download Report
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500">No report available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ReportsPage;