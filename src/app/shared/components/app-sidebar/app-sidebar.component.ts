import { Component, input, output } from '@angular/core';
import {
  IonAvatar,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { NavItem } from '../../models/nav-item.model';

@Component({
  selector: 'app-sidebar',
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.scss'],
  imports: [IonAvatar, IonLabel, IonList, IonItem, IonIcon, TranslatePipe],
})
export class AppSidebarComponent {
  readonly items = input.required<readonly NavItem[]>();
  readonly activeId = input.required<string>();
  readonly brandName = input('Lemonwood Lodge');
  readonly brandSubtitle = input('BRAND.SUBTITLE');
  readonly brandInitials = input('LL');

  readonly closed = output<void>();
  readonly navigated = output<NavItem>();

  onClose(): void {
    this.closed.emit();
  }

  onNavigate(item: NavItem): void {
    this.navigated.emit(item);
  }
}
