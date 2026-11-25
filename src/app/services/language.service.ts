import { Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { AppLanguage, LanguageOption } from '../interface';

export type { AppLanguage, LanguageOption };

const LANGUAGE_KEY = 'app_language';
const DEFAULT_LANGUAGE: AppLanguage = 'mr';

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
] as const;

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly supportedLanguages: AppLanguage[] = ['en', 'mr'];
  readonly languageOptions = LANGUAGE_OPTIONS;

  /** Shared reactive language — header + settings both bind to this. */
  readonly currentLanguage = signal<AppLanguage>(DEFAULT_LANGUAGE);

  async init(): Promise<void> {
    try {
      this.translate.addLangs(this.supportedLanguages);
      this.translate.setFallbackLang('en');

      // Protect against hanging or errors during startup on native devices
      const preferencePromise = Preferences.get({ key: LANGUAGE_KEY })
        .then((res) => res?.value)
        .catch(() => null);

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 1000),
      );

      const value = await Promise.race([preferencePromise, timeoutPromise]);
      const lang = this.isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
      this.applyLanguageToDom(lang);
      this.translate.use(lang);
      this.currentLanguage.set(lang);
    } catch (error) {
      console.warn('LanguageService init fallback:', error);
      this.applyLanguageToDom(DEFAULT_LANGUAGE);
      this.translate.use(DEFAULT_LANGUAGE);
      this.currentLanguage.set(DEFAULT_LANGUAGE);
    }
  }

  async setLanguage(lang: AppLanguage): Promise<void> {
    this.applyLanguageToDom(lang);
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    try {
      await Preferences.set({ key: LANGUAGE_KEY, value: lang });
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  }

  private applyLanguageToDom(lang: AppLanguage): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.setAttribute('lang', lang);
      document.body.classList.toggle('lang-mr', lang === 'mr');
      document.body.classList.toggle('lang-en', lang === 'en');
    }
  }

  getCurrentLanguage(): AppLanguage {
    return this.currentLanguage();
  }

  private isSupportedLanguage(value: string | null | undefined): value is AppLanguage {
    return value === 'en' || value === 'mr';
  }
}
