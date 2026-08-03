import { AppNotification } from '../models/notification.model';

/** Demo notifications matching lodge web shell. */
export const APP_NOTIFICATIONS: readonly AppNotification[] = [
  {
    id: 'low-inventory',
    title: 'Low inventory',
    description: 'Bucket, Shampoo, Kettle below minimum',
  },
  {
    id: 'payment-due',
    title: 'Payment due',
    description: '₹3,400 pending from Sneha Patil',
  },
  {
    id: 'upcoming-checkout',
    title: 'Upcoming check-out',
    description: '4 rooms checking out before 11:00 AM',
  },
  {
    id: 'booking-reminder',
    title: 'Booking reminder',
    description: 'Kiran More arrives tomorrow, Room 307',
  },
  {
    id: 'staff-reminder',
    title: 'Staff reminder',
    description: 'Salary disbursement due in 3 days',
  },
] as const;
