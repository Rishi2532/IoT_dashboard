import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { AlertCircle, Calendar, Check, DropletIcon, Gauge, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface DailyUpdateItem {
  type: 'village' | 'esr' | 'scheme' | 'flow_meter' | 'rca' | 'pressure_transmitter';
  count: number;
  name?: string; // Only for completed items that have a name
  status: 'new' | 'completed';
}

interface DailyUpdatesProps {
  isLoading: boolean;
}

export default function DailyUpdates({ isLoading }: DailyUpdatesProps) {
  const [error, setError] = useState<string | null>(null);

  // Fetch today's updates using TanStack Query
  const { 
    data: todayUpdates = [],
    isLoading: isLoadingUpdates,
    error: queryError
  } = useQuery<DailyUpdateItem[]>({
    queryKey: ['/api/updates/today'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/updates/today');
        if (!response.ok) {
          throw new Error('Failed to fetch today\'s updates');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching today\'s updates:', error);
        setError('Failed to load today\'s updates. Please try again later.');
        return [];
      }
    },
    // Stale time set to 10 minutes since daily updates don't change often
    staleTime: 10 * 60 * 1000,
  });

  // For demo/placeholder data when the API is not yet implemented
  const placeholderUpdates: DailyUpdateItem[] = [
    { type: 'village', count: 3, status: 'new' },
    { type: 'esr', count: 2, status: 'new' },
    { type: 'flow_meter', count: 5, status: 'new' },
    { type: 'scheme', count: 1, name: 'Nagpur District Scheme', status: 'completed' },
    { type: 'village', count: 1, name: 'Katol Village', status: 'completed' },
    { type: 'rca', count: 2, status: 'new' },
  ];

  const updates = todayUpdates.length > 0 ? todayUpdates : placeholderUpdates;

  // Helper function to get the icon for the update type
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'village':
        return <div className="w-5 h-5 text-amber-500">🏘️</div>;
      case 'esr':
        return <div className="w-5 h-5 text-purple-500">🏗️</div>;
      case 'scheme':
        return <div className="w-5 h-5 text-blue-500">🌊</div>;
      case 'flow_meter':
        return <Gauge className="w-5 h-5 text-emerald-500" />;
      case 'rca':
        return <DropletIcon className="w-5 h-5 text-cyan-500" />;
      case 'pressure_transmitter':
        return <Activity className="w-5 h-5 text-pink-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Helper function to format the update text
  const formatUpdateText = (item: DailyUpdateItem) => {
    const countText = formatNumber(item.count);
    
    if (item.status === 'new') {
      switch (item.type) {
        case 'village':
          return `${countText} new ${item.count === 1 ? 'village' : 'villages'} added`;
        case 'esr':
          return `${countText} new ${item.count === 1 ? 'ESR' : 'ESRs'} added`;
        case 'scheme':
          return `${countText} new ${item.count === 1 ? 'scheme' : 'schemes'} added`;
        case 'flow_meter':
          return `${countText} new flow ${item.count === 1 ? 'meter' : 'meters'} added`;
        case 'rca':
          return `${countText} new chlorine ${item.count === 1 ? 'analyzer' : 'analyzers'} added`;
        case 'pressure_transmitter':
          return `${countText} new pressure ${item.count === 1 ? 'transmitter' : 'transmitters'} added`;
        default:
          return `${countText} new ${item.type} added`;
      }
    } else {
      // For completed items
      switch (item.type) {
        case 'village':
          return item.name 
            ? `Village "${item.name}" fully completed` 
            : `${countText} ${item.count === 1 ? 'village' : 'villages'} fully completed`;
        case 'esr':
          return item.name 
            ? `ESR "${item.name}" fully completed` 
            : `${countText} ${item.count === 1 ? 'ESR' : 'ESRs'} fully completed`;
        case 'scheme':
          return item.name 
            ? `Scheme "${item.name}" fully completed` 
            : `${countText} ${item.count === 1 ? 'scheme' : 'schemes'} fully completed`;
        default:
          return `${countText} ${item.type} ${item.count === 1 ? 'is' : 'are'} now operational`;
      }
    }
  };

  const today = new Date();
  const formattedDate = format(today, 'MMMM d, yyyy');

  if (isLoading) {
    return (
      <Card className="bg-white overflow-hidden border shadow-sm hover:shadow-md transition-all mb-4 sm:mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center">
                <Skeleton className="h-6 w-6 mr-3 rounded-full" />
                <Skeleton className="h-5 w-full max-w-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white overflow-hidden border border-red-200 shadow-sm hover:shadow-md transition-all mb-4 sm:mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center text-red-500 mb-2">
            <AlertCircle className="w-5 h-5 mr-2" />
            <h3 className="text-lg font-medium">Error Loading Updates</h3>
          </div>
          <p className="text-red-600 text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white overflow-hidden border shadow-sm hover:shadow-md transition-all mb-4 sm:mb-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-lg font-medium text-blue-800 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Today's Updates
          </h3>
          <div className="mt-1 sm:mt-0">
            <Badge variant="outline" className="text-xs font-normal text-neutral-500 bg-neutral-50">
              {formattedDate}
            </Badge>
          </div>
        </div>
        
        {isLoadingUpdates ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center">
                <Skeleton className="h-6 w-6 mr-3 rounded-full" />
                <Skeleton className="h-5 w-full max-w-md" />
              </div>
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="text-center py-6 text-neutral-500">
            <p>No updates available for today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {updates.map((item, index) => (
              <div key={index} className="flex items-start py-1.5">
                <span className="mt-0.5 mr-3 flex-shrink-0">
                  {getItemIcon(item.type)}
                </span>
                <div>
                  <p className={`text-sm ${item.status === 'completed' ? 'text-green-700 font-medium' : 'text-neutral-700'}`}>
                    {formatUpdateText(item)}
                    {item.status === 'completed' && (
                      <Check className="inline-block ml-1 h-4 w-4 text-green-500" />
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-400 text-right">
          Last updated: {format(new Date(), 'h:mm a')}
        </div>
      </CardContent>
    </Card>
  );
}