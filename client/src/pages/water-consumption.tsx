import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, Filter } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface WaterConsumptionRecord {
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  flow_rate_m3: number;
  flow_meter_connected: boolean;
  online_status: string;
  esr_capacity: number;
  water_value_day1: number;
  water_value_day2: number;
  water_value_day3: number;
  water_value_day4: number;
  water_value_day5: number;
  water_value_day6: number;
  water_value_day7: number;
  water_date_day1: string;
  water_date_day2: string;
  water_date_day3: string;
  water_date_day4: string;
  water_date_day5: string;
  water_date_day6: string;
  water_date_day7: string;
  consistent_zero_consumption: number;
  percentage_consumption_previous_day: number;
  dashboard_url?: string;
}

export default function WaterConsumptionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all_regions");
  const [mjpCommissionedFilter, setMjpCommissionedFilter] = useState<string>("all_mjp_status");
  const [mjpCompletedFilter, setMjpCompletedFilter] = useState<string>("all_completion");
  const [iotStatusFilter, setIotStatusFilter] = useState<string>("all_iot_status");
  const [selectedRecord, setSelectedRecord] = useState<WaterConsumptionRecord | null>(null);

  // Fetch water consumption data
  const { data: waterConsumptionData = [], isLoading } = useQuery<WaterConsumptionRecord[]>({
    queryKey: ["/api/water-consumption"],
  });

  // Get unique regions for filter dropdown
  const regions = useMemo(() => {
    const uniqueRegions = [...new Set(waterConsumptionData.map(record => record.region))];
    return uniqueRegions.filter(Boolean).sort();
  }, [waterConsumptionData]);

  // Filter data based on all criteria
  const filteredData = useMemo(() => {
    return waterConsumptionData.filter(record => {
      const matchesSearch = searchTerm === "" || 
        record.esr_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.village_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.scheme_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.scheme_id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRegion = regionFilter === "" || regionFilter === "all_regions" || record.region === regionFilter;

      // MJP Commissioned filter (based on online_status or flow_meter_connected)
      const matchesMjpCommissioned = mjpCommissionedFilter === "" || mjpCommissionedFilter === "all_mjp_status" || 
        (mjpCommissionedFilter === "commissioned" && (record.online_status === "Online" || record.flow_meter_connected)) ||
        (mjpCommissionedFilter === "not_commissioned" && record.online_status !== "Online" && !record.flow_meter_connected);

      // MJP Completion filter (based on scheme completion status - using esr_capacity as proxy)
      const matchesMjpCompleted = mjpCompletedFilter === "" || mjpCompletedFilter === "all_completion" ||
        (mjpCompletedFilter === "fully_completed" && record.esr_capacity && record.esr_capacity > 0) ||
        (mjpCompletedFilter === "partially_completed" && (!record.esr_capacity || record.esr_capacity === 0));

      // IoT Status filter (based on flow_meter_connected and online_status)
      const matchesIotStatus = iotStatusFilter === "" || iotStatusFilter === "all_iot_status" ||
        (iotStatusFilter === "fully_connected" && record.flow_meter_connected && record.online_status === "Online") ||
        (iotStatusFilter === "partially_connected" && (record.flow_meter_connected || record.online_status === "Online")) ||
        (iotStatusFilter === "not_connected" && !record.flow_meter_connected && record.online_status !== "Online");

      return matchesSearch && matchesRegion && matchesMjpCommissioned && matchesMjpCompleted && matchesIotStatus;
    });
  }, [waterConsumptionData, searchTerm, regionFilter, mjpCommissionedFilter, mjpCompletedFilter, iotStatusFilter]);

  const getStatusBadge = (record: WaterConsumptionRecord) => {
    if (record.flow_meter_connected && record.online_status === "Online") {
      return <Badge variant="default" className="bg-green-500">Fully Connected</Badge>;
    } else if (record.flow_meter_connected || record.online_status === "Online") {
      return <Badge variant="secondary" className="bg-yellow-500">Partially Connected</Badge>;
    } else {
      return <Badge variant="destructive">Not Connected</Badge>;
    }
  };

  const getCompletionBadge = (record: WaterConsumptionRecord) => {
    if (record.esr_capacity && record.esr_capacity > 0) {
      return <Badge variant="default" className="bg-blue-500">Fully Completed</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-orange-500">Partially Completed</Badge>;
    }
  };

  const formatWaterValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    return value.toFixed(2);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="water-consumption-page">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
          Water Consumption Management
        </h1>
        <p className="text-gray-600">
          Monitor and analyze water consumption data across ESR locations with real-time IoT status tracking.
        </p>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search Bar */}
            <div className="xl:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search ESR, Village, Scheme, or Scheme ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
            </div>

            {/* Region Filter */}
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger data-testid="region-filter">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_regions">All Regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* MJP Commissioned Filter */}
            <Select value={mjpCommissionedFilter} onValueChange={setMjpCommissionedFilter}>
              <SelectTrigger data-testid="mjp-commissioned-filter">
                <SelectValue placeholder="MJP Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_mjp_status">All MJP Status</SelectItem>
                <SelectItem value="commissioned">Commissioned</SelectItem>
                <SelectItem value="not_commissioned">Not Commissioned</SelectItem>
              </SelectContent>
            </Select>

            {/* MJP Completion Filter */}
            <Select value={mjpCompletedFilter} onValueChange={setMjpCompletedFilter}>
              <SelectTrigger data-testid="mjp-completion-filter">
                <SelectValue placeholder="Completion Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_completion">All Completion</SelectItem>
                <SelectItem value="fully_completed">Fully Completed</SelectItem>
                <SelectItem value="partially_completed">Partially Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* IoT Status Filter */}
            <Select value={iotStatusFilter} onValueChange={setIotStatusFilter}>
              <SelectTrigger data-testid="iot-status-filter">
                <SelectValue placeholder="IoT Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_iot_status">All IoT Status</SelectItem>
                <SelectItem value="fully_connected">Fully Connected</SelectItem>
                <SelectItem value="partially_connected">Partially Connected</SelectItem>
                <SelectItem value="not_connected">Not Connected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setRegionFilter("all_regions");
                setMjpCommissionedFilter("all_mjp_status");
                setMjpCompletedFilter("all_completion");
                setIotStatusFilter("all_iot_status");
              }}
              data-testid="clear-filters-button"
            >
              Clear All Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600" data-testid="results-count">
          Showing {filteredData.length} of {waterConsumptionData.length} ESR locations
        </p>
      </div>

      {/* ESR List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading water consumption data...</div>
            </CardContent>
          </Card>
        ) : filteredData.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                No ESR locations found matching your criteria.
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredData.map((record, index) => (
            <Card key={`${record.scheme_id}-${record.village_name}-${record.esr_name}-${index}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold text-gray-900" data-testid={`esr-name-${index}`}>
                        {record.esr_name}
                      </h3>
                      {getStatusBadge(record)}
                      {getCompletionBadge(record)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Village:</span>
                        <span className="ml-2 text-gray-600" data-testid={`village-${index}`}>
                          {record.village_name}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Scheme:</span>
                        <span className="ml-2 text-gray-600" data-testid={`scheme-${index}`}>
                          {record.scheme_name}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Scheme ID:</span>
                        <span className="ml-2 text-gray-600" data-testid={`scheme-id-${index}`}>
                          {record.scheme_id}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Region:</span>
                        <span className="ml-2 text-gray-600">
                          {record.region}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">ESR Capacity:</span>
                        <span className="ml-2 text-gray-600">
                          {record.esr_capacity ? `${record.esr_capacity} m³` : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Flow Rate:</span>
                        <span className="ml-2 text-gray-600">
                          {record.flow_rate_m3 ? `${record.flow_rate_m3} m³` : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRecord(record)}
                        data-testid={`view-details-${index}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View 7-Day Data
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          7-Day Water Consumption Data - {record.esr_name}
                        </DialogTitle>
                      </DialogHeader>
                      
                      {selectedRecord && (
                        <div className="space-y-6">
                          {/* ESR Information */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">ESR Information</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><strong>ESR Name:</strong> {selectedRecord.esr_name}</div>
                              <div><strong>Village:</strong> {selectedRecord.village_name}</div>
                              <div><strong>Scheme:</strong> {selectedRecord.scheme_name}</div>
                              <div><strong>Scheme ID:</strong> {selectedRecord.scheme_id}</div>
                              <div><strong>Region:</strong> {selectedRecord.region}</div>
                              <div><strong>Division:</strong> {selectedRecord.division}</div>
                              <div><strong>ESR Capacity:</strong> {selectedRecord.esr_capacity ? `${selectedRecord.esr_capacity} m³` : "N/A"}</div>
                              <div><strong>Flow Rate:</strong> {selectedRecord.flow_rate_m3 ? `${selectedRecord.flow_rate_m3} m³` : "N/A"}</div>
                            </div>
                          </div>

                          <Separator />

                          {/* 7-Day Water Consumption Data */}
                          <div>
                            <h4 className="font-semibold mb-4">7-Day Water Consumption Values</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-2 text-left">Day</th>
                                    <th className="border border-gray-300 p-2 text-left">Date</th>
                                    <th className="border border-gray-300 p-2 text-left">Water Value (m³)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                    <tr key={day} className="hover:bg-gray-50">
                                      <td className="border border-gray-300 p-2 font-medium">Day {day}</td>
                                      <td className="border border-gray-300 p-2">
                                        {selectedRecord[`water_date_day${day}` as keyof WaterConsumptionRecord] || "N/A"}
                                      </td>
                                      <td className="border border-gray-300 p-2">
                                        {formatWaterValue(selectedRecord[`water_value_day${day}` as keyof WaterConsumptionRecord] as number)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <Separator />

                          {/* Additional Metrics */}
                          <div>
                            <h4 className="font-semibold mb-2">Additional Metrics</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>Consistent Zero Consumption:</strong> {selectedRecord.consistent_zero_consumption || 0} days
                              </div>
                              <div>
                                <strong>Percentage of Previous Day:</strong> {selectedRecord.percentage_consumption_previous_day ? `${selectedRecord.percentage_consumption_previous_day}%` : "N/A"}
                              </div>
                              <div>
                                <strong>Flow Meter Connected:</strong> {selectedRecord.flow_meter_connected ? "Yes" : "No"}
                              </div>
                              <div>
                                <strong>Online Status:</strong> {selectedRecord.online_status || "Unknown"}
                              </div>
                            </div>
                          </div>

                          {/* Dashboard Link */}
                          {selectedRecord.dashboard_url && (
                            <div className="pt-4">
                              <Button asChild className="w-full">
                                <a 
                                  href={selectedRecord.dashboard_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  Open PI Vision Dashboard
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}