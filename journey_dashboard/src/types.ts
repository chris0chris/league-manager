export interface JourneyEvent {
  id: number;
  event_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Journey {
  id: number;
  user: number;
  started_at: string;
  ended_at: string | null;
  events: JourneyEvent[];
}

export interface JourneyStats {
  event_name: string;
  count: number;
}

export interface StatsResponse {
  stats: JourneyStats[];
  total_events: number;
  unique_event_types: number;
}
