import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  IonBackdrop,
  IonContent,
  IonMenu,
  IonSplitPane,
  MenuController,
} from '@ionic/angular/standalone';

import {
  DEFAULT_NAV_ID,
  getBottomNavItemsForRole,
  getNavItemById,
  getNavItemsForRole,
} from '../../data/nav-items';
import { NavItem } from '../../models/nav-item.model';
import { AppBottomNavComponent } from '../app-bottom-nav/app-bottom-nav.component';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';
import { RoleService } from '../../../services/role.service';
import { PermissionService } from '../../../services/permission.service';
import { AuthService } from '../../../services/auth.service';

/** Matches CSS: mobile drawer below this, persistent web sidebar at/above. */
export const DESKTOP_BREAKPOINT_PX = 1027;

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  imports: [
    IonSplitPane,
    IonMenu,
    IonContent,
    IonBackdrop,
    AppBottomNavComponent,
    AppHeaderComponent,
    AppSidebarComponent,
  ],
})
export class AppShellComponent {
  private readonly menuController = inject(MenuController);
  private readonly roleService = inject(RoleService);
  private readonly permissionService = inject(PermissionService);
  private readonly authService = inject(AuthService);

  readonly menuId = input('lodge-menu');
  readonly contentId = input('lodge-main');
  readonly activeNavId = input(DEFAULT_NAV_ID);
  readonly breadcrumb = input<string>('');

  readonly activeNavIdChange = output<string>();

  readonly navItems = computed(() =>
    getNavItemsForRole(this.roleService.currentRole() || 'owner', (perm) =>
      this.permissionService.hasPermission(perm),
    ),
  );

  readonly bottomNavItems = computed(() =>
    getBottomNavItemsForRole(this.roleService.currentRole() || 'owner', (perm) =>
      this.permissionService.hasPermission(perm),
    ),
  );

  readonly isMenuOpen = signal(false);

  readonly profileInitials = computed(() => {
    const name = this.roleService.currentUserProfile()?.name || 'PO';
    return name
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  });

  readonly profileName = computed(
    () => this.roleService.currentUserProfile()?.name || 'Property Owner',
  );

  readonly profileRole = computed(() => {
    const role = this.roleService.currentRole();
    if (!role) {
      return 'PENDING';
    }
    const designation = this.roleService.currentDesignation();
    if (designation && role === 'staff') {
      return `Staff (${designation.replace('_', ' ')})`;
    }
    return role.toUpperCase();
  });

  readonly pageTitle = computed(
    () => getNavItemById(this.activeNavId())?.label ?? 'NAV.DASHBOARD',
  );

  async openMenu(): Promise<void> {
    await this.menuController.open(this.menuId());
  }

  async closeMenu(): Promise<void> {
    await this.menuController.close(this.menuId());
  }

  onMenuWillOpen(): void {
    this.isMenuOpen.set(true);
  }

  onMenuWillClose(): void {
    this.isMenuOpen.set(false);
  }

  async onNavigate(item: NavItem): Promise<void> {
    this.activeNavIdChange.emit(item.id);
    await this.closeMenu();
  }

  onSettingsFromHeader(): void {
    this.activeNavIdChange.emit('settings');
  }

  onBottomNavNavigate(item: NavItem): void {
    this.activeNavIdChange.emit(item.id);
  }

  async onLogout(): Promise<void> {
    await this.closeMenu();
    await this.authService.logout();
  }
}
