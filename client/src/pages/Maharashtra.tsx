import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface MaharashtraProps {
  onRegionClick?: (regionName: string) => void;
  selectedRegion?: string;
  showLabels?: boolean;
}

export const Maharashtra = ({ 
  onRegionClick = () => {}, 
  selectedRegion = "all",
  showLabels = true 
}: MaharashtraProps): JSX.Element => {
  const [hoveredRegion, setHoveredRegion] = React.useState<string | null>(null);

  // Region mapping as requested
  const regionMapping = {
    "Konkan": ["Mumbai City", "Mumbai Suburban", "Thane", "Palghar", "Raigad", "Ratnagiri", "Sindhudurg"],
    "Pune": ["Pune", "Satara", "Sangli", "Kolhapur", "Solapur"],
    "Nashik": ["Nashik", "Nandurbar", "Dhule", "Jalgaon", "Ahmednagar"],
    "Chhatrapati Sambhajinagar": ["Chhatrapati Sambhajinagar", "Jalna", "Beed", "Parbhani", "Hingoli", "Latur", "Osmanabad", "Nanded"],
    "Amravati": ["Akola", "Amravati", "Buldhana", "Washim", "Yavatmal"],
    "Nagpur": ["Nagpur", "Wardha", "Chandrapur", "Gadchiroli", "Gondia", "Bhandara"]
  };

  // Region base colors
  const regionColors = {
    "Konkan": "#60a5fa", // Blue
    "Pune": "#4ade80", // Green  
    "Nashik": "#fbbf24", // Yellow
    "Chhatrapati Sambhajinagar": "#a78bfa", // Purple
    "Amravati": "#fb7185", // Pink
    "Nagpur": "#f97316" // Orange
  };

  // Region dark colors for highlighting
  const regionDarkColors = {
    "Konkan": "#1d4ed8", // Dark Blue
    "Pune": "#15803d", // Dark Green
    "Nashik": "#d97706", // Dark Yellow
    "Chhatrapati Sambhajinagar": "#7c3aed", // Dark Purple
    "Amravati": "#e11d48", // Dark Pink
    "Nagpur": "#c2410c" // Dark Orange
  };

  // Function to find which region a district belongs to
  const getDistrictRegion = (districtName: string): string | null => {
    for (const [region, districts] of Object.entries(regionMapping)) {
      if (districts.includes(districtName)) {
        return region;
      }
    }
    return null;
  };

  // Handle district hover
  const handleDistrictHover = (districtName: string | null) => {
    if (districtName) {
      const region = getDistrictRegion(districtName);
      setHoveredRegion(region);
    } else {
      setHoveredRegion(null);
    }
  };

  // Handle district click
  const handleDistrictClick = (districtName: string) => {
    const region = getDistrictRegion(districtName);
    if (region && onRegionClick) {
      onRegionClick(region);
    }
  };

  // Get fill color for a district with proper type safety
  const getDistrictFill = (districtName: string): string => {
    const region = getDistrictRegion(districtName);
    if (!region) return "#e5e7eb"; // Default gray
    
    if (hoveredRegion === region) {
      return regionDarkColors[region as keyof typeof regionDarkColors];
    }
    return regionColors[region as keyof typeof regionColors];
  };

  return (
    <Card className="w-full h-full">
      <CardContent className="p-6">
        <div className="w-full h-[600px] relative">
          <svg 
            viewBox="0 0 1000 800" 
            className="w-full h-full border border-gray-200 rounded-lg bg-blue-50"
          >
            <style>
              {`
                .district-path {
                  transition: all 0.3s ease;
                  cursor: pointer;
                  stroke: #ffffff;
                  stroke-width: 2;
                }
                .district-path:hover {
                  stroke: #000000;
                  stroke-width: 3;
                }
              `}
            </style>

            {/* Mumbai City */}
            <path
              className="district-path"
              data-district="Mumbai City"
              data-region="Konkan"
              d="M200,400 L220,400 L220,420 L200,420 Z"
              fill={getDistrictFill("Mumbai City")}
              onMouseEnter={() => handleDistrictHover("Mumbai City")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Mumbai City")}
            />
            {showLabels && (
              <text x="210" y="415" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Mumbai City
              </text>
            )}

            {/* Mumbai Suburban */}
            <path
              className="district-path"
              data-district="Mumbai Suburban"
              data-region="Konkan"
              d="M170,380 L200,380 L200,420 L170,420 Z"
              fill={getDistrictFill("Mumbai Suburban")}
              onMouseEnter={() => handleDistrictHover("Mumbai Suburban")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Mumbai Suburban")}
            />
            {showLabels && (
              <text x="185" y="405" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Mumbai Sub
              </text>
            )}

            {/* Thane */}
            <path
              className="district-path"
              data-district="Thane"
              data-region="Konkan"
              d="M220,380 L270,380 L270,420 L220,420 Z"
              fill={getDistrictFill("Thane")}
              onMouseEnter={() => handleDistrictHover("Thane")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Thane")}
            />
            {showLabels && (
              <text x="245" y="405" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Thane
              </text>
            )}

            {/* Palghar */}
            <path
              className="district-path"
              data-district="Palghar"
              data-region="Konkan"
              d="M170,330 L270,330 L270,380 L170,380 Z"
              fill={getDistrictFill("Palghar")}
              onMouseEnter={() => handleDistrictHover("Palghar")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Palghar")}
            />
            {showLabels && (
              <text x="220" y="360" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Palghar
              </text>
            )}

            {/* Raigad */}
            <path
              className="district-path"
              data-district="Raigad"
              data-region="Konkan"
              d="M270,380 L320,380 L320,450 L270,450 Z"
              fill={getDistrictFill("Raigad")}
              onMouseEnter={() => handleDistrictHover("Raigad")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Raigad")}
            />
            {showLabels && (
              <text x="295" y="420" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Raigad
              </text>
            )}

            {/* Ratnagiri */}
            <path
              className="district-path"
              data-district="Ratnagiri"
              data-region="Konkan"
              d="M220,420 L270,420 L270,480 L220,480 Z"
              fill={getDistrictFill("Ratnagiri")}
              onMouseEnter={() => handleDistrictHover("Ratnagiri")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Ratnagiri")}
            />
            {showLabels && (
              <text x="245" y="455" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Ratnagiri
              </text>
            )}

            {/* Sindhudurg */}
            <path
              className="district-path"
              data-district="Sindhudurg"
              data-region="Konkan"
              d="M220,480 L270,480 L270,530 L220,530 Z"
              fill={getDistrictFill("Sindhudurg")}
              onMouseEnter={() => handleDistrictHover("Sindhudurg")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Sindhudurg")}
            />
            {showLabels && (
              <text x="245" y="510" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Sindhudurg
              </text>
            )}

            {/* Pune Region */}
            {/* Pune */}
            <path
              className="district-path"
              data-district="Pune"
              data-region="Pune"
              d="M320,380 L400,380 L400,430 L320,430 Z"
              fill={getDistrictFill("Pune")}
              onMouseEnter={() => handleDistrictHover("Pune")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Pune")}
            />
            {showLabels && (
              <text x="360" y="410" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Pune
              </text>
            )}

            {/* Satara */}
            <path
              className="district-path"
              data-district="Satara"
              data-region="Pune"
              d="M270,450 L350,450 L350,500 L270,500 Z"
              fill={getDistrictFill("Satara")}
              onMouseEnter={() => handleDistrictHover("Satara")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Satara")}
            />
            {showLabels && (
              <text x="310" y="480" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Satara
              </text>
            )}

            {/* Sangli */}
            <path
              className="district-path"
              data-district="Sangli"
              data-region="Pune"
              d="M350,450 L420,450 L420,500 L350,500 Z"
              fill={getDistrictFill("Sangli")}
              onMouseEnter={() => handleDistrictHover("Sangli")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Sangli")}
            />
            {showLabels && (
              <text x="385" y="480" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Sangli
              </text>
            )}

            {/* Kolhapur */}
            <path
              className="district-path"
              data-district="Kolhapur"
              data-region="Pune"
              d="M270,500 L350,500 L350,550 L270,550 Z"
              fill={getDistrictFill("Kolhapur")}
              onMouseEnter={() => handleDistrictHover("Kolhapur")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Kolhapur")}
            />
            {showLabels && (
              <text x="310" y="530" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Kolhapur
              </text>
            )}

            {/* Solapur */}
            <path
              className="district-path"
              data-district="Solapur"
              data-region="Pune"
              d="M400,380 L480,380 L480,450 L400,450 Z"
              fill={getDistrictFill("Solapur")}
              onMouseEnter={() => handleDistrictHover("Solapur")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Solapur")}
            />
            {showLabels && (
              <text x="440" y="420" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Solapur
              </text>
            )}

            {/* Nashik Region */}
            {/* Nashik */}
            <path
              className="district-path"
              data-district="Nashik"
              data-region="Nashik"
              d="M320,280 L400,280 L400,330 L320,330 Z"
              fill={getDistrictFill("Nashik")}
              onMouseEnter={() => handleDistrictHover("Nashik")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Nashik")}
            />
            {showLabels && (
              <text x="360" y="310" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Nashik
              </text>
            )}

            {/* Nandurbar */}
            <path
              className="district-path"
              data-district="Nandurbar"
              data-region="Nashik"
              d="M270,230 L350,230 L350,280 L270,280 Z"
              fill={getDistrictFill("Nandurbar")}
              onMouseEnter={() => handleDistrictHover("Nandurbar")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Nandurbar")}
            />
            {showLabels && (
              <text x="310" y="260" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Nandurbar
              </text>
            )}

            {/* Dhule */}
            <path
              className="district-path"
              data-district="Dhule"
              data-region="Nashik"
              d="M350,230 L430,230 L430,280 L350,280 Z"
              fill={getDistrictFill("Dhule")}
              onMouseEnter={() => handleDistrictHover("Dhule")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Dhule")}
            />
            {showLabels && (
              <text x="390" y="260" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Dhule
              </text>
            )}

            {/* Jalgaon */}
            <path
              className="district-path"
              data-district="Jalgaon"
              data-region="Nashik"
              d="M430,230 L510,230 L510,280 L430,280 Z"
              fill={getDistrictFill("Jalgaon")}
              onMouseEnter={() => handleDistrictHover("Jalgaon")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Jalgaon")}
            />
            {showLabels && (
              <text x="470" y="260" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Jalgaon
              </text>
            )}

            {/* Ahmednagar */}
            <path
              className="district-path"
              data-district="Ahmednagar"
              data-region="Nashik"
              d="M400,280 L480,280 L480,330 L400,330 Z"
              fill={getDistrictFill("Ahmednagar")}
              onMouseEnter={() => handleDistrictHover("Ahmednagar")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Ahmednagar")}
            />
            {showLabels && (
              <text x="440" y="310" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Ahmednagar
              </text>
            )}

            {/* Chhatrapati Sambhajinagar Region */}
            {/* Chhatrapati Sambhajinagar */}
            <path
              className="district-path"
              data-district="Chhatrapati Sambhajinagar"
              data-region="Chhatrapati Sambhajinagar"
              d="M510,280 L590,280 L590,330 L510,330 Z"
              fill={getDistrictFill("Chhatrapati Sambhajinagar")}
              onMouseEnter={() => handleDistrictHover("Chhatrapati Sambhajinagar")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Chhatrapati Sambhajinagar")}
            />
            {showLabels && (
              <text x="550" y="310" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                C.S.Nagar
              </text>
            )}

            {/* Jalna */}
            <path
              className="district-path"
              data-district="Jalna"
              data-region="Chhatrapati Sambhajinagar"
              d="M510,230 L570,230 L570,280 L510,280 Z"
              fill={getDistrictFill("Jalna")}
              onMouseEnter={() => handleDistrictHover("Jalna")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Jalna")}
            />
            {showLabels && (
              <text x="540" y="260" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Jalna
              </text>
            )}

            {/* Beed */}
            <path
              className="district-path"
              data-district="Beed"
              data-region="Chhatrapati Sambhajinagar"
              d="M480,330 L560,330 L560,380 L480,380 Z"
              fill={getDistrictFill("Beed")}
              onMouseEnter={() => handleDistrictHover("Beed")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Beed")}
            />
            {showLabels && (
              <text x="520" y="360" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Beed
              </text>
            )}

            {/* Parbhani */}
            <path
              className="district-path"
              data-district="Parbhani"
              data-region="Chhatrapati Sambhajinagar"
              d="M590,280 L650,280 L650,330 L590,330 Z"
              fill={getDistrictFill("Parbhani")}
              onMouseEnter={() => handleDistrictHover("Parbhani")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Parbhani")}
            />
            {showLabels && (
              <text x="620" y="310" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Parbhani
              </text>
            )}

            {/* Hingoli */}
            <path
              className="district-path"
              data-district="Hingoli"
              data-region="Chhatrapati Sambhajinagar"
              d="M570,230 L630,230 L630,280 L570,280 Z"
              fill={getDistrictFill("Hingoli")}
              onMouseEnter={() => handleDistrictHover("Hingoli")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Hingoli")}
            />
            {showLabels && (
              <text x="600" y="260" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Hingoli
              </text>
            )}

            {/* Latur */}
            <path
              className="district-path"
              data-district="Latur"
              data-region="Chhatrapati Sambhajinagar"
              d="M560,330 L620,330 L620,380 L560,380 Z"
              fill={getDistrictFill("Latur")}
              onMouseEnter={() => handleDistrictHover("Latur")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Latur")}
            />
            {showLabels && (
              <text x="590" y="360" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Latur
              </text>
            )}

            {/* Osmanabad */}
            <path
              className="district-path"
              data-district="Osmanabad"
              data-region="Chhatrapati Sambhajinagar"
              d="M480,380 L560,380 L560,430 L480,430 Z"
              fill={getDistrictFill("Osmanabad")}
              onMouseEnter={() => handleDistrictHover("Osmanabad")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Osmanabad")}
            />
            {showLabels && (
              <text x="520" y="410" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Osmanabad
              </text>
            )}

            {/* Nanded */}
            <path
              className="district-path"
              data-district="Nanded"
              data-region="Chhatrapati Sambhajinagar"
              d="M620,330 L700,330 L700,400 L620,400 Z"
              fill={getDistrictFill("Nanded")}
              onMouseEnter={() => handleDistrictHover("Nanded")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Nanded")}
            />
            {showLabels && (
              <text x="660" y="370" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Nanded
              </text>
            )}

            {/* Amravati Region */}
            {/* Akola */}
            <path
              className="district-path"
              data-district="Akola"
              data-region="Amravati"
              d="M630,230 L710,230 L710,280 L630,280 Z"
              fill={getDistrictFill("Akola")}
              onMouseEnter={() => handleDistrictHover("Akola")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Akola")}
            />
            {showLabels && (
              <text x="670" y="260" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Akola
              </text>
            )}

            {/* Amravati */}
            <path
              className="district-path"
              data-district="Amravati"
              data-region="Amravati"
              d="M710,230 L790,230 L790,280 L710,280 Z"
              fill={getDistrictFill("Amravati")}
              onMouseEnter={() => handleDistrictHover("Amravati")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Amravati")}
            />
            {showLabels && (
              <text x="750" y="260" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Amravati
              </text>
            )}

            {/* Buldhana */}
            <path
              className="district-path"
              data-district="Buldhana"
              data-region="Amravati"
              d="M650,280 L730,280 L730,330 L650,330 Z"
              fill={getDistrictFill("Buldhana")}
              onMouseEnter={() => handleDistrictHover("Buldhana")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Buldhana")}
            />
            {showLabels && (
              <text x="690" y="310" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Buldhana
              </text>
            )}

            {/* Washim */}
            <path
              className="district-path"
              data-district="Washim"
              data-region="Amravati"
              d="M700,330 L770,330 L770,380 L700,380 Z"
              fill={getDistrictFill("Washim")}
              onMouseEnter={() => handleDistrictHover("Washim")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Washim")}
            />
            {showLabels && (
              <text x="735" y="360" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Washim
              </text>
            )}

            {/* Yavatmal */}
            <path
              className="district-path"
              data-district="Yavatmal"
              data-region="Amravati"
              d="M770,280 L850,280 L850,350 L770,350 Z"
              fill={getDistrictFill("Yavatmal")}
              onMouseEnter={() => handleDistrictHover("Yavatmal")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Yavatmal")}
            />
            {showLabels && (
              <text x="810" y="320" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Yavatmal
              </text>
            )}

            {/* Nagpur Region */}
            {/* Nagpur */}
            <path
              className="district-path"
              data-district="Nagpur"
              data-region="Nagpur"
              d="M730,330 L810,330 L810,400 L730,400 Z"
              fill={getDistrictFill("Nagpur")}
              onMouseEnter={() => handleDistrictHover("Nagpur")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Nagpur")}
            />
            {showLabels && (
              <text x="770" y="370" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Nagpur
              </text>
            )}

            {/* Wardha */}
            <path
              className="district-path"
              data-district="Wardha"
              data-region="Nagpur"
              d="M790,230 L850,230 L850,280 L790,280 Z"
              fill={getDistrictFill("Wardha")}
              onMouseEnter={() => handleDistrictHover("Wardha")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Wardha")}
            />
            {showLabels && (
              <text x="820" y="260" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Wardha
              </text>
            )}

            {/* Chandrapur */}
            <path
              className="district-path"
              data-district="Chandrapur"
              data-region="Nagpur"
              d="M810,350 L890,350 L890,420 L810,420 Z"
              fill={getDistrictFill("Chandrapur")}
              onMouseEnter={() => handleDistrictHover("Chandrapur")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Chandrapur")}
            />
            {showLabels && (
              <text x="850" y="390" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Chandrapur
              </text>
            )}

            {/* Gadchiroli */}
            <path
              className="district-path"
              data-district="Gadchiroli"
              data-region="Nagpur"
              d="M810,420 L890,420 L890,490 L810,490 Z"
              fill={getDistrictFill("Gadchiroli")}
              onMouseEnter={() => handleDistrictHover("Gadchiroli")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Gadchiroli")}
            />
            {showLabels && (
              <text x="850" y="460" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Gadchiroli
              </text>
            )}

            {/* Gondia */}
            <path
              className="district-path"
              data-district="Gondia"
              data-region="Nagpur"
              d="M850,230 L930,230 L930,300 L850,300 Z"
              fill={getDistrictFill("Gondia")}
              onMouseEnter={() => handleDistrictHover("Gondia")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Gondia")}
            />
            {showLabels && (
              <text x="890" y="270" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Gondia
              </text>
            )}

            {/* Bhandara */}
            <path
              className="district-path"
              data-district="Bhandara"
              data-region="Nagpur"
              d="M850,300 L930,300 L930,370 L850,370 Z"
              fill={getDistrictFill("Bhandara")}
              onMouseEnter={() => handleDistrictHover("Bhandara")}
              onMouseLeave={() => handleDistrictHover(null)}
              onClick={() => handleDistrictClick("Bhandara")}
            />
            {showLabels && (
              <text x="890" y="340" textAnchor="middle" className="text-xs font-medium pointer-events-none">
                Bhandara
              </text>
            )}

            {/* Title */}
            <text x="500" y="40" textAnchor="middle" className="text-xl font-bold">
              Maharashtra Districts
            </text>

            {/* Current selection indicator */}
            {hoveredRegion && (
              <text x="500" y="70" textAnchor="middle" className="text-lg font-medium">
                Hovering: {hoveredRegion} Region
              </text>
            )}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};