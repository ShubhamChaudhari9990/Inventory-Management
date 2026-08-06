import {
  Component,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import {
  LANGUAGE_OPTIONS,
  LanguageOption,
  LanguageService,
} from '../../../services/language.service';
import { APP_NOTIFICATIONS } from '../../data/notifications';
import { AppNotification } from '../../models/notification.model';

type HeaderMenu = 'language' | 'notifications' | 'profile';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  imports: [IonButton, IonIcon, IonList, IonItem, IonLabel, TranslatePipe],
})
export class AppHeaderComponent {
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  readonly title = input.required<string>();
  readonly profileInitials = input('GK');
  readonly profileName = input('Ganesh Kadam');
  readonly profileRole = input('Super Admin');

  readonly menuClick = output<void>();
  readonly settingsClick = output<void>();
  readonly logoutClick = output<void>();
  readonly notificationClick = output<AppNotification>();

  readonly languageOptions = LANGUAGE_OPTIONS;
  readonly notifications = APP_NOTIFICATIONS;
  readonly hasNotifications = computed(() => this.notifications.length > 0);
  /** Shared with Settings via LanguageService — stays in sync both ways. */
  readonly currentLanguage = this.languageService.currentLanguage;
  readonly openMenu = signal<HeaderMenu | null>(null);

  readonly isLanguageMenuOpen = computed(() => this.openMenu() === 'language');
  readonly isNotificationsMenuOpen = computed(
    () => this.openMenu() === 'notifications',
  );
  readonly isProfileMenuOpen = computed(() => this.openMenu() === 'profile');

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenu.set(null);
  }

  onMenuClick(): void {
    this.menuClick.emit();
  }

  onLanguageButtonClick(event: Event): void {
    this.toggleMenu('language', event);
  }

  async onLanguageSelect(
    option: LanguageOption,
    event: Event,
  ): Promise<void> {
    event.stopPropagation();
    await this.languageService.setLanguage(option.code);
    this.openMenu.set(null);
  }

  onNotificationsButtonClick(event: Event): void {
    this.toggleMenu('notifications', event);
  }

  onNotificationClick(notification: AppNotification, event: Event): void {
    event.stopPropagation();
    this.openMenu.set(null);
    this.notificationClick.emit(notification);
  }

  onProfileButtonClick(event: Event): void {
    this.toggleMenu('profile', event);
  }

  onSettingsClick(event: Event): void {
    event.stopPropagation();
    this.openMenu.set(null);
    this.settingsClick.emit();
  }

  async onLogoutClick(event: Event): Promise<void> {
    event.stopPropagation();
    this.openMenu.set(null);
    this.logoutClick.emit();
    await this.router.navigateByUrl('/login');
  }

  private toggleMenu(menu: HeaderMenu, event: Event): void {
    event.stopPropagation();
    this.openMenu.update((current) => (current === menu ? null : menu));
  }
}
