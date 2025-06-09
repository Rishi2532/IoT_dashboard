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

  // Calculate change percentages
  const calculateDiffPercentage = (change: number, previous: number) => {
    if (previous === 0) return change > 0 ? 100 : 0;
    return (Math.abs(change) / previous) * 100;
  };

  const waterGainedPercent = calculateDiffPercentage(
    populationStats.population_gained_water,
    populationStats.population_with_water_day5,
  );

  const waterLostPercent = calculateDiffPercentage(
    populationStats.population_lost_water,
    populationStats.population_no_water_day5,
  );

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

  // Calculate percentages for each card
  const calculatePopulationPercentage = (population: number, total: number) => {
    if (total === 0) return 0;
    return (population / total) * 100;
  };

  // Card percentages
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

  // Change percentages
  const withWaterChangePercentage = calculateDiffPercentage(
    populationStats.population_gained_water,
    populationStats.population_with_water_day5,
  );
  const noWaterChangePercentage = calculateDiffPercentage(
    populationStats.population_lost_water,
    populationStats.population_no_water_day5,
  );
  const lpcdAbove55ChangePercentage = calculateDiffPercentage(
    lpcdAbove55Change,
    populationStats.population_lpcd_above_55_day6,
  );
  const lpcdBelow55ChangePercentage = calculateDiffPercentage(
    lpcdBelow55Change,
    populationStats.population_lpcd_below_55_day6,
  );

  // Determine arrow directions and formatting
  const getArrowIcon = (change: number) => {
    if (change > 0) return "↗";
    if (change < 0) return "↘";
    return "→";
  };

  const getArrowColor = (change: number, isGoodIncrease: boolean = true) => {
    if (change > 0) return isGoodIncrease ? "text-green-300" : "text-red-300";
    if (change < 0) return isGoodIncrease ? "text-red-300" : "text-green-300";
    return "text-yellow-300";
  };

  const formatChangeWithArrow = (
    change: number,
    color: string = "text-white",
  ) => {
    const arrow = getArrowIcon(change);
    const value = formatNumber(Math.abs(change));
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <span className="text-lg">{arrow}</span>
        <span className="font-bold">{value}</span>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Single Row - All Five Cards */}
      <div className="grid grid-cols-5 gap-6">
        {/* Total Population Covered */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-blue-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">
              {formatNumber(populationStats.total_population)}
            </div>
          </div>

          {/* Center: Net population change and percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {netPopulationChange !== 0 && (
                <div className="flex items-center justify-center gap-1 text-green-300">
                  {netPopulationChange > 0 ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-300" />
                  )}
                  <span>{Math.abs(netPopulationChange)}</span>
                </div>
              )}
              <div className="text-green-200 text-sm mt-1 leading-tight">
                {formatPercentage(Math.abs(waterGainedPercent))}%
                <br />
                <span className="text-xs text-blue-100">of total</span>
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-100" />
              <span className="text-xs font-medium text-blue-100">
                Total Population
              </span>
            </div>
          </div>
        </div>

        {/* Population With Water */}
        <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-emerald-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">
              {formatNumber(populationStats.population_with_water)}
            </div>
          </div>

          {/* Arrow down if population gained water decreased - top right */}
          <div className="absolute top-2 right-2">
            {populationStats.population_gained_water < 0 && (
              <ArrowDown className="h-4 w-4 text-yellow-300" />
            )}
          </div>

          {/* Change number and percentages - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {populationStats.population_gained_water !== 0 && (
                <div className="flex items-center justify-center gap-1 text-green-300">
                  {populationStats.population_gained_water > 0 ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                  <span>
                    {Math.abs(populationStats.population_gained_water)}
                  </span>
                </div>
              )}
              <div className="text-green-200 text-sm mt-1 leading-tight">
                {formatPercentage(withWaterChangePercentage)}%
                <br />
                <span className="text-xs text-green-100">
                  {formatPercentage(withWaterPercentage)}% of total
                </span>
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3 text-green-100" />
              <span className="text-xs font-medium text-green-100">
                With Water
              </span>
            </div>
          </div>
        </div>

        {/* Population No Water */}
        <div className="bg-gradient-to-br from-red-500 via-red-600 to-orange-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-red-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">
              {formatNumber(populationStats.population_no_water)}
            </div>
          </div>

          {/* Center: Change number and percentages */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {populationStats.population_lost_water > 0 && (
                <div className="flex items-center justify-center gap-1 text-yellow-300">
                  <ArrowDown className="h-4 w-4" />
                  <span>{populationStats.population_lost_water}</span>
                </div>
              )}
              <div className="text-yellow-200 text-sm mt-1 leading-tight">
                {formatPercentage(noWaterChangePercentage)}%
                <br />
                <span className="text-xl text-yellow-100">
                  {formatPercentage(noWaterPercentage)}% of total
                </span>
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-100" />
              <span className="text-xs font-medium text-red-100">No Water</span>
            </div>
          </div>
        </div>

        {/* Population with LPCD > 55 */}
        <div className="bg-gradient-to-br from-teal-500 via-cyan-600 to-teal-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-teal-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">
              {formatNumber(populationStats.population_lpcd_above_55)}
            </div>
          </div>

          {/* Arrow down if lpcd > 55 decreased - top right */}
          <div className="absolute top-2 right-2">
            {lpcdAbove55Change < 0 && (
              <ArrowDown className="h-4 w-4 text-orange-200" />
            )}
          </div>

          {/* Arrow and change number - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center flex items-center justify-center gap-1">
              {lpcdAbove55Change > 0 && (
                <ArrowUp className="h-4 w-4 text-teal-200" />
              )}
              {lpcdAbove55Change < 0 && (
                <ArrowDown className="h-4 w-4 text-orange-200" />
              )}
              <span
                className={
                  lpcdAbove55Change >= 0 ? "text-teal-200" : "text-orange-200"
                }
              >
                {Math.abs(lpcdAbove55Change)}
              </span>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              {/* <div className="w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">55+</span>
              </div> */}
              <span className="text-xs font-medium text-teal-100">
                LPCD &gt; 55
              </span>
            </div>
          </div>
        </div>

        {/* Population with LPCD ≤ 55 */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-amber-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">
              {formatNumber(populationStats.population_lpcd_below_55)}
            </div>
          </div>

          {/* Arrow down if LPCD ≤ 55 increased (which is bad) - top right */}
          <div className="absolute top-2 right-2">
            {lpcdBelow55Change > 0 && (
              <ArrowDown className="h-4 w-4 text-red-200" />
            )}
          </div>

          {/* Arrow and change number - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center flex items-center justify-center gap-1">
              {lpcdBelow55Change > 0 && (
                <ArrowUp className="h-4 w-4 text-red-200" />
              )}
              {lpcdBelow55Change < 0 && (
                <ArrowDown className="h-4 w-4 text-amber-200" />
              )}
              <span
                className={
                  lpcdBelow55Change <= 0 ? "text-amber-200" : "text-red-200"
                }
              >
                {Math.abs(lpcdBelow55Change)}
              </span>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              {/* <div className="w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">≤55</span>
              </div> */}
              <span className="text-xs font-medium text-amber-100">
                LPCD ≤ 55
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
