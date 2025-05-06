import { useQuery } from '@tanstack/react-query';
import { SchemeStatus } from '@shared/schema';
import { useGeoFilter } from '@/contexts/GeoFilterContext';

/**
 * Custom hook to fetch schemes based on the current geographic filter
 */
export const useGeographicFilteredSchemes = () => {
  const { filter, isFiltering } = useGeoFilter();

  return useQuery<SchemeStatus[]>({
    queryKey: ['/api/schemes/geo-filtered', filter],
    queryFn: async () => {
      // If no filtering is active, return empty array
      if (!isFiltering) return [];

      // Build the query parameters based on the active filters
      const params = new URLSearchParams();
      
      if (filter.region) params.append('region', filter.region);
      if (filter.division) params.append('division', filter.division);
      if (filter.subdivision) params.append('subdivision', filter.subdivision);
      if (filter.circle) params.append('circle', filter.circle);
      if (filter.block) params.append('block', filter.block);
      if (filter.village) params.append('village', filter.village);
      
      // Add the filter level for backend logic
      params.append('level', filter.level);
      
      // Make the API request with the constructed parameters
      const response = await fetch(`/api/schemes/filtered?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch filtered schemes');
      }
      
      return response.json();
    },
    enabled: isFiltering, // Only run the query if filtering is active
  });
};

/**
 * Custom hook to fetch water scheme data based on the current geographic filter
 */
export const useGeographicFilteredWaterData = () => {
  const { filter, isFiltering } = useGeoFilter();

  return useQuery({
    queryKey: ['/api/water-data/geo-filtered', filter],
    queryFn: async () => {
      if (!isFiltering) return [];

      const params = new URLSearchParams();
      
      if (filter.region) params.append('region', filter.region);
      if (filter.division) params.append('division', filter.division);
      if (filter.subdivision) params.append('subdivision', filter.subdivision);
      if (filter.circle) params.append('circle', filter.circle);
      if (filter.block) params.append('block', filter.block);
      if (filter.village) params.append('village', filter.village);
      
      params.append('level', filter.level);
      
      const response = await fetch(`/api/water-data/filtered?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch filtered water data');
      }
      
      return response.json();
    },
    enabled: isFiltering,
  });
};

/**
 * Custom hook to fetch chlorine data based on the current geographic filter
 */
export const useGeographicFilteredChlorineData = () => {
  const { filter, isFiltering } = useGeoFilter();

  return useQuery({
    queryKey: ['/api/chlorine-data/geo-filtered', filter],
    queryFn: async () => {
      if (!isFiltering) return [];

      const params = new URLSearchParams();
      
      if (filter.region) params.append('region', filter.region);
      if (filter.division) params.append('division', filter.division);
      if (filter.subdivision) params.append('subdivision', filter.subdivision);
      if (filter.circle) params.append('circle', filter.circle);
      if (filter.block) params.append('block', filter.block);
      if (filter.village) params.append('village', filter.village);
      
      params.append('level', filter.level);
      
      const response = await fetch(`/api/chlorine-data/filtered?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch filtered chlorine data');
      }
      
      return response.json();
    },
    enabled: isFiltering,
  });
};