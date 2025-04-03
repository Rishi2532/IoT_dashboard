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
  agency: string | null;
  total_villages_in_scheme: number;
  total_esr_in_scheme: number;
  villages_integrated_on_iot: number | null;
  fully_completed_villages: number | null;
  esr_request_received: number | null;
  esr_integrated_on_iot: number | null;
  fully_completed_esr: number | null;
  balance_for_fully_completion: number | null;
  fm_integrated: number | null;
  rca_integrated: number | null;
  pt_integrated: number | null;
  scheme_completion_status: string;
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
