import { Journey, JourneyEvent, StatsResponse } from '../types';

const BASE_URL = '/api/journey';

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  
  return headers;
}

export async function fetchJourneys(userId?: number): Promise<Journey[]> {
  const url = userId ? `${BASE_URL}/journeys/?user=${userId}` : `${BASE_URL}/journeys/`;
  const res = await fetch(url, {
    headers: getAuthHeader(),
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`Failed to fetch journeys: ${res.statusText}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || []);
}

export async function fetchEvents(journeyId: number): Promise<JourneyEvent[]> {
  const url = `${BASE_URL}/events/?journey=${journeyId}`;
  const res = await fetch(url, {
    headers: getAuthHeader(),
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || []);
}

export async function fetchStats(): Promise<StatsResponse> {
  const url = `${BASE_URL}/events/stats/`;
  const res = await fetch(url, { 
    headers: getAuthHeader(),
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  return res.json();
}

export async function recordEvent(
  eventName: string,
  metadata?: Record<string, unknown>
): Promise<JourneyEvent> {
  const url = `${BASE_URL}/events/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeader(),
    credentials: 'include',
    body: JSON.stringify({ event_name: eventName, metadata: metadata || {} }),
  });
  if (!res.ok) throw new Error(`Failed to record event: ${res.statusText}`);
  return res.json();
}

export async function getGamedayEvents(userId: string): Promise<JourneyEvent[]> {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const url = `${BASE_URL}/events/?user_id=${userId}`;
  const res = await fetch(url, {
    headers: getAuthHeader(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);

  const data = await res.json();
  const allEvents = Array.isArray(data) ? data : (data.results || []);

  return allEvents.filter((event: JourneyEvent) =>
    event.event_name.startsWith('gameday_') || event.event_name.startsWith('template_')
  );
}
