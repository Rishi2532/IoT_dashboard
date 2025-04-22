import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimpleLpcdDashboard from './lpcd/SimpleLpcdDashboard';
import EnhancedLpcdDashboard from './lpcd/EnhancedLpcdDashboard';
import LpcdImport from './lpcd/LpcdImport';
import { useAuth } from '@/hooks/use-auth';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import Sidebar from '@/components/dashboard/sidebar';

const LpcdPage = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('enhanced');

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 px-4">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h1 className="text-2xl font-bold">LPCD Dashboard</h1>
              <TabsList>
                <TabsTrigger value="enhanced">Enhanced View</TabsTrigger>
                <TabsTrigger value="simple">Simple View</TabsTrigger>
                {isAdmin && <TabsTrigger value="import">Import Data</TabsTrigger>}
              </TabsList>
            </div>
            
            <TabsContent value="enhanced" className="m-0">
              <EnhancedLpcdDashboard />
            </TabsContent>
            
            <TabsContent value="simple" className="m-0">
              <SimpleLpcdDashboard />
            </TabsContent>
            
            {isAdmin && (
              <TabsContent value="import" className="m-0">
                <LpcdImport />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LpcdPage;