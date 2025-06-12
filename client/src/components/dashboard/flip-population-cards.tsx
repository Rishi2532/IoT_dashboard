import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Users, Droplets, AlertTriangle, MapPin, RotateCcw } from "lucide-react";
import FlipCard from "@/components/ui/flip-card";
import { Button } from "@/components/ui/button";

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
  population_lpcd_above_55_day7: number;
  population_lpcd_below_55_day7: number;
  population_lpcd_above_55_day6: number;
  population_lpcd_below_55_day6: number;
}

interface VillageStats {
  total_villages: number;
  villages_with_water: number;
  percent_villages_with_water: number;
  villages_without_water: number;
  percent_villages_without_water: number;
  villages_lpcd_above_55: number;
  percent_villages_lpcd_above_55: number;
  villages_lpcd_below_55: number;
  percent_villages_lpcd_below_55: number;
  villages_gained_water: number;
  villages_lost_water: number;
  villages_with_water_day5: number;
  villages_without_water_day5: number;
  villages_lpcd_above_55_day7: number;
  villages_lpcd_above_55_day6: number;
  villages_lpcd_below_55_day7: number;
  villages_lpcd_below_55_day6: number;
}

interface FlipPopulationCardsProps {
  selectedRegion?: string;
}

export default function FlipPopulationCards({
  selectedRegion = "all",
}: FlipPopulationCardsProps) {
  const [allFlipped, setAllFlipped] = useState(false);
  // Fetch population statistics
  const { data: populationStats, isLoading: populationLoading } = useQuery<PopulationStats>({
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

  // Fetch village statistics
  const { data: villageStats, isLoading: villageLoading } = useQuery<VillageStats>({
    queryKey: ["/api/water-scheme-data/village-stats", selectedRegion],
    queryFn: async () => {
      const url =
        selectedRegion === "all"
          ? "/api/water-scheme-data/village-stats"
          : `/api/water-scheme-data/village-stats?region=${selectedRegion}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch village statistics");
      }
      return response.json();
    },
  });

  if (populationLoading || villageLoading) {
    return (
      <div className="space-y-3 h-full">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg mb-3"></div>
          <div className="grid grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!populationStats || !villageStats) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No data available</p>
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

  // Calculate change indicators
  const getChangeIndicator = (current: number, previous: number) => {
    const change = current - previous;
    if (change === 0) return null;
    
    return {
      value: Math.abs(change),
      isPositive: change > 0,
      percentage: previous > 0 ? (Math.abs(change) / previous) * 100 : 100,
    };
  };

  // Population changes
  const populationWaterChange = getChangeIndicator(
    populationStats.population_with_water,
    populationStats.population_with_water_day5
  );
  
  const populationNoWaterChange = getChangeIndicator(
    populationStats.population_no_water,
    populationStats.population_no_water_day5
  );

  const populationLpcdAbove55Change = getChangeIndicator(
    populationStats.population_lpcd_above_55_day7 || 0,
    populationStats.population_lpcd_above_55_day6 || 0
  );

  const populationLpcdBelow55Change = getChangeIndicator(
    populationStats.population_lpcd_below_55_day7 || 0,
    populationStats.population_lpcd_below_55_day6 || 0
  );

  // Village changes
  const villageWaterChange = getChangeIndicator(
    villageStats.villages_with_water,
    villageStats.villages_with_water_day5
  );

  const villageNoWaterChange = getChangeIndicator(
    villageStats.villages_without_water,
    villageStats.villages_without_water_day5
  );

  const villageLpcdAbove55Change = getChangeIndicator(
    villageStats.villages_lpcd_above_55_day7 || 0,
    villageStats.villages_lpcd_above_55_day6 || 0
  );

  const villageLpcdBelow55Change = getChangeIndicator(
    villageStats.villages_lpcd_below_55_day7 || 0,
    villageStats.villages_lpcd_below_55_day6 || 0
  );

  const ChangeIndicator = ({ change }: { change: any }) => {
    if (!change) return null;
    
    return (
      <div className={`flex items-center gap-1 ${change.isPositive ? 'text-green-200' : 'text-red-200'}`}>
        <span className="text-sm font-bold">
          {change.isPositive ? '+' : '-'}
        </span>
        <span className="text-xs font-medium">
          {formatNumber(change.value)} ({change.percentage.toFixed(1)}%)
        </span>
      </div>
    );
  };

  const handleToggleAll = () => {
    setAllFlipped(!allFlipped);
  };

  return (
    <div className="w-full">
      {/* Master Toggle Button */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleToggleAll}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {allFlipped ? 'Show Population' : 'Show Villages'}
        </Button>
      </div>
      
      {/* Single Row - All Five Flip Cards */}
      <div className="grid grid-cols-5 gap-6">
        
        {/* Card 1: Total Population/Villages */}
        <FlipCard
          isFlipped={allFlipped}
          delay={0}
          frontContent={
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-indigo-400/30">
              <div className="absolute top-2 left-2">
                <div className="text-3xl font-bold">
                  {formatNumber(populationStats.total_population)}
                </div>
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-slate-100" />
                  <span className="text-xs font-medium text-slate-100">
                    Population Covered
                  </span>
                </div>
              </div>
            </div>
          }
          backContent={
            <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-violet-400/30">
              <div className="absolute top-2 left-2">
                <div className="text-3xl font-bold">
                  {formatNumber(villageStats.total_villages)}
                </div>
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-purple-100" />
                  <span className="text-xs font-medium text-purple-100">
                    Total Villages
                  </span>
                </div>
              </div>
            </div>
          }
        />

        {/* Card 2: Population/Villages With Water */}
        <FlipCard
          isFlipped={allFlipped}
          delay={0.1}
          frontContent={
            <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-emerald-400/30">
              <div className="absolute top-2 left-2">
                <div className="text-3xl font-bold">
                  {formatNumber(populationStats.population_with_water)}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <ChangeIndicator change={populationWaterChange} />
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-teal-100" />
                  <span className="text-xs font-medium text-teal-100">
                    Population with Water
                  </span>
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="text-xs text-teal-300">
                  {formatPercentage(populationStats.percent_population_with_water)}%
                </span>
              </div>
            </div>
          }
          backContent={
            <div className="bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-sky-400/30">
              <div className="absolute top-2 left-2">
                <div className="text-3xl font-bold">
                  {formatNumber(villageStats.villages_with_water)}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <ChangeIndicator change={villageWaterChange} />
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-blue-100" />
                  <span className="text-xs font-medium text-blue-100">
                    Villages with Water
                  </span>
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="text-xs text-blue-300">
                  {formatPercentage(villageStats.percent_villages_with_water)}%
                </span>
              </div>
            </div>
          }
        />

        {/* Card 3: Population/Villages Without Water */}
        <FlipCard
          isFlipped={allFlipped}
          delay={0.2}
          frontContent={
            <div className="bg-gradient-to-br from-red-500 via-rose-600 to-pink-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-red-400/30">
              <div className="absolute top-2 left-2">
                <div className="text-3xl font-bold">
                  {formatNumber(populationStats.population_no_water)}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <ChangeIndicator change={populationNoWaterChange} />
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-rose-100" />
                  <span className="text-xs font-medium text-rose-100">
                    Population No Water
                  </span>
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="text-xs text-rose-300">
                  {formatPercentage(populationStats.percent_population_no_water)}%
                </span>
              </div>
            </div>
          }
          backContent={
            <div className="bg-gradient-to-br from-orange-500 via-red-600 to-rose-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-orange-400/30">
              <div className="absolute top-2 left-2">
                <div className="text-3xl font-bold">
                  {formatNumber(villageStats.villages_without_water)}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <ChangeIndicator change={villageNoWaterChange} />
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-100" />
                  <span className="text-xs font-medium text-orange-100">
                    Villages No Water
                  </span>
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="text-xs text-orange-300">
                  {formatPercentage(villageStats.percent_villages_without_water)}%
                </span>
              </div>
            </div>
          }
        />

        {/* Card 4: Population/Villages with LPCD > 55 */}
        <FlipCard
          isFlipped={allFlipped}
          delay={0.3}
          frontContent={
            <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-green-400/30">
              <div className="absolute top-2 left-2">
                <div className="text-3xl font-bold">
                  {formatNumber(populationStats.population_lpcd_above_55)}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <ChangeIndicator change={populationLpcdAbove55Change} />
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-emerald-100" />
                  <span className="text-xs font-medium text-emerald-100">
                    Population LPCD {">"} 55
                  </span>
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="text-xs text-emerald-300">
                  {formatPercentage((populationStats.population_lpcd_above_55 / populationStats.total_population) * 100)}%
                </span>
              </div>
            </div>
          }
          backContent={
            <div className="bg-gradient-to-br from-lime-500 via-green-600 to-emerald-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-lime-400/30">
              <div className="absolute top-2 left-2">
                <div className="text-3xl font-bold">
                  {formatNumber(villageStats.villages_lpcd_above_55)}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <ChangeIndicator change={villageLpcdAbove55Change} />
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-green-100" />
                  <span className="text-xs font-medium text-green-100">
                    Villages LPCD {">"} 55
                  </span>
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="text-xs text-green-300">
                  {formatPercentage(villageStats.percent_villages_lpcd_above_55)}%
                </span>
              </div>
            </div>
          }
        />

        {/* Card 5: Population/Villages with LPCD < 55 */}
        <FlipCard
          isFlipped={allFlipped}
          delay={0.4}
          frontContent={
            <div className="bg-gradient-to-br from-yellow-500 via-amber-600 to-orange-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-yellow-400/30">
              <div className="absolute top-2 left-2">
                <div className="text-3xl font-bold">
                  {formatNumber(populationStats.population_lpcd_below_55)}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <ChangeIndicator change={populationLpcdBelow55Change} />
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-100" />
                  <span className="text-xs font-medium text-amber-100">
                    Population LPCD ≤ 55
                  </span>
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="text-xs text-amber-300">
                  {formatPercentage((populationStats.population_lpcd_below_55 / populationStats.total_population) * 100)}%
                </span>
              </div>
            </div>
          }
          backContent={
            <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-700 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-orange-400/30">
              <div className="absolute top-2 left-2">
                <div className="text-3xl font-bold">
                  {formatNumber(villageStats.villages_lpcd_below_55)}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <ChangeIndicator change={villageLpcdBelow55Change} />
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-100" />
                  <span className="text-xs font-medium text-yellow-100">
                    Villages LPCD ≤ 55
                  </span>
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="text-xs text-yellow-300">
                  {formatPercentage(villageStats.percent_villages_lpcd_below_55)}%
                </span>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}