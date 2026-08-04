import { TitleCasePipe } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-coming-soon-view',
  templateUrl: './coming-soon-view.component.html',
  styleUrls: ['./coming-soon-view.component.scss'],
  imports: [TitleCasePipe],
})
export class ComingSoonViewComponent {
  readonly sectionId = input.required<string>();
}
