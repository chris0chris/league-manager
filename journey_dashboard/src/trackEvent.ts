/**
 * Track a user journey event by posting to the backend.
 * Call this utility in React apps whenever a user performs a key action.
 *
 * Example:
 *   trackEvent('gameday_created', { gameday_id: 123 })
 */
export function trackEvent(
  eventName: string,
  metadata: Record<string, unknown> = {}
): void {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('trackEvent: No authToken found in localStorage');
    return;
  }

  fetch('/api/journey/events/', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_name: eventName,
      metadata,
    }),
  }).catch((err) => {
    // Silently fail — tracking loss is acceptable
    console.error('trackEvent error:', err);
  });
}
