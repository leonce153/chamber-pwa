/**
 * Notifications a viewer has cleared on this device. Stored only in this browser,
 * so clearing never affects anyone else. Lists listen for HIDDEN_EVENT to refresh.
 */
const KEY = 'chamber_hidden_notifications';
const MAX = 300;
export const HIDDEN_EVENT = 'chamber-hidden-notifications';

export function hiddenNotificationIds(): Set<string> {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function hideNotifications(ids: string[]): void {
  const all = [...hiddenNotificationIds(), ...ids];
  try {
    localStorage.setItem(KEY, JSON.stringify([...new Set(all)].slice(-MAX)));
  } catch {
    /* storage unavailable: nothing to keep */
  }
  window.dispatchEvent(new Event(HIDDEN_EVENT));
}
