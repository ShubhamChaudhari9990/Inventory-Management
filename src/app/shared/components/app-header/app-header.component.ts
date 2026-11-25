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
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  appsOutline,
  businessOutline,
  checkmarkOutline,
  chevronDownOutline,
  globeOutline,
  languageOutline,
  logOutOutline,
  menuOutline,
  personOutline,
  settingsOutline,
} from 'ionicons/icons';

import {
  LANGUAGE_OPTIONS,
  LanguageOption,
  LanguageService,
} from '../../../services/language.service';
import { Property, UserRole } from '../../../interface';
import { PropertyService } from '../../../services/property.service';
import { RoleService } from '../../../services/role.service';

type HeaderMenu = 'language' | 'profile' | 'lodge';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  imports: [IonIcon, TranslatePipe],
})
export class AppHeaderComponent {
  private readonly languageService = inject(LanguageService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);

  readonly title = input<string>('');
  readonly breadcrumb = input<string>('');
  readonly profileInitials = input('PO');
  readonly profileName = input('Property Owner');
  readonly profileRole = input('OWNER');

  readonly menuClick = output<void>();
  readonly settingsClick = output<void>();
  readonly logoutClick = output<void>();

  readonly languageOptions = LANGUAGE_OPTIONS;
  /** Shared with Settings via LanguageService — stays in sync both ways. */
  readonly currentLanguage = this.languageService.currentLanguage;
  readonly openMenu = signal<HeaderMenu | null>(null);

  readonly isLanguageMenuOpen = computed(() => this.openMenu() === 'language');
  readonly isProfileMenuOpen = computed(() => this.openMenu() === 'profile');
  readonly isLodgeMenuOpen = computed(() => this.openMenu() === 'lodge');

  // Multi-Lodge & Role States
  readonly isOwner = this.roleService.isOwner;
  readonly isManager = this.roleService.isManager;
  readonly isStaff = this.roleService.isStaff;
  readonly currentRole = this.roleService.currentRole;
  readonly currentDesignation = this.roleService.currentDesignation;
  readonly selectedPropertyId = this.propertyService.selectedPropertyId;
  readonly accessibleProperties = this.propertyService.accessibleProperties;
  readonly selectedPropertyName = this.propertyService.selectedPropertyName;

  // Single assigned property for Manager / Staff
  readonly assignedProperty = computed<Property | null>(() => {
    return this.propertyService.currentProperty() || this.accessibleProperties()[0] || null;
  });

  constructor() {
    addIcons({
      appsOutline,
      businessOutline,
      checkmarkOutline,
      chevronDownOutline,
      globeOutline,
      languageOutline,
      logOutOutline,
      menuOutline,
      personOutline,
      settingsOutline,
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenu.set(null);
  }

  onMenuClick(): void {
    this.menuClick.emit();
  }

  onLodgeButtonClick(event: Event): void {
    // Only Owners can toggle lodge selection dropdown
    if (this.isOwner()) {
      this.toggleMenu('lodge', event);
    }
  }

  onSelectLodge(id: string, event: Event): void {
    event.stopPropagation();
    this.propertyService.switchProperty(id);
    this.openMenu.set(null);
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

  onProfileButtonClick(event: Event): void {
    this.toggleMenu('profile', event);
  }

  onSwitchRole(role: UserRole, event: Event): void {
    event.stopPropagation();
    this.roleService.switchRole(role);
    if (role === 'owner') {
      this.propertyService.switchProperty('all');
      void this.router.navigate(['/owner/dashboard']);
    } else if (role === 'manager') {
      const allowed = this.roleService.assignedPropertyIds();
      this.propertyService.switchProperty(allowed[0] || '');
      void this.router.navigate(['/manager/dashboard']);
    } else {
      const allowed = this.roleService.assignedPropertyIds();
      this.propertyService.switchProperty(allowed[0] || '');
      void this.router.navigate(['/staff/dashboard']);
    }
    this.openMenu.set(null);
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
