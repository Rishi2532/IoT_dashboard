import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Region } from "@/types";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

interface RegionComparisonChartProps {
  regions: Region[];
  isLoading: boolean;
}

export default function RegionComparisonChart({
  regions,
  isLoading,
}: RegionComparisonChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (isLoading || !regions.length || !chartRef.current) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // Register the plugin
    Chart.register(ChartDataLabels);

    const sortedRegions = [...regions].sort((a, b) =>
      a.region_name.localeCompare(b.region_name),
    );

    const labels = sortedRegions.map((region) => {
      // Abbreviate long names to fit better on chart
      if (region.region_name === "Chhatrapati Sambhajinagar")
        return "C. Sambhajinagar";
      return region.region_name;
    });

    // Extract all required data from regions
    const totalEsrData = sortedRegions.map(
      (region) => region.total_esr_integrated || 0,
    );
    const completedEsrData = sortedRegions.map(
      (region) => region.fully_completed_esr || 0,
    );
    const totalVillagesData = sortedRegions.map(
      (region) => region.total_villages_integrated || 0,
    );
    const completedVillagesData = sortedRegions.map(
      (region) => region.fully_completed_villages || 0,
    );
    const totalSchemesData = sortedRegions.map(
      (region) => region.total_schemes_integrated || 0,
    );
    const completedSchemesData = sortedRegions.map(
      (region) => region.fully_completed_schemes || 0,
    );

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Total ESR Integrated",
            data: totalEsrData,
            backgroundColor: "rgba(59, 130, 246, 0.6)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 1,
          },
          {
            label: "Fully Completed ESR",
            data: completedEsrData,
            backgroundColor: "rgba(16, 185, 129, 0.6)",
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 1,
          },
          {
            label: "Total Villages Integrated",
            data: totalVillagesData,
            backgroundColor: "rgba(245, 158, 11, 0.6)",
            borderColor: "rgba(245, 158, 11, 1)",
            borderWidth: 1,
          },
          {
            label: "Fully Completed Villages",
            data: completedVillagesData,
            backgroundColor: "rgba(236, 72, 153, 0.6)",
            borderColor: "rgba(236, 72, 153, 1)",
            borderWidth: 1,
          },
          {
            label: "Total Schemes Integrated",
            data: totalSchemesData,
            backgroundColor: "rgba(124, 58, 237, 0.6)",
            borderColor: "rgba(124, 58, 237, 1)",
            borderWidth: 1,
          },
          {
            label: "Fully Completed Schemes",
            data: completedSchemesData,
            backgroundColor: "rgba(239, 68, 68, 0.6)",
            borderColor: "rgba(239, 68, 68, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 20,
            right: 20,
            bottom: 60, // Increased bottom padding to show all content
            left: 20, // Increased left padding for better visibility
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Count",
              font: {
                size: 20,
                weight: "bold",
              },
              padding: { top: 10, bottom: 10 },
            },
            grid: {
              color: "rgba(0,0,0,0.1)",
            },
          },
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 20,
              },
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 15,
              padding: 10,
              font: {
                size: 15,
                weight: "bold",
              },
              usePointStyle: true,
              generateLabels: function (chart) {
                const original =
                  Chart.defaults.plugins.legend.labels.generateLabels(chart);
                original.forEach((label) => {
                  label.lineCap = "round";
                  label.lineJoin = "round";
                  label.lineWidth = 2;
                  label.pointStyle = "rectRounded";
                });
                return original;
              },
            },
            title: {
              display: true,
              text: "Region Wise Project Status",
              font: {
                size: 18,
                weight: "bold",
              },
              padding: {
                bottom: 15,
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleFont: {
              size: 12,
            },
            bodyFont: {
              size: 11,
            },
            padding: 10,
            displayColors: true,
          },
          datalabels: {
            color: "#000",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            borderRadius: 4,
            padding: 2,
            offset: 0,
            font: {
              weight: "bold",
              size: 20,
            },
            formatter: (value: number) => {
              return value.toString();
            },
            display: (context: any) => {
              const value = context.dataset.data[context.dataIndex];
              return typeof value === "number" && value > 0;
            },
            anchor: "end",
            align: "top",
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [regions, isLoading]);

  return (
    <div
      className="h-full flex flex-col"
      style={{ height: "550px", maxHeight: "600px" }}
    >
      {isLoading ? (
        <div className="animate-pulse h-full w-full bg-gray-200 rounded flex-1"></div>
      ) : (
        <div className="h-full w-full flex-1">
          <canvas ref={chartRef} className="h-full w-full"></canvas>
        </div>
      )}
    </div>
  );
}
