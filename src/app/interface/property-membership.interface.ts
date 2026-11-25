import { UserRole } from './role.interface';
import { PermissionKey } from './permission.interface';

export interface PropertyMembership {
  id: string;
  userId: string;
  propertyId: string;
  propertyName?: string;
  organizationId: string;
  role: UserRole;
  designation?: string | null;
  assignedAt: string;
  assignedBy: string;
  status: 'active' | 'pending' | 'suspended';
  permissions?: PermissionKey[];
}

export interface UserPropertyAccess {
  userId: string;
  role: UserRole;
  organizationId: string;
  accessiblePropertyIds: string[];
  isAllPropertiesAllowed: boolean;
}
