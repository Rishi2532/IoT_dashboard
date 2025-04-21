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
  const [activeDatasets, setActiveDatasets] = useState<Set<number>>(new Set());
  const [showAllDatasets, setShowAllDatasets] = useState<boolean>(true);

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
        onClick: function(event, elements) {
          // This is needed for legend click handler to work properly
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
            // Increase max height of y-axis to accommodate labels
            suggestedMax: function(context: any) {
              let maxValue = 0;
              if (context.chart && context.chart.data && context.chart.data.datasets) {
                const allData = context.chart.data.datasets.flatMap((d: any) => d.data || []);
                maxValue = Math.max(...allData.filter((v: any) => typeof v === 'number'));
              }
              // Add 20% padding for labels
              return maxValue * 1.2;
            },
          },
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 14, // Reduced font size for better fit
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
            onClick: function(e, legendItem, legend) {
              const index = legendItem.datasetIndex;
              
              if (index === undefined) return;
              
              // Toggle the clicked dataset
              if (showAllDatasets) {
                // First click on any legend - show only this dataset
                setShowAllDatasets(false);
                setActiveDatasets(new Set([index]));
                
                // Update visibility for all datasets
                legend.chart.data.datasets.forEach((dataset, i) => {
                  const meta = legend.chart.getDatasetMeta(i);
                  meta.hidden = i !== index;
                });
              } else {
                // Toggle the clicked dataset in our active set
                const newActiveDatasets = new Set(activeDatasets);
                
                if (newActiveDatasets.has(index)) {
                  // If this was the only active dataset, show all datasets again
                  if (newActiveDatasets.size === 1) {
                    setShowAllDatasets(true);
                    // Show all datasets
                    legend.chart.data.datasets.forEach((dataset, i) => {
                      const meta = legend.chart.getDatasetMeta(i);
                      meta.hidden = false;
                    });
                  } else {
                    // Remove from active set
                    newActiveDatasets.delete(index);
                    setActiveDatasets(newActiveDatasets);
                    
                    // Hide this dataset
                    const meta = legend.chart.getDatasetMeta(index);
                    meta.hidden = true;
                  }
                } else {
                  // Add to active set
                  newActiveDatasets.add(index);
                  setActiveDatasets(newActiveDatasets);
                  
                  // Show this dataset
                  const meta = legend.chart.getDatasetMeta(index);
                  meta.hidden = false;
                }
              }
              
              legend.chart.update();
            },
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
              size: 12, // Reduced font size for better fit
            },
            formatter: (value: any) => {
              // Always show the value, including zero
              // Ensure zeros are shown consistently
              if (value === 0 || value === '0' || !value) {
                return '0';
              }
              return value.toString();
            },
            // Always display all labels including zero values
            display: true,
            anchor: "end",
            // Position the label vertically and horizontally based on dataset
            align: function(context: any) {
              const datasetIndex = context.datasetIndex || 0;
              const value = Number(context.dataset.data[context.dataIndex] || 0);
              
              // Special positioning for high values to prevent overlap
              if (datasetIndex === 0 && value > 300) {
                return 'end';
              } else if (value > 150) {
                return 'start';
              }
              return 'top';
            },
            // Add space between label and bar
            offset: function(context: any) {
              const datasetIndex = context.datasetIndex || 0;
              const value = Number(context.dataset.data[context.dataIndex] || 0);
              
              // Add more spacing for specific datasets to prevent overlap
              if (datasetIndex === 0 && value > 300) {
                return 15; // More space for very high values
              } else if (value > 150) {
                return 8;
              } else if (value > 100) {
                return 5;
              }
              
              return 2; // Default offset
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
  }, [regions, isLoading, activeDatasets, showAllDatasets]);

  // Reset function to show all datasets
  const resetChart = () => {
    if (!showAllDatasets && chartInstance.current) {
      setShowAllDatasets(true);
      setActiveDatasets(new Set());
      
      // Show all datasets
      chartInstance.current.data.datasets.forEach((dataset, i) => {
        const meta = chartInstance.current?.getDatasetMeta(i);
        if (meta) meta.hidden = false;
      });
      
      chartInstance.current.update();
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{ height: "550px", maxHeight: "600px" }}
    >
      {!showAllDatasets && (
        <div className="flex justify-end mb-2">
          <button
            onClick={resetChart}
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
