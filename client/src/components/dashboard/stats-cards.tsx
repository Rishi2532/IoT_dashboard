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
      <Card className="bg-white overflow-hidden border-2 border-blue-200 hover:shadow-lg transition-all duration-300 hover:translate-y-[-3px] rounded-xl">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-full w-full text-blue-700" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 12h6m-2 2v6m-4-8V4m0 0h16m0 0v8m0-8h4v16H2" />
            <circle cx="16" cy="16" r="6" />
            <path d="M16 14v4m-2-2h4" />
          </svg>
        </div>
        <CardContent className="p-3 sm:p-4 md:p-6 xl:p-8">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-md">
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
            <div className="w-full bg-blue-100 rounded-full h-2.5 sm:h-3 xl:h-4 mt-1 sm:mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-700 h-2.5 sm:h-3 xl:h-4 rounded-full shadow-inner"
                style={{ width: `${schemeCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs xl:text-sm mt-1 xl:mt-2">
              <span className="text-green-600 font-medium">
                <b>{completedSchemes} Fully Completed</b>
              </span>
              <span className="text-yellow-600 font-medium">
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
      <Card className="bg-white overflow-hidden border-2 border-amber-200 hover:shadow-lg transition-all duration-300 hover:translate-y-[-3px] rounded-xl">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-full w-full text-amber-700" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 10l9-7 9 7v11H3z" />
            <path d="M12 3v7h7" />
            <path d="M9 21v-8H5v8" />
            <path d="M19 21v-6h-4v6" />
          </svg>
        </div>
        <CardContent className="p-3 sm:p-4 md:p-6 xl:p-8">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-md">
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
            <div className="w-full bg-amber-100 rounded-full h-2.5 sm:h-3 xl:h-4 mt-1 sm:mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-700 h-2.5 sm:h-3 xl:h-4 rounded-full shadow-inner"
                style={{ width: `${villageCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs xl:text-sm mt-1 xl:mt-2">
              <span className="text-green-600 font-medium">
                <b>{completedVillages} Fully Completed</b>
              </span>
              <span className="text-yellow-600 font-medium">
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
      <Card className="bg-white overflow-hidden border-2 border-purple-200 hover:shadow-lg transition-all duration-300 hover:translate-y-[-3px] rounded-xl">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-full w-full text-purple-700">
            <path fill="currentColor" d="M12,2l9,4v12l-9,4l-9-4V6L12,2z M12,4.2L5,7.2v9.6l7,3l7-3V7.2L12,4.2z M12,17l-5-2.2v-6.1l5,2.2V17z M7,7.8l5,2.2v0.9l-5-2.2V7.8z" />
          </svg>
        </div>
        <CardContent className="p-3 sm:p-4 md:p-6 xl:p-8">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 xl:h-7 xl:w-7 text-white">
                <path d="M12,3 L20,8 V16 L12,21 L4,16 V8 L12,3 Z" />
                <path d="M12,12 m0,3 a3,3 0 1,0 0,-6 a3,3 0 1,0 0,6 Z" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 md:ml-5 xl:ml-6 flex-1">
              <h3 className="text-xs sm:text-sm xl:text-base font-medium text-purple-800">
                Total ESR
              </h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold text-purple-900">
                  {totalEsr}
                </p>
                <p className="ml-1 sm:ml-2 text-xs sm:text-sm xl:text-base text-purple-600">
                  ESR tanks integrated
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 md:mt-6 xl:mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm xl:text-base font-medium text-purple-800">
                Completion Rate
              </span>
              <span className="text-xs sm:text-sm xl:text-base font-bold text-purple-900">
                {esrCompletionPercentage}%
              </span>
            </div>
            <div className="w-full bg-purple-100 rounded-full h-2.5 sm:h-3 xl:h-4 mt-1 sm:mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-700 h-2.5 sm:h-3 xl:h-4 rounded-full shadow-inner"
                style={{ width: `${esrCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs xl:text-sm mt-1 xl:mt-2">
              <span className="text-green-600 font-medium">
                <b>{completedEsr} Fully Completed</b>
              </span>
              <span className="text-yellow-600 font-medium">
                {totalEsr - completedEsr} Partially Completed
              </span>
            </div>

            {/* Additional large-screen details */}
            <div className="hidden 2xl:block mt-4 pt-4 border-t border-purple-100">
              <div className="flex justify-between text-sm text-purple-700">
                <span>ESRs Integrated:</span>
                <span className="font-semibold">{totalEsr}</span>
              </div>
              <div className="flex justify-between text-sm text-purple-700 mt-1">
                <span>Fully Completed:</span>
                <span className="font-semibold">{completedEsr}</span>
              </div>
              <div className="flex justify-between text-sm text-purple-700 mt-1">
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
      <Card className="bg-white overflow-hidden border-2 border-emerald-200 hover:shadow-lg transition-all duration-300 hover:translate-y-[-3px] rounded-xl">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-full w-full text-emerald-700" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="20" height="8" rx="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" />
            <line x1="6" y1="6" x2="6" y2="6" strokeLinecap="round" />
            <line x1="10" y1="6" x2="10" y2="6" strokeLinecap="round" />
            <line x1="6" y1="18" x2="6" y2="18" strokeLinecap="round" />
            <line x1="10" y1="18" x2="10" y2="18" strokeLinecap="round" />
            <line x1="14" y1="6" x2="18" y2="6" strokeLinecap="round" />
            <line x1="14" y1="18" x2="18" y2="18" strokeLinecap="round" />
          </svg>
        </div>
        <CardContent className="p-3 sm:p-4 md:p-6 xl:p-8">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-md">
              <Cpu className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 md:ml-5 xl:ml-6 flex-1">
              <h3 className="text-xs sm:text-sm xl:text-base font-medium text-emerald-800">
                Connected Sensors on IoT Platform
              </h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold text-emerald-900">
                  {Number(flowMeterIntegrated) + Number(rcaIntegrated) + Number(pressureTransmitterIntegrated)}
                </p>
                <p className="ml-1 sm:ml-2 text-xs sm:text-sm xl:text-base text-emerald-600">
                  components
                </p>
              </div>
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
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mr-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12h8" />
                    <path d="M12 16V8" />
                    <path d="M9 9l6 6" />
                    <path d="M15 9l-6 6" />
                  </svg>
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
