import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, saveOutline, settingsOutline } from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { LODGE_TYPES, Lodge, LodgeSettingsData } from '../../interface';
import { LodgeService } from '../../services/lodge.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from '../lodge-form/lodge-form.page';

@Component({
  selector: 'app-lodge-settings',
  templateUrl: './lodge-settings.page.html',
  styleUrls: ['./lodge-settings.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonSpinner, AppShellComponent],
})
export class LodgeSettingsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lodgeService = inject(LodgeService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly lodgeId = signal('');
  readonly lodge = signal<Lodge | undefined>(undefined);
  readonly settings = signal<LodgeSettingsData | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);

  readonly lodgeTypes = LODGE_TYPES;
  readonly currencies = CURRENCY_OPTIONS;
  readonly timezones = TIMEZONE_OPTIONS;

  constructor() {
    addIcons({ arrowBackOutline, saveOutline, settingsOutline });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('lodgeId') || '';
    this.lodgeId.set(id);
    this.lodge.set(this.lodgeService.getLodgeById(id));

    if (!id || !this.roleService.canAccessProperty(id) || this.roleService.isStaff()) {
      this.toast.error('Unauthorized access to lodge settings.');
      void this.router.navigate(['/lodges']);
      return;
    }

    try {
      const data = await this.lodgeService.getLodgeSettings(id);
      this.settings.set(data);
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to load lodge settings.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSave(): Promise<void> {
    const s = this.settings();
    if (!s || this.isSaving()) return;

    this.isSaving.set(true);
    try {
      await this.lodgeService.saveLodgeSettings(this.lodgeId(), s);
      this.toast.success('Lodge settings saved successfully.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to save settings.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    void this.router.navigate(['/lodges', this.lodgeId()]);
  }

  onNavChange(navId: string): void {
    if (navId === 'lodges') {
      void this.router.navigate(['/lodges']);
      return;
    }
    const role = this.roleService.currentRole();
    const target = role === 'owner' ? '/owner/dashboard' : '/manager/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
