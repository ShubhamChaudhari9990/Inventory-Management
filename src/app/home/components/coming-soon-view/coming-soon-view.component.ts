import { TitleCasePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { getNavItemById } from '../../../shared/data/nav-items';

@Component({
  selector: 'app-coming-soon-view',
  templateUrl: './coming-soon-view.component.html',
  styleUrls: ['./coming-soon-view.component.scss'],
  imports: [TitleCasePipe, TranslatePipe],
})
export class ComingSoonViewComponent {
  readonly sectionId = input.required<string>();

  readonly sectionLabelKey = computed(() => getNavItemById(this.sectionId())?.label ?? null);
}
