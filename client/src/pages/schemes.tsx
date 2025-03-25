import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import RegionFilter from "@/components/dashboard/region-filter";
import SchemeTable from "@/components/dashboard/scheme-table";
import SchemeDetailsModal from "@/components/dashboard/scheme-details-modal";
import { SchemeStatus } from "@/types";

export default function Schemes() {
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedScheme, setSelectedScheme] = useState<SchemeStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch regions data
  const { data: regions, isLoading: isRegionsLoading } = useQuery({
    queryKey: ['/api/regions'],
  });

  // Fetch schemes data
  const { data: schemes, isLoading: isSchemesLoading } = useQuery({
    queryKey: ['/api/schemes', selectedRegion],
  });

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
  };

  const handleViewSchemeDetails = (scheme: SchemeStatus) => {
    setSelectedScheme(scheme);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Schemes Management</h1>
        <p className="mt-1 text-sm text-neutral-500">
          View and manage all water schemes across regions
        </p>
      </div>

      <RegionFilter 
        regions={regions || []} 
        selectedRegion={selectedRegion} 
        onChange={handleRegionChange}
        className="mb-6"
      />

      <SchemeTable 
        schemes={schemes || []} 
        isLoading={isSchemesLoading}
        onViewDetails={handleViewSchemeDetails}
      />

      <SchemeDetailsModal 
        scheme={selectedScheme} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </DashboardLayout>
  );
}
