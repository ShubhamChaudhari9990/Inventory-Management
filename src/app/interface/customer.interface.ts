export type CustomerPaymentStatus = 'Paid' | 'Due' | 'Settled';
export type CustomerIdType = 'Aadhaar' | 'PAN' | 'Passport' | 'Driving License' | 'Voter ID' | string;
export type CustomerType = 'Regular' | 'VIP' | 'Corporate';
export type CustomerAccountStatus = 'active' | 'inactive';

export interface CustomerNoteItem {
  id: string;
  customerId: string;
  content: string;
  authorName: string;
  authorUid: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerActivityItem {
  id: string;
  customerId: string;
  action: string;
  details: string;
  performedBy: string;
  timestamp: string;
}

export interface CustomerStatsSummary {
  totalBookings: number;
  completedStays: number;
  cancelledBookings: number;
  totalNights: number;
  lastVisit: string | null;
  upcomingBookings: number;
  isReturning: boolean;
}

export interface CustomerItem {
  id: string;
  organizationId?: string;
  propertyId?: string;
  initials: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name: string;
  phone: string;
  normalizedPhone?: string;
  email?: string;
  normalizedEmail?: string;
  gender?: 'Male' | 'Female' | 'Other' | '';
  dateOfBirth?: string;
  photoUrl?: string;
  photoPath?: string;
  address?: string;
  fullAddress?: string;
  city: string;
  state?: string;
  country?: string;
  pincode?: string;
  room?: string;
  idType: CustomerIdType;
  idNumber: string;
  customerType?: CustomerType;
  preferences?: string;
  specialRequirements?: string;
  customerStatus?: CustomerAccountStatus;
  status: CustomerPaymentStatus;
  visits: number;
  totalBookings?: number;
  totalNights?: number;
  due: string;
  totalSpent?: string;
  lastVisit?: string;
  notes?: string;
  isRepeatCustomer?: boolean;
  registeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CustomerFormData {
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  gender?: 'Male' | 'Female' | 'Other' | '';
  dateOfBirth?: string;
  photoUrl?: string;
  photoPath?: string;
  address?: string;
  city: string;
  state?: string;
  country?: string;
  pincode?: string;
  idType: CustomerIdType;
  idNumber: string;
  customerType?: CustomerType;
  preferences?: string;
  specialRequirements?: string;
  customerStatus?: CustomerAccountStatus;
  propertyId?: string;
  notes?: string;
}
