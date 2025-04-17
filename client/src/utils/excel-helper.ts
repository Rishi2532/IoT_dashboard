/**
 * Excel Export Helper Functions
 * 
 * This module provides utility functions to work with Excel exports throughout the application
 */

/**
 * Triggers the Excel export functionality from the dashboard
 * Used by the chatbot to respond to voice commands for downloading Excel files
 * 
 * @returns Promise that resolves when export is triggered (or rejects if not available)
 */
export const triggerExcelExport = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if the dashboard export function is available
    if (typeof window.triggerDashboardExport === 'function') {
      // Call the dashboard export function
      window.triggerDashboardExport()
        .then(() => {
          console.log('Excel export triggered successfully');
          resolve();
        })
        .catch((error) => {
          console.error('Error triggering Excel export:', error);
          reject(error);
        });
    } else {
      console.warn('Excel export function not available - dashboard may not be loaded');
      reject(new Error('Excel export function not available'));
    }
  });
};