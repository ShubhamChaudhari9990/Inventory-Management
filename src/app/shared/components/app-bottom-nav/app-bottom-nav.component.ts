import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';

import { NavItem } from '../../models/nav-item.model';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './app-bottom-nav.component.html',
  styleUrls: ['./app-bottom-nav.component.scss'],
  imports: [IonIcon],
})
export class AppBottomNavComponent {
  readonly items = input.required<readonly NavItem[]>();
  readonly activeId = input.required<string>();

  readonly navigated = output<NavItem>();

  onNavigate(item: NavItem): void {
    this.navigated.emit(item);
  }
}
