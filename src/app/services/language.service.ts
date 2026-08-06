import { Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'en' | 'mr';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
}

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
    this.translate.addLangs(this.supportedLanguages);
    const { value } = await Preferences.get({ key: LANGUAGE_KEY });
    const lang = this.isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
    this.translate.use(lang);
    this.currentLanguage.set(lang);
  }

  async setLanguage(lang: AppLanguage): Promise<void> {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    await Preferences.set({ key: LANGUAGE_KEY, value: lang });
  }

  getCurrentLanguage(): AppLanguage {
    return this.currentLanguage();
  }

  private isSupportedLanguage(value: string | null | undefined): value is AppLanguage {
    return value === 'en' || value === 'mr';
  }
}
