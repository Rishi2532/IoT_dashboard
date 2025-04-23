// Import this instead of using full React object
import React, { useState, useEffect, createContext, useContext } from "react";
// Import the chatbot component
import { createChatBotMessage } from "react-chatbot-kit";
import "react-chatbot-kit/build/main.css";
// Import UI components
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  X,
  Maximize2,
  Minimize2,
  Filter,
  MapPin,
} from "lucide-react";
// Import Voice Recognition component
import VoiceRecognition from "./VoiceRecognition";
import TextToSpeech from "./TextToSpeech";
import ChatbotGuide from "./ChatbotGuide";
// Import OpenAI integration
import { getOpenAICompletion, detectLanguage, translateText, LANGUAGE_NAMES } from "@/services/openai-service";
// Import Excel helper function
import { triggerExcelExport } from "@/utils/excel-helper";

// Create a context to manage dashboard filter state
interface DashboardFilterContext {
  setSelectedRegion: (region: string) => void;
  setStatusFilter: (status: string) => void;
  applyFilters: (filters: { 
    region?: string; 
    status?: string;
    minLpcd?: number;
    maxLpcd?: number;
    zeroSupplyForWeek?: boolean;
  }) => void;
}

const FilterContext = createContext<DashboardFilterContext | null>(null);

// Provider component to be used in dashboard.tsx
export const FilterContextProvider: React.FC<{
  children: React.ReactNode;
  setSelectedRegion: (region: string) => void;
  setStatusFilter: (status: string) => void;
  setLpcdFilters?: (filters: { minLpcd?: number; maxLpcd?: number; zeroSupplyForWeek?: boolean }) => void;
}> = ({ children, setSelectedRegion, setStatusFilter, setLpcdFilters }) => {
  const applyFilters = (filters: { 
    region?: string; 
    status?: string;
    minLpcd?: number;
    maxLpcd?: number;
    zeroSupplyForWeek?: boolean;
  }) => {
    if (filters.region) {
      setSelectedRegion(filters.region);
    }
    if (filters.status) {
      setStatusFilter(filters.status);
    }
    
    // If we have LPCD filters and the setter function is available
    if (setLpcdFilters && (
      filters.minLpcd !== undefined || 
      filters.maxLpcd !== undefined || 
      filters.zeroSupplyForWeek !== undefined
    )) {
      setLpcdFilters({
        minLpcd: filters.minLpcd,
        maxLpcd: filters.maxLpcd,
        zeroSupplyForWeek: filters.zeroSupplyForWeek
      });
    }
  };

  return (
    <FilterContext.Provider
      value={{ setSelectedRegion, setStatusFilter, applyFilters }}
    >
      {children}
    </FilterContext.Provider>
  );
};

// Define message types for proper type checking
interface ChatMessage {
  type: "user" | "bot";
  text: string;
  fromVoice?: boolean;
  filters?: { 
    region?: string; 
    status?: string;
    minLpcd?: number;
    maxLpcd?: number;
    zeroSupplyForWeek?: boolean;
  };
  autoSpeak?: boolean;
}

// Custom Chatbot Components for simplicity - avoiding JSX in widget functions
const CustomChatbot = () => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      type: "bot",
      text: "Hello! I'm your JJM Assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const filterContext = useContext(FilterContext);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Enhanced region extraction from query with better pattern matching
  const extractRegion = (text: string): string | null => {
    // Normalize text - convert to lowercase and remove punctuation
    const normalizedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
    
    // Expanded region mapping with alternate spellings, typos, and local language variations
    const regionMap: Record<string, string> = {
      // Standard region names
      amravati: "Amravati",
      nagpur: "Nagpur",
      nashik: "Nashik",
      nasik: "Nashik", // Common misspelling
      pune: "Pune",
      poona: "Pune", // Alternate historical name
      konkan: "Konkan",
      mumbai: "Mumbai",
      bombay: "Mumbai", // Alternate historical name
      "chhatrapati sambhajinagar": "Chhatrapati Sambhajinagar",
      sambhajinagar: "Chhatrapati Sambhajinagar",
      aurangabad: "Chhatrapati Sambhajinagar", // Historical name
      
      // Common word boundaries/patterns to improve accuracy
      " amravati ": "Amravati",
      " nagpur ": "Nagpur",
      " nashik ": "Nashik",
      " nasik ": "Nashik",
      " pune ": "Pune",
      " konkan ": "Konkan",
      " mumbai ": "Mumbai",
      
      // Prefix patterns like "in Nagpur" or "for Pune"
      "in nagpur": "Nagpur",
      "in pune": "Pune",
      "in nashik": "Nashik",
      "in amravati": "Amravati",
      "in konkan": "Konkan",
      "in mumbai": "Mumbai",
      "in aurangabad": "Chhatrapati Sambhajinagar",
      "in sambhajinagar": "Chhatrapati Sambhajinagar",
      
      // Hindi/Marathi transliteration variations
      "नागपूर": "Nagpur",
      "पुणे": "Pune",
      "नाशिक": "Nashik",
      "अमरावती": "Amravati",
      "कोंकण": "Konkan",
      "मुंबई": "Mumbai",
      "छत्रपती संभाजीनगर": "Chhatrapati Sambhajinagar",
      "औरंगाबाद": "Chhatrapati Sambhajinagar",
    };

    // Check for pattern like "X region" or "region of X"
    const regionPatterns = [
      /in\s+(\w+)\s+region/i,
      /(\w+)\s+region/i,
      /region\s+of\s+(\w+)/i
    ];
    
    for (const pattern of regionPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const potentialRegion = match[1].toLowerCase();
        // Check if the matched word is a known region
        for (const [key, value] of Object.entries(regionMap)) {
          if (key.includes(potentialRegion)) {
            return value;
          }
        }
      }
    }

    // Standard inclusion check - look for region names in the text
    for (const [key, value] of Object.entries(regionMap)) {
      // Add word boundary check for better precision with short region names
      if (key.length <= 4) {
        // For short names like Pune, check for word boundaries
        const pattern = new RegExp(`\\b${key}\\b`, 'i');
        if (pattern.test(normalizedText)) {
          console.log(`Matched region '${key}' using pattern ${pattern}`);
          return value;
        }
      } else if (normalizedText.includes(key)) {
        console.log(`Matched region '${key}' using simple inclusion`);
        return value;
      }
    }
    
    return null;
  };

  // Process user message
  const handleSendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    // Add user message
    // Track if this message came from voice input
    const fromVoice = text !== input; // If text doesn't match input, it came from voice
    setMessages((prev) => [...prev, { type: "user", text, fromVoice }]);
    setInput("");
    setLoading(true);

    // Using setTimeout to simulate processing time
    setTimeout(async () => {
      try {
        let response = "";
        let filters: { 
          region?: string; 
          status?: string; 
          schemeId?: string;
          minLpcd?: number;
          maxLpcd?: number;
          zeroSupplyForWeek?: boolean;
        } = {};

        const lowerText = text.toLowerCase();
        console.log(`Processing query: "${lowerText}"`);
        
        // Extract region from query with enhanced detection
        const region = extractRegion(text);
        if (region) {
          console.log(`Detected region: ${region}`);
        }
        
        // Extract scheme ID or name if present - try different pattern matches
        let schemeId = null;
        
        // Try pattern "in scheme X" or "scheme X"
        const schemeMatch1 = text.match(/(?:in\s+)?scheme\s+([A-Za-z0-9\s-]+)/i);
        if (schemeMatch1) {
          schemeId = schemeMatch1[1].trim();
        }
        
        // Try pattern "in X scheme" or "X scheme"
        if (!schemeId) {
          const schemeMatch2 = text.match(/(?:in\s+)?([A-Za-z0-9\s-]+)\s+scheme/i);
          if (schemeMatch2) {
            schemeId = schemeMatch2[1].trim();
          }
        }
        
        // Try direct numeric scheme ID
        if (!schemeId) {
          const schemeMatch3 = text.match(/\b(\d{5,})\b/);
          if (schemeMatch3) {
            schemeId = schemeMatch3[1].trim();
          }
        }
        
        // Try villages like "Bidgaon" or "Tarodi" mentioned in query
        if (!schemeId && !region) {
          const villageSchemeMatch = text.match(/\b(bidgaon|tarodi|in\s+\w+\s+village)\b/i);
          if (villageSchemeMatch) {
            // This would need to be replaced with actual village-to-scheme mapping
            console.log(`Village keyword detected: ${villageSchemeMatch[0]}`);
            // For demo purposes, we'll use a placeholder schemeId for Bidgaon 
            if (lowerText.includes('bidgaon')) {
              schemeId = '7890975'; // Example scheme ID for Bidgaon (should come from database)
            } else if (lowerText.includes('tarodi')) {
              schemeId = '9087653'; // Example scheme ID for Tarodi (should come from database)
            }
          }
        }
        
        if (schemeId) {
          console.log(`Detected scheme ID/name: ${schemeId}`);
        }
        
        // Flag for specific query types - enhanced to detect implicit questions
        const isHowManyQuery = lowerText.includes("how many") || 
                              lowerText.includes("number of") || 
                              lowerText.includes("count") ||
                              // Implicit queries that still expect a count
                              (region && (
                                lowerText.includes("flow meter") || 
                                lowerText.includes("chlorine") ||
                                lowerText.includes("esr") ||
                                lowerText.includes("village") ||
                                lowerText.includes("lpcd")
                              ));
        
        // Check for infrastructure components with expanded keywords
        const hasFlowMeters = lowerText.includes("flow meter") || 
                             lowerText.includes("flowmeter") || 
                             lowerText.includes("flow-meter") ||
                             lowerText.includes("flow") ||
                             lowerText.match(/\bfm\b/i) !== null;
                             
        const hasChlorineAnalyzers = lowerText.includes("chlorine") || 
                                    lowerText.includes("analyzer") || 
                                    lowerText.includes("analyser") ||
                                    lowerText.includes("rca") ||
                                    lowerText.includes("residual") ||
                                    lowerText.includes("chlorin");
                                    
        const hasPressureTransmitters = lowerText.includes("pressure") || 
                                       lowerText.includes("transmitter") || 
                                       lowerText.includes("pt") ||
                                       lowerText.includes("transmit");
                                       
        const hasESR = lowerText.includes("esr") || 
                      lowerText.includes("reservoir") || 
                      lowerText.includes("elevated") ||
                      lowerText.includes("storage") ||
                      lowerText.includes("tank");
                      
        const hasVillages = lowerText.includes("village") || 
                           lowerText.includes("settlement") ||
                           lowerText.includes("gram") ||
                           lowerText.includes("community");
        
        // LPCD related checks for statistics and filtering
        const isLpcdQuery = lowerText.includes("lpcd") || 
                           lowerText.includes("liters per capita") || 
                           lowerText.includes("litres per capita") ||
                           lowerText.includes("water consumption") || 
                           lowerText.includes("water supply") ||
                           lowerText.includes("water availability");
        
        const hasLpcdAbove55 = isLpcdQuery && (
                               lowerText.includes("above 55") || 
                               lowerText.includes(">55") || 
                               lowerText.includes("greater than 55") ||
                               lowerText.includes("more than 55") ||
                               lowerText.includes("over 55") ||
                               lowerText.match(/\b55\+\b/) !== null);
                               
        const hasLpcdBelow40 = isLpcdQuery && (
                              lowerText.includes("below 40") || 
                              lowerText.includes("<40") || 
                              lowerText.includes("less than 40") ||
                              lowerText.includes("under 40"));
                              
        const hasLpcdBetween40And55 = isLpcdQuery && (
                                     lowerText.includes("between 40 and 55") || 
                                     lowerText.includes("40-55") || 
                                     lowerText.includes("40 to 55") ||
                                     lowerText.includes("40 - 55"));
                                     
        const hasZeroLpcd = isLpcdQuery && (
                           lowerText.includes("zero lpcd") || 
                           lowerText.includes("no water") || 
                           lowerText.includes("without water") ||
                           lowerText.includes("0 lpcd"));
        
        // Status filter check
        const hasStatusFilter =
          lowerText.includes("fully completed") ||
          lowerText.includes("completed scheme") ||
          lowerText.includes("completed schemes");

        // Handle greeting queries
        if (lowerText.includes("hello") || lowerText.includes("hi")) {
          response =
            "Hello! How can I help you with Maharashtra's water infrastructure today? You can ask me about flow meters, chlorine analyzers, ESRs, or villages in specific regions or schemes.";
        } 
        // Handle infrastructure queries
        else if (isHowManyQuery) {
          try {
            let queryResult;
            const components = [];
            let isRegionSpecific = false;
            let isSchemeSpecific = false;
            
            // Set filter based on region or scheme
            if (region) {
              filters.region = region;
              isRegionSpecific = true;
            }
            
            if (schemeId) {
              filters.schemeId = schemeId;
              isSchemeSpecific = true;
            }
            
            // Determine which API to call based on filters
            try {
              if (isRegionSpecific && region) {
                // Fetch region-specific data using dedicated region endpoint
                console.log(`Fetching data for region: ${region}`);
                const response = await fetch(`/api/regions/${encodeURIComponent(region)}/summary`);
                if (!response.ok) {
                  throw new Error(`Failed to fetch data for region: ${region}`);
                }
                queryResult = await response.json();
              } else if (isSchemeSpecific && schemeId) {
                // Fetch scheme-specific data
                console.log(`Fetching data for scheme: ${schemeId}`);
                const response = await fetch(`/api/schemes/${encodeURIComponent(schemeId)}`);
                if (!response.ok) {
                  throw new Error(`Failed to fetch data for scheme: ${schemeId}`);
                }
                const schemeData = await response.json();
                
                // Convert scheme data to a summary format
                queryResult = {
                  flow_meter_integrated: schemeData.flow_meters_connected || 0,
                  rca_integrated: schemeData.residual_chlorine_analyzer_connected || 0,
                  pressure_transmitter_integrated: schemeData.pressure_transmitter_connected || 0,
                  total_esr_integrated: schemeData.esr || 0,
                  fully_completed_esr: schemeData.esr_completed || 0,
                  total_villages_integrated: schemeData.villages || 0,
                  fully_completed_villages: schemeData.villages_completed || 0
                };
              } else {
                // Fetch global summary for all regions
                console.log("Fetching global summary");
                const response = await fetch('/api/regions/summary');
                if (!response.ok) {
                  throw new Error("Failed to fetch global summary");
                }
                queryResult = await response.json();
              }
            } catch (error) {
              console.error("Error fetching data:", error);
              throw error;
            }
            
            // Build response based on requested components
            let locationDescription = "across Maharashtra";
            if (isRegionSpecific && region) {
              locationDescription = `in the ${region} region`;
            } else if (isSchemeSpecific && schemeId) {
              locationDescription = `in scheme ${schemeId}`;
            }
            
            // Add components to response
            if (hasFlowMeters) {
              components.push(`**${queryResult.flow_meter_integrated || 0}** flow meters`);
            }
            
            if (hasChlorineAnalyzers) {
              components.push(`**${queryResult.rca_integrated || 0}** chlorine analyzers`);
            }
            
            if (hasPressureTransmitters) {
              components.push(`**${queryResult.pressure_transmitter_integrated || 0}** pressure transmitters`);
            }
            
            if (hasESR) {
              components.push(`**${queryResult.total_esr_integrated || 0}** ESRs (with **${queryResult.fully_completed_esr || 0}** fully completed)`);
            }
            
            if (hasVillages) {
              components.push(`**${queryResult.total_villages_integrated || 0}** villages (with **${queryResult.fully_completed_villages || 0}** fully completed)`);
            }
            
            // If no specific components were asked for, give a comprehensive answer
            if (components.length === 0) {
              response = `${locationDescription.charAt(0).toUpperCase() + locationDescription.slice(1)}, there are:\n• **${queryResult.flow_meter_integrated || 0}** flow meters\n• **${queryResult.rca_integrated || 0}** chlorine analyzers\n• **${queryResult.pressure_transmitter_integrated || 0}** pressure transmitters\n• **${queryResult.total_esr_integrated || 0}** ESRs\n• **${queryResult.total_villages_integrated || 0}** villages`;
            } else if (components.length === 1) {
              response = `There are ${components[0]} ${locationDescription}.`;
            } else {
              const lastComponent = components.pop();
              response = `There are ${components.join(', ')} and ${lastComponent} ${locationDescription}.`;
            }
            
          } catch (error) {
            console.error("Error fetching infrastructure data:", error);
            response = "Sorry, I couldn't fetch the requested infrastructure information at the moment.";
          }
        }
        // Handle LPCD statistics queries
        else if (isLpcdQuery) {
          try {
            console.log("LPCD query detected");
            
            // Determine the region to filter by (if any)
            let regionParam = '';
            if (region) {
              regionParam = `?region=${encodeURIComponent(region)}`;
            }
            
            // Fetch LPCD statistics from the new API endpoint
            const statsResponse = await fetch(`/api/water-scheme-data/lpcd-stats${regionParam}`);
            if (!statsResponse.ok) {
              throw new Error("Failed to fetch LPCD statistics");
            }
            const lpcdStats = await statsResponse.json();
            
            // Prepare location description for the response
            let locationDesc = region ? `in the ${region} region` : "across Maharashtra";
            
            // Handle specific LPCD range queries
            if (hasLpcdAbove55) {
              // Query for villages with LPCD > 55
              response = `There are **${lpcdStats.above_55_count}** villages with LPCD values above 55 liters per capita per day ${locationDesc}. This represents ${Math.round((lpcdStats.above_55_count / lpcdStats.total_villages) * 100)}% of all villages.`;
              
              // Set filter for the dashboard to show only villages with LPCD > 55
              if (filterContext) {
                filters = { minLpcd: 55 };
                if (region) filters.region = region;
              }
            }
            else if (hasLpcdBelow40) {
              // Query for villages with LPCD < 40
              response = `There are **${lpcdStats.below_40_count}** villages with LPCD values below 40 liters per capita per day ${locationDesc}. This represents ${Math.round((lpcdStats.below_40_count / lpcdStats.total_villages) * 100)}% of all villages.`;
              
              // Set filter for the dashboard to show only villages with LPCD < 40
              if (filterContext) {
                filters = { maxLpcd: 40 };
                if (region) filters.region = region;
              }
            }
            else if (hasLpcdBetween40And55) {
              // Query for villages with LPCD between 40 and 55
              response = `There are **${lpcdStats.between_40_55_count}** villages with LPCD values between 40 and 55 liters per capita per day ${locationDesc}. This represents ${Math.round((lpcdStats.between_40_55_count / lpcdStats.total_villages) * 100)}% of all villages.`;
              
              // Set filter for the dashboard to show only villages with LPCD between 40 and 55
              if (filterContext) {
                filters = { minLpcd: 40, maxLpcd: 55 };
                if (region) filters.region = region;
              }
            }
            else if (hasZeroLpcd) {
              // Query for villages with zero LPCD
              response = `There are **${lpcdStats.zero_lpcd_count}** villages with zero water supply (0 LPCD) ${locationDesc}. Among these, **${lpcdStats.consistent_zero_count}** villages have had no water supply for an entire week.`;
              
              // Set filter for the dashboard to show only villages with zero LPCD
              if (filterContext) {
                filters = { zeroSupplyForWeek: true };
                if (region) filters.region = region;
              }
            }
            else {
              // General LPCD statistics summary
              response = `LPCD Statistics ${locationDesc}:\n` +
                         `• **${lpcdStats.above_55_count}** villages have good water supply (LPCD > 55L)\n` +
                         `• **${lpcdStats.between_40_55_count}** villages have moderate water supply (LPCD between 40-55L)\n` +
                         `• **${lpcdStats.below_40_count}** villages have low water supply (LPCD < 40L)\n` +
                         `• **${lpcdStats.zero_lpcd_count}** villages have no water supply (LPCD = 0L)\n` +
                         `• **${lpcdStats.consistent_zero_count}** villages have had no water for over a week`;
            }
          } catch (error) {
            console.error("Error fetching LPCD statistics:", error);
            response = "I'm sorry, I couldn't fetch the LPCD statistics at the moment. Please try again later.";
          }
        }
        // Handle status filter requests
        else if (hasStatusFilter) {
          // If region is specified, apply both filters
          if (region) {
            // Convert region to match the exact case that the API expects
            console.log(`Applying region filter for "${region}" with status "Fully Completed"`);
            filters = { region, status: "Fully Completed" };
            response = `I've filtered the dashboard to show fully completed schemes in ${region} region.`;
          } else {
            // Apply just the status filter
            console.log(`Applying status filter for "Fully Completed"`);
            filters = { status: "Fully Completed" };
            response =
              "I've filtered the dashboard to show all fully completed schemes across Maharashtra. The highest completion rates are in Nashik and Pune regions.";
          }
          
          // Explicitly apply filters immediately
          if (filterContext) {
            console.log(`Applying status filters immediately:`, filters);
            setTimeout(() => {
              try {
                // First try direct call for status
                if (filters.status) {
                  filterContext.setStatusFilter(filters.status);
                  console.log(`Direct status filter applied: "${filters.status}"`);
                }
                
                // Also try direct call for region if present
                if (filters.region) {
                  filterContext.setSelectedRegion(filters.region);
                  console.log(`Direct region filter applied: "${filters.region}"`);
                }
                
                // Then also apply using the combined method for good measure
                filterContext.applyFilters(filters);
                console.log(`Filters applied via applyFilters: ${JSON.stringify(filters)}`);
              } catch (err) {
                console.error("Error applying status filters:", err);
              }
            }, 100); // Small delay to ensure UI is updated
          }
        } 
        // Handle region filter requests
        else if (region) {
          // Just filter by region - ensure the region name matches what's expected by the API
          filters = { region };
          response = `I've updated the dashboard to focus on ${region} region and its schemes.`;
          
          // Explicitly apply filters immediately
          if (filterContext) {
            console.log(`Applying region filter immediately:`, filters);
            setTimeout(() => {
              try {
                // First try direct call
                filterContext.setSelectedRegion(region);
                console.log(`Direct region filter applied: "${region}"`);
                
                // Then also apply using the combined method for good measure
                filterContext.applyFilters(filters);
                console.log(`Filters applied via applyFilters: ${JSON.stringify(filters)}`);
              } catch (err) {
                console.error("Error applying region filter:", err);
              }
            }, 100); // Small delay to ensure UI is updated
          }
        } 
        // Handle Excel download requests
        else if (
          (lowerText.includes("excel") || 
           lowerText.includes("download") || 
           lowerText.includes("export") || 
           lowerText.includes("get excel") || 
           lowerText.includes("give me excel") ||
           lowerText.includes("generate excel"))
        ) {
          console.log("Excel download request detected");
          
          // If region is specified, first apply the region filter
          if (region) {
            filters = { region };
            
            // Check if a specific status is also mentioned
            if (lowerText.includes("fully completed") || 
                lowerText.includes("complete") || 
                lowerText.includes("completed schemes")) {
              filters.status = "Fully Completed";
              response = `I'll help you download an Excel file with fully completed schemes in ${region} region. The download will start shortly.`;
            } 
            else if (lowerText.includes("partial") || 
                     lowerText.includes("ongoing") || 
                     lowerText.includes("in progress")) {
              filters.status = "Partial Integration";
              response = `I'll help you download an Excel file with partially completed schemes in ${region} region. The download will start shortly.`;
            }
            else {
              response = `I'll help you download an Excel file with all schemes in ${region} region. The download will start shortly.`;
            }
          }
          // No region specified, check if status filter is needed
          else if (lowerText.includes("fully completed") || 
                  lowerText.includes("complete") || 
                  lowerText.includes("completed schemes")) {
            filters = { status: "Fully Completed" };
            response = `I'll help you download an Excel file with fully completed schemes across Maharashtra. The download will start shortly.`;
          }
          else if (lowerText.includes("partial") || 
                  lowerText.includes("ongoing") || 
                  lowerText.includes("in progress")) {
            filters = { status: "Partial Integration" };
            response = `I'll help you download an Excel file with partially completed schemes across Maharashtra. The download will start shortly.`;
          }
          else {
            response = `I'll help you download an Excel file with all water schemes across Maharashtra. The download will start shortly.`;
          }
          
          // Apply filters first if any were specified
          if (filterContext && filters) {
            filterContext.applyFilters(filters);
          }
          
          // Directly trigger the Excel download (no need to wait for filters)
          try {
            // Direct call to manually trigger document click on export button
            const exportButton = document.querySelector('button[aria-label="Export to Excel"], button:has(.lucide-download), button.border-blue-300');
            
            if (exportButton) {
              console.log("Found export button, clicking it directly");
              (exportButton as HTMLButtonElement).click();
            } else {
              // Fallback to the global method
              console.log("No export button found, using global export method");
              await triggerExcelExport();
            }
            
            console.log("Excel export triggered successfully");
          } catch (error) {
            console.error("Failed to trigger Excel export:", error);
            // We don't need to update the UI here as the message is already sent
          }
        }
        // Handle summary requests
        else if (
          lowerText.includes("summary") ||
          lowerText.includes("statistics") ||
          lowerText.includes("stats")
        ) {
          try {
            const summary = await fetch('/api/regions/summary').then(res => res.json());
            response =
              `Maharashtra Water Systems Summary:\n• Total Schemes: **${summary.total_schemes_integrated || 0}**\n• Fully Completed: **${summary.fully_completed_schemes || 0}**\n• Total Villages Integrated: **${summary.total_villages_integrated || 0}**\n• ESRs Integrated: **${summary.total_esr_integrated || 0}**\n• Flow Meters: **${summary.flow_meter_integrated || 0}**\n• Chlorine Analyzers: **${summary.rca_integrated || 0}**\n• Pressure Transmitters: **${summary.pressure_transmitter_integrated || 0}**`;
          } catch (error) {
            response = "Sorry, I couldn't fetch the summary information at the moment.";
          }
        } 
        // Show all regions (reset region filter)
        else if (
          lowerText.includes("all regions") ||
          lowerText.includes("show all")
        ) {
          filters = { region: "all" };
          response =
            "I've reset the region filter to show schemes from all regions.";
            
          // Explicitly apply filters immediately
          if (filterContext) {
            console.log(`Resetting region filter to all`);
            setTimeout(() => {
              filterContext.applyFilters(filters);
            }, 100); // Small delay to ensure UI is updated
          }
        } 
        // Reset all filters
        else if (
          lowerText.includes("reset") ||
          lowerText.includes("clear filters")
        ) {
          filters = { region: "all", status: "all" };
          response =
            "I've reset all filters. Now showing schemes from all regions with any status.";
            
          // Explicitly apply filters immediately
          if (filterContext) {
            console.log(`Resetting all filters`);
            setTimeout(() => {
              filterContext.applyFilters(filters);
            }, 100); // Small delay to ensure UI is updated
          }
        } 
        // Default response for unrecognized queries - use OpenAI
        else {
          try {
            // Detect language from user input
            const detectedLanguage = detectLanguage(text);
            console.log(`Detected language: ${detectedLanguage}`);
            
            // Create enhanced context for OpenAI about Maharashtra Water Dashboard
            // Including specific instruction to respond in the same language
            const languageMap: Record<string, string> = {
              'en': 'English',
              'hi': 'Hindi',
              'mr': 'Marathi',
              'ta': 'Tamil',
              'te': 'Telugu',
              'kn': 'Kannada',
              'ml': 'Malayalam',
              'gu': 'Gujarati',
              'bn': 'Bengali'
            };
            const languageName = languageMap[detectedLanguage] || 'English';
            
            const contextPrompt = `
              User query: "${text}"
              
              The user is asking about the Maharashtra Water Dashboard, which tracks water infrastructure 
              across Maharashtra, India. The dashboard monitors:
              - Elevated Storage Reservoirs (ESRs)
              - Villages with water access
              - Flow meters
              - Chlorine analyzers (RCA)
              - Pressure transmitters (PT)
              
              Regions in the dashboard: Nagpur, Pune, Nashik, Konkan, Amravati, and Chhatrapati Sambhajinagar.
              
              IMPORTANT: Respond ONLY in ${languageName} language, even if the user's input is partly in English.
              If the user is speaking in Hindi, your response must be entirely in Hindi.
              If the user is speaking in Tamil, your response must be entirely in Tamil.
              If the user is speaking in Telugu, your response must be entirely in Telugu.
              If the user is speaking in Marathi, your response must be entirely in Marathi.
              
              Answer the query briefly (2-3 sentences) based on context. If you don't know, suggest asking about 
              specific regions or schemes. Don't make up information not in the context.
            `;
            
            // Log the language that will be used for the response
            console.log(`Responding in ${languageName} (code: ${detectedLanguage})`);
            
            // Get response from OpenAI with enhanced language settings
            console.log("Calling OpenAI for assistance with unrecognized query");
            const openAIResponse = await getOpenAICompletion({
              prompt: contextPrompt,
              maxTokens: 200,  // Increased for non-English responses
              temperature: 0.5,  // Lower temperature for more consistent responses
              language: detectedLanguage
            });
            
            if (!openAIResponse.isError) {
              response = openAIResponse.text;
              console.log("Received OpenAI response:", response);
            } else {
              // Fallback if OpenAI fails
              response = "I'm not sure I understand that query. You can ask me about:\n• Flow meters, chlorine analyzers, pressure transmitters\n• ESRs (reservoirs) and villages\n• Filter by region (e.g., 'Schemes in Nagpur')\n• Filter by status (e.g., 'Show fully completed schemes')";
              console.log("Using fallback response due to OpenAI error");
            }
          } catch (error) {
            console.error("Error using OpenAI:", error);
            response = "I'm not sure I understand that query. You can ask me about:\n• Flow meters, chlorine analyzers, pressure transmitters\n• ESRs (reservoirs) and villages\n• Filter by region (e.g., 'Schemes in Nagpur')\n• Filter by status (e.g., 'Show fully completed schemes')";
          }
        }

        // Apply filters if available
        if (filterContext && (filters.region || filters.status)) {
          filterContext.applyFilters(filters);
          
          // Check if previous message was from voice input to enable auto-speak
          const prevMessage = messages[messages.length - 1];
          const autoSpeak = prevMessage?.fromVoice === true;
          
          // Add visual indication of filter application
          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: response,
              filters: filters, // Store applied filters for reference
              autoSpeak // Pass flag to trigger automatic text-to-speech
            },
          ]);
        } else {
          // Check if previous message was from voice input to enable auto-speak
          const prevMessage = messages[messages.length - 1];
          const autoSpeak = prevMessage?.fromVoice === true;
          
          setMessages((prev) => [...prev, { 
            type: "bot", 
            text: response,
            autoSpeak  // Pass flag to trigger automatic text-to-speech
          }]);
        }
      } catch (error) {
        console.error("Error processing message:", error);
        // Check if previous message was from voice input to enable auto-speak
        const prevMessage = messages[messages.length - 1];
        const autoSpeak = prevMessage?.fromVoice === true;
        
        setMessages((prev) => [...prev, { 
          type: "bot", 
          text: "I encountered an error processing your request. Please try again.",
          autoSpeak // Always auto-speak error messages if the query was from voice
        }]);
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  // Handle predefined queries
  const handlePredefinedQuery = (query: string) => {
    setInput(query);
    handleSendMessage(query);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="message-container">
          {messages.map((msg: ChatMessage, i) => (
            <div
              key={i}
              className={`mb-4 flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-lg max-w-[80%] ${
                  msg.type === "user"
                    ? "bg-blue-100 text-blue-900"
                    : "bg-blue-600 text-white"
                }`}
              >
                {/* Add text-to-speech button for bot messages */}
                {msg.type === "bot" && (
                  <div className="flex justify-end mb-1">
                    <TextToSpeech text={msg.text} autoSpeak={msg.autoSpeak} />
                  </div>
                )}
                {msg.text.split("\n").map((line: string, j: number) => {
                  return (
                    <React.Fragment key={j}>
                      {/* Check for markdown bold syntax (**number**) and render it as bold text */}
                      {line.includes('**') ? (
                        <span>
                          {line.split(/(\*\*[^*]+\*\*)/).map((part, k) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              // Extract content between ** markers and make it bold
                              const content = part.slice(2, -2);
                              return <span key={k} className="font-bold text-black">{content}</span>;
                            }
                            return <span key={k}>{part}</span>;
                          })}
                        </span>
                      ) : (
                        // For lines without markdown, still check for numbers
                        <span>
                          {line.split(/(\d+([.,]\d+)?)/).map((part, k) => (
                            /\d+([.,]\d+)?/.test(part) ? 
                              <span key={k} className="font-bold text-black">{part}</span> : 
                              <span key={k}>{part}</span>
                          ))}
                        </span>
                      )}
                      {j < msg.text.split("\n").length - 1 && <br />}
                    </React.Fragment>
                  );
                })}

                {/* Add filter indication if the message applied filters */}
                {msg.filters && (
                  <div className="mt-2 pt-2 border-t border-blue-400 text-xs flex items-center">
                    <Filter className="w-3 h-3 mr-1" />
                    <span>Filters applied to dashboard</span>
                    {msg.filters.region && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white rounded-sm flex items-center">
                        <MapPin className="w-2 h-2 mr-0.5" />
                        {msg.filters.region}
                      </span>
                    )}
                    {msg.filters.status && (
                      <span className="ml-1 px-1.5 py-0.5 bg-green-500 text-white rounded-sm">
                        {msg.filters.status}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="mb-4 flex justify-start">
              <div className="bg-blue-600 text-white p-3 rounded-lg max-w-[80%] flex items-center">
                <div className="flex space-x-1">
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {messages.length === 1 && (
            <>
              {/* Display the voice assistant guide */}
              <ChatbotGuide />
              
              {/* Example queries */}
              <div className="mb-2 flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg max-w-[90%]">
                  <p className="text-sm font-medium mb-2">Try asking me:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                      onClick={() =>
                        handlePredefinedQuery("How many flow meters are there in all regions?")
                      }
                    >
                      Flow meters in all regions
                    </button>
                    <button
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                      onClick={() =>
                        handlePredefinedQuery("How many ESRs and villages are in Nagpur region?")
                      }
                    >
                      ESRs and villages in Nagpur
                    </button>
                    <button
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                      onClick={() => 
                        handlePredefinedQuery("Show summary statistics")
                      }
                    >
                      Summary statistics
                    </button>
                    <button
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                      onClick={() => 
                        handlePredefinedQuery("How many flow meters in Bidgaon scheme?")
                      }
                    >
                      Flow meters in Bidgaon
                    </button>
                    <button
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                      onClick={() => 
                        handlePredefinedQuery("Download Excel for fully completed schemes in Nagpur")
                      }
                    >
                      Export Nagpur data to Excel
                    </button>
                    <button
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                      onClick={() => 
                        handlePredefinedQuery("How many chlorine analyzers in 105 villages?")
                      }
                    >
                      Chlorine analyzers in villages
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-3 border-t border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message here..."
            className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => handleSendMessage()}
            className="absolute right-3 top-3 text-blue-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11h2a1 1 0 001-1v-4.571a1 1 0 00-.725-.962l-5-1.429a1 1 0 00-1.17 1.409l7 14z" />
            </svg>
          </button>
        </div>
        
        {/* Voice recognition component */}
        <div className="mt-2 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Use voice to ask questions
          </div>
          <VoiceRecognition 
            onTranscript={(text) => {
              setInput(text);
              handleSendMessage(text);
            }}
            isDisabled={loading}
          />
        </div>
      </div>
    </div>
  );
};

const ChatbotComponent: React.FC = () => {
  const [showChatbot, setShowChatbot] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  // Load TensorFlow model on component mount but don't block rendering
  useEffect(() => {
    const loadTensorFlowModel = async () => {
      setModelLoading(true);
      try {
        // Import modules only when needed
        await import("@tensorflow/tfjs");
        await import("@tensorflow-models/universal-sentence-encoder");
        console.log("TensorFlow modules imported");
      } catch (error) {
        console.warn("Error importing TensorFlow modules:", error);
      } finally {
        setModelLoading(false);
      }
    };

    if (showChatbot) {
      loadTensorFlowModel();
    }
  }, [showChatbot]);

  const toggleChatbot = () => {
    setShowChatbot(!showChatbot);
    setMinimized(false);
  };

  const toggleMinimize = () => {
    setMinimized(!minimized);
  };

  // If chatbot is not showing, just show the button
  if (!showChatbot) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={toggleChatbot}
          className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  // If chatbot is showing but minimized, show just the header
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg h-14 w-80 flex flex-col border border-gray-200">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 h-full">
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-sm font-medium text-blue-700">
                Water Infrastructure Assistant
              </h3>
              {modelLoading && (
                <div className="ml-2 w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
              )}
            </div>
            <div className="flex space-x-1">
              <button
                onClick={toggleMinimize}
                className="p-1 text-gray-500 hover:text-blue-600 rounded"
              >
                <Maximize2 size={14} />
              </button>
              <button
                onClick={toggleChatbot}
                className="p-1 text-gray-500 hover:text-red-600 rounded"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full chatbot view - using simplified custom chatbot for now
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg h-[500px] w-[350px] sm:w-[380px] flex flex-col border border-gray-200">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center">
            <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-sm font-medium text-blue-700">JJM Assistant</h3>
            {modelLoading && (
              <div className="ml-2 w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
            )}
          </div>
          <div className="flex space-x-1">
            <button
              onClick={toggleMinimize}
              className="p-1 text-gray-500 hover:text-blue-600 rounded"
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={toggleChatbot}
              className="p-1 text-gray-500 hover:text-red-600 rounded"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Using custom chatbot component instead of the library for now */}
        <CustomChatbot />
      </div>
    </div>
  );
};

export default ChatbotComponent;