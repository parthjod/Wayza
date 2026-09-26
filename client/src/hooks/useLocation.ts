import { useState, useCallback } from 'react';

interface LocationState {
  lat: number;
  lng: number;
}

export function useLocation() {
  const [coords, setCoords] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback((): Promise<LocationState> => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      setError(null);

      if (!navigator.geolocation) {
        const msg = 'Geolocation is not supported by your browser';
        setError(msg);
        setLoading(false);
        reject(new Error(msg));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoords(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          let msg = 'Unable to get your location';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case err.POSITION_UNAVAILABLE:
              msg = 'Location unavailable. Please try again.';
              break;
            case err.TIMEOUT:
              msg = 'Location request timed out. Please try again.';
              break;
          }
          setError(msg);
          setLoading(false);
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { requestLocation, coords, error, loading };
}
