import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface TextToSpeechProps {
  text: string;
  autoSpeak?: boolean;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text, autoSpeak = false }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  
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
    
    // Select a voice (optional)
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => 
      voice.lang.includes('en') && voice.name.includes('Female')
    );
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    // Set speaking state
    setIsSpeaking(true);
    
    // Speak the text
    window.speechSynthesis.speak(utterance);
    
    // Add event for when speech is finished
    utterance.onend = () => {
      setIsSpeaking(false);
    };
  }, [text, speechSupported, cleanTextForSpeech]);

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
      
      // If autoSpeak is enabled, speak the text automatically
      if (autoSpeak) {
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