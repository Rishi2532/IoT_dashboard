import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface TextToSpeechProps {
  text: string;
  autoSpeak?: boolean;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text, autoSpeak = true }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const previousTextRef = useRef('');
  
  // Clean text by removing markdown and other formatting
  const cleanTextForSpeech = useCallback((rawText: string) => {
    // Remove markdown formatting like **bold**
    let cleanedText = rawText.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Remove bullet points and replace with "there are"
    cleanedText = cleanedText.replace(/•\s*/g, 'there are ');
    
    // Clean up any other special characters or formatting
    cleanedText = cleanedText.replace(/[\r\n]+/g, '. ');
    
    return cleanedText;
  }, []);

  // Function to find the best voice for a given language
  const findVoiceForLanguage = useCallback((text: string) => {
    if (!window.speechSynthesis) return null;
    
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    
    // Try to detect the language from text patterns (very basic detection)
    let languageCode = 'en-IN'; // Default to Indian English
    
    // Check for Hindi patterns (simple detection)
    if (/[\u0900-\u097F]/.test(text)) {
      languageCode = 'hi-IN';
    } 
    // Check for Marathi patterns (simple detection)
    else if (/[\u0900-\u097F][\u0900-\u097F]\s/.test(text)) {
      languageCode = 'mr-IN';
    }
    
    // Try to find a voice that matches the language
    let matchedVoice = voices.find(voice => voice.lang.startsWith(languageCode));
    
    // If no specific match, fall back to any available Indian voice
    if (!matchedVoice) {
      matchedVoice = voices.find(voice => voice.lang.includes('IN'));
    }
    
    // Last resort - any English voice
    if (!matchedVoice) {
      matchedVoice = voices.find(voice => voice.lang.includes('en'));
    }
    
    // If all else fails, use the first available voice
    return matchedVoice || voices[0];
  }, []);

  // Function to speak text
  const speak = useCallback(() => {
    if (!speechSupported) return;
    
    // Clean the text for speech
    const cleanedText = cleanTextForSpeech(text);
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create a new speech utterance
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    
    // Set speaking properties
    utterance.rate = 1.0;  // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume
    
    // Find the best voice for the text
    const bestVoice = findVoiceForLanguage(cleanedText);
    if (bestVoice) {
      utterance.voice = bestVoice;
      setSelectedVoice(bestVoice);
    }
    
    // Set speaking state
    setIsSpeaking(true);
    
    // Speak the text
    window.speechSynthesis.speak(utterance);
    
    // Add event for when speech is finished
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    // Add failsafe in case onend doesn't fire
    setTimeout(() => {
      if (isSpeaking) {
        setIsSpeaking(false);
      }
    }, cleanedText.length * 100); // Rough estimate based on text length
  }, [text, speechSupported, cleanTextForSpeech, findVoiceForLanguage, isSpeaking]);

  // Stop speaking function
  const stopSpeaking = useCallback(() => {
    if (!speechSupported) return;
    
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [speechSupported]);

  // Check speech support and auto-speak on component mount or when props change
  useEffect(() => {
    // Check if browser supports speech synthesis
    if ('speechSynthesis' in window) {
      setSpeechSupported(true);
      
      // Only speak automatically if text is new and autoSpeak is enabled
      if (autoSpeak && text !== previousTextRef.current) {
        previousTextRef.current = text;
        speak();
      }
    }
    
    // Cleanup function to stop speaking when component unmounts
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text, autoSpeak, speak]);

  // Load voices when available
  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    // Chrome needs this event handler to load voices
    const handleVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const bestVoice = findVoiceForLanguage(text);
        if (bestVoice) {
          setSelectedVoice(bestVoice);
        }
      }
    };
    
    // Initial load
    handleVoicesChanged();
    
    // Add event listener for voice changes
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    
    // Cleanup
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, [findVoiceForLanguage, text]);

  // Don't render anything if speech synthesis is not supported
  if (!speechSupported) return null;

  return (
    <button 
      className={`p-1 rounded-full ${isSpeaking ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
      onClick={isSpeaking ? stopSpeaking : speak}
      title={isSpeaking ? "Stop speaking" : "Listen to response"}
    >
      {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
};

export default TextToSpeech;