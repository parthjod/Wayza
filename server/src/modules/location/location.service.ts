import prisma from '../../config/db';
import axios from 'axios';
import { createError } from '../../middleware/errorHandler';

export class LocationService {
  async getCampusPOIs() {
    const pois = await prisma.campusPOI.findMany({
      select: { id: true, label: true, lat: true, lng: true },
    });
    return { pois };
  }

  async autocomplete(query: string) {
    if (!query || query.trim().length < 2) {
      return { results: [] };
    }

    const sanitized = query.trim().replace(/[%_]/g, '');

    // 1. Search local CampusPOI table first
    const localResults = await prisma.campusPOI.findMany({
      where: {
        OR: [
          { name: { contains: sanitized, mode: 'insensitive' } },
          { label: { contains: sanitized, mode: 'insensitive' } },
        ],
      },
      select: { label: true, lat: true, lng: true },
      take: 4,
    });

    const results: Array<{ label: string; lat: number; lng: number }> = [...localResults];

    // 2. Fetch from Photon (OSM geocoder, fast & built for typeahead autocomplete)
    try {
      // Bias towards Pune coordinates (lat: 18.518, lon: 73.815)
      const photonRes = await axios.get('https://photon.komoot.io/api/', {
        params: {
          q: sanitized,
          lat: 18.518,
          lon: 73.815,
          limit: 8,
        },
        timeout: 3000,
      });

      if (photonRes.data?.features && Array.isArray(photonRes.data.features)) {
        for (const feat of photonRes.data.features) {
          const props = feat.properties || {};
          const coords = feat.geometry?.coordinates;
          if (!coords || coords.length < 2) continue;

          // Build clean readable label: e.g. "Kothrud, Karve Nagar, Pune"
          const parts = [
            props.name,
            props.district || props.locality,
            props.city,
            props.state,
          ].filter(Boolean);

          const label = Array.from(new Set(parts)).join(', ');
          if (!label) continue;

          const lat = coords[1];
          const lng = coords[0];

          const exists = results.some(
            (r) =>
              r.label.toLowerCase() === label.toLowerCase() ||
              (Math.abs(r.lat - lat) < 0.0005 && Math.abs(r.lng - lng) < 0.0005)
          );

          if (!exists) {
            results.push({ label, lat, lng });
          }
        }
      }
    } catch {
      // 3. Fallback to Nominatim if Photon is unavailable
      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: sanitized,
            format: 'json',
            limit: 6,
            countrycodes: 'in',
            addressdetails: 1,
          },
          headers: {
            'User-Agent': 'WayzaApp/1.0 (contact@wayza.in)',
          },
          timeout: 3500,
        });

        if (Array.isArray(response.data)) {
          for (const item of response.data) {
            const address = item.address || {};
            const parts = [
              item.name || address.suburb || address.neighbourhood,
              address.suburb || address.neighbourhood,
              address.city || address.town || address.county,
              address.state,
            ].filter(Boolean);

            const label =
              Array.from(new Set(parts)).join(', ') || item.display_name?.substring(0, 100);
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);

            const exists = results.some(
              (r) =>
                r.label.toLowerCase() === label.toLowerCase() ||
                (Math.abs(r.lat - lat) < 0.0005 && Math.abs(r.lng - lng) < 0.0005)
            );

            if (!exists) {
              results.push({ label, lat, lng });
            }
          }
        }
      } catch {
        // silent fallback
      }
    }

    return { results: results.slice(0, 8) };
  }
}

export const locationService = new LocationService();
