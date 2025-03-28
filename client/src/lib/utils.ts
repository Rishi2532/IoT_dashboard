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
      return 'bg-success-50 text-success-600';
    case 'Partial':
      return 'bg-warning-50 text-warning-600';
    case 'Not-Connected':
      return 'bg-danger-50 text-danger-600';
    default:
      return 'bg-neutral-50 text-neutral-600';
  }
}

export function getStatusDisplayName(status: SchemeCompletionStatus): string {
  switch (status) {
    case 'Fully-Completed':
      return 'Fully Completed';
    case 'Not-Connected':
      return 'Not Connected';
    default:
      return status;
  }
}
