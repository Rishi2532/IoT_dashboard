import { FeatureCollection } from 'geojson';

// Simplified GeoJSON for Maharashtra districts
// This is a placeholder - in a real implementation, this would be a more detailed GeoJSON
export const getMaharashtraGeoJson = (): FeatureCollection => {
  return {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "name": "Pune",
          "region": "Pune"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[73.8, 18.3], [74.3, 18.3], [74.3, 18.7], [73.8, 18.7], [73.8, 18.3]]]
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
          "coordinates": [[[73.7, 19.8], [74.2, 19.8], [74.2, 20.2], [73.7, 20.2], [73.7, 19.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "name": "Nagpur",
          "region": "Nagpur"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[78.9, 20.9], [79.3, 20.9], [79.3, 21.3], [78.9, 21.3], [78.9, 20.9]]]
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
          "coordinates": [[[77.5, 20.7], [78.0, 20.7], [78.0, 21.1], [77.5, 21.1], [77.5, 20.7]]]
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
          "coordinates": [[[72.8, 18.9], [73.2, 18.9], [73.2, 19.3], [72.8, 19.3], [72.8, 18.9]]]
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
          "coordinates": [[[75.1, 19.6], [75.6, 19.6], [75.6, 20.0], [75.1, 20.0], [75.1, 19.6]]]
        }
      }
    ]
  };
};

// In a production application, you would load more detailed GeoJSON data
// that would include divisions, subdivisions, circles, blocks, and villages
// The data would be structured with proper hierarchies for filtering

export default getMaharashtraGeoJson;