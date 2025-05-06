import React, { createContext, useContext, useState } from 'react';
import { GeoFilterLevel } from '@/components/maps/EnhancedGeoFilterMap';

// Define the structure of our geographic filter
export interface GeoFilter {
  level: GeoFilterLevel;
  region: string | null;
  division: string | null;
  subdivision: string | null;
  circle: string | null;
  block: string | null;
  village: string | null;
}

// Define the context type including the state and update function
export interface GeoFilterContextType {
  filter: GeoFilter;
  setFilter: React.Dispatch<React.SetStateAction<GeoFilter>>;
  isFiltering: boolean;
  clearFilter: () => void;
}

// Create the context with default values
const GeoFilterContext = createContext<GeoFilterContextType>({
  filter: {
    level: 'region',
    region: null,
    division: null,
    subdivision: null,
    circle: null,
    block: null,
    village: null
  },
  setFilter: () => {},
  isFiltering: false,
  clearFilter: () => {},
});

// Provider component to wrap around components that need access to the context
export const GeoFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filter, setFilter] = useState<GeoFilter>({
    level: 'region',
    region: null,
    division: null,
    subdivision: null,
    circle: null,
    block: null,
    village: null
  });

  // Check if any filter is active
  const isFiltering = Boolean(
    filter.region || 
    filter.division || 
    filter.subdivision || 
    filter.circle || 
    filter.block || 
    filter.village
  );

  // Function to clear all filters
  const clearFilter = () => {
    setFilter({
      level: 'region',
      region: null,
      division: null,
      subdivision: null,
      circle: null,
      block: null,
      village: null
    });
  };

  return (
    <GeoFilterContext.Provider value={{ filter, setFilter, isFiltering, clearFilter }}>
      {children}
    </GeoFilterContext.Provider>
  );
};

// Custom hook to make using the context easier
export const useGeoFilter = () => useContext(GeoFilterContext);

export default GeoFilterContext;