import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  IonBackdrop,
  IonContent,
  IonMenu,
  MenuController,
} from '@ionic/angular/standalone';

import {
  BOTTOM_NAV_ITEMS,
  DEFAULT_NAV_ID,
  getNavItemById,
  NAV_ITEMS,
} from '../../data/nav-items';
import { NavItem } from '../../models/nav-item.model';
import { AppBottomNavComponent } from '../app-bottom-nav/app-bottom-nav.component';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  imports: [
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

  readonly menuId = input('lodge-menu');
  readonly contentId = input('lodge-main');
  readonly profileInitials = input('GK');
  readonly activeNavId = input(DEFAULT_NAV_ID);

  readonly activeNavIdChange = output<string>();

  readonly navItems = NAV_ITEMS;
  readonly bottomNavItems = BOTTOM_NAV_ITEMS;
  readonly isMenuOpen = signal(false);
  readonly pageTitle = computed(
    () => getNavItemById(this.activeNavId())?.label ?? 'Dashboard',
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
}
