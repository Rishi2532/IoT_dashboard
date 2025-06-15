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

// Create a context to manage dashboard filter state
interface DashboardFilterContext {
  setSelectedRegion: (region: string) => void;
  setStatusFilter: (status: string) => void;
  applyFilters: (filters: { region?: string; status?: string }) => void;
}

const FilterContext = createContext<DashboardFilterContext | null>(null);

// Provider component to be used in dashboard.tsx
export const FilterContextProvider: React.FC<{
  children: React.ReactNode;
  setSelectedRegion: (region: string) => void;
  setStatusFilter: (status: string) => void;
}> = ({ children, setSelectedRegion, setStatusFilter }) => {
  const applyFilters = (filters: { region?: string; status?: string }) => {
    if (filters.region) {
      setSelectedRegion(filters.region);
    }
    if (filters.status) {
      setStatusFilter(filters.status);
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
  filters?: { region?: string; status?: string };
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

  // Excel export helper function
  const triggerExcelExport = () => {
    try {
      console.log('Attempting to trigger Excel export...');
      
      // Find export button on current page using multiple selectors
      const exportButtonSelectors = [
        'button:has(.lucide-download)',
        'button[aria-label*="Export"]',
        'button.border-green-200',
        'button.bg-green-50',
        'button.text-green-700'
      ];
      
      for (const selector of exportButtonSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          console.log(`Found export button with selector: ${selector}`);
          (button as HTMLButtonElement).click();
          return;
        }
      }
      
      // Fallback: find any button with "export" or "download" text
      const allButtons = Array.from(document.querySelectorAll('button'));
      const exportButton = allButtons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('export') && text.includes('excel');
      });
      
      if (exportButton) {
        console.log('Found export button by text content');
        (exportButton as HTMLButtonElement).click();
      } else {
        console.warn('No export button found on current page');
      }
    } catch (error) {
      console.error('Error triggering Excel export:', error);
    }
  };

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
          return value;
        }
      } else if (normalizedText.includes(key)) {
        return value;
      }
    }

    return null;
  };

  // Enhanced status extraction from query
  const extractStatus = (text: string): { status?: string; mjpCommissioned?: boolean; mjpFullyCompleted?: boolean } => {
    const normalizedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
    
    const statusFilters: { status?: string; mjpCommissioned?: boolean; mjpFullyCompleted?: boolean } = {};
    
    // MJP status patterns
    if (normalizedText.includes("mjp fully completed") || normalizedText.includes("mjp complete")) {
      statusFilters.mjpFullyCompleted = true;
    }
    
    if (normalizedText.includes("mjp commissioned") || normalizedText.includes("mjp commission")) {
      statusFilters.mjpCommissioned = true;
    }
    
    // General status patterns
    if (normalizedText.includes("fully completed") || normalizedText.includes("complete")) {
      if (!statusFilters.mjpFullyCompleted) { // Only set if MJP fully completed not already set
        statusFilters.status = "fully_completed";
      }
    }
    
    if (normalizedText.includes("in progress") || normalizedText.includes("progress") || normalizedText.includes("ongoing")) {
      statusFilters.status = "in_progress";
    }
    
    if (normalizedText.includes("commissioned") || normalizedText.includes("commission")) {
      if (!statusFilters.mjpCommissioned) { // Only set if MJP commissioned not already set
        statusFilters.mjpCommissioned = true;
      }
    }
    
    return statusFilters;
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
        let filters: { region?: string; status?: string; schemeId?: string; mjpCommissioned?: boolean; mjpFullyCompleted?: boolean } = {};

        const lowerText = text.toLowerCase();
        console.log(`Processing query: "${lowerText}"`);

        // Extract region and status from query with enhanced detection
        const region = extractRegion(text);
        const statusFilters = extractStatus(text);
        console.log(`Region extraction result for "${text}":`, region);
        console.log(`Status extraction result for "${text}":`, statusFilters);

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
                                lowerText.includes("village")
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

        // Status filter check
        const hasStatusFilter =
          lowerText.includes("fully completed") ||
          lowerText.includes("completed scheme") ||
          lowerText.includes("completed schemes");

        // PRIORITY 1: Handle region filtering first (before other conditions)
        if (region && !isHowManyQuery) {
          console.log(`Priority region filter triggered for: ${region}`);
          filters = { region };
          
          const currentPath = window.location.pathname;
          let pageContext = "";
          
          if (currentPath.includes('/chlorine')) {
            pageContext = "chlorine monitoring data";
          } else if (currentPath.includes('/pressure')) {
            pageContext = "pressure monitoring data";
          } else if (currentPath.includes('/lpcd')) {
            pageContext = "LPCD water consumption data";
          } else if (currentPath.includes('/scheme-lpcd')) {
            pageContext = "scheme-level LPCD data";
          } else {
            pageContext = "dashboard data";
          }
          
          if (hasStatusFilter) {
            filters.status = "Fully Completed";
            response = `Filtering ${pageContext} for fully completed schemes in ${region} region.`;
          } else {
            response = `Filtering ${pageContext} for ${region} region. The dashboard now shows only ${region}'s information.`;
          }
        }
        // Handle greeting queries
        else if (lowerText.includes("hello") || lowerText.includes("hi")) {
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
        // Handle region filtering with or without status
        else if (region) {
          filters = { region };
          
          // Apply status filters if detected
          if (statusFilters.status) {
            filters.status = statusFilters.status;
          }
          if (statusFilters.mjpCommissioned) {
            filters.mjpCommissioned = statusFilters.mjpCommissioned;
          }
          if (statusFilters.mjpFullyCompleted) {
            filters.mjpFullyCompleted = statusFilters.mjpFullyCompleted;
          }

          // Build response message
          let statusDescription = "";
          if (statusFilters.mjpFullyCompleted) {
            statusDescription = " with MJP fully completed status";
          } else if (statusFilters.mjpCommissioned) {
            statusDescription = " with MJP commissioned status";
          } else if (statusFilters.status === "fully_completed") {
            statusDescription = " with fully completed status";
          } else if (statusFilters.status === "in_progress") {
            statusDescription = " with in progress status";
          }
          
          response = `I've filtered the dashboard to show schemes in ${region} region${statusDescription}.`;
        }
        // Handle status filter requests without region
        else if (Object.keys(statusFilters).length > 0) {
          filters = { ...statusFilters };
          
          let statusDescription = "";
          if (statusFilters.mjpFullyCompleted) {
            statusDescription = "MJP fully completed";
          } else if (statusFilters.mjpCommissioned) {
            statusDescription = "MJP commissioned";
          } else if (statusFilters.status === "fully_completed") {
            statusDescription = "fully completed";
          } else if (statusFilters.status === "in_progress") {
            statusDescription = "in progress";
          }
          
          response = `I've filtered the dashboard to show ${statusDescription} schemes across Maharashtra.`;
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

            // Apply status filters if detected
            if (statusFilters.status) {
              filters.status = statusFilters.status;
            }
            if (statusFilters.mjpCommissioned) {
              filters.mjpCommissioned = statusFilters.mjpCommissioned;
            }
            if (statusFilters.mjpFullyCompleted) {
              filters.mjpFullyCompleted = statusFilters.mjpFullyCompleted;
            }

            // Build response message based on detected filters
            let statusDescription = "";
            if (statusFilters.mjpFullyCompleted) {
              statusDescription = " with MJP fully completed status";
            } else if (statusFilters.mjpCommissioned) {
              statusDescription = " with MJP commissioned status";
            } else if (statusFilters.status === "fully_completed") {
              statusDescription = " with fully completed status";
            } else if (statusFilters.status === "in_progress") {
              statusDescription = " with in progress status";
            }

            response = `I'll help you download an Excel file with schemes in ${region} region${statusDescription}. The download will start shortly.`;
          }
          // No region specified, apply status filters if detected
          else if (Object.keys(statusFilters).length > 0) {
            filters = { ...statusFilters };
            
            let statusDescription = "";
            if (statusFilters.mjpFullyCompleted) {
              statusDescription = "MJP fully completed";
            } else if (statusFilters.mjpCommissioned) {
              statusDescription = "MJP commissioned";
            } else if (statusFilters.status === "fully_completed") {
              statusDescription = "fully completed";
            } else if (statusFilters.status === "in_progress") {
              statusDescription = "in progress";
            }
            
            response = `I'll help you download an Excel file with ${statusDescription} schemes across Maharashtra. The download will start shortly.`;
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

          // Apply region filter first if specified, then trigger download
          if (region) {
            console.log(`Applying region filter: ${region} before Excel export`);
            window.dispatchEvent(new CustomEvent('regionFilterChange', {
              detail: { region: region }
            }));
            
            // Wait a moment for filter to apply, then trigger export
            setTimeout(() => {
              triggerExcelExport();
            }, 500);
          } else {
            // Trigger immediate export for all regions
            triggerExcelExport();
          }
        }

        // Handle standalone Excel export requests without other keywords
        else if (
          (lowerText.includes("excel") || lowerText.includes("export")) && 
          !isHowManyQuery && 
          !hasFlowMeters && 
          !hasChlorineAnalyzers && 
          !hasPressureTransmitters && 
          !hasESR && 
          !hasVillages
        ) {
          console.log("Standalone Excel export request detected");
          
          if (region) {
            filters = { region };
            response = `Downloading Excel file for ${region} region data. The export will start shortly.`;
            
            // Apply region filter and trigger export
            window.dispatchEvent(new CustomEvent('regionFilterChange', {
              detail: { region: region }
            }));
            
            setTimeout(() => {
              triggerExcelExport();
            }, 500);
          } else {
            response = `Downloading Excel file with all Maharashtra region data. The export will start shortly.`;
            triggerExcelExport();
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
        } 
        // Reset all filters
        else if (
          lowerText.includes("reset") ||
          lowerText.includes("clear filters")
        ) {
          filters = { region: "all", status: "all" };
          response =
            "I've reset all filters. Now showing schemes from all regions with any status.";
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

        // Apply filters using event-based system that works across all pages
        if (filters.region || filters.status || filters.mjpCommissioned || filters.mjpFullyCompleted) {
          console.log('Applying filters to dashboard:', filters);
          
          // Dispatch custom events that dashboard pages can listen to
          if (filters.region) {
            console.log(`Dispatching regionFilterChange event with region: ${filters.region}`);
            window.dispatchEvent(new CustomEvent('regionFilterChange', {
              detail: { region: filters.region }
            }));
          }
          
          if (filters.status) {
            console.log(`Dispatching statusFilterChange event with status: ${filters.status}`);
            window.dispatchEvent(new CustomEvent('statusFilterChange', {
              detail: { status: filters.status }
            }));
          }
          
          if (filters.mjpCommissioned) {
            console.log(`Dispatching mjpCommissionedFilterChange event`);
            window.dispatchEvent(new CustomEvent('mjpCommissionedFilterChange', {
              detail: { mjpCommissioned: filters.mjpCommissioned }
            }));
          }
          
          if (filters.mjpFullyCompleted) {
            console.log(`Dispatching mjpFullyCompletedFilterChange event`);
            window.dispatchEvent(new CustomEvent('mjpFullyCompletedFilterChange', {
              detail: { mjpFullyCompleted: filters.mjpFullyCompleted }
            }));
          }

          // Also try the filterContext if available (for backward compatibility)
          if (filterContext) {
            try {
              filterContext.applyFilters(filters);
              console.log('Successfully applied filters via filterContext');
            } catch (e) {
              console.error('Error applying filters via filterContext:', e);
            }
          }
        }

        // Check if previous message was from voice input to enable auto-speak
        const prevMessage = messages[messages.length - 1];
        const autoSpeak = prevMessage?.fromVoice === true;

        // Add response message with filters if any were applied
        if (filters.region || filters.status) {
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
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-none"
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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);

  // Reference to track the draggable element
  const dragRef = React.useRef<HTMLDivElement>(null);
  const startPositionRef = React.useRef({ x: 0, y: 0 });

  // Show welcome popup after login (force it to show in this update)
  useEffect(() => {
    // Immediately show welcome popup
    const timer = setTimeout(() => {
      setShowWelcome(true);

      // Auto-hide the welcome popup after 8 seconds
      const hideTimer = setTimeout(() => {
        setShowWelcome(false);
      }, 8000);

      return () => clearTimeout(hideTimer);
    }, 1500); // Show popup 1.5 seconds after component mounts

    return () => clearTimeout(timer);
  }, []);

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

  // Enhanced mouse down handler for smoother dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent text selection during drag

    // Only start dragging when clicking the header or button, not the content
    if (e.currentTarget.classList.contains('drag-handle')) {
      setIsDragging(true);

      // Calculate offset from the element's top-left corner
      const rect = dragRef.current?.getBoundingClientRect();
      if (rect) {
        startPositionRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
    }
  };

  // Enhanced mouse move handler for smoother dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    // Calculate new position based on mouse position and initial offset
    const newX = e.clientX - startPositionRef.current.x;
    const newY = e.clientY - startPositionRef.current.y;

    // Apply boundaries to keep the chatbot on screen
    const width = dragRef.current?.offsetWidth || 70;
    const height = dragRef.current?.offsetHeight || 70;

    const maxX = window.innerWidth - width;
    const maxY = window.innerHeight - height;

    const boundedX = Math.min(Math.max(0, newX), maxX);
    const boundedY = Math.min(Math.max(0, newY), maxY);

    // Update position with requestAnimationFrame for smoother animation
    requestAnimationFrame(() => {
      if (dragRef.current) {
        dragRef.current.style.left = `${boundedX}px`;
        dragRef.current.style.top = `${boundedY}px`;
        dragRef.current.style.bottom = 'auto';
        dragRef.current.style.right = 'auto';

        // Update state after animation frame
        setPosition({ x: boundedX, y: boundedY });
      }
    });
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Set up the global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // If chatbot is not showing, just show the draggable button
  if (!showChatbot) {
    return (
      <div 
        ref={dragRef}
        className="fixed z-50"
        style={{ 
          bottom: position.y === 0 ? '1rem' : 'auto',
          right: position.x === 0 ? '1rem' : 'auto',
          top: position.y !== 0 ? `${position.y}px` : 'auto',
          left: position.x !== 0 ? `${position.x}px` : 'auto'
        }}
      >
        <div
          className="drag-handle cursor-move"
          onMouseDown={handleMouseDown}
        >
          <Button
            onClick={toggleChatbot}
            className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        </div>

        {/* Enhanced welcome popup message with animation */}
        {showWelcome && (
          <div 
            className="absolute bottom-16 right-0 bg-gradient-to-br from-white to-blue-50 p-4 rounded-xl shadow-xl border border-blue-300 w-72 animate-in fade-in slide-in-from-bottom-5 duration-300"
            style={{ transformOrigin: 'bottom right' }}
          >
            <div className="flex items-start">
              <div className="mr-3 mt-0.5 bg-blue-100 p-2 rounded-full">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">How may I help you?</p>
                <p className="text-xs text-blue-700 mt-1.5 leading-relaxed">
                  Click this icon to ask questions about water infrastructure data, schemes, and regions
                </p>
              </div>
            </div>
            <div className="absolute w-4 h-4 bg-blue-300 rotate-45 bottom-[-8px] right-6"></div>
            <div className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-ping"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If chatbot is showing but minimized, show just the header
  if (minimized) {
    return (
      <div 
        ref={dragRef}
        className="fixed z-50"
        style={{ 
          bottom: position.y === 0 ? '1rem' : 'auto',
          right: position.x === 0 ? '1rem' : 'auto',
          top: position.y !== 0 ? `${position.y}px` : 'auto',
          left: position.x !== 0 ? `${position.x}px` : 'auto'
        }}
      >
        <div className="bg-white rounded-lg shadow-lg h-14 w-80 flex flex-col border border-gray-200">
          <div 
            className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 h-full drag-handle cursor-move"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-sm font-medium text-blue-700">
                JJM Assistant
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
    <div 
      ref={dragRef}
      className="fixed z-50"
      style={{ 
        bottom: position.y === 0 ? '1rem' : 'auto',
        right: position.x === 0 ? '1rem' : 'auto',
        top: position.y !== 0 ? `${position.y}px` : 'auto',
        left: position.x !== 0 ? `${position.x}px` : 'auto'
      }}
    >
      <div className="bg-white rounded-lg shadow-lg h-[500px] w-[350px] sm:w-[380px] flex flex-col border border-gray-200">
        <div 
          className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 cursor-move drag-handle"
          onMouseDown={handleMouseDown}
        >
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