import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of our geographic filter state
interface GeoFilterState {
  region: string;
  division: string;
  subDivision: string;
  circle: string;
  block: string;
  village: string;
}

// Define the context value shape
interface GeoFilterContextValue {
  filter: GeoFilterState;
  setRegion: (region: string) => void;
  setDivision: (division: string) => void;
  setSubDivision: (subDivision: string) => void;
  setCircle: (circle: string) => void;
  setBlock: (block: string) => void;
  setVillage: (village: string) => void;
  clearFilters: () => void;
  // For UI components that need to know what level we're filtering at
  currentFilterLevel: 'region' | 'division' | 'subdivision' | 'circle' | 'block' | 'village'; 
}

const defaultFilterState: GeoFilterState = {
  region: 'all',
  division: 'all',
  subDivision: 'all',
  circle: 'all',
  block: 'all',
  village: 'all',
};

// Create the context with a default value
const GeoFilterContext = createContext<GeoFilterContextValue>({
  filter: defaultFilterState,
  setRegion: () => {},
  setDivision: () => {},
  setSubDivision: () => {},
  setCircle: () => {},
  setBlock: () => {},
  setVillage: () => {},
  clearFilters: () => {},
  currentFilterLevel: 'region',
});

// Custom hook to use the geo filter context
export const useGeoFilter = () => useContext(GeoFilterContext);

interface GeoFilterProviderProps {
  children: ReactNode;
}

// The provider component
export const GeoFilterProvider: React.FC<GeoFilterProviderProps> = ({ children }) => {
  const [filter, setFilter] = useState<GeoFilterState>(defaultFilterState);
  const [currentFilterLevel, setCurrentFilterLevel] = useState<'region' | 'division' | 'subdivision' | 'circle' | 'block' | 'village'>('region');
  
  // Determine the most specific level that has a filter applied
  useEffect(() => {
    if (filter.village !== 'all') {
      setCurrentFilterLevel('village');
    } else if (filter.block !== 'all') {
      setCurrentFilterLevel('block');
    } else if (filter.circle !== 'all') {
      setCurrentFilterLevel('circle');
    } else if (filter.subDivision !== 'all') {
      setCurrentFilterLevel('subdivision');
    } else if (filter.division !== 'all') {
      setCurrentFilterLevel('division');
    } else {
      setCurrentFilterLevel('region');
    }
  }, [filter]);
  
  // Set region and clear more specific filters
  const setRegion = (region: string) => {
    setFilter({
      ...filter,
      region,
      // Clear more specific filters when changing region
      division: 'all',
      subDivision: 'all',
      circle: 'all',
      block: 'all',
      village: 'all',
    });
  };
  
  // Set division and clear more specific filters
  const setDivision = (division: string) => {
    setFilter({
      ...filter,
      division,
      // Clear more specific filters
      subDivision: 'all',
      circle: 'all',
      block: 'all',
      village: 'all',
    });
  };
  
  // Set subdivision and clear more specific filters
  const setSubDivision = (subDivision: string) => {
    setFilter({
      ...filter,
      subDivision,
      // Clear more specific filters
      circle: 'all',
      block: 'all',
      village: 'all',
    });
  };
  
  // Set circle and clear more specific filters
  const setCircle = (circle: string) => {
    setFilter({
      ...filter,
      circle,
      // Clear more specific filters
      block: 'all',
      village: 'all',
    });
  };
  
  // Set block and clear village filter
  const setBlock = (block: string) => {
    setFilter({
      ...filter,
      block,
      // Clear more specific filter
      village: 'all',
    });
  };
  
  // Set village (most specific level)
  const setVillage = (village: string) => {
    setFilter({
      ...filter,
      village,
    });
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilter(defaultFilterState);
  };
  
  const value = {
    filter,
    setRegion,
    setDivision,
    setSubDivision,
    setCircle,
    setBlock,
    setVillage,
    clearFilters,
    currentFilterLevel,
  };
  
  return (
    <GeoFilterContext.Provider value={value}>
      {children}
    </GeoFilterContext.Provider>
  );
};