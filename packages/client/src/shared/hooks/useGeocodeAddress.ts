import { useState, useCallback } from 'react';

interface GeocodeResult {
  ward_id: string;
  ward_name: string;
  municipality: string;
  county: string;
}

interface UseGeocodeAddressReturn {
  geocode: (address: string) => Promise<GeocodeResult | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function useGeocodeAddress(): UseGeocodeAddressReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const geocode = useCallback(async (address: string): Promise<GeocodeResult | null> => {
    const trimmed = address.trim();
    if (!trimmed) return null;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/wards/geocode?address=${encodeURIComponent(trimmed)}`,
      );

      if (!res.ok) {
        if (res.status === 400) {
          setError('This address does not appear to be in Wisconsin. Please enter a full Wisconsin street address.');
        } else if (res.status === 404) {
          setError('No ward boundary found at that location. The address may be outside municipal ward boundaries.');
        } else {
          setError(`Geocoding failed (error ${res.status}). Please check the address and try again.`);
        }
        return null;
      }

      const data = await res.json();
      if (data.ward) {
        return data.ward as GeocodeResult;
      }

      setError('No ward found at that address. Try a more specific street address.');
      return null;
    } catch {
      setError('Unable to connect to the geocoding service. Check your internet connection and try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { geocode, isLoading, error, clearError };
}
