import { Component, input, output } from '@angular/core';
import {
  IonAvatar,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  bedOutline,
  calendarOutline,
  cashOutline,
  cubeOutline,
  gridOutline,
  peopleOutline,
  personCircleOutline,
  receiptOutline,
  settingsOutline,
  sparklesOutline,
} from 'ionicons/icons';

import { NavItem } from '../../models/nav-item.model';

@Component({
  selector: 'app-sidebar',
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.scss'],
  imports: [IonAvatar, IonLabel, IonList, IonItem, IonIcon],
})
export class AppSidebarComponent {
  readonly items = input.required<readonly NavItem[]>();
  readonly activeId = input.required<string>();
  readonly brandName = input('Lemonwood Lodge');
  readonly brandSubtitle = input('Lodge Management System');
  readonly brandInitials = input('LL');

  readonly closed = output<void>();
  readonly navigated = output<NavItem>();

  constructor() {
    addIcons({
      'grid-outline': gridOutline,
      'bed-outline': bedOutline,
      'calendar-outline': calendarOutline,
      'people-outline': peopleOutline,
      'cube-outline': cubeOutline,
      'cash-outline': cashOutline,
      'receipt-outline': receiptOutline,
      'person-circle-outline': personCircleOutline,
      'sparkles-outline': sparklesOutline,
      'bar-chart-outline': barChartOutline,
      'settings-outline': settingsOutline,
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  onNavigate(item: NavItem): void {
    this.navigated.emit(item);
  }
}
