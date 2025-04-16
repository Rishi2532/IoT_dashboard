import React, { useState, useEffect } from 'react';
import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import config from './config';
import MessageParser from './MessageParser';
import ActionProvider from './ActionProvider';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, Maximize2, Minimize2 } from 'lucide-react';

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

  // Full chatbot view
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
        
        <div className="flex-1 overflow-hidden">
          <Chatbot
            config={config}
            messageParser={MessageParser}
            actionProvider={ActionProvider}
            headerText="Water Infrastructure Assistant"
            placeholderText="Type your message here..."
          />
        </div>
      </div>
    </div>
  );
};

export default ChatbotComponent;