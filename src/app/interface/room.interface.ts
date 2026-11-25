export type RoomStatus =
  | 'All'
  | 'Available'
  | 'Occupied'
  | 'Reserved'
  | 'Dirty'
  | 'Cleaning'
  | 'Inspection'
  | 'Maintenance'
  | 'Out of Service';

export type OperationalRoomStatus =
  | 'active'
  | 'cleaning'
  | 'maintenance'
  | 'blocked'
  | 'inactive';

export type BedType = 'Single' | 'Double' | 'Queen' | 'King' | 'Twin' | 'Bunk';

export const BED_TYPES: readonly BedType[] = [
  'Single',
  'Double',
  'Queen',
  'King',
  'Twin',
  'Bunk',
];

export const PREDEFINED_ROOM_AMENITIES: readonly string[] = [
  'Air Conditioning',
  'TV',
  'Wi-Fi',
  'Attached Bathroom',
  'Balcony',
  'Refrigerator',
  'Wardrobe',
  'Hot Water',
  'Desk',
  'Room Service',
];

export type RoomViewMode = 'grid' | 'list';

export interface RoomGalleryImage {
  id: string;
  url: string;
  storagePath?: string;
  caption?: string;
  uploadedAt: string;
}

export interface RoomTaxConfig {
  taxRate: number;
  taxInclusive: boolean;
}

export interface RoomItem {
  id: string;
  organizationId?: string;
  propertyId?: string;
  number: string;
  roomName?: string;
  roomCode?: string;
  floorId?: string;
  floor: string;
  roomTypeId?: string;
  type: string;
  description?: string;

  // Occupancy
  maximumAdults?: number;
  maximumChildren?: number;
  maximumOccupancy?: number;
  capacity?: number;
  beds?: number;
  bedConfiguration?: BedType;

  // Pricing
  basePrice?: number;
  weekdayPrice?: number;
  weekendPrice?: number;
  extraAdultCharge?: number;
  extraChildCharge?: number;
  currency?: string;
  taxConfiguration?: RoomTaxConfig;
  price: string;
  additionalCharges?: string;

  // Amenities & Media
  amenities?: string[];
  primaryImageUrl?: string;
  primaryImagePath?: string;
  galleryImages?: RoomGalleryImage[];
  images?: string[];

  // Additional Info
  roomSize?: string;
  smokingPolicy?: 'Non-Smoking' | 'Smoking Allowed' | 'Balcony Only';
  accessibilityInfo?: string;
  internalNotes?: string;

  // Statuses (Separated operational vs lifecycle vs housekeeping)
  operationalStatus?: OperationalRoomStatus;
  housekeepingStatus?: 'Clean' | 'Dirty' | 'Cleaning' | 'Inspection Pending' | 'Inspected' | 'Out of Service';
  status: Exclude<RoomStatus, 'All'>;
  guestName?: string;
  guestDate?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  lastCleaned?: string;
  lastInspectedAt?: string;
  lastInspectedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FloorItem {
  id: string;
  organizationId: string;
  propertyId: string;
  floorName: string;
  floorNumber: number;
  description?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomType {
  id: string;
  organizationId?: string;
  propertyId: string;
  name: string;
  description?: string;
  defaultAdultCapacity?: number;
  defaultChildCapacity?: number;
  defaultBedConfiguration?: BedType;
  defaultBeds?: number;
  basePrice: number;
  weekdayPrice?: number;
  weekendPrice?: number;
  capacity: number;
  amenities: string[];
  images?: string[];
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomPricingRule {
  id: string;
  organizationId: string;
  propertyId: string;
  roomTypeId?: string;
  roomId?: string;
  title: string;
  ruleType: 'seasonal' | 'special_date';
  startDate: string;
  endDate: string;
  priceOverride?: number;
  percentageAdjustment?: number;
  isActive: boolean;
  createdAt?: string;
}

export interface RoomActivityItem {
  id: string;
  roomId: string;
  action: string;
  details: string;
  performedBy: string;
  timestamp: string;
}

export interface BulkRoomCreateData {
  propertyId: string;
  floor: string;
  type: string;
  pricePerNight: string;
  startRoomNumber: number;
  count: number;
  capacity?: number;
  beds?: number;
  amenities?: string[];
}
