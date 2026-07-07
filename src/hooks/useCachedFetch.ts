import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000;

export function useCachedFetch<T = any>(url: string, options?: { ttl?: number; enabled?: boolean }) {
  const { ttl = CACHE_TTL, enabled = true } = options || {};
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < ttl) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        setError(new Error(`HTTP ${res.status}`));
        setLoading(false);
        return;
      }
      const json = await res.json();
      cache.set(url, { data: json, timestamp: Date.now() });
      setData(json);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [url, ttl, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    cache.delete(url);
    return fetchData();
  }, [url, fetchData]);

  return { data, loading, error, refresh };
}
