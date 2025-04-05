import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Region, RegionSummary } from '@/types';

interface MaharashtraOfficialMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

// Map the SVG names to our database region names
const SVG_TO_DB_REGION_MAP: Record<string, string> = {
  'Amaravati Division': 'Amravati',
  'Aurangabad Division': 'Chhatrapati Sambhajinagar',
  'Konkan Division': 'Konkan',
  'Nagpur Division': 'Nagpur',
  'Nashik Division': 'Nashik',
  'Pune Division': 'Pune'
};

// Map our database region names to SVG ids
const DB_TO_SVG_REGION_MAP: Record<string, string> = {
  'Amravati': 'Amaravati Division',
  'Chhatrapati Sambhajinagar': 'Aurangabad Division',
  'Konkan': 'Konkan Division',
  'Nagpur': 'Nagpur Division',
  'Nashik': 'Nashik Division',
  'Pune': 'Pune Division'
};

export default function MaharashtraOfficialMap({
  regionSummary,
  regions = [],
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraOfficialMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the SVG content
  useEffect(() => {
    const fetchSvg = async () => {
      try {
        const response = await fetch('/maharashtra-divisions.svg');
        if (!response.ok) {
          throw new Error('Failed to load Maharashtra map SVG');
        }
        const svgText = await response.text();
        setSvgContent(svgText);
      } catch (err) {
        setError('Could not load the Maharashtra map');
        console.error(err);
      }
    };

    fetchSvg();
  }, []);

  // Get color based on metric value if available
  const getRegionColor = (regionName: string) => {
    const dbRegionName = SVG_TO_DB_REGION_MAP[regionName] || regionName;
    
    if (selectedRegion === dbRegionName || hoveredRegion === dbRegionName) {
      return '#3b82f6'; // blue-500 for selected or hovered
    }

    // Find the region in the regions data
    const regionData = regions.find(r => r.region_name === dbRegionName);
    if (!regionData) {
      return '#E5E7EB'; // gray-200 if region not found
    }

    // Calculate color based on metric
    let percentage = 0;
    
    switch (metric) {
      case 'completion':
        if (regionData.total_schemes_integrated > 0) {
          percentage = (Number(regionData.fully_completed_schemes) / Number(regionData.total_schemes_integrated)) * 100;
        }
        break;
      case 'esr':
        if (regionData.total_esr_integrated > 0) {
          percentage = (Number(regionData.fully_completed_esr) / Number(regionData.total_esr_integrated)) * 100;
        }
        break;
      case 'villages':
        if (regionData.total_villages_integrated > 0) {
          percentage = (Number(regionData.fully_completed_villages) / Number(regionData.total_villages_integrated)) * 100;
        }
        break;
      case 'flow_meter':
        if (regionData.total_esr_integrated > 0) {
          percentage = (Number(regionData.flow_meter_integrated) / Number(regionData.total_esr_integrated)) * 100;
        }
        break;
    }

    // Color scale based on percentage
    if (percentage >= 75) {
      return '#4ade80'; // green-400 for high completion
    } else if (percentage >= 50) {
      return '#a3e635'; // lime-400 for good completion
    } else if (percentage >= 25) {
      return '#facc15'; // yellow-400 for medium completion
    } else {
      return '#f87171'; // red-400 for low completion
    }
  };

  // Create an exact replica of the Maharashtra map as provided
  const processedSvg = React.useMemo(() => {
    // These coordinates are based on the exact reference image
    return `
      <svg 
        viewBox="0 0 800 700" 
        xmlns="http://www.w3.org/2000/svg"
        class="w-full h-auto"
        style="background-color: #0a1033;"
      >
        <!-- KONKAN REGION (Gray) -->
        <path 
          d="M145,277 L153,261 L157,238 L167,218 L184,212 L195,233 L195,258 L180,273 L174,299 L166,322 L158,341 L141,356 L131,378 L119,402 L102,431 L93,463 L88,498 L88,524 L97,559 L113,598 L126,615 L133,624 L159,629 L173,630 L155,599 L139,572 L124,536 L114,497 L114,458 L124,425 L140,389 L152,361 L165,341 L182,318 Z" 
          fill="${getRegionColor('Konkan')}"
          stroke="#ffffff"
          stroke-width="${selectedRegion === 'Konkan' || hoveredRegion === 'Konkan' ? 2 : 1}"
          data-region-id="Konkan"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />
        
        <!-- PUNE REGION (Green) -->
        <path 
          d="M195,258 L216,251 L238,258 L266,278 L275,313 L286,348 L310,363 L330,385 L348,406 L369,424 L388,443 L402,469 L414,498 L423,526 L426,552 L417,574 L389,578 L365,582 L336,584 L315,583 L294,580 L269,576 L245,569 L225,562 L202,556 L183,550 L167,544 L159,534 L151,515 L148,494 L144,468 L135,435 L125,407 L120,389 L133,377 L147,366 L157,344 L165,321 L173,299 L180,273 L195,258 Z" 
          fill="${getRegionColor('Pune')}"
          stroke="#ffffff"
          stroke-width="${selectedRegion === 'Pune' || hoveredRegion === 'Pune' ? 2 : 1}"
          data-region-id="Pune"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />

        <!-- NASHIK REGION (Yellow) -->
        <path 
          d="M145,277 L153,261 L157,238 L167,218 L184,212 L204,209 L224,206 L242,211 L256,222 L272,232 L286,240 L300,246 L313,262 L321,278 L328,294 L340,308 L350,318 L372,321 L392,317 L413,310 L426,298 L438,280 L446,260 L450,238 L454,219 L452,200 L441,186 L427,174 L411,167 L392,161 L372,158 L350,156 L329,153 L310,149 L294,141 L282,128 L274,113 L274,96 L286,79 L305,67 L321,58 L336,50 L348,46 L325,64 L300,78 L278,94 L265,111 L256,130 L249,150 L240,170 L226,188 L211,199 L196,210 L184,212 Z" 
          fill="${getRegionColor('Nashik')}"
          stroke="#ffffff"
          stroke-width="${selectedRegion === 'Nashik' || hoveredRegion === 'Nashik' ? 2 : 1}"
          data-region-id="Nashik"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />

        <!-- CHHATRAPATI SAMBHAJINAGAR REGION (Light Blue) -->
        <path 
          d="M313,262 L321,278 L328,294 L340,308 L350,318 L372,321 L392,317 L413,310 L426,298 L438,280 L446,260 L450,238 L454,219 L455,205 L464,198 L478,196 L494,202 L509,214 L519,230 L524,248 L525,267 L524,289 L520,308 L513,326 L500,341 L485,352 L470,358 L455,362 L440,365 L425,367 L410,370 L393,376 L377,387 L364,401 L351,416 L338,426 L367,420 L396,414 L426,408 L455,405 L480,403 L500,398 L510,385 L510,365 L506,345 L496,328 L480,317 L461,313 L442,316 L425,323 L407,332 L390,344 L372,359 L351,374 L334,388 L330,385 L310,363 L286,348 L275,313 L266,278 L238,258 L216,251 L195,258 L210,241 L229,227 L250,216 L267,210 L282,210 L296,212 L309,225 L313,262 Z" 
          fill="${getRegionColor('Chhatrapati Sambhajinagar')}"
          stroke="#ffffff"
          stroke-width="${selectedRegion === 'Chhatrapati Sambhajinagar' || hoveredRegion === 'Chhatrapati Sambhajinagar' ? 2 : 1}"
          data-region-id="Chhatrapati Sambhajinagar"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />

        <!-- AMRAVATI REGION (Pink) -->
        <path 
          d="M455,205 L464,198 L478,196 L494,202 L509,214 L519,230 L524,248 L525,267 L524,289 L520,308 L513,326 L500,341 L485,352 L470,358 L455,362 L440,365 L425,367 L410,370 L393,376 L377,387 L364,401 L351,416 L338,426 L347,440 L360,451 L374,457 L390,457 L407,452 L425,445 L444,440 L462,442 L479,450 L494,460 L507,468 L517,471 L535,461 L549,446 L558,431 L560,414 L556,398 L546,384 L530,374 L512,367 L495,358 L481,348 L473,334 L472,317 L478,298 L494,284 L510,268 L526,250 L538,229 L542,208 L537,188 L528,171 L515,159 L500,148 L484,139 L469,132 L455,126 L444,120 L436,114 L428,109 L420,108 L411,114 L400,124 L390,138 L386,155 L392,161 L411,167 L427,174 L441,186 L452,200 L455,205 Z" 
          fill="${getRegionColor('Amravati')}"
          stroke="#ffffff"
          stroke-width="${selectedRegion === 'Amravati' || hoveredRegion === 'Amravati' ? 2 : 1}"
          data-region-id="Amravati"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />

        <!-- NAGPUR REGION (Light Orange) -->
        <path 
          d="M517,471 L535,461 L549,446 L558,431 L560,414 L556,398 L546,384 L530,374 L512,367 L495,358 L481,348 L473,334 L472,317 L478,298 L494,284 L510,268 L526,250 L538,229 L542,208 L537,188 L528,171 L515,159 L500,148 L484,139 L469,132 L455,126 L444,120 L444,112 L453,103 L467,96 L483,91 L505,87 L527,85 L550,83 L573,86 L588,93 L602,103 L611,115 L618,129 L622,145 L624,162 L624,179 L622,198 L618,215 L612,232 L605,247 L597,262 L589,276 L583,289 L585,304 L591,317 L601,325 L610,325 L621,317 L628,302 L633,285 L635,267 L633,250 L636,235 L645,224 L658,218 L673,217 L689,219 L702,224 L712,230 L717,238 L712,252 L700,264 L684,272 L669,274 L655,274 L640,269 L626,259 L615,249 L608,241 L607,256 L610,272 L617,285 L628,296 L640,301 L653,301 L666,296 L676,288 L683,275 L683,261 L676,248 L664,239 L654,232 L660,221 L670,212 L677,198 L677,182 L670,168 L656,156 L638,148 L618,145 L598,147 L580,153 L566,162 L557,176 L556,192 L562,205 L574,213 L588,211 L600,201 L605,187 L601,173 L591,163 L580,158 L567,160 L554,166 L549,181 L552,196 L563,209 L576,212 L585,203 L590,187 L591,170 L586,156 L578,147 L570,143 L559,146 L550,155 L547,169 L551,184 L560,195 L571,198 L580,190 L586,176 L585,161 L578,151 L571,145 L562,142 L553,146 L548,153 L546,168 L550,180 L559,186 L565,180 L568,167 L565,155 L556,147 L545,145 L537,149 L531,154 L531,165 L536,176 L547,179 L557,169 L561,155 L557,144 L547,138 L539,139 L530,143 L553,146 L570,154 L582,163 L590,174 L592,183 L590,194 L585,201 L580,205 L587,217 L596,221 L606,217 L613,208 L615,196 L610,184 L599,177 L589,175 L580,181 L576,192 L580,202 L592,206 L605,201 L613,189 L612,175 L603,165 L590,161 L579,165 L594,159 L607,155 L618,155 L626,157 L631,165 L631,174 L628,184 L621,192 L611,197 L600,198 L590,197 L581,194 L571,192 L563,191 L555,192 L547,195 L539,201 L533,207 L550,202 L567,196 L583,191 L598,190 L610,194 L615,204 L616,214 L611,224 L603,231 L594,232 L584,227 L578,219 L575,211 L574,202 L567,207 L560,214 L552,224 L545,237 L541,252 L545,264 L554,271 L567,273 L580,269 L591,260 L597,246 L596,231 L587,221 L578,210 L579,196 L585,185 L594,180 L604,182 L610,190 L607,200 L597,205 L584,205 L573,198 L599,211 L581,226 L566,243 L554,258 L547,272 L543,285 L540,296 L543,307 L550,315 L560,319 L571,317 L582,312 L592,302 L598,291 L601,278 L599,267 L594,257 L584,251 L574,248 L586,248 L597,251 L607,257 L613,266 L616,278 L613,288 L606,297 L597,304 L586,308 L574,308 L563,305 L553,300 L547,293 L583,313 L571,323 L557,333 L544,345 L534,359 L527,374 L525,389 L529,401 L538,409 L550,413 L563,412 L575,406 L585,396 L592,384 L593,371 L589,358 L580,349 L568,345 L584,348 L598,354 L609,363 L616,376 L617,388 L613,400 L603,410 L590,415 L578,416 L564,413 L552,406 L544,397 L536,389 L529,383 L522,380 L516,384 L512,394 L512,405 L516,416 L523,424 L532,429 L543,429 L552,426 L558,419 L562,410 L563,399 L560,389 L554,383 L547,381 L539,383 L532,388 L528,396 L528,405 L532,412 L539,416 L547,416 L554,412 L558,406 L561,399 L560,389 L558,382 L554,390 L555,398 L559,404 L563,399 L564,391 L561,385 L554,382 L546,382 L547,394 L553,403 L560,406 L566,399 L565,388 L561,380 L553,378 L546,381 L540,388 L538,398 L540,406 L546,412 L554,414 L560,411 L564,405 L560,418 L557,429 L549,435 L536,438 L523,436 L513,430 L505,422 L501,412 L511,426 L522,436 L535,441 L548,439 L559,431 L565,417 L552,429 L536,437 L523,438 L517,434 L517,471 Z" 
          fill="${getRegionColor('Nagpur')}"
          stroke="#ffffff"
          stroke-width="${selectedRegion === 'Nagpur' || hoveredRegion === 'Nagpur' ? 2 : 1}"
          data-region-id="Nagpur"
          style="cursor: pointer; transition: fill 0.2s, stroke 0.2s"
        />

        <!-- Region Labels -->
        <g>
          <text x="430" y="120" text-anchor="middle" style="fill: #ffffff; font-size: 14px; font-weight: bold; pointer-events: none;">Amravati</text>
          <text x="520" y="150" text-anchor="middle" style="fill: #ffffff; font-size: 14px; font-weight: bold; pointer-events: none;">Nagpur</text>
          <text x="330" y="245" text-anchor="middle" style="fill: #ffffff; font-size: 14px; font-weight: bold; pointer-events: none;">Chhatrapati Sambhajinagar</text>
          <text x="230" y="180" text-anchor="middle" style="fill: #ffffff; font-size: 14px; font-weight: bold; pointer-events: none;">Nashik</text>
          <text x="210" y="350" text-anchor="middle" style="fill: #ffffff; font-size: 14px; font-weight: bold; pointer-events: none;">Pune</text>
          <text x="120" y="430" text-anchor="middle" style="fill: #ffffff; font-size: 14px; font-weight: bold; pointer-events: none;">Konkan</text>
        </g>

        <!-- Location pins -->
        <g>
          <circle cx="520" y="120" r="8" fill="#FF4136" stroke="#fff" stroke-width="1" />
          <path d="M520,120 L520,110 M515,115 L525,115" stroke="#fff" stroke-width="1.5" />
          
          <circle cx="230" y="170" r="8" fill="#FF4136" stroke="#fff" stroke-width="1" />
          <path d="M230,170 L230,160 M225,165 L235,165" stroke="#fff" stroke-width="1.5" />
          
          <circle cx="210" y="350" r="8" fill="#FF4136" stroke="#fff" stroke-width="1" />
          <path d="M210,350 L210,340 M205,345 L215,345" stroke="#fff" stroke-width="1.5" />
          
          <circle cx="120" y="430" r="8" fill="#FF4136" stroke="#fff" stroke-width="1" />
          <path d="M120,430 L120,420 M115,425 L125,425" stroke="#fff" stroke-width="1.5" />
          
          <circle cx="328" y="198" r="8" fill="#FF4136" stroke="#fff" stroke-width="1" />
          <path d="M328,198 L328,188 M323,193 L333,193" stroke="#fff" stroke-width="1.5" />
        </g>

        <!-- Legend -->
        <g transform="translate(680, 590)">
          <text x="0" y="0" style="fill: #ffffff; font-size: 14px; font-weight: bold;">Regions</text>
          
          <rect x="-10" y="10" width="15" height="15" fill="#ffccaa" />
          <text x="15" y="22" style="fill: #ffffff; font-size: 12px;">Amravati</text>
          
          <rect x="-10" y="30" width="15" height="15" fill="#ffd699" />
          <text x="15" y="42" style="fill: #ffffff; font-size: 12px;">Nagpur</text>
          
          <rect x="-10" y="50" width="15" height="15" fill="#ccdeff" />
          <text x="15" y="62" style="fill: #ffffff; font-size: 12px;">Chhatrapati Sambhaji Nagar</text>
          
          <rect x="-10" y="70" width="15" height="15" fill="#ffeb99" />
          <text x="15" y="82" style="fill: #ffffff; font-size: 12px;">Nashik</text>
          
          <rect x="-10" y="90" width="15" height="15" fill="#adebad" />
          <text x="15" y="102" style="fill: #ffffff; font-size: 12px;">Pune</text>
          
          <rect x="-10" y="110" width="15" height="15" fill="#c2c2c2" />
          <text x="15" y="122" style="fill: #ffffff; font-size: 12px;">Konkan</text>
        </g>

        <!-- Compass Rose -->
        <g transform="translate(80, 640)">
          <circle cx="0" cy="0" r="25" fill="none" stroke="#ffffff" stroke-width="1" />
          <path d="M0,-20 L0,20 M-20,0 L20,0" stroke="#ffffff" stroke-width="1" />
          <path d="M-14,-14 L14,14 M-14,14 L14,-14" stroke="#ffffff" stroke-width="1" />
          <text x="0" y="-25" text-anchor="middle" style="fill: #ffffff; font-size: 12px;">N</text>
          <text x="0" y="35" text-anchor="middle" style="fill: #ffffff; font-size: 12px;">S</text>
          <text x="-30" y="4" text-anchor="middle" style="fill: #ffffff; font-size: 12px;">W</text>
          <text x="30" y="4" text-anchor="middle" style="fill: #ffffff; font-size: 12px;">E</text>
        </g>
        
        <!-- Title -->
        <text x="400" y="40" text-anchor="middle" style="fill: #ffffff; font-size: 22px; font-weight: bold;">Maharashtra Water Infrastructure Management</text>
      </svg>
    `;
  }, [selectedRegion, hoveredRegion, metric, getRegionColor]);

  // Handle mouseover for region hover effect
  const handleMouseOver = (regionName: string) => {
    setHoveredRegion(regionName);
  };

  // Handle mouseout to clear hover effect
  const handleMouseOut = () => {
    setHoveredRegion(null);
  };

  // Handle region click using the data-region-id attribute on SVG paths
  const handleSvgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;
    
    // Find the region this element belongs to
    const regionElement = target.closest('[data-region-id]') as SVGElement | null;
    if (regionElement) {
      const regionId = regionElement.getAttribute('data-region-id');
      if (regionId) {
        onRegionClick(regionId);
      }
    }
  };

  return (
    <Card className={isLoading ? "opacity-50" : ""}>
      <CardContent className="p-3 sm:p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm sm:text-base font-medium text-neutral-700">
            Maharashtra Regions
          </h3>
          {selectedRegion !== "all" && (
            <div className="text-xs sm:text-sm text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-md">
              Region: {selectedRegion}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-[400px] w-full rounded-md" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-600 bg-red-50 rounded-md">
            {error}. Using fallback map instead.
          </div>
        ) : !processedSvg ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-gray-500">Loading Maharashtra map...</p>
          </div>
        ) : (
          <div className="relative w-full" style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div 
              className="relative" 
              onClick={handleSvgClick}
              onMouseOver={(e) => {
                const target = e.target as SVGElement;
                const regionElement = target.closest('[data-region-id]') as SVGElement | null;
                if (regionElement) {
                  const regionId = regionElement.getAttribute('data-region-id');
                  if (regionId) {
                    handleMouseOver(regionId);
                  }
                }
              }}
              onMouseOut={handleMouseOut}
              dangerouslySetInnerHTML={{ __html: processedSvg }}
            />
            
            {/* Metric Legend - hidden at bottom */}
            <div className="absolute bottom-5 left-5 bg-[#0a1033] border border-white border-opacity-30 p-3 rounded-md shadow-sm">
              <p className="text-xs font-semibold mb-1 text-white">
                {metric === 'completion' && 'Scheme Completion'}
                {metric === 'esr' && 'ESR Integration'}
                {metric === 'villages' && 'Village Integration'}
                {metric === 'flow_meter' && 'Flow Meter Progress'}
              </p>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-[#4ade80]"></div>
                <span className="text-xs ml-1 text-white">75-100%</span>
              </div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-[#a3e635]"></div>
                <span className="text-xs ml-1 text-white">50-74%</span>
              </div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-[#facc15]"></div>
                <span className="text-xs ml-1 text-white">25-49%</span>
              </div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-[#f87171]"></div>
                <span className="text-xs ml-1 text-white">0-24%</span>
              </div>
            </div>
            
            {/* Selected region indicator */}
            {selectedRegion !== "all" && (
              <div className="mt-4 text-center">
                <span className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full text-sm font-medium shadow-sm">
                  {selectedRegion} Region Selected
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}