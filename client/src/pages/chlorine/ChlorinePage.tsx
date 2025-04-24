import DashboardLayout from '@/components/dashboard/dashboard-layout';
import Sidebar from '@/components/dashboard/sidebar';
import ChlorineDashboard from './ChlorineDashboard';

const ChlorinePage = () => {
  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 px-4">
          <div className="w-full">
            <div className="border-b pb-2 mb-4">
              <h1 className="text-2xl font-bold">Chlorine Monitoring Dashboard</h1>
            </div>
            <ChlorineDashboard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChlorinePage;