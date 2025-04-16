import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, MicOff, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecognitionProps {
  onTranscript: (text: string) => void;
  isDisabled?: boolean;
}

// List of supported languages for speech recognition
const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-IN', name: 'English (India)' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'mr-IN', name: 'Marathi' }
];

const VoiceRecognition: React.FC<VoiceRecognitionProps> = ({ 
  onTranscript, 
  isDisabled = false 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [showError, setShowError] = useState(false);
  const [language, setLanguage] = useState('en-IN'); // Default to English (India)
  const [autoStopTimeout, setAutoStopTimeout] = useState<NodeJS.Timeout | null>(null);
  const previousTranscriptRef = useRef('');

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  // Update local listening state when the recognition service changes
  useEffect(() => {
    setIsListening(listening);
  }, [listening]);

  // Auto-submit when transcript changes and there's a pause in speaking
  useEffect(() => {
    if (transcript && transcript !== previousTranscriptRef.current && listening) {
      previousTranscriptRef.current = transcript;
      
      // Clear previous timeout
      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
      }
      
      // Set new timeout - auto-submit after 1.5 seconds of silence
      const timeout = setTimeout(() => {
        if (transcript.trim()) {
          handleSubmitTranscript();
        }
      }, 1500);
      
      setAutoStopTimeout(timeout);
    }
    
    // Cleanup on unmount
    return () => {
      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
      }
    };
  }, [transcript, listening]);

  // Handle submit of transcript
  const handleSubmitTranscript = () => {
    if (transcript.trim()) {
      onTranscript(transcript);
      resetTranscript();
      SpeechRecognition.stopListening();
      
      // Clear any pending auto-stop timeout
      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
        setAutoStopTimeout(null);
      }
    }
  };

  // Toggle listening state
  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      
      // Clear any pending auto-stop timeout
      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
        setAutoStopTimeout(null);
      }
    } else {
      setShowError(false);
      resetTranscript();
      previousTranscriptRef.current = '';
      SpeechRecognition.startListening({ 
        continuous: true, 
        language: language 
      });
    }
  };
  
  // Change recognition language
  const changeLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    setLanguage(newLanguage);
    
    // If currently listening, restart with new language
    if (listening) {
      SpeechRecognition.stopListening();
      setTimeout(() => {
        SpeechRecognition.startListening({ 
          continuous: true, 
          language: newLanguage 
        });
      }, 100);
    }
  };

  // Check for browser support
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="text-xs text-gray-500 flex items-center">
        <MicOff className="w-3 h-3 mr-1" />
        Voice recognition not supported in this browser
      </div>
    );
  }

  // Check for microphone availability
  if (!isMicrophoneAvailable) {
    return (
      <div className="text-xs text-gray-500 flex items-center">
        <MicOff className="w-3 h-3 mr-1" />
        Please allow microphone access
      </div>
    );
  }

  // If there's a transcript, show the submit button
  if (transcript && !listening) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-xs text-gray-600 flex-1 truncate">
          "{transcript.substring(0, 30)}{transcript.length > 30 ? '...' : ''}"
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 px-2 text-xs"
          onClick={handleSubmitTranscript}
        >
          Use Text
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0"
          onClick={resetTranscript}
        >
          <RefreshCcw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        type="button"
        size="sm"
        variant={isListening ? "default" : "outline"}
        className={`rounded-full h-8 w-8 p-0 ${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`}
        onClick={toggleListening}
        disabled={isDisabled}
      >
        {isListening ? (
          <Mic className="h-4 w-4 text-white animate-pulse" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      
      <select 
        className="text-xs border rounded p-1 bg-white"
        value={language}
        onChange={changeLanguage}
        disabled={isListening}
      >
        {SUPPORTED_LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
      
      {isListening && (
        <div className="text-xs text-blue-500">
          Listening... {transcript && `"${transcript.substring(0, 20)}${transcript.length > 20 ? '...' : ''}"`}
        </div>
      )}
      
      {transcript && isListening && (
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 px-2 text-xs"
          onClick={handleSubmitTranscript}
        >
          Send
        </Button>
      )}
      
      {showError && (
        <div className="text-xs text-red-500">
          Could not access microphone. Please check permissions.
        </div>
      )}
    </div>
  );
};

export default VoiceRecognition;