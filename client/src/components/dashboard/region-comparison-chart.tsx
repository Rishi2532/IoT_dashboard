import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Region } from "@/types";
import Chart from "chart.js/auto";

interface RegionComparisonChartProps {
  regions: Region[];
  isLoading: boolean;
}

export default function RegionComparisonChart({ regions, isLoading }: RegionComparisonChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (isLoading || !regions.length || !chartRef.current) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const sortedRegions = [...regions].sort((a, b) => a.region_name.localeCompare(b.region_name));
    
    const labels = sortedRegions.map(region => {
      // Abbreviate long names to fit better on chart
      if (region.region_name === "Chhatrapati Sambhajinagar") return "C. Sambhajinagar";
      return region.region_name;
    });
    
    const totalEsrData = sortedRegions.map(region => region.total_esr || 0);
    const completedEsrData = sortedRegions.map(region => region.fully_completed_esr || 0);

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total ESR',
            data: totalEsrData,
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          },
          {
            label: 'Completed ESR',
            data: completedEsrData,
            backgroundColor: 'rgba(16, 185, 129, 0.6)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [regions, isLoading]);

  return (
    <Card className="bg-white">
      <CardContent className="p-5">
        <h3 className="text-lg leading-6 font-medium text-neutral-900">Region Comparison</h3>
        <div className="mt-1 text-sm text-neutral-500">
          Progress across different regions
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
