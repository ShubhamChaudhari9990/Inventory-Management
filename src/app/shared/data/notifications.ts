import { AppNotification } from '../models/notification.model';

/** Demo notifications matching lodge web shell. Titles/descriptions are i18n keys. */
export const APP_NOTIFICATIONS: readonly AppNotification[] = [
  {
    id: 'low-inventory',
    title: 'NOTIFICATIONS.LOW_INVENTORY_TITLE',
    description: 'NOTIFICATIONS.LOW_INVENTORY_DESC',
  },
  {
    id: 'payment-due',
    title: 'NOTIFICATIONS.PAYMENT_DUE_TITLE',
    description: 'NOTIFICATIONS.PAYMENT_DUE_DESC',
  },
  {
    id: 'upcoming-checkout',
    title: 'NOTIFICATIONS.UPCOMING_CHECKOUT_TITLE',
    description: 'NOTIFICATIONS.UPCOMING_CHECKOUT_DESC',
  },
  {
    id: 'booking-reminder',
    title: 'NOTIFICATIONS.BOOKING_REMINDER_TITLE',
    description: 'NOTIFICATIONS.BOOKING_REMINDER_DESC',
  },
  {
    id: 'staff-reminder',
    title: 'NOTIFICATIONS.STAFF_REMINDER_TITLE',
    description: 'NOTIFICATIONS.STAFF_REMINDER_DESC',
  },
] as const;
