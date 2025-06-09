import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Droplets, AlertTriangle } from "lucide-react";

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
}

interface CompactPopulationCardsProps {
  selectedRegion?: string;
}

export default function CompactPopulationCards({ selectedRegion = "all" }: CompactPopulationCardsProps) {
  // Fetch population statistics from water_scheme_data
  const { data: populationStats, isLoading } = useQuery<PopulationStats>({
    queryKey: ["/api/water-scheme-data/population-stats", selectedRegion],
    queryFn: async () => {
      const url = selectedRegion === "all" 
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
    if (isNaN(numValue)) return '0';
    return new Intl.NumberFormat('en-IN').format(numValue);
  };

  const formatPercentage = (num: number | string | null | undefined) => {
    const numValue = Number(num);
    if (isNaN(numValue)) return '0.0';
    return numValue.toFixed(1);
  };

  // Calculate change percentages
  const calculateChangePercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100);
  };

  const waterGainedPercent = calculateChangePercentage(
    populationStats.population_with_water, 
    populationStats.population_with_water_day5
  );
  
  const waterLostPercent = calculateChangePercentage(
    populationStats.population_no_water, 
    populationStats.population_no_water_day5
  );

  const netPopulationChange = populationStats.population_gained_water - populationStats.population_lost_water;

  return (
    <div className="w-full">
      {/* Single Row - All Five Cards */}
      <div className="grid grid-cols-5 gap-2">
        {/* Total Population Covered */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white relative shadow-lg overflow-hidden rounded-lg h-24">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-xl font-bold">{formatNumber(populationStats.total_population)}</div>
          </div>
          
          {/* Percentage and change - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-green-300 text-sm font-bold">+{formatNumber(Math.abs(netPopulationChange))}</div>
              <div className="text-green-200 text-xs">{formatPercentage(Math.abs(waterGainedPercent))}%</div>
            </div>
          </div>
          
          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-100" />
              <span className="text-xs font-medium text-blue-100">Total Population</span>
            </div>
          </div>
        </div>

        {/* Population With Water */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white relative shadow-lg overflow-hidden rounded-lg">
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">{formatNumber(populationStats.population_with_water)}</div>
          </div>
          <div className="absolute top-2 right-2">
            <div className="text-green-300 text-lg font-bold">
              {populationStats.population_gained_water > populationStats.population_lost_water ? '+' : '±'}
            </div>
          </div>
          <div className="pt-16 pb-4 px-4">
            <div className="text-center">
              <Droplets className="h-6 w-6 mx-auto mb-2 text-green-100" />
              <h3 className="text-xs font-semibold mb-1 text-green-100">With Water</h3>
              <p className="text-xs text-green-200">{formatPercentage(populationStats.percent_population_with_water)}%</p>
              <div className="mt-2 text-xs">
                <div className="text-green-300">+{formatNumber(populationStats.population_gained_water)}</div>
                <div className="text-green-200">{formatPercentage(Math.abs(waterGainedPercent))}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Population No Water */}
        <div className="bg-gradient-to-br from-red-500 to-orange-600 text-white relative shadow-lg overflow-hidden rounded-lg">
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">{formatNumber(populationStats.population_no_water)}</div>
          </div>
          <div className="absolute top-2 right-2">
            <div className="text-yellow-300 text-lg font-bold">
              {populationStats.population_lost_water > populationStats.population_gained_water ? '-' : '±'}
            </div>
          </div>
          <div className="pt-16 pb-4 px-4">
            <div className="text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-100" />
              <h3 className="text-xs font-semibold mb-1 text-red-100">No Water</h3>
              <p className="text-xs text-red-200">{formatPercentage(populationStats.percent_population_no_water)}%</p>
              <div className="mt-2 text-xs">
                <div className="text-yellow-300">-{formatNumber(populationStats.population_lost_water)}</div>
                <div className="text-yellow-200">{formatPercentage(Math.abs(waterLostPercent))}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Villages with LPCD > 55 */}
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white relative shadow-lg overflow-hidden rounded-lg">
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">{formatNumber(populationStats.population_lpcd_above_55)}</div>
          </div>
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">✓</span>
            </div>
          </div>
          <div className="pt-16 pb-4 px-4">
            <div className="text-center">
              <div className="w-6 h-6 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">55+</span>
              </div>
              <h3 className="text-xs font-semibold mb-1 text-teal-100">LPCD {'>'} 55</h3>
              <p className="text-xs text-teal-200">{formatNumber(populationStats.villages_lpcd_above_55)} villages</p>
            </div>
          </div>
        </div>

        {/* Villages with LPCD ≤ 55 */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white relative shadow-lg overflow-hidden rounded-lg">
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">{formatNumber(populationStats.population_lpcd_below_55)}</div>
          </div>
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">!</span>
            </div>
          </div>
          <div className="pt-16 pb-4 px-4">
            <div className="text-center">
              <div className="w-6 h-6 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">≤55</span>
              </div>
              <h3 className="text-xs font-semibold mb-1 text-amber-100">LPCD ≤ 55</h3>
              <p className="text-xs text-amber-200">{formatNumber(populationStats.villages_lpcd_below_55)} villages</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}