import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionKey } from '../interface';
import { PermissionService } from '../services/permission.service';

export const permissionGuard: CanActivateFn = (route) => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  const requiredPermissions = route.data?.['permissions'] as PermissionKey[] | undefined;
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  const hasPermission = permissionService.hasAnyPermission(requiredPermissions);
  if (hasPermission) {
    return true;
  }

  void router.navigate(['/home']);
  return false;
};
