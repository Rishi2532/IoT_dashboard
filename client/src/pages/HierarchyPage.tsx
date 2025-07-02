import DashboardLayout from "@/components/dashboard/dashboard-layout";
import Sidebar from "@/components/dashboard/sidebar";
import ZoomableSunburst from "@/components/dashboard/zoomable-sunburst";

const HierarchyPage = () => {
  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 px-4">
          <div className="w-full">
            <ZoomableSunburst />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HierarchyPage;