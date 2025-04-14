import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  if (!scheme) return null;

  // Handle field names from the database
  const totalVillages = scheme.number_of_village || 0;
  const villagesIntegrated = scheme.total_villages_integrated || 0;
  const totalEsr = scheme.total_number_of_esr || 0;
  const esrIntegrated = scheme.total_esr_integrated || 0;

  const villagesIntegratedPercent = calculatePercentage(
    villagesIntegrated,
    totalVillages,
  );

  const fullyCompletedVillagesPercent = calculatePercentage(
    scheme.fully_completed_villages,
    totalVillages,
  );

  const esrIntegratedPercent = calculatePercentage(esrIntegrated, totalEsr);

  const fullyCompletedEsrPercent = calculatePercentage(
    scheme.no_fully_completed_esr,
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
              <span className="break-all">{scheme.scheme_name}</span>
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
                  {scheme.scheme_id || "N/A"}
                </p>
              </div>
              {/* Sr. No. removed as requested */}
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Agency</h4>
                <p className="text-xs text-neutral-900">
                  {getAgencyByRegion(scheme.region)}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Total Villages
                </h4>
                <p className="text-xs text-neutral-900">
                  {scheme.number_of_village || 0}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Total ESR
                </h4>
                <p className="text-xs text-neutral-900">
                  {scheme.total_number_of_esr || 0}
                </p>
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
                  {scheme.region || "N/A"}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Circle</h4>
                <p className="text-xs text-neutral-900">
                  {!scheme.circle ||
                  scheme.circle === "Circle" ||
                  scheme.circle === "N/A" ? (
                    <span className="text-gray-400 italic">Not specified</span>
                  ) : (
                    scheme.circle
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Division
                </h4>
                <p className="text-xs text-neutral-900">
                  {!scheme.division ||
                  scheme.division === "Division" ||
                  scheme.division === "N/A" ? (
                    <span className="text-gray-400 italic">Not specified</span>
                  ) : (
                    scheme.division
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Sub Division
                </h4>
                <p className="text-xs text-neutral-900">
                  {!scheme.sub_division ||
                  scheme.sub_division === "Sub Division" ||
                  scheme.sub_division === "N/A" ? (
                    <span className="text-gray-400 italic">Not specified</span>
                  ) : (
                    scheme.sub_division
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Block</h4>
                <p className="text-xs text-neutral-900">
                  {!scheme.block ||
                  scheme.block === "Block" ||
                  scheme.block === "N/A" ? (
                    <span className="text-gray-400 italic">Not specified</span>
                  ) : (
                    scheme.block
                  )}
                </p>
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
                    className={`px-2 py-1 inline-flex items-center justify-center text-xs font-medium rounded-md ${getStatusColorClass((scheme.fully_completion_scheme_status || "Not-Connected") as SchemeCompletionStatus)}`}
                  >
                    {getStatusDisplayName(
                      (scheme.fully_completion_scheme_status ||
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
                      scheme.scheme_functional_status === "Functional"
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {scheme.scheme_functional_status === "Functional"
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
                    {scheme.fully_completed_villages || 0} / {totalVillages}
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
                    {scheme.no_fully_completed_esr || 0} / {totalEsr}
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
                  {scheme.flow_meters_connected ||
                    scheme.flow_meters_connected ||
                    0}
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-neutral-100 text-center">
                <div className="text-xs text-neutral-500 mb-1">
                  Pressure Transmitters
                </div>
                <div className="font-semibold text-blue-600">
                  {scheme.pressure_transmitter_connected || 0}
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-neutral-100 text-center">
                <div className="text-xs text-neutral-500 mb-1">
                  Residual Chlorine Analyzers
                </div>
                <div className="font-semibold text-blue-600">
                  {scheme.residual_chlorine_analyzer_connected || 0}
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
