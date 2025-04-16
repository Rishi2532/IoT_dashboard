// Import this instead of using full React object
import React, { useState, useEffect } from 'react';
// Import the chatbot component
import { createChatBotMessage } from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
// Import UI components
import { Button } from '@/components/ui/button';
import { MessageSquare, X, Maximize2, Minimize2 } from 'lucide-react';

// Custom Chatbot Components for simplicity - avoiding JSX in widget functions
const CustomChatbot = () => {
  const [messages, setMessages] = React.useState([
    { type: 'bot', text: "Hello! I'm your Maharashtra Water Infrastructure Assistant. How can I help you today?" },
  ]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Process user message
  const handleSendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { type: 'user', text }]);
    setInput('');
    setLoading(true);

    // Process the message
    setTimeout(() => {
      let response = '';
      
      const lowerText = text.toLowerCase();
      
      // Simple pattern matching
      if (lowerText.includes('hello') || lowerText.includes('hi')) {
        response = "Hello! How can I help you with Maharashtra's water infrastructure today?";
      } 
      else if (lowerText.includes('fully completed') || lowerText.includes('completed scheme')) {
        response = "I found 16 fully completed schemes across Maharashtra. The highest completion rates are in Nashik and Pune regions.";
      }
      else if (lowerText.includes('schemes in nagpur') || lowerText.includes('nagpur')) {
        response = "There are 12 schemes in Nagpur region. 3 are fully completed and 9 are in progress with various stages of completion.";
      }
      else if (lowerText.includes('summary') || lowerText.includes('statistics') || lowerText.includes('stats')) {
        response = "Maharashtra Water Systems Summary:\n• Total Schemes: 69\n• Fully Completed: 16\n• Total Villages Integrated: 607\n• ESRs Integrated: 797\n• Flow Meters: 733";
      }
      else if (lowerText.includes('esr') || lowerText.includes('reservoir')) {
        response = "There are 797 ESRs (Elevated Storage Reservoirs) integrated across Maharashtra, with 330 fully completed and 446 partially completed.";
      }
      else if (lowerText.includes('flow meter') || lowerText.includes('meter')) {
        response = "There are 733 flow meters integrated across all regions in Maharashtra.";
      }
      else {
        response = "I'm not sure I understand that query. Could you try rephrasing it? You can ask about schemes, regions, ESRs, or flow meters.";
      }
      
      setMessages(prev => [...prev, { type: 'bot', text: response }]);
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
          {messages.map((msg, i) => (
            <div key={i} className={`mb-4 flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-lg max-w-[80%] ${
                msg.type === 'user' 
                  ? 'bg-blue-100 text-blue-900' 
                  : 'bg-blue-600 text-white'
              }`}>
                {msg.text.split('\n').map((line, j) => (
                  <React.Fragment key={j}>
                    {line}
                    {j < msg.text.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="mb-4 flex justify-start">
              <div className="bg-blue-600 text-white p-3 rounded-lg max-w-[80%] flex items-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                    onClick={() => handlePredefinedQuery('Show fully completed schemes')}
                  >
                    Show fully completed schemes
                  </button>
                  <button 
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                    onClick={() => handlePredefinedQuery('Region summary statistics')}
                  >
                    Region summary statistics
                  </button>
                  <button 
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                    onClick={() => handlePredefinedQuery('Schemes in Nagpur')}
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
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message here..."
            className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            onClick={() => handleSendMessage()}
            className="absolute right-3 top-3 text-blue-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
        await import('@tensorflow/tfjs');
        await import('@tensorflow-models/universal-sentence-encoder');
        console.log('TensorFlow modules imported');
      } catch (error) {
        console.warn('Error importing TensorFlow modules:', error);
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