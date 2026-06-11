import { useState, useCallback } from 'react';

interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface UseGeolocationReturn {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  getPosition: () => void;
  clear: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLoading(false);
      },
      err => {
        const msgs: Record<number, string> = {
          1: 'Permissão de localização negada.',
          2: 'Posição indisponível.',
          3: 'Tempo limite expirado.',
        };
        setError(msgs[err.code] || 'Erro ao obter localização.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const clear = useCallback(() => {
    setPosition(null);
    setError(null);
  }, []);

  return { position, error, loading, getPosition, clear };
}
