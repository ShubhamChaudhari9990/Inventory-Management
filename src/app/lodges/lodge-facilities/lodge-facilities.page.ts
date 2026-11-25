import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  createOutline,
  saveOutline,
  trashOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  Lodge,
  LodgeFacilityItem,
  PREDEFINED_FACILITIES,
} from '../../interface';
import { LodgeService } from '../../services/lodge.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-lodge-facilities',
  templateUrl: './lodge-facilities.page.html',
  styleUrls: ['./lodge-facilities.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonSpinner, AppShellComponent],
})
export class LodgeFacilitiesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lodgeService = inject(LodgeService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly lodgeId = signal('');
  readonly lodge = computed<Lodge | undefined>(() =>
    this.lodgeService.getLodgeById(this.lodgeId()),
  );
  readonly facilities = signal<LodgeFacilityItem[]>([]);
  readonly isSaving = signal(false);

  newFacilityName = '';
  newFacilityDesc = '';

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      checkmarkCircleOutline,
      createOutline,
      saveOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('lodgeId') || '';
    this.lodgeId.set(id);
    if (!id || !this.roleService.canAccessProperty(id) || this.roleService.isStaff()) {
      this.toast.error('Unauthorized access to facilities management.');
      void this.router.navigate(['/lodges']);
      return;
    }

    const l = this.lodgeService.getLodgeById(id);
    if (l?.facilityItems && l.facilityItems.length > 0) {
      this.facilities.set(l.facilityItems.map((f) => ({ ...f })));
    } else {
      const activeSet = new Set(l?.amenities || []);
      const base: LodgeFacilityItem[] = PREDEFINED_FACILITIES.map((p, idx) => ({
        id: `fac_${idx}`,
        name: p.name,
        icon: p.icon,
        description: p.defaultDesc,
        active: activeSet.has(p.name),
        isCustom: false,
      }));
      for (const name of l?.amenities || []) {
        if (!base.some((b) => b.name === name)) {
          base.push({
            id: `fac_custom_${Date.now()}_${Math.random()}`,
            name,
            description: '',
            active: true,
            isCustom: true,
          });
        }
      }
      this.facilities.set(base);
    }
  }

  addCustom(): void {
    const name = this.newFacilityName.trim();
    if (!name) return;
    if (this.facilities().some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      this.toast.warning('Facility already exists.');
      return;
    }
    this.facilities.update((list) => [
      ...list,
      {
        id: `fac_custom_${Date.now()}`,
        name,
        description: this.newFacilityDesc.trim(),
        active: true,
        isCustom: true,
      },
    ]);
    this.newFacilityName = '';
    this.newFacilityDesc = '';
  }

  removeFacility(id: string): void {
    this.facilities.update((list) => list.filter((f) => f.id !== id));
  }

  async saveAll(): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    try {
      await this.lodgeService.saveFacilities(this.lodgeId(), this.facilities());
      this.toast.success('Facilities updated in Firestore.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to save facilities.');
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
