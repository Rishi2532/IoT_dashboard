import { Card, CardContent } from "@/components/ui/card";
import { calculatePercentage } from "@/lib/utils";
import { RegionSummary } from "@/types";
import { GitBranchPlus, Home, Droplet } from "lucide-react";

interface StatsCardsProps {
  data?: RegionSummary;
  isLoading: boolean;
}

export default function StatsCards({ data, isLoading }: StatsCardsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-white overflow-hidden">
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

  const schemeCompletionPercentage = calculatePercentage(completedSchemes, totalSchemes);
  const villageCompletionPercentage = calculatePercentage(completedVillages, totalVillages);
  const esrCompletionPercentage = calculatePercentage(completedEsr, totalEsr);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
      {/* Total Schemes Card */}
      <Card className="bg-white overflow-hidden">
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-50 rounded-md p-3">
              <GitBranchPlus className="h-5 w-5 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 truncate">Total Schemes</dt>
                <dd>
                  <div className="text-lg font-semibold text-neutral-900">{totalSchemes}</div>
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-500">Fully Completed</span>
              <span className="text-sm font-medium text-success-600">{completedSchemes}</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2 mt-1">
              <div 
                className="bg-success-500 h-2 rounded-full" 
                style={{ width: `${schemeCompletionPercentage}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Villages Card */}
      <Card className="bg-white overflow-hidden">
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-warning-50 rounded-md p-3">
              <Home className="h-5 w-5 text-warning-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 truncate">Total Villages</dt>
                <dd>
                  <div className="text-lg font-semibold text-neutral-900">{totalVillages}</div>
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-500">Fully Completed</span>
              <span className="text-sm font-medium text-success-600">{completedVillages}</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2 mt-1">
              <div 
                className="bg-success-500 h-2 rounded-full" 
                style={{ width: `${villageCompletionPercentage}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total ESR Card */}
      <Card className="bg-white overflow-hidden">
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-50 rounded-md p-3">
              <Droplet className="h-5 w-5 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 truncate">Total ESR</dt>
                <dd>
                  <div className="text-lg font-semibold text-neutral-900">{totalEsr}</div>
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-500">Fully Completed</span>
              <span className="text-sm font-medium text-success-600">{completedEsr}</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2 mt-1">
              <div 
                className="bg-success-500 h-2 rounded-full" 
                style={{ width: `${esrCompletionPercentage}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
