import { Component } from '@angular/core';

import { AppShellComponent } from '../shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [AppShellComponent],
})
export class HomePage {}
