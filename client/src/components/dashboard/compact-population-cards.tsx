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
  // New LPCD comparison fields
  population_lpcd_above_55_day7: number;
  population_lpcd_below_55_day7: number;
  population_lpcd_above_55_day6: number;
  population_lpcd_below_55_day6: number;
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

  // Calculate LPCD population changes (day 7 vs day 6)
  const lpcdAbove55Change = (populationStats.population_lpcd_above_55_day7 || 0) - (populationStats.population_lpcd_above_55_day6 || 0);
  const lpcdBelow55Change = (populationStats.population_lpcd_below_55_day7 || 0) - (populationStats.population_lpcd_below_55_day6 || 0);
  
  // Determine arrow directions
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

  return (
    <div className="w-full">
      {/* Single Row - All Five Cards */}
      <div className="grid grid-cols-5 gap-4">
        {/* Total Population Covered */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white relative shadow-lg overflow-hidden rounded-lg h-40">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">{formatNumber(populationStats.total_population)}</div>
          </div>
          
          {/* +/- sign - top right */}
          <div className="absolute top-2 right-2">
            <div className="text-green-300 text-lg font-bold">+</div>
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
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white relative shadow-lg overflow-hidden rounded-lg h-40">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">{formatNumber(populationStats.population_with_water)}</div>
          </div>
          
          {/* +/- sign - top right */}
          <div className="absolute top-2 right-2">
            <div className="flex flex-col items-center">
              <div className="text-green-300 text-sm font-bold">+</div>
              <div className="text-yellow-300 text-sm font-bold">-</div>
            </div>
          </div>
          
          {/* Percentage and change - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-green-300 text-sm font-bold">+{formatNumber(populationStats.population_gained_water)}</div>
              <div className="text-green-200 text-xs">{formatPercentage(populationStats.percent_population_with_water)}%</div>
            </div>
          </div>
          
          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3 text-green-100" />
              <span className="text-xs font-medium text-green-100">With Water</span>
            </div>
          </div>
        </div>

        {/* Population No Water */}
        <div className="bg-gradient-to-br from-red-500 to-orange-600 text-white relative shadow-lg overflow-hidden rounded-lg h-40">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">{formatNumber(populationStats.population_no_water)}</div>
          </div>
          
          {/* +/- sign - top right */}
          <div className="absolute top-2 right-2">
            <div className="text-yellow-300 text-lg font-bold">
              {populationStats.population_lost_water > populationStats.population_gained_water ? '-' : '±'}
            </div>
          </div>
          
          {/* Percentage and change - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-yellow-300 text-sm font-bold">-{formatNumber(populationStats.population_lost_water)}</div>
              <div className="text-yellow-200 text-xs">{formatPercentage(populationStats.percent_population_no_water)}%</div>
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
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white relative shadow-lg overflow-hidden rounded-lg h-40">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">{formatNumber(populationStats.population_lpcd_above_55)}</div>
          </div>
          
          {/* Arrow indicator - top right */}
          <div className="absolute top-2 right-2">
            <div className={`text-lg font-bold ${getArrowColor(lpcdAbove55Change, true)}`}>
              {getArrowIcon(lpcdAbove55Change)}
            </div>
          </div>
          
          {/* Population change - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-sm font-bold ${lpcdAbove55Change >= 0 ? 'text-teal-200' : 'text-orange-200'}`}>
                {lpcdAbove55Change >= 0 ? '+' : ''}{formatNumber(Math.abs(lpcdAbove55Change))}
              </div>
              <div className="text-teal-100 text-xs">population change</div>
            </div>
          </div>
          
          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">55+</span>
              </div>
              <span className="text-xs font-medium text-teal-100">LPCD &gt; 55</span>
            </div>
          </div>
        </div>

        {/* Population with LPCD ≤ 55 */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white relative shadow-lg overflow-hidden rounded-lg h-40">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-2xl font-bold">{formatNumber(populationStats.population_lpcd_below_55)}</div>
          </div>
          
          {/* Arrow indicator - top right */}
          <div className="absolute top-2 right-2">
            <div className={`text-lg font-bold ${getArrowColor(lpcdBelow55Change, false)}`}>
              {getArrowIcon(lpcdBelow55Change)}
            </div>
          </div>
          
          {/* Population change - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-sm font-bold ${lpcdBelow55Change <= 0 ? 'text-amber-200' : 'text-red-200'}`}>
                {lpcdBelow55Change >= 0 ? '+' : ''}{formatNumber(Math.abs(lpcdBelow55Change))}
              </div>
              <div className="text-amber-100 text-xs">population change</div>
            </div>
          </div>
          
          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">≤55</span>
              </div>
              <span className="text-xs font-medium text-amber-100">LPCD ≤ 55</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}