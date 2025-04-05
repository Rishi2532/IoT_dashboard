import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  FileUp, 
  LogOut, 
  RefreshCw,
  Database,
  FileText
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import ProtectedRoute from '@/components/auth/protected-route';
import RegionImporter from '@/components/admin/region-importer';
import SchemeImporter from '@/components/admin/scheme-importer';
import CsvImporter from '@/components/admin/csv-importer';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('region-import');

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Logout failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
      // Redirect to the login page
      window.location.href = '/login';
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Logout failed: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Region summary update mutation
  const updateRegionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/update-region-summaries', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Update failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Region summaries have been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Update failed: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleUpdateRegionSummaries = () => {
    updateRegionMutation.mutate();
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Admin Header with gradient */}
        <div className="p-6 bg-gradient-to-r from-blue-500/10 to-blue-600/5 rounded-lg mb-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-blue-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-sm text-blue-700/80 font-medium">
                Import data and manage system settings
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button 
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={handleUpdateRegionSummaries}
                disabled={updateRegionMutation.isPending}
              >
                {updateRegionMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update Summaries
                  </>
                )}
              </Button>
              <Button 
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? 'Logging out...' : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6">
          <Tabs defaultValue="region-import" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="region-import" className="flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Import Region Data
              </TabsTrigger>
              <TabsTrigger value="scheme-import" className="flex items-center">
                <FileUp className="h-4 w-4 mr-2" />
                Import Scheme Excel
              </TabsTrigger>
              <TabsTrigger value="csv-import" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Import CSV (No Headers)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="region-import" className="mt-0">
              <RegionImporter />
            </TabsContent>
            
            <TabsContent value="scheme-import" className="mt-0">
              <SchemeImporter />
            </TabsContent>
            
            <TabsContent value="csv-import" className="mt-0">
              <CsvImporter />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}