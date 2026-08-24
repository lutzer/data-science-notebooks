import type { Int } from 'apache-arrow';
import { geoEqualEarth } from 'd3-geo';
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Position,
} from 'geojson';

const projection = geoEqualEarth().scale(150).translate([0, 0]);

/**
 * Project a single (lon, lat) pair to Cartesian Natural Earth coordinates.
 * Y is flipped so that north points up in deck.gl's screen space, matching
 * the Python prototype's `[x, -y]` convention.
 */
export function transformCoordinates(lon: number, lat: number): Position | null {
  const projected = projection([lon, lat]);
  if (projected == null) return null;
  return projected;
}

/**
 * Recursively walk a GeoJSON coordinates array and reproject every
 * `[lon, lat]` pair. Mirrors `project_coordinates` in the Python prototype.
 */
function projectCoords(coords: unknown): unknown {
  if (Array.isArray(coords) && typeof coords[0] === 'number') {
    return transformCoordinates(coords[0] as number, coords[1] as number);
  }
  return (coords as unknown[]).map(projectCoords);
}

/**
 * Reproject a GeoJSON geometry (returning a new object). Supports the
 * primitive geometry types plus GeometryCollection, matching the recursion
 * in the Python prototype's `reproject_geometry`.
 */
function reprojectGeometry(geometry: Geometry | null): Geometry | null {
  if (geometry == null) return null;
  if (geometry.type === 'GeometryCollection') {
    return {
      type: 'GeometryCollection',
      geometries: geometry.geometries
        .map(reprojectGeometry)
        .filter((g): g is Geometry => g != null),
    };
  }
  return {
    ...geometry,
    coordinates: projectCoords(
      (geometry as Exclude<Geometry, { type: 'GeometryCollection' }>).coordinates,
    ),
  } as Geometry;
}

/**
 * Reproject every feature of a GeoJSON FeatureCollection to Natural Earth.
 * Returns a new FeatureCollection; the input is not mutated.
 */
export function reprojectGeojson(fc: FeatureCollection): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map(
      (feature: Feature): Feature => ({
        ...feature,
        geometry: reprojectGeometry(feature.geometry) as Geometry,
      }),
    ),
  };
}