import type { TranslationKey } from '@/i18n/en';

// Known push errors (from the push hook) shown in the current language
export const PUSH_ERRORS: Record<string, TranslationKey> = {
  'Push notification service unavailable': 'push.errUnavailable',
  'Push notifications not initialized': 'push.errNotInit',
  'Notification permission denied. Please enable in browser settings.': 'push.errDenied',
  'Notification permission required': 'push.errRequired',
  'Failed to enable notifications. Please try again.': 'push.errFailed',
  'Failed to unsubscribe': 'push.errUnsub'
};
