import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LpcdDashboardFixed from './lpcd/LpcdDashboardFixed';
import LpcdImport from './lpcd/LpcdImport';
import { useAuth } from '@/hooks/use-auth';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import Sidebar from '@/components/dashboard/sidebar';

const LpcdPage = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 px-4">
          <h1 className="text-2xl font-bold mb-4">LPCD Management</h1>
          
          <Tabs defaultValue="dashboard" value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="dashboard">LPCD Dashboard</TabsTrigger>
              {isAdmin && <TabsTrigger value="import">Import Data</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="dashboard">
              <LpcdDashboardFixed />
            </TabsContent>
            
            {isAdmin && (
              <TabsContent value="import">
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