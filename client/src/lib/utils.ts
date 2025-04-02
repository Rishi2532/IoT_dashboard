import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';
  return num.toString();
}

export function calculatePercentage(value: number | undefined | null, total: number | undefined | null): number {
  if (!value || !total || total === 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
}

export type SchemeCompletionStatus = 'Fully-Completed' | 'Partial' | 'Not-Connected';

export function getStatusColorClass(status: SchemeCompletionStatus): string {
  switch (status) {
    case 'Fully-Completed':
      return 'bg-green-100 text-green-800';
    case 'Partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'Not-Connected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-neutral-50 text-neutral-600';
  }
}

export function getStatusDisplayName(status: SchemeCompletionStatus): string {
  if (!status) return 'Unknown';
  
  // Handle potential whitespace issues
  const cleanStatus = status.toString().trim();
  
  switch (cleanStatus) {
    case 'Fully-Completed':
      return 'Fully Completed';
    case 'Not-Connected':
      return 'Not Connected';
    case 'Partial':
      return 'Partial';
    default:
      return cleanStatus;
  }
}

// Function to get agency based on region name
export function getAgencyByRegion(regionName: string | null | undefined): string {
  if (!regionName) return 'N/A';
  
  switch (regionName) {
    case 'Nagpur':
    case 'Chhatrapati Sambhajinagar':
      return 'M/S Rite Water';
    case 'Pune':
    case 'Konkan':
      return 'M/S Indo/Chetas';
    case 'Nashik':
    case 'Amravati':
      return 'M/S Ceinsys';
    default:
      return 'N/A';
  }
}
