import { useQuery } from '@tanstack/react-query';
import { useGeoFilter } from '@/contexts/GeoFilterContext';

/**
 * Custom hook to fetch schemes based on the current geographic filter
 */
export const useGeographicFilteredSchemes = () => {
  const { filter, isFiltering } = useGeoFilter();
  
  return useQuery({
    queryKey: ['geographic-schemes', filter],
    queryFn: async () => {
      // If there's no active filtering, return empty array
      if (!isFiltering || filter.level === 'none') {
        return [];
      }
      
      // Build query parameters based on the current filter
      const params = new URLSearchParams();
      
      if (filter.region) {
        params.append('region', filter.region);
      }
      
      if (filter.division) {
        params.append('division', filter.division);
      }
      
      if (filter.subdivision) {
        params.append('subdivision', filter.subdivision);
      }
      
      if (filter.circle) {
        params.append('circle', filter.circle);
      }
      
      if (filter.block) {
        params.append('block', filter.block);
      }
      
      // Make the API call with the constructed parameters
      const response = await fetch(`/api/schemes/geographic?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch geographically filtered schemes');
      }
      
      return response.json();
    },
    enabled: isFiltering && filter.level !== 'none',
    refetchOnWindowFocus: false,
  });
};

/**
 * Custom hook to fetch water scheme data based on the current geographic filter
 */
export const useGeographicFilteredWaterData = () => {
  const { filter, isFiltering } = useGeoFilter();
  
  return useQuery({
    queryKey: ['geographic-water-data', filter],
    queryFn: async () => {
      // If there's no active filtering, return empty array
      if (!isFiltering || filter.level === 'none') {
        return [];
      }
      
      // Build query parameters based on the current filter
      const params = new URLSearchParams();
      
      if (filter.region) {
        params.append('region', filter.region);
      }
      
      // Add other filters if needed for water data filtering
      
      // Make the API call with the constructed parameters
      const response = await fetch(`/api/water-scheme-data?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch geographically filtered water scheme data');
      }
      
      return response.json();
    },
    enabled: isFiltering && filter.level !== 'none',
    refetchOnWindowFocus: false,
  });
};

/**
 * Custom hook to fetch chlorine data based on the current geographic filter
 */
export const useGeographicFilteredChlorineData = () => {
  const { filter, isFiltering } = useGeoFilter();
  
  return useQuery({
    queryKey: ['geographic-chlorine-data', filter],
    queryFn: async () => {
      // If there's no active filtering, return empty array
      if (!isFiltering || filter.level === 'none') {
        return [];
      }
      
      // Build query parameters based on the current filter
      const params = new URLSearchParams();
      
      if (filter.region) {
        params.append('region', filter.region);
      }
      
      // Add other filters if needed for chlorine data filtering
      
      // Make the API call with the constructed parameters
      const response = await fetch(`/api/chlorine-data?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch geographically filtered chlorine data');
      }
      
      return response.json();
    },
    enabled: isFiltering && filter.level !== 'none',
    refetchOnWindowFocus: false,
  });
};