import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PressureDashboard from './PressureDashboard';
import { BarChart2, FileSpreadsheet, Gauge } from 'lucide-react';

const PressurePage: React.FC = () => {
  const [location, setLocation] = useLocation();
  
  // Determine which tab to show based on the URL
  const getActiveTab = () => {
    if (location === '/pressure/import') return 'import';
    return 'dashboard';
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pressure Monitoring</h1>
        <p className="text-gray-600">
          Monitor and analyze water pressure across multiple ESRs in all regions
        </p>
      </div>

      <Tabs 
        value={getActiveTab()} 
        onValueChange={(value) => {
          if (value === 'dashboard') setLocation('/pressure');
          if (value === 'import') setLocation('/pressure/import');
        }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <TabsList className="bg-blue-50 h-12">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm flex gap-2 h-10"
            >
              <Gauge className="h-5 w-5" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="import" 
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm flex gap-2 h-10"
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span>Import Data</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Link href="/chlorine">
              <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200" variant="outline">
                <BarChart2 className="h-5 w-5 mr-2" />
                Chlorine Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <TabsContent value="dashboard" className="mt-0">
          <PressureDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PressurePage;