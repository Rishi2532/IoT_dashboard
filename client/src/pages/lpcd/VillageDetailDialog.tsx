import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eye } from 'lucide-react';

// Import the interface type from parent component
interface WaterSchemeData {
  scheme_id: string;
  region?: string;
  circle?: string;
  division?: string;
  sub_division?: string;
  block?: string;
  scheme_name?: string;
  village_name?: string;
  population?: number;
  number_of_esr?: number;
  water_value_day1?: number | string;
  water_value_day2?: number | string;
  water_value_day3?: number | string;
  water_value_day4?: number | string;
  water_value_day5?: number | string;
  water_value_day6?: number | string;
  lpcd_value_day1?: number | string;
  lpcd_value_day2?: number | string;
  lpcd_value_day3?: number | string;
  lpcd_value_day4?: number | string;
  lpcd_value_day5?: number | string;
  lpcd_value_day6?: number | string;
  lpcd_value_day7?: number | string;
  // Date fields
  water_date_day1?: string;
  water_date_day2?: string;
  water_date_day3?: string;
  water_date_day4?: string;
  water_date_day5?: string;
  water_date_day6?: string;
  lpcd_date_day1?: string;
  lpcd_date_day2?: string;
  lpcd_date_day3?: string;
  lpcd_date_day4?: string;
  lpcd_date_day5?: string;
  lpcd_date_day6?: string;
  lpcd_date_day7?: string;
  consistent_zero_lpcd_for_a_week?: number | boolean;
  below_55_lpcd_count?: number;
  above_55_lpcd_count?: number;
}

interface VillageDetailDialogProps {
  scheme: WaterSchemeData;
  latestLpcd: number | null;
  getLatestLpcdValue: (scheme: WaterSchemeData) => number | null;
  calculateLpcdCounts: (scheme: WaterSchemeData) => {
    daysAbove55: number;
    daysBelow55: number;
    hasConsistentZeroSupply: boolean;
  };
  getLpcdStatusBadge: (lpcdValue: number | null) => React.ReactNode;
}

const VillageDetailDialog: React.FC<VillageDetailDialogProps> = ({
  scheme,
  latestLpcd,
  getLatestLpcdValue,
  calculateLpcdCounts,
  getLpcdStatusBadge,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[90vw]">
        <DialogHeader className="bg-blue-100 p-4 rounded-t-lg">
          <DialogTitle className="text-blue-800 text-xl">
            {scheme.village_name} - {scheme.scheme_name}
          </DialogTitle>
          <DialogDescription className="text-blue-700">
            Scheme ID: {scheme.scheme_id.split('-')[0]}
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 bg-gradient-to-b from-blue-50 to-white">
          {/* Water Scheme Details Section */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-700">Water Scheme Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Region</p>
                <p className="font-medium">{scheme.region || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Circle</p>
                <p className="font-medium">{scheme.circle || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Division</p>
                <p className="font-medium">{scheme.division || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Sub Division</p>
                <p className="font-medium">{scheme.sub_division || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Block</p>
                <p className="font-medium">{scheme.block || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Population</p>
                <p className="font-medium">{scheme.population || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          {/* LPCD Statistics Section */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-700">LPCD Statistics</h3>
            
            {(() => {
              const { daysAbove55, daysBelow55, hasConsistentZeroSupply } = calculateLpcdCounts(scheme);
              
              return (
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px] bg-green-50 p-3 rounded-md border border-green-100">
                    <p className="text-sm text-gray-600">Days above 55 LPCD</p>
                    <p className="font-medium text-xl text-green-600">{daysAbove55}</p>
                  </div>
                  <div className="flex-1 min-w-[200px] bg-yellow-50 p-3 rounded-md border border-yellow-100">
                    <p className="text-sm text-gray-600">Days below 55 LPCD</p>
                    <p className="font-medium text-xl text-yellow-600">{daysBelow55}</p>
                  </div>
                  <div className="flex-1 min-w-[200px] bg-gray-50 p-3 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-600">Zero supply for a week</p>
                    <p className="font-medium text-xl">{hasConsistentZeroSupply ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="flex-1 min-w-[200px] bg-blue-50 p-3 rounded-md border border-blue-100">
                    <p className="text-sm text-gray-600">Current Status</p>
                    <div className="font-medium mt-1">{getLpcdStatusBadge(latestLpcd)}</div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* LPCD Values & Water Consumption Section */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-700">LPCD Values & Water Consumption (Last 7 Days)</h3>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Water Consumption</TableHead>
                    <TableHead className="text-right">LPCD Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Create an array to store all 7 days of data
                    const daysData: Array<{
                      day: number;
                      lpcdDate: string;
                      lpcdValue: number | null;
                      waterValue: number | null;
                      formattedDate: string;
                    }> = [];
                    
                    // Process each day's data in order (1-7)
                    for (let day = 1; day <= 7; day++) {
                      // Get LPCD date and value for this day
                      const lpcdDateStr = scheme[`lpcd_date_day${day}` as keyof WaterSchemeData] || '';
                      const lpcdValue = scheme[`lpcd_value_day${day}` as keyof WaterSchemeData];
                      const numericLpcdValue = lpcdValue !== undefined && lpcdValue !== null && lpcdValue !== '' && !isNaN(Number(lpcdValue)) 
                        ? Number(lpcdValue) 
                        : null;
                      
                      // Get water value for this day (only days 1-6 have water values)
                      let waterValue = null;
                      if (day <= 6) {
                        const waterValueRaw = scheme[`water_value_day${day}` as keyof WaterSchemeData];
                        if (waterValueRaw !== undefined && waterValueRaw !== null && waterValueRaw !== '' && !isNaN(Number(waterValueRaw))) {
                          waterValue = Number(waterValueRaw);
                        }
                      }
                      
                      // Format the date - use directly if it's short format
                      let formattedDate = lpcdDateStr || `Day ${day}`;
                      // If it looks like an ISO date, format it nicely
                      if (lpcdDateStr && lpcdDateStr.includes('-')) {
                        try {
                          // Check if it's already in DD-MMM format
                          if (!/^\d{1,2}-[A-Za-z]{3}$/.test(lpcdDateStr)) {
                            const date = new Date(lpcdDateStr);
                            formattedDate = date.toLocaleDateString('en-GB', { 
                              day: 'numeric', 
                              month: 'short' 
                            });
                          }
                        } catch (e) {
                          console.error("Error formatting date:", e);
                        }
                      }
                      
                      // Add this day's data to our array
                      daysData.push({
                        day,
                        lpcdDate: lpcdDateStr,
                        lpcdValue: numericLpcdValue,
                        waterValue,
                        formattedDate
                      });
                    }
                    
                    // Reverse the array to display most recent first (day 7 to day 1)
                    daysData.reverse();
                    
                    // Return the table rows
                    return daysData.map((dayData) => (
                      <TableRow key={`lpcd-day-${dayData.day}`}>
                        <TableCell>{dayData.formattedDate}</TableCell>
                        <TableCell className="text-right">
                          {dayData.waterValue !== null ? dayData.waterValue : (
                            <Badge variant="outline" className="bg-gray-100">
                              <span className="text-gray-600 text-sm">No data</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {dayData.lpcdValue !== null ? dayData.lpcdValue : (
                            <Badge variant="outline" className="bg-gray-100">
                              <span className="text-gray-600 text-sm">No data</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getLpcdStatusBadge(dayData.lpcdValue)}</TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VillageDetailDialog;