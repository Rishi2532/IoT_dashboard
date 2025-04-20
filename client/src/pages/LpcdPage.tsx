import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LpcdDashboard from './lpcd/LpcdDashboard';
import LpcdImport from './lpcd/LpcdImport';
import { useAuth } from '@/hooks/use-auth';

const LpcdPage = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">LPCD Management</h1>
      
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="dashboard">LPCD Dashboard</TabsTrigger>
          {isAdmin && <TabsTrigger value="import">Import Data</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="dashboard">
          <LpcdDashboard />
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="import">
            <LpcdImport />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default LpcdPage;