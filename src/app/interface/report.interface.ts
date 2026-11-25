export type ReportType =
  | 'revenue'
  | 'expense'
  | 'pnl'
  | 'booking'
  | 'occupancy'
  | 'customer'
  | 'payment'
  | 'lodge_performance'
  | 'inventory'
  | 'staff'
  | 'housekeeping';

export interface ProfitLossRow {
  id: string;
  labelKey: string;
  amount: string;
  isTotal?: boolean;
  tone?: 'positive' | 'negative' | 'neutral' | 'success' | 'danger' | 'strong';
}

export interface ReportCard {
  id: string;
  titleKey: string;
  descKey?: string;
  value?: string;
  metaKey: string;
  icon: string;
  tone?: 'primary' | 'warm' | 'success';
}

export interface ReportExportOptions {
  reportType: ReportType;
  propertyId: string;
  startDate?: string;
  endDate?: string;
  format: 'csv' | 'excel' | 'pdf';
}
