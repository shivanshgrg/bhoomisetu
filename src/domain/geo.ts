import type { AcquisitionParcel, GeoPoint } from './types';

function cross(o: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
}

/**
 * Andrew's monotone chain convex hull, operating directly on {lat, lng}
 * points (lng as x, lat as y — the actual axis choice doesn't matter for a
 * convex hull, only that it's consistent). Returns the hull vertices in
 * counter-clockwise order, deduplicated, with no dependency added.
 */
export function computeConvexHull(points: GeoPoint[]): GeoPoint[] {
  const sorted = Array.from(
    new Map(points.map((point) => [`${point.lat},${point.lng}`, point])).values(),
  ).sort((a, b) => (a.lng === b.lng ? a.lat - b.lat : a.lng - b.lng));

  if (sorted.length <= 2) {
    return sorted;
  }

  const lower: GeoPoint[] = [];
  for (const point of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    ) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper: GeoPoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const point = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
    ) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

const METERS_PER_DEGREE_LAT = 111_320;

// Deterministic string hash (no crypto needed — this only needs to spread
// values evenly, not resist collisions), used to give each parcel's footprint
// a small, stable, parcel-specific rotation and aspect ratio so a map full of
// polygons doesn't read as a grid of identical stamped squares.
function hashSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * A real cadastral survey would supply an actual GeoJSON polygon per parcel;
 * this dataset only has a centroid point (Step 12) plus an area, so this
 * function stands in for that missing geometry: a rectangle, centered on the
 * parcel's coordinates, sized from its real `areaHectares` (not a fixed
 * size — a 4 ha parcel visibly covers more ground than a 0.5 ha one) and
 * given a small per-parcel rotation and aspect-ratio variation (both derived
 * deterministically from the parcel id, so the same parcel always renders
 * the same footprint) so a map full of them reads as real, varied survey
 * plots rather than a stamped grid. This is disclosed as a stand-in, not
 * presented as authoritative cadastral geometry — see ParcelMap.tsx and
 * IMPLEMENTATION_PROGRESS.md Step 60.
 */
export function getParcelFootprintPolygon(parcel: Pick<AcquisitionParcel, 'id' | 'coordinates' | 'areaHectares'>): GeoPoint[] {
  const seed = hashSeed(parcel.id);
  const areaM2 = Math.max(parcel.areaHectares, 0.05) * 10_000;

  // Aspect ratio in [0.6, 1.6] and rotation in [0, 180) degrees, both derived
  // from the id hash so they're stable across renders/reloads.
  const aspect = 0.6 + ((seed % 100) / 100) * 1.0;
  const rotationDeg = ((seed >> 8) % 180) + (seed % 7);
  const rotationRad = (rotationDeg * Math.PI) / 180;

  const widthM = Math.sqrt(areaM2 * aspect);
  const heightM = areaM2 / widthM;

  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((parcel.coordinates.lat * Math.PI) / 180);

  const halfWidthDeg = widthM / 2 / metersPerDegreeLng;
  const halfHeightDeg = heightM / 2 / METERS_PER_DEGREE_LAT;

  const corners: [number, number][] = [
    [-halfWidthDeg, -halfHeightDeg],
    [halfWidthDeg, -halfHeightDeg],
    [halfWidthDeg, halfHeightDeg],
    [-halfWidthDeg, halfHeightDeg],
  ];

  return corners.map(([dx, dy]) => {
    const rotatedDx = dx * Math.cos(rotationRad) - dy * Math.sin(rotationRad);
    const rotatedDy = dx * Math.sin(rotationRad) + dy * Math.cos(rotationRad);
    return {
      lat: parcel.coordinates.lat + rotatedDy,
      lng: parcel.coordinates.lng + rotatedDx,
    };
  });
}
