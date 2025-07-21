import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import * as d3 from "d3";

interface SchemeData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  circle: string;
  block: string; // Add block field
  completion_status: string;
  total_villages: number;
  completed_villages: number;
  number_of_village: number; // Use the correct field name from schema
}

interface WaterSchemeData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  village_name: string;
  population: number;
  number_of_esr: number;
  water_value_day1: number;
  water_value_day2: number;
  water_value_day3: number;
  water_value_day4: number;
  water_value_day5: number;
  water_value_day6: number;
  water_value_day7: number;
  lpcd_value_day1: number;
  lpcd_value_day2: number;
  lpcd_value_day3: number;
  lpcd_value_day4: number;
  lpcd_value_day5: number;
  lpcd_value_day6: number;
  lpcd_value_day7: number;
  water_date_day1: string;
  water_date_day2: string;
  water_date_day3: string;
  water_date_day4: string;
  water_date_day5: string;
  water_date_day6: string;
  water_date_day7: string;
}

interface HeatmapData {
  region: string;
  villageRange: string;
  schemeCount: number;
  schemes: SchemeData[]; // Store the actual schemes for display
}

interface SelectedCell {
  region: string;
  villageRange: string;
  schemes: SchemeData[];
}

export default function SchemeVillageHeatmap() {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(
    new Set(),
  );

  const { data: schemeStatus, isLoading } = useQuery<SchemeData[]>({
    queryKey: ["/api/scheme-status"],
  });

  const { data: waterSchemeData } = useQuery<WaterSchemeData[]>({
    queryKey: ["/api/water-scheme-data"],
    // Always fetch water scheme data so we can calculate LPCD
  });

  // Define the village count ranges
  const villageRanges = [
    { label: "1", min: 1, max: 1 }, // Exclude 0 village schemes
    { label: "2-3", min: 2, max: 3 },
    { label: "4-5", min: 4, max: 5 },
    { label: "6-9", min: 6, max: 9 },
    { label: "10-19", min: 10, max: 19 },
    { label: "20-29", min: 20, max: 29 },
    { label: "30-39", min: 30, max: 39 },
    { label: "40-49", min: 40, max: 49 },
    { label: "50-59", min: 50, max: 59 },
    { label: "60-69", min: 60, max: 69 },
    { label: "70-79", min: 70, max: 79 },
    { label: "80-89", min: 80, max: 89 },
    { label: "90-99", min: 90, max: 99 },
    { label: "100-125", min: 100, max: 125 },
    { label: "126-150", min: 126, max: 150 },
    { label: "151-200", min: 151, max: 200 },
    { label: "201+", min: 201, max: Infinity },
  ];

  const heatmapData = useMemo(() => {
    if (!schemeStatus) return {
      data: [],
      regions: [],
      villageRanges: [],
      maxSchemeCount: 0
    };

    // Get all unique regions
    const regions = Array.from(
      new Set(schemeStatus.map((s) => s.region)),
    ).sort();

    // First, aggregate schemes by scheme_name and region to get total villages
    const aggregatedSchemes = new Map<
      string,
      {
        scheme_name: string;
        region: string;
        total_villages: number;
        blocks: SchemeData[];
      }
    >();

    schemeStatus.forEach((scheme) => {
      const key = `${scheme.region}-${scheme.scheme_name}`;
      if (aggregatedSchemes.has(key)) {
        const existing = aggregatedSchemes.get(key)!;
        existing.total_villages += scheme.number_of_village || 0;
        existing.blocks.push(scheme);
      } else {
        aggregatedSchemes.set(key, {
          scheme_name: scheme.scheme_name,
          region: scheme.region,
          total_villages: scheme.number_of_village || 0,
          blocks: [scheme],
        });
      }
    });

    // Create heatmap data structure using ranges
    const heatmapMatrix: HeatmapData[] = [];

    regions.forEach((region) => {
      villageRanges.forEach((range) => {
        const schemesInRange: SchemeData[] = [];

        // Find aggregated schemes that fall in this range
        Array.from(aggregatedSchemes.values())
          .filter((agg) => agg.region === region)
          .forEach((aggregatedScheme) => {
            if (
              aggregatedScheme.total_villages >= range.min &&
              aggregatedScheme.total_villages <= range.max
            ) {
              // Add all blocks of this scheme to the list
              schemesInRange.push(...aggregatedScheme.blocks);
            }
          });

        // Count unique schemes (not blocks)
        const uniqueSchemes = new Set(schemesInRange.map((s) => s.scheme_name));

        heatmapMatrix.push({
          region,
          villageRange: range.label,
          schemeCount: uniqueSchemes.size,
          schemes: schemesInRange, // Store all blocks for display
        });
      });
    });

    return {
      data: heatmapMatrix,
      regions,
      villageRanges: villageRanges.map((r) => r.label),
      maxSchemeCount: Math.max(...heatmapMatrix.map((d) => d.schemeCount)),
    };
  }, [schemeStatus]);

  const getColor = (schemeCount: number, maxCount: number) => {
    if (schemeCount === 0) return "#f9fafb"; // Light gray for zero

    // Blue-to-green gradient: #e0f3f8 → #66c2a4 → #238b45
    const intensity = schemeCount / maxCount;

    if (intensity <= 0.33) return "#e0f3f8"; // Very light blue for low count
    if (intensity <= 0.66) return "#66c2a4"; // Teal/greenish for medium count
    return "#238b45"; // Deep green for high count
  };

  const getTextColor = (schemeCount: number, maxCount: number) => {
    if (schemeCount === 0) return "#6b7280";
    const intensity = schemeCount / maxCount;
    // White text for high intensity (deep green), black for low/medium
    return intensity > 0.66 ? "#ffffff" : "#000000";
  };

  const handleCellClick = (region: string, villageRange: string) => {
    if (!schemeStatus) return;

    // Find the range definition
    const range = villageRanges.find((r) => r.label === villageRange);
    if (!range) return;

    // Aggregate schemes by scheme_name and region to get total villages
    const aggregatedSchemes = new Map<
      string,
      {
        scheme_name: string;
        total_villages: number;
        blocks: SchemeData[];
      }
    >();

    schemeStatus
      .filter((scheme) => scheme.region === region)
      .forEach((scheme) => {
        const key = scheme.scheme_name;
        if (aggregatedSchemes.has(key)) {
          const existing = aggregatedSchemes.get(key)!;
          existing.total_villages += scheme.number_of_village || 0;
          existing.blocks.push(scheme);
        } else {
          aggregatedSchemes.set(key, {
            scheme_name: scheme.scheme_name,
            total_villages: scheme.number_of_village || 0,
            blocks: [scheme],
          });
        }
      });

    // Find schemes that fall in this range and collect all their blocks
    const schemesInRange: SchemeData[] = [];
    Array.from(aggregatedSchemes.values()).forEach((aggregatedScheme) => {
      if (
        aggregatedScheme.total_villages >= range.min &&
        aggregatedScheme.total_villages <= range.max
      ) {
        // Add all blocks of this scheme to the list
        schemesInRange.push(...aggregatedScheme.blocks);
      }
    });

    if (schemesInRange.length > 0) {
      setSelectedCell({
        region,
        villageRange,
        schemes: schemesInRange,
      });
      setExpandedSchemes(new Set()); // Reset expanded schemes
    }
  };

  const toggleSchemeExpansion = (identifier: string) => {
    const newExpanded = new Set(expandedSchemes);
    if (newExpanded.has(identifier)) {
      newExpanded.delete(identifier);
    } else {
      newExpanded.add(identifier);
    }
    setExpandedSchemes(newExpanded);
  };

  const getSchemeWaterData = (schemeId: string, schemeName: string) => {
    if (!waterSchemeData) return [];
    return waterSchemeData.filter(
      (wd) => wd.scheme_id === schemeId || wd.scheme_name === schemeName,
    );
  };

  const calculateSchemeAverageLpcd = (schemes: SchemeData[]) => {
    let totalWaterDay7 = 0;
    let totalPopulation = 0;
    let hasValidData = false;

    schemes.forEach((scheme) => {
      const schemeWaterData = getSchemeWaterData(scheme.scheme_id, scheme.scheme_name);
      schemeWaterData.forEach((data) => {
        // Get water consumption for day 7 (latest day)
        const waterDay7 = typeof data.water_value_day7 === 'string' 
          ? parseFloat(data.water_value_day7) 
          : data.water_value_day7;
          
        const population = typeof data.population === 'string'
          ? parseFloat(data.population)
          : data.population;

        if (!isNaN(waterDay7) && waterDay7 > 0 && !isNaN(population) && population > 0) {
          totalWaterDay7 += waterDay7;
          totalPopulation += population;
          hasValidData = true;
        }
      });
    });

    if (hasValidData && totalPopulation > 0) {
      // LPCD = total water consumption / total population * 100000
      const lpcd = (totalWaterDay7 / totalPopulation) * 100000;
      return !isNaN(lpcd) && lpcd > 0 ? Math.round(lpcd) : null;
    }

    return null;
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Scheme Distribution Heatmap</CardTitle>
          <p className="text-sm text-gray-600">
            Number of schemes by region and village count
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading heatmap data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!heatmapData.data.length) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Scheme Distribution Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No data available for heatmap visualization.</p>
        </CardContent>
      </Card>
    );
  }

  const { data, regions, villageRanges: ranges, maxSchemeCount } = heatmapData;

  return (
    <Card className="w-full max-w-none">
      <CardHeader>
        <CardTitle>Scheme Distribution Heatmap</CardTitle>
        <p className="text-sm text-gray-600">
          Number of schemes by region and village count. Darker colors indicate
          more schemes.
        </p>
      </CardHeader>
      <CardContent className="p-2">
        <div className="w-full">
          <div
            className="grid border border-gray-300 rounded-lg overflow-hidden w-full"
            style={{
              gridTemplateColumns: `180px repeat(${ranges.length}, 1fr)`,
            }}
          >
            {/* Header with village ranges */}
            <div className="bg-gray-200 px-4 py-3 font-semibold text-sm border-r border-gray-300 flex items-center">
              Regions
            </div>
            {ranges.map((villageRange) => (
              <div
                key={villageRange}
                className="bg-gray-200 px-2 py-3 font-semibold text-sm border-r border-gray-300 text-center flex items-center justify-center"
                title={`${villageRange} villages`}
              >
                {villageRange}
              </div>
            ))}

            {/* Heatmap rows */}
            {regions.map((region) => (
              <>
                {/* Region label */}
                <div
                  key={`${region}-label`}
                  className="bg-gray-100 px-4 py-3 font-medium text-sm border-r border-gray-300 border-t border-gray-200 flex items-center"
                >
                  {region}
                </div>

                {/* Heatmap cells for this region */}
                {ranges.map((villageRange) => {
                  const cellData = data.find(
                    (d) =>
                      d.region === region && d.villageRange === villageRange,
                  );
                  const schemeCount = cellData?.schemeCount || 0;
                  const bgColor = getColor(schemeCount, maxSchemeCount);
                  const textColor = getTextColor(schemeCount, maxSchemeCount);

                  return (
                    <div
                      key={`${region}-${villageRange}`}
                      className="h-12 flex items-center justify-center border-r border-gray-300 border-t border-gray-200 font-medium text-sm cursor-pointer hover:opacity-80 transition-all"
                      style={{
                        backgroundColor: bgColor,
                        color: textColor,
                        border:
                          selectedCell?.region === region &&
                          selectedCell?.villageRange === villageRange
                            ? "2px solid #1d4ed8"
                            : undefined,
                      }}
                      title={`${region}: ${schemeCount} schemes with ${villageRange} villages. Click to view details.`}
                      onClick={() => handleCellClick(region, villageRange)}
                    >
                      {schemeCount > 0 ? schemeCount : ""}
                    </div>
                  );
                })}
              </>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm font-medium">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300"></div>
              <span className="text-xs">0 schemes</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 border border-gray-300"
                style={{
                  backgroundColor: getColor(
                    maxSchemeCount * 0.5,
                    maxSchemeCount,
                  ),
                }}
              ></div>
              <span className="text-xs">
                Medium ({Math.ceil(maxSchemeCount * 0.5)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 border border-gray-300"
                style={{
                  backgroundColor: getColor(maxSchemeCount, maxSchemeCount),
                }}
              ></div>
              <span className="text-xs">High ({maxSchemeCount})</span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="mt-4 text-sm text-gray-600">
            <p>
              Total regions: {regions.length} | Village ranges: {ranges.length}{" "}
              predefined ranges | Max schemes per cell: {maxSchemeCount}
            </p>
            {selectedCell && (
              <p className="mt-2 font-medium text-blue-700">
                Selected: {selectedCell.region} region with{" "}
                {selectedCell.villageRange} villages (
                {selectedCell.schemes.length} schemes)
              </p>
            )}
          </div>
        </div>
      </CardContent>

      {/* Selected Cell Details */}
      {selectedCell && (
        <CardContent className="pt-0">
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Schemes in {selectedCell.region} with{" "}
                {selectedCell.villageRange} Villages
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCell(null)}
              >
                Clear Selection
              </Button>
            </div>

            <div className="space-y-4">
              {(() => {
                // Group schemes by scheme name to show aggregated data
                const groupedSchemes = new Map<
                  string,
                  {
                    schemes: SchemeData[];
                    totalVillages: number;
                  }
                >();

                selectedCell.schemes.forEach((scheme) => {
                  if (groupedSchemes.has(scheme.scheme_name)) {
                    const existing = groupedSchemes.get(scheme.scheme_name)!;
                    existing.schemes.push(scheme);
                    existing.totalVillages += scheme.number_of_village || 0;
                  } else {
                    groupedSchemes.set(scheme.scheme_name, {
                      schemes: [scheme],
                      totalVillages: scheme.number_of_village || 0,
                    });
                  }
                });

                return Array.from(groupedSchemes.entries()).map(
                  ([schemeName, group]) => {
                    const isExpanded = expandedSchemes.has(schemeName);
                    const firstScheme = group.schemes[0];

                    return (
                      <div
                        key={schemeName}
                        className="border rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {schemeName}
                            </h4>
                            <div className="text-sm text-gray-600 mt-1">
                              <span>Total Villages: {group.totalVillages}</span>
                              <span className="mx-2">•</span>
                              <span>Blocks: {group.schemes.length}</span>
                              <span className="mx-2">•</span>
                              <span>Circle: {firstScheme.circle}</span>
                              <span className="mx-2">•</span>
                              <span>
                                Status: {firstScheme.completion_status}
                              </span>
                              {(() => {
                                // Only show LPCD if water scheme data is available
                                if (!waterSchemeData || waterSchemeData.length === 0) return null;
                                
                                const avgLpcd = calculateSchemeAverageLpcd(group.schemes);
                                return avgLpcd !== null && !isNaN(avgLpcd) ? (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      avgLpcd >= 55 
                                        ? 'bg-green-100 text-green-800' 
                                        : avgLpcd >= 40
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : avgLpcd >= 25
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      LPCD: {avgLpcd}L
                                    </span>
                                  </>
                                ) : null;
                              })()}
                            </div>
                            {group.schemes.length > 1 && (
                              <div className="text-xs text-blue-600 mt-1">
                                Blocks:{" "}
                                {group.schemes.map((s) => s.block).join(", ")}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSchemeExpansion(schemeName)}
                            className="ml-4"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {isExpanded ? "Hide" : "View"} Data
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 border-t pt-4">
                            {(() => {
                              // Get water data for all schemes in this group
                              const allWaterData: WaterSchemeData[] = [];
                              group.schemes.forEach((scheme) => {
                                const schemeWaterData = getSchemeWaterData(
                                  scheme.scheme_id,
                                  scheme.scheme_name,
                                );
                                allWaterData.push(...schemeWaterData);
                              });

                              return allWaterData.length > 0 ? (
                                <div className="overflow-x-auto max-h-96">
                                  <div className="min-w-max">
                                    <table className="w-full text-xs border-collapse">
                                      <thead className="sticky top-0 bg-white">
                                        <tr className="bg-gray-100">
                                          <th className="px-2 py-1 text-left font-medium border border-gray-300 min-w-[100px]">
                                            Village
                                          </th>
                                          <th className="px-2 py-1 text-center font-medium border border-gray-300 min-w-[60px]">
                                            Pop.
                                          </th>
                                          <th className="px-2 py-1 text-center font-medium border border-gray-300 min-w-[40px]">
                                            ESR
                                          </th>
                                          {/* Water columns with compact headers */}
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-blue-50">
                                            W{" "}
                                            {allWaterData[0]?.water_date_day1 ||
                                              "D1"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-blue-50">
                                            W{" "}
                                            {allWaterData[0]?.water_date_day2 ||
                                              "D2"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-blue-50">
                                            W{" "}
                                            {allWaterData[0]?.water_date_day3 ||
                                              "D3"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-blue-50">
                                            W{" "}
                                            {allWaterData[0]?.water_date_day4 ||
                                              "D4"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-blue-50">
                                            W{" "}
                                            {allWaterData[0]?.water_date_day5 ||
                                              "D5"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-blue-50">
                                            W{" "}
                                            {allWaterData[0]?.water_date_day6 ||
                                              "D6"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-blue-50">
                                            W{" "}
                                            {allWaterData[0]?.water_date_day7 ||
                                              "D7"}
                                          </th>
                                          {/* LPCD columns with compact headers */}
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-green-50">
                                            L{" "}
                                            {allWaterData[0]?.water_date_day1 ||
                                              "D1"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-green-50">
                                            L{" "}
                                            {allWaterData[0]?.water_date_day2 ||
                                              "D2"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-green-50">
                                            L{" "}
                                            {allWaterData[0]?.water_date_day3 ||
                                              "D3"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-green-50">
                                            L{" "}
                                            {allWaterData[0]?.water_date_day4 ||
                                              "D4"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-green-50">
                                            L{" "}
                                            {allWaterData[0]?.water_date_day5 ||
                                              "D5"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-green-50">
                                            L{" "}
                                            {allWaterData[0]?.water_date_day6 ||
                                              "D6"}
                                          </th>
                                          <th className="px-1 py-1 text-center font-medium border border-gray-300 min-w-[50px] text-xs bg-green-50">
                                            L{" "}
                                            {allWaterData[0]?.water_date_day7 ||
                                              "D7"}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {allWaterData.map((village, idx) => (
                                          <tr
                                            key={`${village.village_name}-${idx}`}
                                            className="hover:bg-gray-50"
                                          >
                                            <td className="px-2 py-1 font-medium border border-gray-300">
                                              {village.village_name}
                                            </td>
                                            <td className="px-2 py-1 text-center border border-gray-300">
                                              {village.population?.toLocaleString() ||
                                                "N/A"}
                                            </td>
                                            <td className="px-2 py-1 text-center border border-gray-300">
                                              {village.number_of_esr || "N/A"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-blue-50">
                                              {village.water_value_day1 != null
                                                ? Number(
                                                    village.water_value_day1,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-blue-50">
                                              {village.water_value_day2 != null
                                                ? Number(
                                                    village.water_value_day2,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-blue-50">
                                              {village.water_value_day3 != null
                                                ? Number(
                                                    village.water_value_day3,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-blue-50">
                                              {village.water_value_day4 != null
                                                ? Number(
                                                    village.water_value_day4,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-blue-50">
                                              {village.water_value_day5 != null
                                                ? Number(
                                                    village.water_value_day5,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-blue-50">
                                              {village.water_value_day6 != null
                                                ? Number(
                                                    village.water_value_day6,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-blue-50">
                                              {village.water_value_day7 != null
                                                ? Number(
                                                    village.water_value_day7,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-green-50">
                                              {village.lpcd_value_day1 != null
                                                ? Number(
                                                    village.lpcd_value_day1,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-green-50">
                                              {village.lpcd_value_day2 != null
                                                ? Number(
                                                    village.lpcd_value_day2,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-green-50">
                                              {village.lpcd_value_day3 != null
                                                ? Number(
                                                    village.lpcd_value_day3,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-green-50">
                                              {village.lpcd_value_day4 != null
                                                ? Number(
                                                    village.lpcd_value_day4,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-green-50">
                                              {village.lpcd_value_day5 != null
                                                ? Number(
                                                    village.lpcd_value_day5,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-green-50">
                                              {village.lpcd_value_day6 != null
                                                ? Number(
                                                    village.lpcd_value_day6,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                            <td className="px-1 py-1 text-center border border-gray-300 bg-green-50">
                                              {village.lpcd_value_day7 != null
                                                ? Number(
                                                    village.lpcd_value_day7,
                                                  ).toFixed(1)
                                                : "-"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <p>
                                    No water consumption data available for this
                                    scheme.
                                  </p>
                                  <p className="text-sm mt-1">
                                    Water data is fetched from water_scheme_data
                                    table.
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  },
                );
              })()}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
