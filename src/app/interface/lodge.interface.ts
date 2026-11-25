import { Property, PropertyFilter, PropertyStatistics, PropertyStatus } from './property.interface';

export type LodgeStatus = PropertyStatus | 'archived';

export type LodgeType =
  | 'Lodge'
  | 'Hotel'
  | 'Resort'
  | 'Guest House'
  | 'Homestay'
  | 'Boutique Hotel';

export const LODGE_TYPES: readonly LodgeType[] = [
  'Lodge',
  'Hotel',
  'Resort',
  'Guest House',
  'Homestay',
  'Boutique Hotel',
];

export const PREDEFINED_FACILITIES: readonly { name: string; icon: string; defaultDesc: string }[] = [
  { name: 'Wi-Fi', icon: 'wifi-outline', defaultDesc: 'High-speed wireless internet access across property' },
  { name: 'Parking', icon: 'car-outline', defaultDesc: 'Dedicated guest vehicle parking facility' },
  { name: 'Restaurant', icon: 'restaurant-outline', defaultDesc: 'On-site dining and culinary service' },
  { name: 'Room Service', icon: 'notifications-outline', defaultDesc: 'In-room dining and housekeeping support' },
  { name: 'Swimming Pool', icon: 'water-outline', defaultDesc: 'Temperature-controlled guest swimming pool' },
  { name: 'Laundry', icon: 'shirt-outline', defaultDesc: 'Daily laundry and dry-cleaning service' },
  { name: 'Air Conditioning', icon: 'snow-outline', defaultDesc: 'Climate-controlled rooms and common areas' },
  { name: 'CCTV', icon: 'videocam-outline', defaultDesc: '24/7 security surveillance in common areas' },
  { name: 'Power Backup', icon: 'flash-outline', defaultDesc: 'Uninterrupted generator and inverter backup' },
  { name: 'Conference Hall', icon: 'people-outline', defaultDesc: 'Meeting and event space for business guests' },
];

export interface LodgeFacilityItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  active: boolean;
  isCustom?: boolean;
}

export interface LodgeContact {
  primaryPhone: string;
  alternatePhone?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
}

export interface LodgeAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LodgePropertyDetails {
  totalFloors: number;
  estimatedRoomCount: number;
  maximumGuestCapacity: number;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  timezone: string;
}

export interface LodgeGalleryItem {
  id: string;
  url: string;
  storagePath?: string;
  caption?: string;
  order: number;
  isCover?: boolean;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface LodgeImages {
  logo: string | null;
  logoPath?: string | null;
  cover: string | null;
  coverPath?: string | null;
  gallery: LodgeGalleryItem[];
}

export interface LodgeTaxSettings {
  gstNumber?: string;
  panNumber?: string;
  businessRegNumber?: string;
  invoicePrefix?: string;
  defaultTaxRate?: number;
  taxInclusive?: boolean;
}

export type LodgeDocumentCategory =
  | 'GST Certificate'
  | 'Business Registration'
  | 'Property Document'
  | 'Fire Safety Certificate'
  | 'Other Operational Document';

export const LODGE_DOCUMENT_CATEGORIES: readonly LodgeDocumentCategory[] = [
  'GST Certificate',
  'Business Registration',
  'Property Document',
  'Fire Safety Certificate',
  'Other Operational Document',
];

export interface LodgeDocumentItem {
  id: string;
  lodgeId: string;
  organizationId: string;
  title: string;
  category: LodgeDocumentCategory;
  fileType: string;
  fileSize: number;
  url: string;
  storagePath: string;
  expiryDate?: string;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByUid: string;
}

export interface LodgeSettingsData {
  lodgeId: string;
  organizationId: string;
  general: {
    displayName: string;
    shortCode: string;
    tagline: string;
    lodgeType: LodgeType;
  };
  contact: LodgeContact;
  booking: {
    allowOnlineBooking: boolean;
    requireAdvancePayment: boolean;
    advancePercentage: number;
    autoCancelUnpaidHours: number;
    allowSameDayCheckIn: boolean;
  };
  checkInOut: {
    standardCheckInTime: string;
    standardCheckOutTime: string;
    earlyCheckInAllowed: boolean;
    lateCheckOutAllowed: boolean;
    gracePeriodMinutes: number;
  };
  roomConfig: {
    defaultCurrency: string;
    allowExtraBed: boolean;
    extraBedCharge: number;
    requireIdVerification: boolean;
    autoAssignHousekeepingOnCheckout: boolean;
  };
  tax: LodgeTaxSettings;
  invoice: {
    invoicePrefix: string;
    startingNumber: number;
    footerNotes: string;
    showGstBreakdown: boolean;
  };
  notifications: {
    notifyNewBooking: boolean;
    notifyCheckInReminder: boolean;
    notifyLowInventory: boolean;
    notifyMaintenanceAlert: boolean;
  };
  operational: {
    timezone: string;
    maintenanceMode: boolean;
    housekeepingCutoffTime: string;
    nightAuditTime: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface Lodge extends Property {
  businessName?: string;
  description?: string;
  type?: LodgeType;
  country?: string;
  district?: string;
  pincode?: string;
  postalCode?: string;
  gstin?: string;
  totalFloors?: number;
  checkInTime?: string;
  checkOutTime?: string;
  currency?: string;
  timezone?: string;
  contact?: LodgeContact;
  lodgeAddress?: LodgeAddress;
  propertyDetails?: LodgePropertyDetails;
  images?: LodgeImages;
  facilityItems?: LodgeFacilityItem[];
  facilities?: string[];
  taxSettings?: LodgeTaxSettings;
  isArchived?: boolean;
  createdBy?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationReason?: string;
}

export interface LodgeFormData {
  name: string;
  code: string;
  businessName?: string;
  description?: string;
  type: LodgeType;
  status: PropertyStatus;
  contact: LodgeContact;
  lodgeAddress: LodgeAddress;
  propertyDetails: LodgePropertyDetails;
  images: LodgeImages;
  facilityItems: LodgeFacilityItem[];
  taxSettings: LodgeTaxSettings;
}

export type { PropertyFilter as LodgeFilter, PropertyStatistics as LodgeStatistics };
