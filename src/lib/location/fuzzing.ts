/**
 * Server-side privacy-preserving location fuzzing utilities.
 * Ensures exact coordinates are never stored or exposed to other users.
 */

// ~111 meters per 0.001 degrees latitude
const GRID_LAT_STEP = 0.001;

function getGridLonStep(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  const cos = Math.cos(rad);
  // Prevent division by zero near poles
  const safeCos = Math.max(Math.abs(cos), 0.01);
  return 0.001 / safeCos;
}

/**
 * Snaps coordinates to a discrete ~110m grid cell, then applies a deterministic
 * pseudo-random jitter within the grid cell based on user ID and hour epoch.
 * This ensures:
 * 1. Coordinates do not jump erratically while the user is stationary.
 * 2. True coordinates are mathematically irreversible (destroyed server-side).
 * 3. Multi-point triangulation attacks are prevented.
 */
export function snapAndFuzzCoordinates(
  lat: number,
  lon: number,
  userId: string
): { fuzzedLat: number; fuzzedLon: number } {
  const lonStep = getGridLonStep(lat);

  // 1. Snap to grid cell center
  const snappedLat = Math.round(lat / GRID_LAT_STEP) * GRID_LAT_STEP;
  const snappedLon = Math.round(lon / lonStep) * lonStep;

  // 2. Deterministic pseudo-random offset within ±40% of grid cell
  const hourEpoch = Math.floor(Date.now() / (1000 * 60 * 60));
  let hash = 0;
  const seedStr = `${userId}_${hourEpoch}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }

  const normalizedX = ((hash & 0xffff) / 0xffff) * 0.8 - 0.4;
  const normalizedY = (((hash >> 16) & 0xffff) / 0xffff) * 0.8 - 0.4;

  const fuzzedLat = Number((snappedLat + normalizedY * GRID_LAT_STEP).toFixed(6));
  const fuzzedLon = Number((snappedLon + normalizedX * lonStep).toFixed(6));

  return { fuzzedLat, fuzzedLon };
}

/**
 * Converts exact distance in meters to a privacy distance band.
 * Raw distances in meters are NEVER returned to client devices.
 */
export function getDistanceBand(meters: number): 'within 100 m' | 'within 500 m' | 'within 1 km' | 'outside radius' {
  if (meters <= 100) return 'within 100 m';
  if (meters <= 500) return 'within 500 m';
  if (meters <= 1000) return 'within 1 km';
  return 'outside radius';
}

/**
 * Computes great-circle distance (Haversine formula) in meters between two lat/lon points.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
