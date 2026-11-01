import { useState, useEffect, useCallback } from 'react';
import { Habitation, RelocationSite, RedZonePolygon, HazardEvent } from '../types';
import { habitationsApi, sitesApi, hazardsApi } from '../api/endpoints';

interface MapDataState {
  habitations: Habitation[];
  sites: RelocationSite[];
  redZones: RedZonePolygon[];
  hazardEvents: HazardEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMapData(): MapDataState {
  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [sites, setSites] = useState<RelocationSite[]>([]);
  const [redZones, setRedZones] = useState<RedZonePolygon[]>([]);
  const [hazardEvents, setHazardEvents] = useState<HazardEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [habsData, sitesData, rzData, eventsData] = await Promise.all([
        habitationsApi.getAll(),
        sitesApi.getAll(),
        hazardsApi.getRedZoneMap(),
        hazardsApi.getEvents(),
      ]);

      setHabitations(habsData);
      setSites(sitesData);
      setRedZones(rzData);
      setHazardEvents(eventsData);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch map geospatial layers';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    habitations,
    sites,
    redZones,
    hazardEvents,
    isLoading,
    error,
    refetch: fetchData,
  };
}
