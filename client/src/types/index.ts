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
  sr_no: number;
  scheme_id: string;
  scheme_name: string;
  region_name: string;
  agency: string | null;
  
  // Villages data
  total_villages: number;
  functional_villages: number;
  partial_villages: number;
  non_functional_villages: number;
  fully_completed_villages: number;
  villages_integrated_on_iot: number | null; // For backwards compatibility
  total_villages_in_scheme: number; // For backwards compatibility
  
  // ESR data
  total_esr: number;
  esr_request_received: number | null; // For backwards compatibility
  esr_integrated_on_iot: number | null; // For backwards compatibility
  fully_completed_esr: number;
  balance_esr: number;
  total_esr_in_scheme: number; // For backwards compatibility
  balance_for_fully_completion: number | null; // For backwards compatibility
  
  // Component data
  flow_meters_connected: number;
  pressure_transmitters_connected: number;
  residual_chlorine_connected: number;
  
  // Computed total for backwards compatibility
  villages_integrated: number; // Total of functional + partial villages
  
  // Legacy component data for backwards compatibility
  fm_integrated: number | null;
  rca_integrated: number | null;
  pt_integrated: number | null;
  
  // Status
  scheme_status: string;
  scheme_functional_status: string;
  scheme_completion_status: string; // For backwards compatibility
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
