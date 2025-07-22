import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Droplets, Building, Gauge, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/dashboard-layout";

export default function SchemeDetailsPage() {
  const [location, setLocation] = useLocation();
  const pathParts = location.split("/").slice(2);
  const schemeId = pathParts[0];
  const block = pathParts[1]; // May be undefined for multi-block schemes
  const [expandedVillages, setExpandedVillages] = useState<Set<string>>(new Set());

  // Fetch scheme information - use aggregate endpoint for multi-block schemes
  const { data: scheme, isLoading: isLoadingScheme } = useQuery({
    queryKey: ["/api/schemes/aggregate", schemeId],
    queryFn: async () => {
      // First try to get individual scheme data
      let response = await fetch(`/api/schemes?schemeId=${schemeId}`);
      if (response.ok) {
        const schemes = await response.json();
        if (schemes && schemes.length > 0) {
          const singleScheme = schemes[0];
          // If this is a multi-block scheme, get aggregated data
          if (singleScheme.scheme_name) {
            const aggregateResponse = await fetch(`/api/schemes/aggregate/${encodeURIComponent(singleScheme.scheme_name)}`);
            if (aggregateResponse.ok) {
              return aggregateResponse.json();
            }
          }
          return singleScheme;
        }
      }
      throw new Error("Failed to fetch scheme data");
    },
    enabled: !!schemeId,
  });

  // Fetch water scheme data (don't pass block parameter for multi-block schemes)
  const { data: villages, isLoading: isLoadingVillages } = useQuery({
    queryKey: ["/api/water-scheme-data/by-scheme", schemeId],
    queryFn: async () => {
      const url = `/api/water-scheme-data/by-scheme/${schemeId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch village data");
      return response.json();
    },
    enabled: !!schemeId,
  });

  // Fetch ESR data (chlorine and pressure combined)
  const { data: esrData, isLoading: isLoadingESR } = useQuery({
    queryKey: ["/api/scheme-esr-data", schemeId],
    queryFn: async () => {
      const url = `/api/scheme-esr-data/${schemeId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch ESR data");
      return response.json();
    },
    enabled: !!schemeId,
  });

  const handleGoBack = () => {
    setLocation("/schemes");
  };

  const toggleVillageExpansion = (villageId: string) => {
    const newExpanded = new Set(expandedVillages);
    if (newExpanded.has(villageId)) {
      newExpanded.delete(villageId);
    } else {
      newExpanded.add(villageId);
    }
    setExpandedVillages(newExpanded);
  };

  const getStatusColor = (status: "good" | "warning" | "danger") => {
    switch (status) {
      case "good":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "danger":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLPCDStatus = (lpcd: number | null): "good" | "warning" | "danger" => {
    if (!lpcd) return "danger";
    if (lpcd >= 55) return "good";
    if (lpcd >= 40) return "warning";
    return "danger";
  };

  const getChlorineStatus = (value: number | null | string): "good" | "warning" | "danger" => {
    if (value === null || value === undefined || value === "") return "danger";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "danger";
    if (numValue >= 0.2 && numValue <= 0.5) return "good";
    return "danger";
  };

  const getPressureStatus = (value: number | null | string): "good" | "warning" | "danger" => {
    if (value === null || value === undefined || value === "") return "danger";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "danger";
    if (numValue >= 0.2 && numValue <= 0.7) return "good";
    return "danger";
  };

  if (isLoadingScheme) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading scheme details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!scheme) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Scheme Not Found</h2>
          <p className="text-gray-600 mb-6">The requested scheme could not be found.</p>
          <Button onClick={handleGoBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schemes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate total statistics for the blue header
  const totalWaterConsumption = villages?.reduce((sum: number, village: any) => {
    const waterValue = village.water_value_day7 || village.water_value || 0;
    return sum + (typeof waterValue === 'number' ? waterValue : parseFloat(waterValue) || 0);
  }, 0) || 0;

  const totalPopulation = villages?.reduce((sum: number, village: any) => {
    const population = village.population || 0;
    return sum + (typeof population === 'number' ? population : parseFloat(population) || 0);
  }, 0) || 0;

  const totalVillages = villages?.length || 0;
  const totalESRs = esrData?.length || 0;

  // Calculate scheme LPCD (total water consumption * 100000 / total population)
  const schemeLPCD = totalPopulation > 0 ? (totalWaterConsumption * 100000) / totalPopulation : 0;

  // Get sensor counts from ESR data
  const flowMeterCount = scheme?.flow_meters_connected || 0;
  const pressureSensorCount = scheme?.pressure_transmitter_connected || 0;
  const chlorineAnalyzerCount = scheme?.residual_chlorine_analyzer_connected || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Header - Stock Market Style */}
        <div className="space-y-4">
          {/* Back Button */}
          <Button onClick={handleGoBack} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schemes
          </Button>

          {/* Orange Box - Scheme Information */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{scheme.scheme_name}</h1>
                <p className="text-orange-100 mt-1">
                  ID: {scheme.scheme_id}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={`px-3 py-1 text-sm font-semibold ${
                  scheme.fully_completion_scheme_status === "Fully Completed"
                    ? "bg-green-500 text-white"
                    : scheme.fully_completion_scheme_status === "In Progress"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-500 text-white"
                }`}
              >
                {scheme.fully_completion_scheme_status}
              </Badge>
            </div>
          </div>

          {/* Blue Box - Key Statistics */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Total Water Consumption */}
              <div className="text-center">
                <div className="text-2xl font-bold">{totalWaterConsumption.toFixed(1)}</div>
                <div className="text-blue-100 text-xs">Total Water</div>
                <div className="text-blue-100 text-xs">Consumption</div>
              </div>

              {/* Total Villages */}
              <div className="text-center">
                <div className="text-2xl font-bold">{totalVillages}</div>
                <div className="text-blue-100 text-xs">Total</div>
                <div className="text-blue-100 text-xs">Villages</div>
              </div>

              {/* Total ESRs */}
              <div className="text-center">
                <div className="text-2xl font-bold">{totalESRs}</div>
                <div className="text-blue-100 text-xs">Total</div>
                <div className="text-blue-100 text-xs">ESRs</div>
              </div>

              {/* Scheme LPCD */}
              <div className="text-center">
                <div className="text-2xl font-bold">{schemeLPCD.toFixed(1)}L</div>
                <div className="text-blue-100 text-xs">Scheme</div>
                <div className="text-blue-100 text-xs">LPCD</div>
              </div>

              {/* Flow Meters */}
              <div className="text-center">
                <div className="text-2xl font-bold">{flowMeterCount}</div>
                <div className="text-blue-100 text-xs">Flow</div>
                <div className="text-blue-100 text-xs">Meters</div>
              </div>

              {/* Pressure Sensors */}
              <div className="text-center">
                <div className="text-2xl font-bold">{pressureSensorCount}</div>
                <div className="text-blue-100 text-xs">Pressure</div>
                <div className="text-blue-100 text-xs">Sensors</div>
              </div>

              {/* Chlorine Analyzers */}
              <div className="text-center">
                <div className="text-2xl font-bold">{chlorineAnalyzerCount}</div>
                <div className="text-blue-100 text-xs">Chlorine</div>
                <div className="text-blue-100 text-xs">Analyzers</div>
              </div>
            </div>
            
            {/* Location Information */}
            <div className="mt-3 pt-3 border-t border-blue-500">
              <p className="text-blue-100 text-sm">
                {scheme.region} • {scheme.circle} • {scheme.division} • {scheme.block}
              </p>
            </div>
          </div>
        </div>

        {/* Scheme Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Villages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {scheme?.fully_completed_villages || 0}/{scheme?.total_villages_integrated || villages?.length || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Completed/Total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">ESRs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {scheme?.no_fully_completed_esr || 0}/{scheme?.total_esr_integrated || esrData?.length || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Completed/Total</p>

            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {scheme?.total_villages_integrated && scheme.total_villages_integrated > 0
                  ? Math.round(((scheme.fully_completed_villages || 0) / scheme.total_villages_integrated) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Completion Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Villages Section - List Format */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Villages ({villages?.length || 0})
          </h2>

          {isLoadingVillages ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : villages && villages.length > 0 ? (
            (() => {
              // Group villages by block
              const villagesByBlock = villages.reduce((acc: any, village: any) => {
                const blockName = village.block || 'Unknown Block';
                if (!acc[blockName]) {
                  acc[blockName] = [];
                }
                acc[blockName].push(village);
                return acc;
              }, {});

              const blockEntries = Object.entries(villagesByBlock);

              return (
                <div className="space-y-8">
                  {blockEntries.map(([blockName, blockVillages]: [string, any]) => (
                    <div key={blockName} className="space-y-4">
                      {/* Block Header */}
                      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <Building className="w-5 h-5 mr-2 text-blue-600" />
                          Block: {blockName}
                        </h3>
                        <Badge variant="outline" className="text-sm">
                          {blockVillages.length} village{blockVillages.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Villages List in this block */}
                      <div className="space-y-2">
                        {blockVillages.map((village: any, index: number) => {
                          const villageId = `${blockName}-${village.village_name}-${index}`;
                          const isExpanded = expandedVillages.has(villageId);
                          const villageESRs = esrData?.filter(
                            (esr: any) => esr.village_name === village.village_name
                          ) || [];

                          return (
                            <div key={villageId} className="border border-gray-200 rounded-lg">
                              {/* Village Header Row - Clickable */}
                              <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => toggleVillageExpansion(villageId)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                      {isExpanded ? (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                      ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                      )}
                                      <MapPin className="w-4 h-4 ml-2 mr-2 text-blue-500" />
                                      <span className="font-medium text-gray-900">{village.village_name}</span>
                                    </div>
                                    
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                      <div className="flex items-center">
                                        <Droplets className="w-4 h-4 mr-1 text-blue-500" />
                                        <span>
                                          {village.water_value_day7 
                                            ? `${Math.round(parseFloat(village.water_value_day7))} L`
                                            : "No data"}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center">
                                        <Building className="w-4 h-4 mr-1 text-gray-500" />
                                        <span>Pop: {village.population || "N/A"}</span>
                                      </div>

                                      <div className="flex items-center">
                                        <span className="text-xs text-gray-500">ESRs: {villageESRs.length}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <Badge
                                    className={`${getStatusColor(
                                      getLPCDStatus(parseFloat(village.lpcd_value_day7))
                                    )} text-xs`}
                                  >
                                    {village.lpcd_value_day7 
                                      ? `${Math.round(parseFloat(village.lpcd_value_day7))}L`
                                      : "No data"}
                                  </Badge>
                                </div>
                              </div>

                              {/* Expanded ESR Details */}
                              {isExpanded && (
                                <div className="border-t border-gray-200 bg-gray-50 p-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                    <Building className="w-4 h-4 mr-2" />
                                    ESRs in {village.village_name} ({villageESRs.length})
                                  </h4>

                                  {isLoadingESR ? (
                                    <div className="animate-pulse space-y-2">
                                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                    </div>
                                  ) : villageESRs.length > 0 ? (
                                    <div className="space-y-3">
                                      {villageESRs.map((esr: any, esrIndex: number) => (
                                        <div
                                          key={esrIndex}
                                          className="bg-white p-4 rounded-lg border border-gray-200"
                                        >
                                          <div className="flex items-center justify-between mb-3">
                                            <span className="font-medium text-gray-900">
                                              {esr.esr_name || `ESR ${esrIndex + 1}`}
                                            </span>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center justify-between">
                                              <span className="flex items-center text-sm">
                                                <Droplets className="w-4 h-4 mr-2 text-blue-500" />
                                                Chlorine Level
                                              </span>
                                              <Badge 
                                                className={`${getStatusColor(
                                                  getChlorineStatus(esr.chlorine_value)
                                                )} text-xs`}
                                              >
                                                {esr.chlorine_value !== null && esr.chlorine_value !== undefined && esr.chlorine_value !== ""
                                                  ? `${Number(esr.chlorine_value).toFixed(2)} mg/L`
                                                  : "No data"}
                                              </Badge>
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                              <span className="flex items-center text-sm">
                                                <Gauge className="w-4 h-4 mr-2 text-orange-500" />
                                                Pressure Level
                                              </span>
                                              <Badge 
                                                className={`${getStatusColor(
                                                  getPressureStatus(esr.pressure_value)
                                                )} text-xs`}
                                              >
                                                {esr.pressure_value !== null && esr.pressure_value !== undefined && esr.pressure_value !== ""
                                                  ? `${Number(esr.pressure_value).toFixed(2)} bar`
                                                  : "No data"}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 text-center text-sm text-gray-500">
                                      No ESR data available for this village
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Villages Found</h3>
                <p className="text-gray-500">
                  No village data is available for this scheme.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}