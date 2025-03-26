import { Card, CardContent } from "@/components/ui/card";
import { calculatePercentage } from "@/lib/utils";
import { RegionSummary } from "@/types";
import { GitBranchPlus, Home, Droplet, BarChart3 } from "lucide-react";

interface StatsCardsProps {
  data?: RegionSummary;
  isLoading: boolean;
}

export default function StatsCards({ data, isLoading }: StatsCardsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card
            key={i}
            className="bg-white overflow-hidden border border-gray-200 shadow-sm"
          >
            <CardContent className="p-6">
              <div className="h-24 flex items-center justify-center">
                <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalSchemes = data.total_schemes_integrated || 0;
  const completedSchemes = data.fully_completed_schemes || 0;
  const totalVillages = data.total_villages_integrated || 0;
  const completedVillages = data.fully_completed_villages || 0;
  const totalEsr = data.total_esr_integrated || 0;
  const completedEsr = data.fully_completed_esr || 0;

  const schemeCompletionPercentage = calculatePercentage(
    completedSchemes,
    totalSchemes,
  );
  const villageCompletionPercentage = calculatePercentage(
    completedVillages,
    totalVillages,
  );
  const esrCompletionPercentage = calculatePercentage(completedEsr, totalEsr);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {/* Total Schemes Card */}
      <Card className="bg-white overflow-hidden border border-blue-100 hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
        <div className="absolute top-0 right-0 h-20 w-20 opacity-10">
          <BarChart3 className="h-full w-full text-blue-700" />
        </div>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 shadow-sm">
              <GitBranchPlus className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Total Schemes
              </h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-3xl font-bold text-blue-900">
                  {totalSchemes}
                </p>
                <p className="ml-2 text-sm text-blue-600">schemes integrated</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">
                Completion Rate
              </span>
              <span className="text-sm font-bold text-blue-900">
                {schemeCompletionPercentage}%
              </span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-3 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full shadow-inner"
                style={{ width: `${schemeCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-blue-600">
                <b>{completedSchemes} Fully completed</b>
              </span>
              <span className="text-violet-600">
                {totalSchemes - completedSchemes} Partially Completed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Villages Card */}
      <Card className="bg-white overflow-hidden border border-amber-100 hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
        <div className="absolute top-0 right-0 h-20 w-20 opacity-10">
          <BarChart3 className="h-full w-full text-amber-700" />
        </div>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-3 shadow-sm">
              <Home className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 flex-1">
              <h3 className="text-sm font-medium text-amber-800">
                Total Villages
              </h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-3xl font-bold text-amber-900">
                  {totalVillages}
                </p>
                <p className="ml-2 text-sm text-amber-600">
                  villages integrated
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-amber-800">
                Completion Rate
              </span>
              <span className="text-sm font-bold text-amber-900">
                {villageCompletionPercentage}%
              </span>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-3 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-600 h-3 rounded-full shadow-inner"
                style={{ width: `${villageCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-amber-600">
                <b>{completedEsr} Fully completed</b>
              </span>
              <span className="text-amber-600">
                {totalVillages - completedVillages} Partially Completed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total ESR Card */}
      <Card className="bg-white overflow-hidden border border-sky-100 hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
        <div className="absolute top-0 right-0 h-20 w-20 opacity-10">
          <BarChart3 className="h-full w-full text-sky-700" />
        </div>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg p-3 shadow-sm">
              <img
                src="/esr-tank.svg"
                alt="ESR"
                className="h-8 w-8 text-white"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <div className="ml-5 flex-1">
              <h3 className="text-sm font-medium text-sky-800">Total ESR</h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-3xl font-bold text-sky-900">{totalEsr}</p>
                <p className="ml-2 text-sm text-sky-600">ESRs integrated</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-sky-800">
                Completion Rate
              </span>
              <span className="text-sm font-bold text-sky-900">
                {esrCompletionPercentage}%
              </span>
            </div>
            <div className="w-full bg-sky-100 rounded-full h-3 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-500 to-sky-600 h-3 rounded-full shadow-inner"
                style={{ width: `${esrCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-sky-600">
                <b>{completedEsr} Fully completed</b>
              </span>
              <span className="text-sky-600">
                {totalEsr - completedEsr} Partially Completed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
