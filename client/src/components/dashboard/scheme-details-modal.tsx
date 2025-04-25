import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculatePercentage,
  SchemeCompletionStatus,
  getStatusColorClass,
  getStatusDisplayName,
  getAgencyByRegion,
} from "@/lib/utils";
import { SchemeStatus } from "@/types";

interface SchemeDetailsModalProps {
  scheme: SchemeStatus | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SchemeDetailsModal({
  scheme,
  isOpen,
  onClose,
}: SchemeDetailsModalProps) {
  console.log("SchemeDetailsModal opening with scheme:", scheme, "isOpen:", isOpen);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [currentScheme, setCurrentScheme] = useState<SchemeStatus | null>(scheme);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setCurrentScheme(scheme);
    if (scheme) {
      setSelectedBlock(scheme.block || "");
      fetchBlocks(scheme.scheme_name);
    }
  }, [scheme]);

  const fetchBlocks = async (schemeName: string) => {
    try {
      setIsLoading(true);
      console.log("Fetching blocks for scheme:", schemeName);
      const response = await fetch(`/api/schemes/blocks/${encodeURIComponent(schemeName)}`);
      if (response.ok) {
        const blocksData = await response.json();
        console.log("Fetched blocks for scheme:", schemeName, blocksData);
        setBlocks(blocksData);
        
        // If we have multiple blocks, fetch the aggregated data first
        if (blocksData.length > 1) {
          console.log("Multiple blocks found:", blocksData.length, "Fetching aggregated data first");
          // Add an "All Blocks" option
          fetchAggregatedData(schemeName);
        } else {
          console.log("Only one block found, will not show dropdown");
        }
      } else {
        console.error("Error response when fetching blocks:", response.status);
      }
    } catch (error) {
      console.error("Error fetching blocks:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchAggregatedData = async (schemeName: string) => {
    try {
      setIsLoading(true);
      console.log("Fetching aggregated data for scheme:", schemeName);
      const response = await fetch(`/api/schemes/aggregate/${encodeURIComponent(schemeName)}`);
      if (response.ok) {
        const aggregatedScheme = await response.json();
        console.log("Fetched aggregated data:", aggregatedScheme);
        setCurrentScheme(aggregatedScheme);
        setSelectedBlock('All Blocks');
      } else {
        console.error("Error response when fetching aggregated data:", response.status);
      }
    } catch (error) {
      console.error("Error fetching aggregated data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockChange = async (blockValue: string) => {
    if (!scheme) return;
    
    console.log("Changing block to:", blockValue);
    setSelectedBlock(blockValue);
    
    try {
      setIsLoading(true);
      
      // If "All Blocks" is selected, fetch aggregated data
      if (blockValue === 'All Blocks') {
        await fetchAggregatedData(scheme.scheme_name);
      } else {
        // Otherwise fetch data for the specific block using the new API endpoint
        const response = await fetch(`/api/schemes/by-name/${encodeURIComponent(scheme.scheme_name)}?block=${encodeURIComponent(blockValue)}`);
        if (response.ok) {
          const schemes = await response.json();
          console.log("Fetched schemes for block:", schemes);
          
          // Handle both array and single object responses
          if (Array.isArray(schemes) && schemes.length > 0) {
            // Use the first matching scheme for this block if response is an array
            setCurrentScheme(schemes[0]);
          } else if (schemes && typeof schemes === 'object') {
            // Handle case where a single scheme object is returned
            setCurrentScheme(schemes);
          } else {
            console.error(`No scheme found for block: ${blockValue}`);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching scheme by block:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentScheme) return null;

  // Handle field names from the database
  const totalVillages = currentScheme.number_of_village || 0;
  const villagesIntegrated = currentScheme.total_villages_integrated || 0;
  const totalEsr = currentScheme.total_number_of_esr || 0;
  const esrIntegrated = currentScheme.total_esr_integrated || 0;

  const villagesIntegratedPercent = calculatePercentage(
    villagesIntegrated,
    totalVillages,
  );

  const fullyCompletedVillagesPercent = calculatePercentage(
    currentScheme.fully_completed_villages,
    totalVillages,
  );

  const esrIntegratedPercent = calculatePercentage(esrIntegrated, totalEsr);

  const fullyCompletedEsrPercent = calculatePercentage(
    currentScheme.no_fully_completed_esr,
    totalEsr,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl bg-white border-2 border-blue-100 rounded-xl max-h-[90vh] overflow-y-auto mt-16">
        <DialogHeader className="bg-blue-50 -mx-6 -mt-6 mb-2 px-4 py-3 rounded-t-xl border-b border-blue-100">
          <DialogTitle className="text-md font-semibold text-blue-800">
            <span className="flex items-center break-words">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-blue-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="break-all">{currentScheme.scheme_name}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {/* Scheme Info */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-neutral-200 mb-3">
            <h4 className="text-xs font-medium text-neutral-700 mb-2">
              Scheme Information
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Scheme ID
                </h4>
                <p className="text-xs text-neutral-900 bg-gray-100 rounded px-2 py-1 mt-1 inline-block font-mono">
                  {currentScheme.scheme_id || "N/A"}
                </p>
              </div>
              {/* Sr. No. removed as requested */}
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Agency</h4>
                <p className="text-xs text-neutral-900">
                  {getAgencyByRegion(currentScheme.region)}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Total Villages
                </h4>
                <p className="text-xs text-neutral-900">
                  {currentScheme.number_of_village || 0}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Total ESR
                </h4>
                <p className="text-xs text-neutral-900">
                  {currentScheme.total_number_of_esr || 0}
                </p>
              </div>
              <div>
                <a
                  href="https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&rootpath=%5C%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Nagpur%5CCircle-Nagpur%5CDivision-Nagpur%5CSub%20Division-Nagpur%5CBlock-Kamptee%5CScheme-7940695%20-%20Bidgaon%20Tarodi%20wss%3F48487708-9037-11ef-96dd-ecf4bbe0f1d4"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <h4 className="text-xs font-medium text-blue-500 hover:underline cursor-pointer">
                    JJM Dashboard
                  </h4>
                </a>
              </div>
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-neutral-200 mb-3">
            <h4 className="text-xs font-medium text-neutral-700 mb-2">
              Location Information
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Region</h4>
                <p className="text-xs text-neutral-900">
                  {currentScheme.region || "N/A"}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Circle</h4>
                <p className="text-xs text-neutral-900">
                  {!currentScheme.circle ||
                  currentScheme.circle === "Circle" ||
                  currentScheme.circle === "N/A" ? (
                    <span className="text-gray-400 italic">Not specified</span>
                  ) : (
                    currentScheme.circle
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Division
                </h4>
                <p className="text-xs text-neutral-900">
                  {!currentScheme.division ||
                  currentScheme.division === "Division" ||
                  currentScheme.division === "N/A" ? (
                    <span className="text-gray-400 italic">Not specified</span>
                  ) : (
                    currentScheme.division
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Sub Division
                </h4>
                <p className="text-xs text-neutral-900">
                  {!currentScheme.sub_division ||
                  currentScheme.sub_division === "Sub Division" ||
                  currentScheme.sub_division === "N/A" ? (
                    <span className="text-gray-400 italic">Not specified</span>
                  ) : (
                    currentScheme.sub_division
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Block</h4>
                {/* Render blocks dropdown when we have multiple blocks */}
                {blocks && blocks.length > 1 ? (
                  <div className="mt-1">
                    <Select
                      value={selectedBlock}
                      onValueChange={handleBlockChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full text-xs h-7">
                        <SelectValue placeholder="Select Block" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="all-blocks" value="All Blocks">
                          All Blocks (Combined)
                        </SelectItem>
                        {blocks.map((block) => (
                          <SelectItem key={block} value={block}>
                            {block || "Not specified"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Aggregation indicator */}
                    {selectedBlock === 'All Blocks' && (
                      <div className="mt-1 text-xs bg-blue-50 border border-blue-200 rounded-md px-2 py-1 text-blue-600">
                        Showing combined data across all blocks
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-900">
                    {!currentScheme.block ||
                    currentScheme.block === "Block" ||
                    currentScheme.block === "N/A" ? (
                      <span className="text-gray-400 italic">Not specified</span>
                    ) : (
                      currentScheme.block
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-neutral-200 mb-3">
            <h4 className="text-xs font-medium text-neutral-700 mb-2">
              Status Information
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Integration Status
                </h4>
                <p className="mt-1">
                  <span
                    className={`px-2 py-1 inline-flex items-center justify-center text-xs font-medium rounded-md ${getStatusColorClass((currentScheme.fully_completion_scheme_status || "Not-Connected") as SchemeCompletionStatus)}`}
                  >
                    {getStatusDisplayName(
                      (currentScheme.fully_completion_scheme_status ||
                        "Not-Connected") as SchemeCompletionStatus,
                    )}
                  </span>
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Functional Status
                </h4>
                <p className="mt-1">
                  <span
                    className={`px-2 py-1 inline-flex items-center justify-center text-xs font-medium rounded-md ${
                      currentScheme.scheme_functional_status === "Functional"
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {currentScheme.scheme_functional_status === "Functional"
                      ? "Functional"
                      : "Partial"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Progress Charts in a more compact grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {/* Village Status Card */}
            <div className="bg-white p-2 rounded-lg shadow-sm border border-neutral-200">
              <h4 className="text-xs font-medium text-neutral-700 mb-1">
                Village Integration
              </h4>
              <div className="bg-neutral-50 rounded-lg p-2">
                {/* Villages integrated */}
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-neutral-500">
                    Villages integrated
                  </span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {villagesIntegrated} / {totalVillages}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${villagesIntegratedPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right text-blue-700">
                  {villagesIntegratedPercent}%
                </div>

                {/* Fully completed villages */}
                <div className="flex justify-between mb-1 mt-2">
                  <span className="text-xs text-neutral-500">
                    Fully completed villages
                  </span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {currentScheme.fully_completed_villages || 0} / {totalVillages}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${fullyCompletedVillagesPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right text-green-700">
                  {fullyCompletedVillagesPercent}%
                </div>
              </div>
            </div>

            {/* ESR Status Card */}
            <div className="bg-white p-2 rounded-lg shadow-sm border border-neutral-200">
              <h4 className="text-xs font-medium text-neutral-700 mb-1 flex items-center">
                <img
                  src="/images/esr-water-tank.png"
                  alt="ESR"
                  className="h-4 w-4 mr-1"
                />
                ESR Integration
              </h4>
              <div className="bg-neutral-50 rounded-lg p-2">
                {/* ESR integrated */}
                <div className="flex justify-between mb-1 mt-2">
                  <span className="text-xs text-neutral-500">
                    ESR integrated
                  </span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {esrIntegrated} / {totalEsr}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${esrIntegratedPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right text-purple-700">
                  {esrIntegratedPercent}%
                </div>

                {/* Fully completed ESR */}
                <div className="flex justify-between mb-1 mt-2">
                  <span className="text-xs text-neutral-500">
                    Fully completed ESR
                  </span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {currentScheme.no_fully_completed_esr || 0} / {totalEsr}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${fullyCompletedEsrPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right text-green-700">
                  {fullyCompletedEsrPercent}%
                </div>
              </div>
            </div>
          </div>

          {/* Component Integration - Simplified Card View */}
          <div className="mb-3 bg-white p-2 rounded-lg shadow-sm border border-neutral-200">
            <h4 className="text-xs font-medium text-neutral-700 mb-1">
              Component Integration
            </h4>
            <div className="grid grid-cols-3 gap-2 p-2 bg-neutral-50 rounded-lg">
              <div className="bg-white p-2 rounded border border-neutral-100 text-center">
                <div className="text-xs text-neutral-500 mb-1">Flow Meters</div>
                <div className="font-semibold text-blue-600">
                  {currentScheme.flow_meters_connected ||
                    currentScheme.flow_meters_connected ||
                    0}
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-neutral-100 text-center">
                <div className="text-xs text-neutral-500 mb-1">
                  Pressure Transmitters
                </div>
                <div className="font-semibold text-blue-600">
                  {currentScheme.pressure_transmitter_connected || 0}
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-neutral-100 text-center">
                <div className="text-xs text-neutral-500 mb-1">
                  Residual Chlorine Analyzers
                </div>
                <div className="font-semibold text-blue-600">
                  {currentScheme.residual_chlorine_analyzer_connected || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-blue-50 -mx-6 -mb-6 mt-6 px-6 py-4 rounded-b-xl border-t border-blue-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border-blue-200 hover:border-blue-300 transition-colors duration-150"
          >
            Close Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
