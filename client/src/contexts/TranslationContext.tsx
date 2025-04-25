import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define available languages
export type Language = 'en' | 'hi' | 'mr' | 'gu' | 'pa' | 'bn' | 'ta' | 'te' | 'kn' | 'ml';

// Language names for display
export const languageNames: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी (Hindi)',
  mr: 'मराठी (Marathi)',
  gu: 'ગુજરાતી (Gujarati)',
  pa: 'ਪੰਜਾਬੀ (Punjabi)',
  bn: 'বাংলা (Bengali)',
  ta: 'தமிழ் (Tamil)',
  te: 'తెలుగు (Telugu)',
  kn: 'ಕನ್ನಡ (Kannada)',
  ml: 'മലയാളം (Malayalam)',
};

// Define context type
interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translate: (text: string) => string;
  translationEnabled: boolean;
  toggleTranslation: () => void;
  isTranslating: boolean;
}

// Create context with default values
const TranslationContext = createContext<TranslationContextType>({
  language: 'en',
  setLanguage: () => {},
  translate: (text) => text,
  translationEnabled: false,
  toggleTranslation: () => {},
  isTranslating: false,
});

// Create a provider component
interface TranslationProviderProps {
  children: ReactNode;
}

// Simple key-value translation storage
const translations: Record<Language, Record<string, string>> = {
  en: {}, // English is the default, so no translations needed
  hi: {
    // Hindi translations
    'Dashboard': 'डैशबोर्ड',
    'Villages': 'गांव',
    'Schemes': 'योजनाएं',
    'Regions': 'क्षेत्र',
    'Water Supply': 'जल आपूर्ति',
    'ESR': 'जलाशय',
    'Fully Completed': 'पूर्ण रूप से पूरा',
    'Total Villages': 'कुल गांव',
    'Villages Integrated': 'एकीकृत गांव',
    'Login': 'लॉगिन',
    'Logout': 'लॉगआउट',
    'Settings': 'सेटिंग्स',
  },
  mr: {
    // Marathi translations
    'Dashboard': 'डॅशबोर्ड',
    'Villages': 'गावे',
    'Schemes': 'योजना',
    'Regions': 'प्रदेश',
    'Water Supply': 'पाणी पुरवठा',
    'ESR': 'जलकुंभ',
    'Fully Completed': 'पूर्णपणे पूर्ण',
    'Total Villages': 'एकूण गावे',
    'Villages Integrated': 'एकात्मिक गावे',
    'Login': 'लॉगिन',
    'Logout': 'लॉगआउट', 
    'Settings': 'सेटिंग्स',
  },
  gu: {}, // Gujarati translations (empty for now)
  pa: {}, // Punjabi translations (empty for now)
  bn: {}, // Bengali translations (empty for now)
  ta: {}, // Tamil translations (empty for now)
  te: {}, // Telugu translations (empty for now)
  kn: {}, // Kannada translations (empty for now)
  ml: {}, // Malayalam translations (empty for now)
};

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  // Get saved language preference from localStorage or default to English
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage && Object.keys(languageNames).includes(savedLanguage) 
      ? savedLanguage
      : 'en';
  });
  
  // Translation toggle
  const [translationEnabled, setTranslationEnabled] = useState<boolean>(() => {
    const savedPref = localStorage.getItem('translationEnabled');
    return savedPref ? savedPref === 'true' : false;
  });
  
  // Loading state
  const [isTranslating, setIsTranslating] = useState(false);

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);
  
  // Update localStorage when translation toggle changes
  useEffect(() => {
    localStorage.setItem('translationEnabled', translationEnabled.toString());
  }, [translationEnabled]);

  // Function to translate text
  const translate = (text: string): string => {
    if (!translationEnabled || language === 'en') {
      return text;
    }
    
    // Check if we have a translation for this text
    if (translations[language] && translations[language][text]) {
      return translations[language][text];
    }
    
    // Return original text if no translation is available
    return text;
  };

  // Function to toggle translation
  const toggleTranslation = () => {
    setTranslationEnabled(prev => !prev);
  };

  // Provide the translation context
  return (
    <TranslationContext.Provider 
      value={{ 
        language, 
        setLanguage, 
        translate, 
        translationEnabled,
        toggleTranslation,
        isTranslating
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

// Custom hook to use the translation context
export const useTranslation = () => useContext(TranslationContext);