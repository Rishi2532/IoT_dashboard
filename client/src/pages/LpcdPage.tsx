import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimpleLpcdDashboard from './lpcd/SimpleLpcdDashboard';
import LpcdImport from './lpcd/LpcdImport';
import { useAuth } from '@/hooks/use-auth';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import Sidebar from '@/components/dashboard/sidebar';

const LpcdPage = () => {
  const { isAdmin } = useAuth();

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 px-4">
          {/* Main content - full width without tabs */}
          <SimpleLpcdDashboard />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LpcdPage;