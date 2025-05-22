import { useState } from "react";
import { Link } from "wouter";
import ReportDownloadList from "@/components/reports/ReportDownloadList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Download, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("datalink");

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Download the latest Excel reports from the Maharashtra Water Dashboard
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="datalink">Datalink Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="datalink" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <ReportDownloadList />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-full">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Report Information</h3>
                    <p className="text-sm text-gray-500">
                      These reports are updated regularly by administrators. Each report contains the latest data for various aspects of water infrastructure in Maharashtra.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-full">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Excel Format</h3>
                    <p className="text-sm text-gray-500">
                      All reports are provided in Excel format (.xlsx) with the original formatting, colors, and formulas intact.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-full">
                    <Download className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">How to Download</h3>
                    <p className="text-sm text-gray-500">
                      Click the "Download" button next to any report to save it to your computer. Reports can be opened with Microsoft Excel or other compatible spreadsheet software.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-50 p-4 rounded-full">
                <FileSpreadsheet className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">Analytics Reports Coming Soon</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              We're working on adding advanced analytics reports. These will provide deeper insights into water infrastructure trends and performance metrics.
            </p>
            <div className="flex justify-center">
              <Link href="/dashboard">
                <Button variant="outline">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}