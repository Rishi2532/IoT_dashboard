import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { calculatePercentage, SchemeCompletionStatus, getStatusColorClass, getStatusDisplayName } from "@/lib/utils";
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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Scheme Details: {scheme.scheme_name}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {/* Scheme Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
            <div>
              <h4 className="text-sm font-medium text-neutral-500">Region</h4>
              <p className="mt-1 text-sm text-neutral-900">{scheme.region_name || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-neutral-500">Agency</h4>
              <p className="mt-1 text-sm text-neutral-900">{scheme.agency || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-neutral-500">Total Villages</h4>
              <p className="mt-1 text-sm text-neutral-900">{scheme.total_villages_in_scheme || 0}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-neutral-500">Total ESR</h4>
              <p className="mt-1 text-sm text-neutral-900">{scheme.total_esr_in_scheme || 0}</p>
            </div>
          </div>

          {/* Progress Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-2">Village Integration Status</h4>
              <div className="bg-neutral-100 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-neutral-500">Villages integrated on IoT</span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {scheme.villages_integrated_on_iot || 0} / {scheme.total_villages_in_scheme || 0}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full" 
                    style={{ width: `${villagesIntegratedPercent}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between mb-2 mt-4">
                  <span className="text-xs text-neutral-500">Fully completed villages</span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {scheme.fully_completed_villages || 0} / {scheme.total_villages_in_scheme || 0}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-success-500 h-2 rounded-full" 
                    style={{ width: `${fullyCompletedVillagesPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-2">ESR Integration Status</h4>
              <div className="bg-neutral-100 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-neutral-500">ESR requests received</span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {scheme.esr_request_received || 0} / {scheme.total_esr_in_scheme || 0}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full" 
                    style={{ width: `${esrRequestReceivedPercent}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between mb-2 mt-4">
                  <span className="text-xs text-neutral-500">ESR integrated on IoT</span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {scheme.esr_integrated_on_iot || 0} / {scheme.total_esr_in_scheme || 0}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${esrIntegratedPercent}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between mb-2 mt-4">
                  <span className="text-xs text-neutral-500">Fully completed ESR</span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {scheme.fully_completed_esr || 0} / {scheme.total_esr_in_scheme || 0}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-success-500 h-2 rounded-full" 
                    style={{ width: `${fullyCompletedEsrPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Details */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Component Integration</h4>
            <div className="bg-neutral-50 overflow-hidden rounded-lg border border-neutral-200">
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
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-50 text-success-600">
                      Complete
                    </span>
                  ) : (scheme.fm_integrated || 0) > 0 ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-warning-50 text-warning-600">
                      Partial
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-danger-50 text-danger-600">
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
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-50 text-success-600">
                      Complete
                    </span>
                  ) : (scheme.rca_integrated || 0) > 0 ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-warning-50 text-warning-600">
                      Partial
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-danger-50 text-danger-600">
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
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-50 text-success-600">
                      Complete
                    </span>
                  ) : (scheme.pt_integrated || 0) > 0 ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-warning-50 text-warning-600">
                      Partial
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-danger-50 text-danger-600">
                      Not Started
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
