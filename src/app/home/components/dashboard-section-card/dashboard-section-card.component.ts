import { Component, input } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-section-card',
  templateUrl: './dashboard-section-card.component.html',
  styleUrls: ['./dashboard-section-card.component.scss'],
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, TranslatePipe],
})
export class DashboardSectionCardComponent {
  readonly title = input('');
  readonly noPadding = input(false);
}
