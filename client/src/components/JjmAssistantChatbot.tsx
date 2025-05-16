import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, MinusCircle, PlusCircle } from 'lucide-react';

// Define types for chat messages
interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const JjmAssistantChatbot: React.FC = () => {
  // State for chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      text: 'Hello! I\'m your JJM (Jal Jeevan Mission) Assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  
  // State for user input
  const [inputText, setInputText] = useState('');
  
  // State for chatbot visibility
  const [isOpen, setIsOpen] = useState(false);
  
  // State for minimized view
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Ref for scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Function to scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Sample responses - in a real app, these would come from an AI backend
  const sampleResponses = [
    "The Jal Jeevan Mission aims to provide safe and adequate drinking water through individual household tap connections by 2024 to all households in rural India.",
    "LPCD stands for Liters Per Capita Per Day. The JJM standard is to provide at least 55 LPCD of water to every rural household.",
    "Villages with LPCD below 40L are considered priority areas for intervention under the JJM program.",
    "You can find detailed water scheme information by navigating to the LPCD Dashboard and selecting the region or village of interest.",
    "The Excel export feature allows you to download water consumption data for further analysis.",
    "Zero supply for a week indicates a serious problem with water distribution that needs immediate attention.",
    "The dashboard shows real-time LPCD data to help monitor water supply across different regions.",
    "Water consumption is measured at the ESR (Elevated Storage Reservoir) level and then calculated as LPCD based on village population.",
    "The JJM program is monitored through this dashboard to ensure accountability and track progress."
  ];
  
  // Function to handle user message submission
  const handleSendMessage = () => {
    if (inputText.trim() === '') return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText('');
    
    // Simulate bot thinking with timeout
    setTimeout(() => {
      // Pick a random response from sample responses
      const randomIndex = Math.floor(Math.random() * sampleResponses.length);
      const botResponse = sampleResponses[randomIndex];
      
      // Add bot response
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: botResponse,
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, botMessage]);
    }, 1000);
  };
  
  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Toggle chatbot visibility
  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    // If opening, also ensure it's not minimized
    if (!isOpen) {
      setIsMinimized(false);
    }
  };
  
  // Toggle minimized state
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };
  
  // Format time from Date object
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Button */}
      {!isOpen && (
        <Button 
          onClick={toggleChatbot} 
          className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
        >
          <MessageCircle size={24} />
        </Button>
      )}
      
      {/* Chat Window */}
      {isOpen && (
        <Card className={`shadow-lg w-80 ${isMinimized ? 'h-auto' : 'h-[500px] md:h-[600px]'} flex flex-col border-purple-200`}>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-t-lg">
            <CardTitle className="text-sm font-medium">JJM Assistant</CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-white hover:bg-purple-700 p-0" 
                onClick={toggleMinimized}
              >
                {isMinimized ? <PlusCircle size={16} /> : <MinusCircle size={16} />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-white hover:bg-purple-700 p-0" 
                onClick={toggleChatbot}
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          
          {!isMinimized && (
            <>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[calc(100%-60px)] p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] px-3 py-2 rounded-lg ${
                            message.type === 'user' 
                              ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-tr-none' 
                              : 'bg-gray-100 text-gray-900 rounded-tl-none'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className={`text-xs mt-1 ${
                            message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
              
              <div className="p-3 border-t border-gray-200">
                <div className="flex">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 mr-2"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    disabled={inputText.trim() === ''}
                    className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default JjmAssistantChatbot;