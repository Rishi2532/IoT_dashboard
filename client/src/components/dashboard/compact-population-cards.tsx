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

  return (
    <div className="h-full">
      {/* First Row - Connected Population Cards */}
      <div className="flex mb-4">
        {/* Total Population Covered */}
        <div className="flex-1 bg-gradient-to-br from-blue-500 to-indigo-600 text-white relative shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
          <div className="relative p-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-blue-100" />
            <h3 className="text-sm font-semibold mb-2 text-blue-100">Total Population Covered</h3>
            <p className="text-3xl font-bold mb-1">{formatNumber(populationStats.total_population)}</p>
            <p className="text-xs text-blue-200">{formatNumber(populationStats.total_villages)} villages</p>
          </div>
        </div>

        {/* Population With Water */}
        <div className="flex-1 bg-gradient-to-br from-emerald-500 to-green-600 text-white relative shadow-lg overflow-hidden border-l-4 border-white/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
          <div className="relative p-6 text-center">
            <Droplets className="h-8 w-8 mx-auto mb-3 text-green-100" />
            <h3 className="text-sm font-semibold mb-2 text-green-100">Population With Water</h3>
            <p className="text-3xl font-bold mb-1">{formatNumber(populationStats.population_with_water)}</p>
            <p className="text-xs text-green-200">
              {formatPercentage(populationStats.percent_population_with_water)}% • {formatNumber(populationStats.villages_with_water)} villages
            </p>
          </div>
        </div>

        {/* Population No Water */}
        <div className="flex-1 bg-gradient-to-br from-red-500 to-orange-600 text-white relative shadow-lg overflow-hidden border-l-4 border-white/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
          <div className="relative p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-red-100" />
            <h3 className="text-sm font-semibold mb-2 text-red-100">Population No Water</h3>
            <p className="text-3xl font-bold mb-1">{formatNumber(populationStats.population_no_water)}</p>
            <p className="text-xs text-red-200">
              {formatPercentage(populationStats.percent_population_no_water)}% • {formatNumber(populationStats.villages_no_water)} villages
            </p>
          </div>
        </div>
      </div>

      {/* Second Row - LPCD Categories */}
      <div className="flex gap-4">
        {/* Villages with LPCD > 55 */}
        <div className="flex-1 bg-gradient-to-br from-teal-500 to-cyan-600 text-white relative shadow-lg overflow-hidden rounded-lg">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>
          <div className="relative p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold">✓</span>
            </div>
            <h3 className="text-sm font-semibold mb-2 text-teal-100">Villages LPCD {'>'} 55</h3>
            <p className="text-2xl font-bold mb-1">{formatNumber(populationStats.villages_lpcd_above_55)}</p>
            <p className="text-xs text-teal-200">
              Population: {formatNumber(populationStats.population_lpcd_above_55)}
            </p>
          </div>
        </div>

        {/* Villages with LPCD ≤ 55 */}
        <div className="flex-1 bg-gradient-to-br from-amber-500 to-orange-600 text-white relative shadow-lg overflow-hidden rounded-lg">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>
          <div className="relative p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold">!</span>
            </div>
            <h3 className="text-sm font-semibold mb-2 text-amber-100">Villages LPCD ≤ 55</h3>
            <p className="text-2xl font-bold mb-1">{formatNumber(populationStats.villages_lpcd_below_55)}</p>
            <p className="text-xs text-amber-200">
              Population: {formatNumber(populationStats.population_lpcd_below_55)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}