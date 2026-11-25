import { UserRole } from './role.interface';
import { PermissionKey } from './permission.interface';

export type AccountStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'rejected'
  | 'inactive';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role?: UserRole | null;
  organizationId?: string;
  propertyIds?: string[];
  designation?: string | null;
  permissions?: PermissionKey[];
  accountStatus: AccountStatus;
  status?: AccountStatus;
  isActive?: boolean;
  assignedBy?: string;
  assignedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  profile: UserProfile | null;
}

export interface UserRoleAssignment {
  userId: string;
  role: UserRole;
  propertyIds: string[];
  designation?: string;
  permissions?: PermissionKey[];
}

export interface UserActivityLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details?: string;
}
