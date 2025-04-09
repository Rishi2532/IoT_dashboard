import { Feature, FeatureCollection, Geometry } from 'geojson';

// Define the type for the GeoJSON data properties
export interface MaharashtraFeatureProperties {
  name: string;
  region: string;
  fid?: number;
  ID_0?: number;
  ISO?: string;
  NAME_0?: string;
  ID_1?: number;
  NAME_1?: string;
  ID_2?: number;
  NAME_2?: string;
  TYPE_2?: string;
  ENGTYPE_2?: string;
  NL_NAME_2?: any;
  VARNAME_2?: string;
}

// Load the custom Maharashtra GeoJSON data
export async function loadMaharashtraGeoJson(): Promise<FeatureCollection<Geometry, MaharashtraFeatureProperties>> {
  try {
    const response = await fetch('/maharastra.geojson');
    const data = await response.json();
    
    // Process the data to ensure each feature has a proper region property
    data.features.forEach((feature: any) => {
      if (!feature.properties.region) {
        // Map the district to its corresponding region if needed
        const districtRegionMap: Record<string, string> = {
          'Nagpur': 'Nagpur',
          'Wardha': 'Nagpur',
          'Bhandara': 'Nagpur',
          'Gondiya': 'Nagpur',
          'Chandrapur': 'Nagpur',
          'Garhchiroli': 'Nagpur',
          
          'Amravati': 'Amravati',
          'Akola': 'Amravati',
          'Washim': 'Amravati',
          'Buldana': 'Amravati',
          'Yavatmal': 'Amravati',
          
          'Aurangabad': 'Chhatrapati Sambhajinagar',
          'Jalna': 'Chhatrapati Sambhajinagar',
          'Parbhani': 'Chhatrapati Sambhajinagar',
          'Hingoli': 'Chhatrapati Sambhajinagar',
          'Nanded': 'Chhatrapati Sambhajinagar',
          'Bid': 'Chhatrapati Sambhajinagar',
          'Latur': 'Chhatrapati Sambhajinagar',
          'Osmanabad': 'Chhatrapati Sambhajinagar',
          
          'Nashik': 'Nashik',
          'Dhule': 'Nashik',
          'Nandurbar': 'Nashik',
          'Jalgaon': 'Nashik',
          
          'Pune': 'Pune',
          'Ahmednagar': 'Pune',
          'Solapur': 'Pune',
          'Satara': 'Pune',
          'Sangli': 'Pune',
          'Kolhapur': 'Pune',
          
          'Greater Bombay': 'Konkan',
          'Mumbai': 'Konkan',
          'Thane': 'Konkan',
          'Raigarh': 'Konkan',
          'Ratnagiri': 'Konkan',
          'Sindhudurg': 'Konkan'
        };
        
        // Set the region based on the district name
        if (feature.properties.NAME_2) {
          feature.properties.region = districtRegionMap[feature.properties.NAME_2] || 'Unknown';
        }
      }
      
      // Set name to district name for display
      feature.properties.name = feature.properties.NAME_2 || feature.properties.name || 'Unknown';
    });
    
    return data;
  } catch (error) {
    console.error('Error loading Maharashtra GeoJSON:', error);
    return { type: 'FeatureCollection', features: [] };
  }
}

// Fallback simplified geojson if the main one fails to load
export const simplifiedMaharashtraGeoJson: FeatureCollection<Geometry, MaharashtraFeatureProperties> = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Nagpur",
        "region": "Nagpur"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[79.10, 21.05], [79.40, 21.10], [79.70, 21.15], [79.90, 21.05], [79.95, 20.85], [79.80, 20.65], [79.60, 20.55], [79.30, 20.55], [79.05, 20.65], [78.95, 20.80], [79.10, 21.05]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Amravati",
        "region": "Amravati"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[77.75, 21.25], [78.05, 21.30], [78.35, 21.25], [78.55, 21.15], [78.65, 20.90], [78.55, 20.70], [78.35, 20.55], [78.05, 20.50], [77.75, 20.60], [77.60, 20.80], [77.65, 21.05], [77.75, 21.25]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Chhatrapati Sambhajinagar",
        "region": "Chhatrapati Sambhajinagar"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[75.10, 20.00], [75.40, 20.05], [75.70, 20.00], [75.90, 19.85], [75.95, 19.65], [75.85, 19.45], [75.65, 19.35], [75.35, 19.30], [75.10, 19.40], [74.95, 19.60], [75.00, 19.80], [75.10, 20.00]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Nashik",
        "region": "Nashik"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.65, 20.15], [74.00, 20.20], [74.35, 20.15], [74.55, 20.00], [74.60, 19.80], [74.50, 19.60], [74.25, 19.45], [73.95, 19.45], [73.65, 19.55], [73.50, 19.75], [73.55, 19.95], [73.65, 20.15]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Pune",
        "region": "Pune"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.65, 18.65], [74.00, 18.70], [74.35, 18.65], [74.65, 18.50], [74.70, 18.30], [74.60, 18.10], [74.35, 17.95], [74.00, 17.90], [73.65, 18.00], [73.45, 18.20], [73.50, 18.45], [73.65, 18.65]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Konkan",
        "region": "Konkan"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[72.75, 19.15], [73.10, 19.15], [73.30, 19.05], [73.35, 18.85], [73.25, 18.65], [73.05, 18.55], [72.80, 18.55], [72.55, 18.65], [72.45, 18.85], [72.55, 19.05], [72.75, 19.15]]]
      }
    }
  ]
};

// Helper function to get the center point of a feature
export function getFeatureCenter(feature: Feature<Geometry, MaharashtraFeatureProperties>): [number, number] {
  const geometry = feature.geometry;
  
  if (geometry.type === 'Polygon') {
    // Calculate the centroid of the first polygon ring
    const coordinates = geometry.coordinates[0];
    let sumX = 0;
    let sumY = 0;
    
    coordinates.forEach(coord => {
      sumX += coord[0];
      sumY += coord[1];
    });
    
    return [sumX / coordinates.length, sumY / coordinates.length];
  }
  
  // Default center for other geometry types
  return [0, 0];
}

// Predefined list of region names since we need these before loading the GeoJSON
export const regionNames = [
  "Nagpur", 
  "Amravati", 
  "Chhatrapati Sambhajinagar", 
  "Nashik", 
  "Pune", 
  "Konkan"
];

// Get features by region name
export function getFeaturesByRegion(regionName: string, geoJsonData: FeatureCollection<Geometry, MaharashtraFeatureProperties>): Feature<Geometry, MaharashtraFeatureProperties>[] {
  return geoJsonData.features.filter(feature => 
    feature.properties.region === regionName
  );
}

// Map region names to their primary feature - function that returns the mapping instead of a constant
export function getRegionToFeatureMap(geoJsonData: FeatureCollection<Geometry, MaharashtraFeatureProperties>): Record<string, Feature<Geometry, MaharashtraFeatureProperties>> {
  return regionNames.reduce((acc, regionName) => {
    const features = getFeaturesByRegion(regionName, geoJsonData);
    if (features.length > 0) {
      acc[regionName] = features[0];
    }
    return acc;
  }, {} as Record<string, Feature<Geometry, MaharashtraFeatureProperties>>);
}

// Color mapping for regions
export const regionColors: Record<string, string> = {
  'Nagpur': '#E8CEAD',
  'Amravati': '#F8BFC7',
  'Chhatrapati Sambhajinagar': '#C0D1F0',
  'Nashik': '#F1E476',
  'Pune': '#ADEBAD',
  'Konkan': '#BFC0C0'
};