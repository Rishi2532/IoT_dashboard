import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Droplet, Home, Gauge, BarChart3 } from "lucide-react";

interface MetricSelectorProps {
  value: 'completion' | 'esr' | 'villages' | 'flow_meter';
  onChange: (value: 'completion' | 'esr' | 'villages' | 'flow_meter') => void;
}

export default function MetricSelector({ value, onChange }: MetricSelectorProps) {
  const handleChange = (newValue: string) => {
    if (newValue) {
      onChange(newValue as 'completion' | 'esr' | 'villages' | 'flow_meter');
    }
  };

  return (
    <div className="pt-2 pb-4">
      <div className="text-sm text-neutral-500 mb-2">
        Select metric to display on map:
      </div>
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={handleChange} 
        className="justify-start"
      >
        <ToggleGroupItem value="completion" aria-label="Scheme Completion" className="flex gap-1.5 items-center">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Scheme Completion</span>
          <span className="inline sm:hidden">Schemes</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="esr" aria-label="ESR Integration" className="flex gap-1.5 items-center">
          <Droplet className="h-4 w-4" />
          <span className="hidden sm:inline">ESR Integration</span>
          <span className="inline sm:hidden">ESR</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="villages" aria-label="Villages Integration" className="flex gap-1.5 items-center">
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Village Integration</span>
          <span className="inline sm:hidden">Villages</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="flow_meter" aria-label="Flow Meter Status" className="flex gap-1.5 items-center">
          <Gauge className="h-4 w-4" />
          <span className="hidden sm:inline">Flow Meter Status</span>
          <span className="inline sm:hidden">Flow Meters</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}