import { Component, computed, inject, input, output } from '@angular/core';
import {
  IonAvatar,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { constructOutline, logOutOutline } from 'ionicons/icons';

import { NavItem } from '../../models/nav-item.model';
import { RoleService } from '../../../services/role.service';
import { PropertyService } from '../../../services/property.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.scss'],
  imports: [IonAvatar, IonLabel, IonList, IonItem, IonIcon, TranslatePipe],
})
export class AppSidebarComponent {
  private readonly roleService = inject(RoleService);
  private readonly propertyService = inject(PropertyService);

  readonly items = input.required<readonly NavItem[]>();
  readonly activeId = input.required<string>();
  readonly brandName = input('LemonWood');
  readonly brandSubtitle = input('BRAND.SUBTITLE');
  readonly brandInitials = input('LW');

  readonly closed = output<void>();
  readonly navigated = output<NavItem>();
  readonly logoutClick = output<void>();

  constructor() {
    addIcons({ constructOutline, logOutOutline });
  }

  readonly currentRole = this.roleService.currentRole;
  readonly roleBadgeText = computed(() => {
    const role = this.roleService.currentRole();
    if (!role) {
      return 'PENDING';
    }
    const des = this.roleService.currentDesignation();
    if (role === 'staff' && des) {
      return `Staff · ${des}`;
    }
    return role.toUpperCase();
  });
  readonly selectedPropertyName = this.propertyService.selectedPropertyName;

  onClose(): void {
    this.closed.emit();
  }

  onNavigate(item: NavItem): void {
    this.navigated.emit(item);
  }

  onLogout(): void {
    this.logoutClick.emit();
  }
}
