import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Reports() {
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
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            This feature is under development and will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-700">
            The reporting section will allow you to generate custom reports based on various parameters:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-neutral-600">
            <li>Region-wise implementation status</li>
            <li>Scheme completion timelines</li>
            <li>Component integration progress</li>
            <li>Historical completion rates</li>
            <li>Performance metrics by region and agency</li>
          </ul>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
