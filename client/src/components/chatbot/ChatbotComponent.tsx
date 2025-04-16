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

// Custom Chatbot Components for simplicity - avoiding JSX in widget functions
const CustomChatbot = () => {
  const [messages, setMessages] = React.useState([
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

  // Extract region from query
  const extractRegion = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    const regionMap: Record<string, string> = {
      amravati: "Amravati",
      nagpur: "Nagpur",
      nashik: "Nashik",
      pune: "Pune",
      konkan: "Konkan",
      mumbai: "Mumbai",
      "chhatrapati sambhajinagar": "Chhatrapati Sambhajinagar",
      sambhajinagar: "Chhatrapati Sambhajinagar",
      aurangabad: "Chhatrapati Sambhajinagar",
    };

    for (const [key, value] of Object.entries(regionMap)) {
      if (lowerText.includes(key)) {
        return value;
      }
    }
    return null;
  };

  // Process user message
  const handleSendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { type: "user", text }]);
    setInput("");
    setLoading(true);

    // Process the message
    setTimeout(() => {
      let response = "";
      let filters: { region?: string; status?: string } = {};

      const lowerText = text.toLowerCase();
      const region = extractRegion(text);

      // Check for status filters
      const hasStatusFilter =
        lowerText.includes("fully completed") ||
        lowerText.includes("completed scheme") ||
        lowerText.includes("completed schemes");

      // Simple pattern matching
      if (lowerText.includes("hello") || lowerText.includes("hi")) {
        response =
          "Hello! How can I help you with Maharashtra's water infrastructure today?";
      } else if (lowerText.includes("how many flowmeter") || lowerText.includes("how many flow meter")) {
        const summaryResponse = await fetch('/api/regions/summary');
        const summary = await summaryResponse.json();
        response = `There are ${summary.flow_meter_integrated} flow meters integrated across Maharashtra.`;
      } else if (hasStatusFilter) {
        // If region is specified, apply both filters
        if (region) {
          filters = { region, status: "Fully Completed" };
          response = `I've filtered the dashboard to show fully completed schemes in ${region} region.`;
        } else {
          // Apply just the status filter
          filters = { status: "Fully Completed" };
          response =
            "I've filtered the dashboard to show all fully completed schemes across Maharashtra. The highest completion rates are in Nashik and Pune regions.";
        }
      } else if (region) {
        // Just filter by region
        filters = { region };
        response = `I've updated the dashboard to focus on ${region} region and its schemes.`;
      } else if (
        lowerText.includes("summary") ||
        lowerText.includes("statistics") ||
        lowerText.includes("stats")
      ) {
        response =
          "Maharashtra Water Systems Summary:\n• Total Schemes: 69\n• Fully Completed: 16\n• Total Villages Integrated: 607\n• ESRs Integrated: 797\n• Flow Meters: 733";
      } else if (lowerText.includes("esr") || lowerText.includes("reservoir")) {
        response =
          "There are 797 ESRs (Elevated Storage Reservoirs) integrated across Maharashtra, with 330 fully completed and 446 partially completed.";
      } else if (
        lowerText.includes("flow meter") ||
        lowerText.includes("meter")
      ) {
        response =
          "There are 733 flow meters integrated across all regions in Maharashtra.";
      } else if (
        lowerText.includes("all regions") ||
        lowerText.includes("show all")
      ) {
        filters = { region: "all" };
        response =
          "I've reset the region filter to show schemes from all regions.";
      } else if (
        lowerText.includes("reset") ||
        lowerText.includes("clear filters")
      ) {
        filters = { region: "all", status: "all" };
        response =
          "I've reset all filters. Now showing schemes from all regions with any status.";
      } else {
        response =
          "I'm not sure I understand that query. Could you try rephrasing it? You can ask about schemes, regions, ESRs, or flow meters.";
      }

      // Apply filters if available
      if (filterContext && (filters.region || filters.status)) {
        filterContext.applyFilters(filters);
        // Add visual indication of filter application
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: response,
            filters: filters, // Store applied filters for reference
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { type: "bot", text: response }]);
      }

      setLoading(false);
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
          {messages.map((msg: any, i) => (
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
                {msg.text.split("\n").map((line: string, j: number) => {
                  // Check if the message contains only numbers and common separators
                  const hasOnlyNumbers = /^[\d\s,.:]+$/.test(line.trim());
                  const numbers = line.match(/\d+([.,]\d+)?/g);

                  return (
                    <React.Fragment key={j}>
                      {hasOnlyNumbers ? (
                        <span className="font-mono">{line}</span>
                      ) : numbers ? (
                        <span>
                          {line.split(/(\d+([.,]\d+)?)/).map((part, k) => (
                            /\d+([.,]\d+)?/.test(part) ? 
                              <span key={k} className="font-mono text-blue-500">{part}</span> : 
                              <span key={k}>{part}</span>
                          ))}
                        </span>
                      ) : (
                        line
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
            <div className="mb-2 flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg max-w-[90%]">
                <p className="text-sm font-medium mb-2">Try asking me:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                    onClick={() =>
                      handlePredefinedQuery("Show fully completed schemes")
                    }
                  >
                    Show fully completed schemes
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                    onClick={() =>
                      handlePredefinedQuery("Region summary statistics")
                    }
                  >
                    Region summary statistics
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                    onClick={() => handlePredefinedQuery("Schemes in Nagpur")}
                  >
                    Schemes in Nagpur
                  </button>
                </div>
              </div>
            </div>
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