import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  bedOutline,
  businessOutline,
  calendarOutline,
  callOutline,
  cashOutline,
  checkmarkCircleOutline,
  createOutline,
  documentTextOutline,
  ellipsisVerticalOutline,
  globeOutline,
  imagesOutline,
  layersOutline,
  locationOutline,
  mailOutline,
  peopleOutline,
  powerOutline,
  settingsOutline,
  sparklesOutline,
  swapHorizontalOutline,
  timeOutline,
} from 'ionicons/icons';
import { Unsubscribe } from 'firebase/firestore';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { Lodge, LodgeDocumentItem, PropertyStatus } from '../../interface';
import { LodgeService } from '../../services/lodge.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { PermissionService } from '../../services/permission.service';
import { AppToastService } from '../../shared/services/app-toast.service';

export type LodgeDetailsTab =
  | 'overview'
  | 'rooms'
  | 'facilities'
  | 'gallery'
  | 'staff'
  | 'settings'
  | 'documents';

@Component({
  selector: 'app-lodge-details',
  templateUrl: './lodge-details.page.html',
  styleUrls: ['./lodge-details.page.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, AppShellComponent],
})
export class LodgeDetailsPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly lodgeService = inject(LodgeService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly permissionService = inject(PermissionService);
  private readonly toast = inject(AppToastService);

  readonly lodgeId = signal<string>('');
  readonly activeTab = signal<LodgeDetailsTab>('overview');
  readonly isMoreMenuOpen = signal(false);
  readonly documents = signal<LodgeDocumentItem[]>([]);
  private docUnsub: Unsubscribe | null = null;

  readonly isOwner = this.roleService.isOwner;
  readonly isStaff = this.roleService.isStaff;
  readonly canViewFinance = computed(() =>
    this.isOwner() || this.permissionService.hasPermission('finance.view'),
  );
  readonly canViewDocs = computed(() => !this.isStaff());

  readonly lodge = computed<Lodge | undefined>(() =>
    this.lodgeService.getLodgeById(this.lodgeId()),
  );

  // Scoped dynamic data for this specific lodgeId
  readonly lodgeRooms = computed(() =>
    this.lodgeData.allRooms().filter((r) => r.propertyId === this.lodgeId()),
  );

  readonly lodgeBookings = computed(() =>
    this.lodgeData.allBookings().filter((b) => b.propertyId === this.lodgeId()),
  );

  readonly lodgeStaff = computed(() =>
    this.lodgeData
      .allStaff()
      .filter((s) => !s.propertyId || s.propertyId === this.lodgeId()),
  );

  readonly lodgeRevenue = computed(() => {
    const id = this.lodgeId();
    return this.lodgeData
      .allPayments()
      .filter((p) => p.propertyId === id && p.status === 'Paid')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  });

  readonly totalRooms = computed(() => {
    const rooms = this.lodgeRooms();
    return rooms.length > 0 ? rooms.length : Number(this.lodge()?.totalRooms) || 0;
  });

  readonly availableRooms = computed(
    () => this.lodgeRooms().filter((r) => r.status === 'Available').length,
  );

  readonly occupiedRooms = computed(
    () => this.lodgeRooms().filter((r) => r.status === 'Occupied').length,
  );

  readonly activeBookingsCount = computed(
    () =>
      this.lodgeBookings().filter((b) =>
        ['Confirmed', 'Checked In', 'Pending'].includes(b.status),
      ).length,
  );

  readonly facilityList = computed(() => {
    const l = this.lodge();
    if (!l) return [];
    if (l.facilityItems && l.facilityItems.length > 0) {
      return l.facilityItems.filter((f) => f.active);
    }
    return (l.amenities || []).map((name, i) => ({
      id: `am_${i}`,
      name,
      active: true,
    }));
  });

  readonly galleryList = computed(() => this.lodge()?.images?.gallery || []);

  constructor() {
    addIcons({
      arrowBackOutline,
      bedOutline,
      businessOutline,
      calendarOutline,
      callOutline,
      cashOutline,
      checkmarkCircleOutline,
      createOutline,
      documentTextOutline,
      ellipsisVerticalOutline,
      globeOutline,
      imagesOutline,
      layersOutline,
      locationOutline,
      mailOutline,
      peopleOutline,
      powerOutline,
      settingsOutline,
      sparklesOutline,
      swapHorizontalOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('lodgeId') || '';
    this.lodgeId.set(id);

    if (id && !this.roleService.canAccessProperty(id)) {
      this.toast.error('You do not have access to this lodge.');
      void this.router.navigate(['/lodges']);
      return;
    }

    if (id && this.canViewDocs()) {
      this.docUnsub = this.lodgeService.watchLodgeDocuments(id, (docs) => {
        this.documents.set(docs);
      });
    }
  }

  ngOnDestroy(): void {
    if (this.docUnsub) this.docUnsub();
  }

  goBack(): void {
    void this.router.navigate(['/lodges']);
  }

  goToEdit(): void {
    void this.router.navigate(['/lodges', this.lodgeId(), 'edit']);
  }

  goToSection(section: 'settings' | 'gallery' | 'facilities' | 'documents'): void {
    this.isMoreMenuOpen.set(false);
    void this.router.navigate(['/lodges', this.lodgeId(), section]);
  }

  switchToThisLodge(): void {
    this.isMoreMenuOpen.set(false);
    const l = this.lodge();
    if (!l) return;
    if (this.propertyService.switchProperty(l.id)) {
      this.toast.success(`Active lodge switched to ${l.name}`);
    }
  }

  async toggleStatus(): Promise<void> {
    this.isMoreMenuOpen.set(false);
    const l = this.lodge();
    if (!l || !this.isOwner()) return;
    const nextStatus: PropertyStatus = l.status === 'active' ? 'inactive' : 'active';
    const actionWord = nextStatus === 'inactive' ? 'Deactivate' : 'Activate';

    const alert = await this.alertCtrl.create({
      header: `${actionWord} ${l.name}?`,
      message:
        nextStatus === 'inactive'
          ? 'Deactivating prevents new bookings while preserving all historical data.'
          : 'Activating restores booking and operational availability.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: actionWord,
          role: nextStatus === 'inactive' ? 'destructive' : 'confirm',
          handler: async () => {
            await this.lodgeService.setLodgeStatus(l.id, nextStatus);
            this.toast.success(`${l.name} is now ${nextStatus}.`);
          },
        },
      ],
    });
    await alert.present();
  }

  onNavChange(navId: string): void {
    if (navId === 'lodges') {
      void this.router.navigate(['/lodges']);
      return;
    }
    const role = this.roleService.currentRole();
    const target =
      role === 'owner'
        ? '/owner/dashboard'
        : role === 'manager'
          ? '/manager/dashboard'
          : '/staff/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
