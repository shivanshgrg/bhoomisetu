import type { GeoPoint } from './types';

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
