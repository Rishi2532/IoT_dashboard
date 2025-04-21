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
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          View Details
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
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
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const lpcdValue = scheme[`lpcd_value_day${day}` as keyof WaterSchemeData];
                    const waterValue = day <= 6 ? scheme[`water_value_day${day}` as keyof WaterSchemeData] : null;
                    const lpcdDate = scheme[`lpcd_date_day${day}` as keyof WaterSchemeData];
                    const waterDate = day <= 6 ? scheme[`water_date_day${day}` as keyof WaterSchemeData] : null;
                    
                    // Format date if it exists
                    let formattedDate = `Day ${day}`;
                    
                    if (lpcdDate && typeof lpcdDate === 'string') {
                      try {
                        formattedDate = new Date(lpcdDate).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short' 
                        });
                      } catch (e) {
                        console.error("Error formatting LPCD date:", e);
                      }
                    } else if (waterDate && typeof waterDate === 'string') {
                      try {
                        formattedDate = new Date(waterDate).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short' 
                        });
                      } catch (e) {
                        console.error("Error formatting water date:", e);
                      }
                    }
                    
                    const numericLpcdValue = lpcdValue !== undefined && lpcdValue !== null && lpcdValue !== '' && !isNaN(Number(lpcdValue)) 
                      ? Number(lpcdValue) 
                      : null;
                      
                    const numericWaterValue = waterValue !== undefined && waterValue !== null && waterValue !== '' && !isNaN(Number(waterValue)) 
                      ? Number(waterValue) 
                      : null;
                    
                    return (
                      <TableRow key={`lpcd-day-${day}`}>
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell className="text-right">
                          {numericWaterValue !== null ? numericWaterValue : (
                            <Badge variant="outline" className="bg-gray-100">
                              <span className="text-gray-600 text-sm">No data</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {numericLpcdValue !== null ? numericLpcdValue : (
                            <Badge variant="outline" className="bg-gray-100">
                              <span className="text-gray-600 text-sm">No data</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getLpcdStatusBadge(numericLpcdValue)}</TableCell>
                      </TableRow>
                    );
                  })}
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