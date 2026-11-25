export interface BusinessProfileSettings {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  logoUrl?: string;
  gstin?: string;
}

export interface LodgeOperationalSettings {
  checkInTime: string;
  checkOutTime: string;
  defaultRoomPrice: number;
  baseTaxPercent: number;
  serviceChargePercent: number;
  taxInclusive: boolean;
  cancellationPolicy: string;
}

export interface NotificationSettings {
  bookingNotifications: boolean;
  paymentNotifications: boolean;
  lowStockAlerts: boolean;
  housekeepingAlerts: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
}

export interface FinancialSettings {
  currency: string;
  currencySymbol: string;
  invoicePrefix: string;
  receiptPrefix: string;
  termsAndConditions?: string;
}

export interface OwnerSettings {
  businessProfile: BusinessProfileSettings;
  lodgeSettings: LodgeOperationalSettings;
  notifications: NotificationSettings;
  financial: FinancialSettings;
}
