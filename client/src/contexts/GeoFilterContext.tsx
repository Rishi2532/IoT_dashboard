import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the geographic filter types
export type GeoFilterLevel = 'region' | 'division' | 'subdivision' | 'circle' | 'block' | 'village' | 'none';

export interface GeoFilter {
  level: GeoFilterLevel;
  region?: string;
  division?: string;
  subdivision?: string;
  circle?: string;
  block?: string;
  village?: string;
}

interface GeoFilterContextType {
  filter: GeoFilter;
  setFilter: React.Dispatch<React.SetStateAction<GeoFilter>>;
  resetFilter: () => void;
  isFiltering: boolean;
}

// Create the context with default values
const GeoFilterContext = createContext<GeoFilterContextType>({
  filter: { level: 'none' },
  setFilter: () => {},
  resetFilter: () => {},
  isFiltering: false
});

// Custom hook to use the context
export const useGeoFilter = () => useContext(GeoFilterContext);

interface GeoFilterProviderProps {
  children: ReactNode;
}

// Provider component
export const GeoFilterProvider: React.FC<GeoFilterProviderProps> = ({ children }) => {
  const [filter, setFilter] = useState<GeoFilter>({ level: 'none' });
  const [isFiltering, setIsFiltering] = useState(false);

  // Reset filter to default state
  const resetFilter = () => {
    setFilter({ level: 'none' });
  };

  // Update isFiltering based on filter state
  useEffect(() => {
    setIsFiltering(filter.level !== 'none');
  }, [filter]);

  return (
    <GeoFilterContext.Provider value={{ filter, setFilter, resetFilter, isFiltering }}>
      {children}
    </GeoFilterContext.Provider>
  );
};