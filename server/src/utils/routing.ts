import { haversineDistance } from './haversine';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

/**
 * Calculates real-world road driving distance matrix between multiple coordinates using OSRM.
 * Falls back to Haversine distance with an urban detour multiplier (1.3x) if OSRM is unreachable or times out.
 *
 * @param coords Array of { lat, lng } points
 * @param timeoutMs Maximum milliseconds to wait before falling back (default 2500ms)
 * @returns 2D matrix of driving distances in meters: matrix[i][j] = distance from coords[i] to coords[j]
 */
export async function getRoadDistanceMatrix(
  coords: LatLngPoint[],
  timeoutMs = 2500
): Promise<number[][]> {
  const n = coords.length;

  // Build fallback matrix using Haversine with an urban circuity/detour factor of 1.3
  const fallbackMatrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 0;
      const h = haversineDistance(coords[i].lat, coords[i].lng, coords[j].lat, coords[j].lng);
      return Math.round(h * 1.3);
    })
  );

  if (n <= 1) return fallbackMatrix;

  try {
    // OSRM expects coordinates formatted as {longitude},{latitude} separated by semicolons
    const locString = coords.map((c) => `${c.lng},${c.lat}`).join(';');
    const url = `https://router.project-osrm.org/table/v1/driving/${locString}?annotations=distance`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await (globalThis as any).fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data: any = await res.json();
      if (data && data.code === 'Ok' && Array.isArray(data.distances)) {
        return data.distances.map((row: any[], i: number) =>
          row.map((val: any, j: number) => {
            if (typeof val === 'number' && !isNaN(val)) {
              return Math.round(val);
            }
            return fallbackMatrix[i][j];
          })
        );
      }
    }
  } catch (err) {
    // Graceful fallback to Haversine * 1.3 on any network/timeout error
  }

  return fallbackMatrix;
}

/**
 * Calculates real-world road driving distance between two points in meters.
 */
export async function getRoadDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number> {
  const matrix = await getRoadDistanceMatrix([
    { lat: lat1, lng: lng1 },
    { lat: lat2, lng: lng2 },
  ]);
  return matrix[0][1];
}

