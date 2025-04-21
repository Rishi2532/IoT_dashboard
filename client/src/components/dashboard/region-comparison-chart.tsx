import { useEffect, useRef, useState } from "react";
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
  const [selectedDatasets, setSelectedDatasets] = useState<number[]>([]);
  const [showResetButton, setShowResetButton] = useState(false);

  // Generate datasets from region data
  const generateChartData = (regions: Region[]) => {
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
    return {
      labels,
      datasets: [
        {
          label: "Total ESR Integrated",
          data: sortedRegions.map((region) => region.total_esr_integrated || 0),
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
          hidden: selectedDatasets.length > 0 && !selectedDatasets.includes(0),
        },
        {
          label: "Fully Completed ESR",
          data: sortedRegions.map((region) => region.fully_completed_esr || 0),
          backgroundColor: "rgba(16, 185, 129, 0.6)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
          hidden: selectedDatasets.length > 0 && !selectedDatasets.includes(1),
        },
        {
          label: "Total Villages Integrated",
          data: sortedRegions.map((region) => region.total_villages_integrated || 0),
          backgroundColor: "rgba(245, 158, 11, 0.6)",
          borderColor: "rgba(245, 158, 11, 1)",
          borderWidth: 1,
          hidden: selectedDatasets.length > 0 && !selectedDatasets.includes(2),
        },
        {
          label: "Fully Completed Villages",
          data: sortedRegions.map((region) => region.fully_completed_villages || 0),
          backgroundColor: "rgba(236, 72, 153, 0.6)",
          borderColor: "rgba(236, 72, 153, 1)",
          borderWidth: 1,
          hidden: selectedDatasets.length > 0 && !selectedDatasets.includes(3),
        },
        {
          label: "Total Schemes Integrated",
          data: sortedRegions.map((region) => region.total_schemes_integrated || 0),
          backgroundColor: "rgba(124, 58, 237, 0.6)",
          borderColor: "rgba(124, 58, 237, 1)",
          borderWidth: 1,
          hidden: selectedDatasets.length > 0 && !selectedDatasets.includes(4),
        },
        {
          label: "Fully Completed Schemes",
          data: sortedRegions.map((region) => region.fully_completed_schemes || 0),
          backgroundColor: "rgba(239, 68, 68, 0.6)",
          borderColor: "rgba(239, 68, 68, 1)",
          borderWidth: 1,
          hidden: selectedDatasets.length > 0 && !selectedDatasets.includes(5),
        },
      ],
    };
  };

  // Handle legend item click
  const handleLegendClick = (datasetIndex: number) => {
    if (selectedDatasets.includes(datasetIndex)) {
      // If already selected, remove it
      const newSelected = selectedDatasets.filter(idx => idx !== datasetIndex);
      setSelectedDatasets(newSelected);
      
      // If nothing is selected now, hide the reset button
      if (newSelected.length === 0) {
        setShowResetButton(false);
      }
    } else {
      // If not selected, add it
      setSelectedDatasets([...selectedDatasets, datasetIndex]);
      setShowResetButton(true);
    }
  };

  // Reset all selections
  const resetSelections = () => {
    setSelectedDatasets([]);
    setShowResetButton(false);
  };

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

    const chartData = generateChartData(regions);

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 20,
            right: 20,
            bottom: 60,
            left: 20,
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
            suggestedMax: function(context: any) {
              let maxValue = 0;
              if (context.chart && context.chart.data && context.chart.data.datasets) {
                const allData = context.chart.data.datasets.flatMap((d: any) => d.data || []);
                maxValue = Math.max(...allData.filter((v: any) => typeof v === 'number'));
              }
              return maxValue * 1.2;
            },
          },
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 14,
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
            onClick: function(e, legendItem) {
              const index = legendItem.datasetIndex;
              if (index !== undefined) {
                handleLegendClick(index);
              }
            },
            labels: {
              boxWidth: 15,
              padding: 10,
              font: {
                size: 15,
                weight: "bold",
              },
              usePointStyle: true,
              generateLabels: function(chart) {
                const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                // Add visual indicator for selected items
                labels.forEach((label, i) => {
                  if (selectedDatasets.includes(i)) {
                    // Make selected items stand out
                    label.lineWidth = 2;
                    label.strokeStyle = label.fillStyle;
                    label.fontColor = "#000000";
                  } else if (selectedDatasets.length > 0) {
                    // Fade non-selected items
                    label.fillStyle = `${label.fillStyle}80`; // Add transparency
                    label.fontColor = "#888888";
                  }
                });
                return labels;
              }
            },
            title: {
              display: true,
              text: "Region Wise Project Status (Click to Toggle)",
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
            font: {
              weight: "bold",
              size: 12,
            },
            formatter: (value: any) => {
              if (value === 0 || value === '0' || !value) {
                return '0';
              }
              return value.toString();
            },
            display: true,
            anchor: "end",
            align: function(context: any) {
              const datasetIndex = context.datasetIndex || 0;
              const value = Number(context.dataset.data[context.dataIndex] || 0);
              
              if (datasetIndex === 0 && value > 300) {
                return 'end';
              } else if (value > 150) {
                return 'start';
              }
              return 'top';
            },
            offset: function(context: any) {
              const datasetIndex = context.datasetIndex || 0;
              const value = Number(context.dataset.data[context.dataIndex] || 0);
              
              if (datasetIndex === 0 && value > 300) {
                return 15;
              } else if (value > 150) {
                return 8;
              } else if (value > 100) {
                return 5;
              }
              
              return 2;
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [regions, isLoading, selectedDatasets]);

  return (
    <div
      className="h-full flex flex-col"
      style={{ height: "550px", maxHeight: "600px" }}
    >
      {showResetButton && (
        <div className="flex justify-end mb-2">
          <button
            onClick={resetSelections}
            className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
          >
            Show All Data
          </button>
        </div>
      )}
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
