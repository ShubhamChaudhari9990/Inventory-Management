import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  checkmarkCircle,
  globeOutline,
  languageOutline,
  leaf,
  textOutline,
} from 'ionicons/icons';

import {
  AppLanguage,
  LanguageService,
} from '../services/language.service';

interface LanguageOption {
  code: AppLanguage;
  labelKey: string;
  subtitleKey: string;
  icon: string;
  iconClass: string;
}

@Component({
  selector: 'app-language-selection',
  templateUrl: './language-selection.page.html',
  styleUrls: ['./language-selection.page.scss'],
  imports: [
    RouterLink,
    TranslatePipe,
    IonContent,
    IonButton,
    IonIcon,
  ],
})
export class LanguageSelectionPage implements OnInit {
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);

  selectedLanguage: AppLanguage = 'mr';

  readonly languages: LanguageOption[] = [
    {
      code: 'en',
      labelKey: 'LANGUAGE.ENGLISH',
      subtitleKey: 'LANGUAGE.ENGLISH_SUB',
      icon: 'globe-outline',
      iconClass: 'icon-blue',
    },
    {
      code: 'mr',
      labelKey: 'LANGUAGE.MARATHI',
      subtitleKey: 'LANGUAGE.MARATHI_SUB',
      icon: 'text-outline',
      iconClass: 'icon-orange',
    },
  ];

  constructor() {
    addIcons({
      leaf,
      languageOutline,
      globeOutline,
      textOutline,
      checkmarkCircle,
      arrowForwardOutline,
    });
  }

  ngOnInit(): void {
    this.selectedLanguage = this.languageService.getCurrentLanguage();
  }

  selectLanguage(code: AppLanguage): void {
    this.selectedLanguage = code;
    void this.languageService.setLanguage(code);
  }

  continue(): void {
    void this.languageService.setLanguage(this.selectedLanguage).then(() => {
      void this.router.navigate(['/login']);
    });
  }
}
