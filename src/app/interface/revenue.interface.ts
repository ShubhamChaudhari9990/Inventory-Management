export type RevenuePeriod = 'today' | 'week' | 'month' | 'year';

export interface RevenuePayment {
  id: string;
  propertyId?: string;
  guest: string;
  room?: string;
  amount: string;
  numericAmount?: number;
  method: string;
  time: string;
  status?: string;
  source?: string;
  category?: 'room' | 'service' | 'other';
}

export interface RevenueMetricBreakdown {
  period: string;
  amount: number;
  label: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  roomRevenue: number;
  serviceRevenue: number;
  byPaymentMethod: Record<string, number>;
  byBookingSource: Record<string, number>;
  byLodge: Record<string, number>;
}
