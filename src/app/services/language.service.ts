import { Injectable, inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'en' | 'mr';

const LANGUAGE_KEY = 'app_language';
const DEFAULT_LANGUAGE: AppLanguage = 'mr';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly supportedLanguages: AppLanguage[] = ['en', 'mr'];

  async init(): Promise<void> {
    this.translate.addLangs(this.supportedLanguages);
    const { value } = await Preferences.get({ key: LANGUAGE_KEY });
    const lang = this.isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
    this.translate.use(lang);
  }

  async setLanguage(lang: AppLanguage): Promise<void> {
    this.translate.use(lang);
    await Preferences.set({ key: LANGUAGE_KEY, value: lang });
  }

  getCurrentLanguage(): AppLanguage {
    const current =
      this.translate.currentLang() ??
      this.translate.fallbackLang() ??
      DEFAULT_LANGUAGE;
    return this.isSupportedLanguage(current) ? current : DEFAULT_LANGUAGE;
  }

  private isSupportedLanguage(value: string | null | undefined): value is AppLanguage {
    return value === 'en' || value === 'mr';
  }
}
