import { Component, computed, inject, input, signal } from '@angular/core';
import {
  IonBackdrop,
  IonContent,
  IonMenu,
  MenuController,
} from '@ionic/angular/standalone';

import { DEFAULT_NAV_ID, getNavItemById, NAV_ITEMS } from '../../data/nav-items';
import { NavItem } from '../../models/nav-item.model';
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
    AppHeaderComponent,
    AppSidebarComponent,
  ],
})
export class AppShellComponent {
  private readonly menuController = inject(MenuController);

  readonly menuId = input('lodge-menu');
  readonly contentId = input('lodge-main');
  readonly profileInitials = input('GK');

  readonly navItems = NAV_ITEMS;
  readonly activeNavId = signal(DEFAULT_NAV_ID);
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
    this.activeNavId.set(item.id);
    await this.closeMenu();
  }

  onSettingsFromHeader(): void {
    this.activeNavId.set('settings');
  }
}
