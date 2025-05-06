import { FeatureCollection, Feature, Geometry } from 'geojson';

// This file provides the GeoJSON data for Maharashtra districts
// Simplified version for better performance

const maharashtraDistricts: FeatureCollection = {
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
        "coordinates": [[[79.2, 21.0], [79.8, 21.0], [79.8, 21.5], [79.2, 21.5], [79.2, 21.0]]]
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
        "coordinates": [[[73.5, 18.3], [74.2, 18.3], [74.2, 18.8], [73.5, 18.8], [73.5, 18.3]]]
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
        "coordinates": [[[73.6, 19.8], [74.2, 19.8], [74.2, 20.3], [73.6, 20.3], [73.6, 19.8]]]
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
        "coordinates": [[[72.5, 18.0], [73.2, 18.0], [73.2, 18.5], [72.5, 18.5], [72.5, 18.0]]]
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
        "coordinates": [[[77.5, 20.7], [78.2, 20.7], [78.2, 21.2], [77.5, 21.2], [77.5, 20.7]]]
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
        "coordinates": [[[75.0, 19.5], [75.7, 19.5], [75.7, 20.0], [75.0, 20.0], [75.0, 19.5]]]
      }
    }
  ]
};

// We can add divisional level GeoJSON here as needed
const maharashtraDivisions: FeatureCollection = {
  "type": "FeatureCollection",
  "features": [
    // These will be populated with actual division boundaries
    // Example division in Nagpur region
    {
      "type": "Feature",
      "properties": {
        "name": "Nagpur Division",
        "region": "Nagpur"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[79.0, 21.0], [79.5, 21.0], [79.5, 21.3], [79.0, 21.3], [79.0, 21.0]]]
      }
    },
    // Example division in Pune region
    {
      "type": "Feature",
      "properties": {
        "name": "Pune Division",
        "region": "Pune"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.7, 18.4], [74.0, 18.4], [74.0, 18.7], [73.7, 18.7], [73.7, 18.4]]]
      }
    }
  ]
};

// Function to get the appropriate GeoJSON based on filter level
export const getMaharashtraGeoJson = (level: string = 'region'): FeatureCollection => {
  switch (level) {
    case 'division':
      return maharashtraDivisions;
    case 'region':
    default:
      return maharashtraDistricts;
  }
};

export default getMaharashtraGeoJson;