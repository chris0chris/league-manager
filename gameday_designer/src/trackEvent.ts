/**
 * Track a user journey event by posting to the backend.
 * Call this utility in React apps whenever a user performs a key action.
 * Uses Django session authentication with CSRF protection.
 *
 * Example:
 *   trackEvent('gameday_created', { gameday_id: 123 })
 */
export function trackEvent(
  eventName: string,
  metadata: Record<string, unknown> = {}
): void {
  // Get CSRF token from cookie
  const getCookie = (name: string): string | null => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + '=') {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const csrftoken = getCookie('csrftoken');

  fetch('/api/journey/events/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrftoken && { 'X-CSRFToken': csrftoken }),
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
