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
    <div className="space-y-3 h-full overflow-y-auto">
      {/* Compact Top Card - Total Population */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-blue-200 rounded-t-lg py-2 px-3">
          <CardTitle className="text-center text-sm font-bold text-blue-900 flex items-center justify-center gap-1">
            <Users className="h-3 w-3" />
            Total Population Covered
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-3">
          <div className="text-center">
            <p className="text-xl font-extrabold text-blue-700 mb-1">
              {formatNumber(populationStats.total_population)}
            </p>
            <p className="text-xs text-gray-600">
              {formatNumber(populationStats.total_villages)} villages
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Two Compact Cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* Water Supply Card */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 border-b border-green-200 rounded-t-lg py-2 px-3">
            <CardTitle className="text-center text-xs font-bold text-green-900 flex items-center justify-center gap-1">
              <Droplets className="h-3 w-3" />
              Population With Water
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <div className="text-center mb-2">
              <p className="text-lg font-extrabold text-green-700">
                {formatNumber(populationStats.population_with_water)}
              </p>
              <p className="text-xs text-gray-600">
                ({formatPercentage(populationStats.percent_population_with_water)}%)
              </p>
            </div>
            
            {/* Compact Village Stats */}
            <div className="space-y-1 border-t border-green-200 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-700">Villages:</span>
                <span className="font-bold text-green-700">
                  {formatNumber(populationStats.villages_with_water)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-700">LPCD {'>'}55:</span>
                <span className="font-bold text-green-600">
                  {formatNumber(populationStats.villages_lpcd_above_55)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-700">LPCD ≤55:</span>
                <span className="font-bold text-orange-600">
                  {formatNumber(populationStats.villages_lpcd_below_55)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No Water Card */}
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-red-100 to-orange-100 border-b border-red-200 rounded-t-lg py-2 px-3">
            <CardTitle className="text-center text-xs font-bold text-red-900 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Population No Water
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <div className="text-center mb-2">
              <p className="text-lg font-extrabold text-red-700">
                {formatNumber(populationStats.population_no_water)}
              </p>
              <p className="text-xs text-gray-600">
                ({formatPercentage(populationStats.percent_population_no_water)}%)
              </p>
            </div>
            
            {/* Village Count */}
            <div className="border-t border-red-200 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-700">Villages No Water:</span>
                <span className="font-bold text-red-700">
                  {formatNumber(populationStats.villages_no_water)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}