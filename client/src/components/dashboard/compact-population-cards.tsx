import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ArrowUp,
  ArrowDown,
  Users,
  Droplets,
  AlertTriangle,
} from "lucide-react";

interface PopulationStats {
  total_villages: number;
  total_population: number;
  villages_with_water: number;
  population_with_water: number;
  percent_villages_with_water: number;
  percent_population_with_water: number;
  villages_no_water: number;
  population_no_water: number;
  percent_villages_no_water: number;
  percent_population_no_water: number;
  villages_lpcd_above_55: number;
  villages_lpcd_below_55: number;
  population_lpcd_above_55: number;
  population_lpcd_below_55: number;
  population_gained_water: number;
  population_lost_water: number;
  population_with_water_day5: number;
  population_no_water_day5: number;
  // New LPCD comparison fields
  population_lpcd_above_55_day7: number;
  population_lpcd_below_55_day7: number;
  population_lpcd_above_55_day6: number;
  population_lpcd_below_55_day6: number;
}

interface PopulationChangeData {
  currentPopulation: number;
  previousPopulation: number;
  change: number;
  changePercent: number;
}

interface PopulationTrackingResponse {
  totalPopulation: number;
  date: string;
  change: PopulationChangeData | null;
}

interface CompactPopulationCardsProps {
  selectedRegion?: string;
}

export default function CompactPopulationCards({
  selectedRegion = "all",
}: CompactPopulationCardsProps) {
  // Fetch population statistics from water_scheme_data
  const { data: populationStats, isLoading } = useQuery<PopulationStats>({
    queryKey: ["/api/water-scheme-data/population-stats", selectedRegion],
    queryFn: async () => {
      const url =
        selectedRegion === "all"
          ? "/api/water-scheme-data/population-stats"
          : `/api/water-scheme-data/population-stats?region=${selectedRegion}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch population statistics");
      }
      return response.json();
    },
  });

  // Fetch population tracking data for daily changes
  const { data: populationTracking } = useQuery<PopulationTrackingResponse>({
    queryKey: [
      "/api/population",
      selectedRegion === "all" ? "total" : `region/${selectedRegion}`,
    ],
    queryFn: async () => {
      const url =
        selectedRegion === "all"
          ? "/api/population/total"
          : `/api/population/region/${encodeURIComponent(selectedRegion)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch population tracking data");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 h-full">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg mb-3"></div>
          <div className="grid grid-cols-1 gap-3">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!populationStats) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No population data available</p>
      </div>
    );
  }

  const formatNumber = (num: number | string | null | undefined) => {
    const numValue = Number(num);
    if (isNaN(numValue)) return "0";
    return new Intl.NumberFormat("en-IN").format(numValue);
  };

  const formatPercentage = (num: number | string | null | undefined) => {
    const numValue = Number(num);
    if (isNaN(numValue)) return "0.0";
    return numValue.toFixed(1);
  };

  // Calculate change percentages properly
  const calculateChangePercentage = (change: number, previous: number) => {
    if (previous === 0) {
      return change === 0 ? 0 : 100;
    }
    return (change / previous) * 100;
  };

  // Net population change calculation
  const netPopulationChange =
    populationStats.population_gained_water -
    populationStats.population_lost_water;

  // Calculate LPCD population changes (day 7 vs day 6)
  const lpcdAbove55Change =
    (populationStats.population_lpcd_above_55_day7 || 0) -
    (populationStats.population_lpcd_above_55_day6 || 0);
  const lpcdBelow55Change =
    (populationStats.population_lpcd_below_55_day7 || 0) -
    (populationStats.population_lpcd_below_55_day6 || 0);

  // Calculate percentages for each card (coverage percentages)
  const calculatePopulationPercentage = (population: number, total: number) => {
    if (total === 0) return 0;
    return (population / total) * 100;
  };

  // Card coverage percentages
  const withWaterPercentage = calculatePopulationPercentage(
    populationStats.population_with_water,
    populationStats.total_population,
  );
  const noWaterPercentage = calculatePopulationPercentage(
    populationStats.population_no_water,
    populationStats.total_population,
  );
  const lpcdAbove55Percentage = calculatePopulationPercentage(
    populationStats.population_lpcd_above_55,
    populationStats.total_population,
  );
  const lpcdBelow55Percentage = calculatePopulationPercentage(
    populationStats.population_lpcd_below_55,
    populationStats.total_population,
  );

  // Change percentages (day-over-day changes)
  const withWaterChangePercentage = calculateChangePercentage(
    populationStats.population_gained_water,
    populationStats.population_with_water_day5,
  );
  const noWaterChangePercentage = calculateChangePercentage(
    populationStats.population_lost_water,
    populationStats.population_no_water_day5,
  );
  const lpcdAbove55ChangePercentage = calculateChangePercentage(
    lpcdAbove55Change,
    populationStats.population_lpcd_above_55_day6,
  );
  const lpcdBelow55ChangePercentage = calculateChangePercentage(
    lpcdBelow55Change,
    populationStats.population_lpcd_below_55_day6,
  );

  // Format change with + or - sign
  const formatChangeWithSign = (change: number) => {
    if (change === 0) return null;
    const sign = change > 0 ? "+" : "-";
    const value = formatNumber(Math.abs(change));
    const colorClass = change > 0 ? "text-green-300" : "text-red-300";
    return (
      <div className={`flex items-center gap-1 ${colorClass} font-bold`}>
        <span className="text-lg">{sign}</span>
        <span>{value}</span>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Single Row - All Five Cards */}
      <div className="grid grid-cols-5 gap-6">
        {/* Population Covered */}
        <div className="bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-slate-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold">
              {formatNumber(populationStats.total_population)}
            </div>
          </div>

          {/* Center: Daily population change and percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {populationTracking?.change &&
              populationTracking.change.change !== 0 ? (
                formatChangeWithSign(populationTracking.change.change)
              ) : selectedRegion === "all" ? (
                <div className="text-slate-200 text-xs">No change</div>
              ) : (
                netPopulationChange !== 0 &&
                formatChangeWithSign(netPopulationChange)
              )}
              <div className="text-slate-200 text-xs mt-1">
                {populationTracking?.change ? (
                  <>
                    <span
                      className={
                        populationTracking.change.change > 0
                          ? "text-green-200"
                          : "text-red-200"
                      }
                    >
                      {formatPercentage(
                        Math.abs(populationTracking.change.changePercent),
                      )}
                      %
                    </span>
                    <br />
                    <span className="text-xs text-slate-100">
                      {selectedRegion === "all"
                        ? "from yesterday"
                        : `${selectedRegion} daily change`}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className={
                        netPopulationChange > 0
                          ? "text-green-200"
                          : "text-red-200"
                      }
                    >
                      {formatPercentage(Math.abs(withWaterChangePercentage))}%
                    </span>
                    <br />
                    <span className="text-xs text-slate-100">change</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-slate-100" />
              <span className="text-xs font-medium text-slate-100">
                Population Covered
              </span>
            </div>
          </div>
        </div>

        {/* Population With Water */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-teal-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold">
              {formatNumber(populationStats.population_with_water)}
            </div>
          </div>

          {/* Change number and percentages - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {populationStats.population_gained_water !== 0 &&
                formatChangeWithSign(populationStats.population_gained_water)}
              <div className="text-teal-200 text-sm mt-1 leading-tight">
                <span
                  className={
                    populationStats.population_gained_water > 0
                      ? "text-green-200"
                      : "text-red-200"
                  }
                >
                  {populationStats.population_gained_water !== 0 
                    ? `${populationStats.population_gained_water > 0 ? '+' : ''}${formatPercentage(Math.abs(withWaterChangePercentage))}%`
                    : '0.0%'
                  }
                </span>
                <br />
                {/* <span className="text-xs text-teal-100">
                  {formatPercentage(withWaterPercentage)}% coverage
                </span> */}
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3 text-teal-100" />
              <span className="text-xs font-medium text-teal-100">
                Populating Receiving Water
              </span>
            </div>
          </div>
        </div>

        {/* Population No Water */}
        <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-rose-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold">
              {formatNumber(populationStats.population_no_water)}
            </div>
          </div>

          {/* Center: Change number and percentages */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {populationStats.population_lost_water !== 0 &&
                formatChangeWithSign(populationStats.population_lost_water)}
              <div className="text-rose-200 text-sm mt-1 leading-tight">
                <span
                  className={
                    populationStats.population_lost_water > 0
                      ? "text-red-200"
                      : "text-green-200"
                  }
                >
                  {populationStats.population_lost_water !== 0 
                    ? `${populationStats.population_lost_water > 0 ? '+' : ''}${formatPercentage(Math.abs(noWaterChangePercentage))}%`
                    : '0.0%'
                  }
                </span>
                <br />
                {/* <span className="text-xs text-rose-100">
                  {formatPercentage(noWaterPercentage)}% coverage
                </span> */}
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-rose-100" />
              <span className="text-xs font-medium text-rose-100">
                Population Receiving No Water
              </span>
            </div>
          </div>
        </div>

        {/* Population with LPCD > 55 */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-emerald-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold">
              {formatNumber(populationStats.population_lpcd_above_55)}
            </div>
          </div>

          {/* Change number - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {lpcdAbove55Change !== 0 &&
                formatChangeWithSign(lpcdAbove55Change)}
              <div className="text-emerald-200 text-sm mt-1 leading-tight">
                <span
                  className={
                    lpcdAbove55Change >= 0 ? "text-green-200" : "text-red-200"
                  }
                >
                  {lpcdAbove55Change !== 0 
                    ? `${lpcdAbove55Change > 0 ? '+' : ''}${formatPercentage(Math.abs(lpcdAbove55ChangePercentage))}%`
                    : '0.0%'
                  }
                </span>
                <br />
                {/* <span className="text-xs text-emerald-100">
                  {formatPercentage(lpcdAbove55Percentage)}% coverage
                </span> */}
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-emerald-100">
                Population with LPCD &gt; 55
              </span>
            </div>
          </div>
        </div>

        {/* Population with LPCD ≤ 55 */}
        <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-amber-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold">
              {formatNumber(populationStats.population_lpcd_below_55)}
            </div>
          </div>

          {/* Change number - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {lpcdBelow55Change !== 0 && (
                <div
                  className={`flex items-center gap-1 font-bold ${
                    lpcdBelow55Change <= 0 ? "text-green-300" : "text-red-300"
                  }`}
                >
                  <span className="text-lg">
                    {lpcdBelow55Change <= 0 ? "+" : "-"}
                  </span>
                  <span>{Math.abs(lpcdBelow55Change)}</span>
                </div>
              )}
              <div className="text-amber-200 text-sm mt-1 leading-tight">
                <span
                  className={
                    lpcdBelow55Change <= 0 ? "text-green-200" : "text-red-200"
                  }
                >
                  {lpcdBelow55Change !== 0 
                    ? `${lpcdBelow55Change > 0 ? '+' : ''}${formatPercentage(Math.abs(lpcdBelow55ChangePercentage))}%`
                    : '0.0%'
                  }
                </span>
                <br />
                {/* <span className="text-xs text-amber-100">
                  {formatPercentage(lpcdBelow55Percentage)}% coverage
                </span> */}
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              {/* <div className="w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">≤55</span>
              </div> */}
              <span className="text-xs font-medium text-amber-100">
                Population With LPCD &lt; 55
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
