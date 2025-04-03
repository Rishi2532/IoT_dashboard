// Define region types
export interface Region {
  region_id: number;
  region_name: string;
  total_esr_integrated: number;
  fully_completed_esr: number;
  partial_esr: number;
  total_villages_integrated: number;
  fully_completed_villages: number;
  total_schemes_integrated: number;
  fully_completed_schemes: number;
  flow_meter_integrated: number;
  rca_integrated: number;
  pressure_transmitter_integrated: number;
}

// Define scheme status types
export interface SchemeStatus {
  scheme_id: string;
  scheme_name: string;
  region_name: string;
  
  // Villages data
  total_villages: number | null;
  functional_villages: number | null;
  partial_villages: number | null;
  non_functional_villages: number | null;
  fully_completed_villages: number | null;
  villages_integrated_on_iot?: number | null; // For backwards compatibility
  total_villages_in_scheme?: number | null; // For backwards compatibility
  
  // ESR data
  total_esr: number | null;
  esr_request_received?: number | null; // For backwards compatibility
  esr_integrated_on_iot: number | null;
  fully_completed_esr: number | null;
  balance_esr: number | null;
  total_esr_in_scheme?: number | null; // For backwards compatibility
  balance_for_fully_completion?: number | null; // For backwards compatibility
  
  // Component data
  flow_meters_connected: number | null;
  pressure_transmitters_connected: number | null;
  residual_chlorine_connected: number | null;
  
  // Computed total for backwards compatibility
  villages_integrated: number | null;
  
  // Legacy component data for backwards compatibility
  fm_integrated?: number | null;
  rca_integrated?: number | null;
  pt_integrated?: number | null;
  
  // Status
  scheme_status: string | null;
  scheme_functional_status: string | null;
  scheme_completion_status?: string; // For backwards compatibility
}

// Aggregate summary of region stats (can be filtered by region)
export interface RegionSummary {
  total_schemes_integrated: number;
  fully_completed_schemes: number;
  total_villages_integrated: number;
  fully_completed_villages: number;
  total_esr_integrated: number;
  fully_completed_esr: number;
  partial_esr: number;
  flow_meter_integrated: number;
  rca_integrated: number;
  pressure_transmitter_integrated: number;
}
