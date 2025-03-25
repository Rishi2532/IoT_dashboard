import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SchemeStatus } from "@/types";
import Chart from "chart.js/auto";

interface CompletionStatusChartProps {
  schemes: SchemeStatus[];
  isLoading: boolean;
}

export default function CompletionStatusChart({ schemes, isLoading }: CompletionStatusChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (isLoading || !schemes.length || !chartRef.current) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const fullyCompletedCount = schemes.filter(scheme => 
      scheme.scheme_completion_status === 'Fully-Completed'
    ).length;
    
    const partialCount = schemes.filter(scheme => 
      scheme.scheme_completion_status === 'Partial'
    ).length;
    
    const notConnectedCount = schemes.filter(scheme => 
      scheme.scheme_completion_status === 'Not-Connected'
    ).length;

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Fully Completed', 'Partial', 'Not Connected'],
        datasets: [{
          data: [fullyCompletedCount, partialCount, notConnectedCount],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [schemes, isLoading]);

  return (
    <Card className="bg-white">
      <CardContent className="p-5">
        <h3 className="text-lg leading-6 font-medium text-neutral-900">Completion Status</h3>
        <div className="mt-1 text-sm text-neutral-500">
          Overall scheme completion status
        </div>
        <div className="mt-4 h-[250px] w-full">
          {isLoading ? (
            <div className="animate-pulse h-full w-full bg-gray-200 rounded"></div>
          ) : (
            <canvas ref={chartRef}></canvas>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
