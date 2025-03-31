
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { calculatePercentage, SchemeCompletionStatus, getStatusColorClass, getStatusDisplayName, getAgencyByRegion } from "@/lib/utils";
import { SchemeStatus } from "@/types";

interface SchemeDetailsModalProps {
  scheme: SchemeStatus | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SchemeDetailsModal({ scheme, isOpen, onClose }: SchemeDetailsModalProps) {
  if (!scheme) return null;

  const villagesIntegratedPercent = calculatePercentage(
    scheme.villages_integrated_on_iot,
    scheme.total_villages_in_scheme
  );

  const fullyCompletedVillagesPercent = calculatePercentage(
    scheme.fully_completed_villages,
    scheme.total_villages_in_scheme
  );

  const esrRequestReceivedPercent = calculatePercentage(
    scheme.esr_request_received,
    scheme.total_esr_in_scheme
  );

  const esrIntegratedPercent = calculatePercentage(
    scheme.esr_integrated_on_iot,
    scheme.total_esr_in_scheme
  );

  const fullyCompletedEsrPercent = calculatePercentage(
    scheme.fully_completed_esr,
    scheme.total_esr_in_scheme
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl bg-white border-2 border-blue-100 rounded-xl">
        <DialogHeader className="bg-blue-50 -mx-6 -mt-6 mb-4 px-6 py-4 rounded-t-xl border-b border-blue-100">
          <DialogTitle className="text-lg font-semibold text-blue-800">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Scheme Details: {scheme.scheme_name}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {/* Scheme Info */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200 mb-6">
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Scheme Information</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Region</h4>
                <p className="mt-1 text-sm text-neutral-900">{scheme.region_name || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Agency</h4>
                <p className="mt-1 text-sm text-neutral-900">{getAgencyByRegion(scheme.region_name)}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Total Villages</h4>
                <p className="mt-1 text-sm text-neutral-900">{scheme.total_villages_in_scheme || 0}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Total ESR</h4>
                <p className="mt-1 text-sm text-neutral-900">{scheme.total_esr_in_scheme || 0}</p>
              </div>
            </div>
          </div>

          {/* Progress Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Village Integration Status</h4>
              <div className="bg-neutral-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-neutral-500">Villages integrated on IoT</span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {scheme.villages_integrated_on_iot || 0} / {scheme.total_villages_in_scheme || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${villagesIntegratedPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right mt-1 text-blue-700">
                  {villagesIntegratedPercent}%
                </div>
                
                <div className="flex justify-between mb-2 mt-4">
                  <span className="text-xs text-neutral-500">Fully completed villages</span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {scheme.fully_completed_villages || 0} / {scheme.total_villages_in_scheme || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${fullyCompletedVillagesPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right mt-1 text-green-700">
                  {fullyCompletedVillagesPercent}%
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
              <h4 className="text-sm font-medium text-neutral-700 mb-3">ESR Integration Status</h4>
              <div className="bg-neutral-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-neutral-500">ESR requests received</span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {scheme.esr_request_received || 0} / {scheme.total_esr_in_scheme || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-purple-500 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${esrRequestReceivedPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right mt-1 text-purple-700">
                  {esrRequestReceivedPercent}%
                </div>
                
                <div className="flex justify-between mb-2 mt-4">
                  <span className="text-xs text-neutral-500">ESR integrated on IoT</span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {scheme.esr_integrated_on_iot || 0} / <span className="text-purple-600">{scheme.total_esr_in_scheme || 0}</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${esrIntegratedPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right mt-1 text-purple-700">
                  {esrIntegratedPercent}%
                </div>
                
                <div className="flex justify-between mb-2 mt-4">
                  <span className="text-xs text-neutral-500">Fully completed ESR</span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {scheme.fully_completed_esr || 0} / <span className="text-purple-600">{scheme.total_esr_in_scheme || 0}</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${fullyCompletedEsrPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right mt-1 text-green-700">
                  {fullyCompletedEsrPercent}%
                </div>
              </div>
            </div>
          </div>

          {/* Integration Details */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Component Integration</h4>
            <div className="bg-white overflow-hidden rounded-lg border border-neutral-200">
              <div className="grid grid-cols-4 border-b border-neutral-200">
                <div className="py-3 px-4 text-xs font-medium text-neutral-500 border-r border-neutral-200">Component</div>
                <div className="py-3 px-4 text-xs font-medium text-neutral-500 border-r border-neutral-200">Integrated</div>
                <div className="py-3 px-4 text-xs font-medium text-neutral-500 border-r border-neutral-200">Total</div>
                <div className="py-3 px-4 text-xs font-medium text-neutral-500">Status</div>
              </div>
              
              <div className="grid grid-cols-4 border-b border-neutral-200 bg-white">
                <div className="py-3 px-4 text-xs text-neutral-700 border-r border-neutral-200">Flow Meter</div>
                <div className="py-3 px-4 text-xs text-neutral-700 border-r border-neutral-200">{scheme.fm_integrated || 0}</div>
                <div className="py-3 px-4 text-xs text-neutral-700 border-r border-neutral-200">{scheme.total_esr_in_scheme || 0}</div>
                <div className="py-3 px-4">
                  {(scheme.fm_integrated || 0) === (scheme.total_esr_in_scheme || 0) ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Complete
                    </span>
                  ) : (scheme.fm_integrated || 0) > 0 ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Partial
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Not Started
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 border-b border-neutral-200 bg-white">
                <div className="py-3 px-4 text-xs text-neutral-700 border-r border-neutral-200">RCA</div>
                <div className="py-3 px-4 text-xs text-neutral-700 border-r border-neutral-200">{scheme.rca_integrated || 0}</div>
                <div className="py-3 px-4 text-xs text-neutral-700 border-r border-neutral-200">{scheme.total_esr_in_scheme || 0}</div>
                <div className="py-3 px-4">
                  {(scheme.rca_integrated || 0) === (scheme.total_esr_in_scheme || 0) ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Complete
                    </span>
                  ) : (scheme.rca_integrated || 0) > 0 ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Partial
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Not Started
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 bg-white">
                <div className="py-3 px-4 text-xs text-neutral-700 border-r border-neutral-200">Pressure Transmitter</div>
                <div className="py-3 px-4 text-xs text-neutral-700 border-r border-neutral-200">{scheme.pt_integrated || 0}</div>
                <div className="py-3 px-4 text-xs text-neutral-700 border-r border-neutral-200">{scheme.total_esr_in_scheme || 0}</div>
                <div className="py-3 px-4">
                  {(scheme.pt_integrated || 0) === (scheme.total_esr_in_scheme || 0) ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Complete
                    </span>
                  ) : (scheme.pt_integrated || 0) > 0 ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Partial
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Not Started
                    </span>
                  )}
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
