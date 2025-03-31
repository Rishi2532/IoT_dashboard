import { Card, CardContent } from "@/components/ui/card";
import { calculatePercentage } from "@/lib/utils";
import { RegionSummary } from "@/types";
import {
  GitBranchPlus,
  Home,
  Droplet,
  BarChart3,
  Gauge,
  Activity,
  Cpu,
} from "lucide-react";

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
  const partialEsr = data.partial_esr || 0;
  const flowMeterIntegrated = data.flow_meter_integrated || 0;
  const rcaIntegrated = data.rca_integrated || 0;
  const pressureTransmitterIntegrated =
    data.pressure_transmitter_integrated || 0;

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
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 xl:gap-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {/* Total Schemes Card */}
      <Card className="bg-white overflow-hidden border border-blue-100 hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <BarChart3 className="h-full w-full text-blue-700" />
        </div>
        <CardContent className="p-3 sm:p-4 md:p-6 xl:p-8">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-sm">
              <GitBranchPlus className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 md:ml-5 xl:ml-6 flex-1">
              <h3 className="text-xs sm:text-sm xl:text-base font-medium text-blue-800">
                Total Schemes
              </h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold text-blue-900">
                  {totalSchemes}
                </p>
                <p className="ml-1 sm:ml-2 text-xs sm:text-sm xl:text-base text-blue-600">
                  water schemes
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 md:mt-6 xl:mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm xl:text-base font-medium text-blue-800">
                Completion Rate
              </span>
              <span className="text-xs sm:text-sm xl:text-base font-bold text-blue-900">
                {schemeCompletionPercentage}%
              </span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2 sm:h-3 xl:h-4 mt-1 sm:mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 sm:h-3 xl:h-4 rounded-full shadow-inner"
                style={{ width: `${schemeCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs xl:text-sm mt-1 xl:mt-2">
              <span className="text-blue-600">
                <b>{completedSchemes} Fully Completed</b>
              </span>
              <span className="text-violet-600">
                {totalSchemes - completedSchemes} Partially Completed
              </span>
            </div>

            {/* Additional large-screen details */}
            <div className="hidden 2xl:block mt-4 pt-4 border-t border-blue-100">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Schemes Integrated:</span>
                <span className="font-semibold">{totalSchemes}</span>
              </div>
              <div className="flex justify-between text-sm text-blue-700 mt-1">
                <span>Fully Completed:</span>
                <span className="font-semibold">{completedSchemes}</span>
              </div>
              <div className="flex justify-between text-sm text-blue-700 mt-1">
                <span>Completion Rate:</span>
                <span className="font-semibold">
                  {schemeCompletionPercentage}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Villages Card */}
      <Card className="bg-white overflow-hidden border border-amber-100 hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <BarChart3 className="h-full w-full text-amber-700" />
        </div>
        <CardContent className="p-3 sm:p-4 md:p-6 xl:p-8">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-sm">
              <Home className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 md:ml-5 xl:ml-6 flex-1">
              <h3 className="text-xs sm:text-sm xl:text-base font-medium text-amber-800">
                Total Villages
              </h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold text-amber-900">
                  {totalVillages}
                </p>
                <p className="ml-1 sm:ml-2 text-xs sm:text-sm xl:text-base text-amber-600">
                  villages integrated
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 md:mt-6 xl:mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm xl:text-base font-medium text-amber-800">
                Completion Rate
              </span>
              <span className="text-xs sm:text-sm xl:text-base font-bold text-amber-900">
                {villageCompletionPercentage}%
              </span>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-2 sm:h-3 xl:h-4 mt-1 sm:mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 sm:h-3 xl:h-4 rounded-full shadow-inner"
                style={{ width: `${villageCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs xl:text-sm mt-1 xl:mt-2">
              <span className="text-amber-600">
                <b>{completedVillages} Fully Completed</b>
              </span>
              <span className="text-amber-600">
                {totalVillages - completedVillages} Partially Completed
              </span>
            </div>

            {/* Additional large-screen details */}
            <div className="hidden 2xl:block mt-4 pt-4 border-t border-amber-100">
              <div className="flex justify-between text-sm text-amber-700">
                <span>Villages Integrated:</span>
                <span className="font-semibold">{totalVillages}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-700 mt-1">
                <span>Fully Completed:</span>
                <span className="font-semibold">{completedVillages}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-700 mt-1">
                <span>Completion Rate:</span>
                <span className="font-semibold">
                  {villageCompletionPercentage}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total ESR Card */}
      <Card className="bg-white overflow-hidden border border-sky-100 hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <BarChart3 className="h-full w-full text-sky-700" />
        </div>
        <CardContent className="p-3 sm:p-4 md:p-6 xl:p-8">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-sm">
              <Droplet className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 md:ml-5 xl:ml-6 flex-1">
              <h3 className="text-xs sm:text-sm xl:text-base font-medium text-sky-800">
                Total ESR
              </h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold text-sky-900">
                  {totalEsr}
                </p>
                <p className="ml-1 sm:ml-2 text-xs sm:text-sm xl:text-base text-sky-600">
                  ESR tanks integrated
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 md:mt-6 xl:mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm xl:text-base font-medium text-sky-800">
                Completion Rate
              </span>
              <span className="text-xs sm:text-sm xl:text-base font-bold text-sky-900">
                {esrCompletionPercentage}%
              </span>
            </div>
            <div className="w-full bg-sky-100 rounded-full h-2 sm:h-3 xl:h-4 mt-1 sm:mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-500 to-sky-600 h-2 sm:h-3 xl:h-4 rounded-full shadow-inner"
                style={{ width: `${esrCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs xl:text-sm mt-1 xl:mt-2">
              <span className="text-sky-600">
                <b>{completedEsr} Fully Completed</b>
              </span>
              <span className="text-sky-600">
                {totalEsr - completedEsr} Partially Completed
              </span>
            </div>

            {/* Additional large-screen details */}
            <div className="hidden 2xl:block mt-4 pt-4 border-t border-sky-100">
              <div className="flex justify-between text-sm text-sky-700">
                <span>ESRs Integrated:</span>
                <span className="font-semibold">{totalEsr}</span>
              </div>
              <div className="flex justify-between text-sm text-sky-700 mt-1">
                <span>Fully Completed:</span>
                <span className="font-semibold">{completedEsr}</span>
              </div>
              <div className="flex justify-between text-sm text-sky-700 mt-1">
                <span>Completion Rate:</span>
                <span className="font-semibold">
                  {esrCompletionPercentage}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infrastructure Components Card */}
      <Card className="bg-white overflow-hidden border border-emerald-100 hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <BarChart3 className="h-full w-full text-emerald-700" />
        </div>
        <CardContent className="p-3 sm:p-4 md:p-6 xl:p-8">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-sm">
              <Cpu className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 md:ml-5 xl:ml-6 flex-1">
              <h3 className="text-xs sm:text-sm xl:text-base font-medium text-emerald-800">
                Connected Sensors on IoT Platform
              </h3>
              {/* <div className="mt-1 flex items-baseline">
                <p className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold text-emerald-900">
                  {flowMeterIntegrated + rcaIntegrated + pressureTransmitterIntegrated}
                </p>
                <p className="ml-1 sm:ml-2 text-xs sm:text-sm xl:text-base text-emerald-600">components integrated</p>
              </div> */}
            </div>
          </div>
          <div className="mt-3 sm:mt-4 md:mt-6 xl:mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm xl:text-base font-medium text-emerald-800">
                Monitoring Systems
              </span>
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mr-2" />
                  <span className="text-xs sm:text-sm text-emerald-800">
                    Flow Meters
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-emerald-900">
                  {flowMeterIntegrated}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mr-2" />
                  <span className="text-xs sm:text-sm text-emerald-800">
                    Residual Chlorine Analyzer
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-emerald-900">
                  {rcaIntegrated}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Droplet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mr-2" />
                  <span className="text-xs sm:text-sm text-emerald-800">
                    Pressure Transmitters
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-emerald-900">
                  {pressureTransmitterIntegrated}
                </span>
              </div>
            </div>

            {/* Additional large-screen details */}
            <div className="hidden 2xl:block mt-4 pt-4 border-t border-emerald-100">
              <div className="flex justify-between text-sm text-emerald-700">
                <span>Total Components:</span>
                <span className="font-semibold">
                  {Number(flowMeterIntegrated) +
                    Number(rcaIntegrated) +
                    Number(pressureTransmitterIntegrated)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-emerald-700 mt-1">
                {/* <span>Coverage Rate:</span>
                <span className="font-semibold">
                  {Math.round(
                    ((Number(flowMeterIntegrated) +
                      Number(rcaIntegrated) +
                      Number(pressureTransmitterIntegrated)) /
                      (totalEsr * 3)) *
                      100,
                  )}
                  %
                </span> */}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
