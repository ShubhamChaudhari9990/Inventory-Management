import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { MoreMenuItem } from '../../data/more-menu.data';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';

@Component({
  selector: 'app-more-menu-view',
  templateUrl: './more-menu-view.component.html',
  styleUrls: ['./more-menu-view.component.scss'],
  imports: [IonIcon, DashboardSectionCardComponent, TranslatePipe],
})
export class MoreMenuViewComponent {
  readonly items = input.required<readonly MoreMenuItem[]>();
  readonly subtitle = input('BRAND.NAME');

  readonly itemClick = output<MoreMenuItem>();

  onItemClick(item: MoreMenuItem): void {
    this.itemClick.emit(item);
  }
}
