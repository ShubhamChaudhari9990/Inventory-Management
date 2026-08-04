import { Component, input } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/angular/standalone';

@Component({
  selector: 'app-dashboard-section-card',
  templateUrl: './dashboard-section-card.component.html',
  styleUrls: ['./dashboard-section-card.component.scss'],
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent],
})
export class DashboardSectionCardComponent {
  readonly title = input('');
  readonly noPadding = input(false);
}
