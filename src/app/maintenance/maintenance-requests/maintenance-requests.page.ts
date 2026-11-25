import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  closeOutline,
  searchOutline,
  cameraOutline,
} from 'ionicons/icons';
import { MaintenanceService } from '../../services/maintenance.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRequestStatus,
} from '../../interface';

@Component({
  selector: 'app-maintenance-requests',
  templateUrl: './maintenance-requests.page.html',
  styleUrls: ['./maintenance-requests.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonIcon,
  ],
})
export class MaintenanceRequestsPage {
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);
  private readonly router = inject(Router);

  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);

  // Filters, sort, pagination
  readonly searchQuery = signal('');
  readonly lodgeFilter = signal('all');
  readonly categoryFilter = signal('all');
  readonly priorityFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly sortBy = signal<'date' | 'priority'>('date');
  readonly page = signal(1);
  readonly pageSize = 10;

  // Form fields
  readonly formLodgeId = signal('');
  readonly formRoomId = signal('');
  readonly formAreaName = signal('');
  readonly formCategory = signal<MaintenanceCategory>('Electrical');
  readonly formPriority = signal<MaintenancePriority>('Normal');
  readonly formTitle = signal('');
  readonly formDescription = signal('');
  readonly formNotes = signal('');
  readonly formPhotos = signal<string[]>([]);
  readonly formBlockRoom = signal(false);

  readonly categories = MAINTENANCE_CATEGORIES;
  readonly priorities = MAINTENANCE_PRIORITIES;
  readonly statuses: MaintenanceRequestStatus[] = [
    'Reported',
    'Approved',
    'Assigned',
    'In Progress',
    'Waiting for Parts',
    'Completed',
    'Verified',
    'Rejected',
    'Cancelled',
  ];

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly roomsForFormLodge = computed(() => {
    const lid = this.formLodgeId();
    if (!lid) return [];
    return this.maintenanceService.rooms().filter((r) => r.propertyId === lid);
  });

  readonly filteredRequests = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const lodge = this.lodgeFilter();
    const cat = this.categoryFilter();
    const prio = this.priorityFilter();
    const status = this.statusFilter();
    const sort = this.sortBy();

    const prioRank: Record<MaintenancePriority, number> = {
      Emergency: 4,
      High: 3,
      Normal: 2,
      Low: 1,
    };

    return this.maintenanceService
      .requests()
      .filter((r) => {
        if (lodge !== 'all' && r.propertyId !== lodge) return false;
        if (cat !== 'all' && r.category !== cat) return false;
        if (prio !== 'all' && r.priority !== prio) return false;
        if (status !== 'all' && r.status !== status) return false;
        if (q) {
          const hay = `${r.title} ${r.description} ${r.roomNumber || ''} ${r.areaName || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'priority') {
          return (prioRank[b.priority] || 0) - (prioRank[a.priority] || 0);
        }
        return (b.reportedAt || '').localeCompare(a.reportedAt || '');
      });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRequests().length / this.pageSize)),
  );

  readonly pagedRequests = computed(() => {
    const p = Math.min(this.page(), this.totalPages());
    const start = (p - 1) * this.pageSize;
    return this.filteredRequests().slice(start, start + this.pageSize);
  });

  constructor() {
    addIcons({ addOutline, closeOutline, searchOutline, cameraOutline });
    const first = this.accessibleProperties()[0];
    if (first) this.formLodgeId.set(first.id);
  }

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.accessibleProperties().find((p) => p.id === propertyId)?.name ||
      propertyId
    );
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const lid = this.formLodgeId();
    if (!file || !lid) {
      if (!lid) await this.toast.warning('Select a lodge before uploading photos.');
      return;
    }

    this.uploading.set(true);
    try {
      const url = await this.maintenanceService.uploadMaintenancePhoto(
        lid,
        `MREQ-TMP`,
        file,
      );
      this.formPhotos.update((arr) => [...arr, url]);
      await this.toast.success('Photo attached');
    } catch {
      await this.toast.error('Photo upload failed');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async submitRequest(): Promise<void> {
    if (!this.formLodgeId() || !this.formTitle().trim() || !this.formDescription().trim()) {
      await this.toast.warning('Please enter lodge, title, and description.');
      return;
    }

    const room = this.roomsForFormLodge().find((r) => r.id === this.formRoomId());
    this.saving.set(true);
    try {
      await this.maintenanceService.createRequest({
        propertyId: this.formLodgeId(),
        roomId: room?.id,
        roomNumber: room?.number,
        areaName: !room ? this.formAreaName().trim() || 'Common Area' : undefined,
        category: this.formCategory(),
        title: this.formTitle().trim(),
        description: this.formDescription().trim(),
        priority: this.formPriority(),
        photos: this.formPhotos(),
        notes: this.formNotes().trim() || undefined,
        markRoomOutOfService: Boolean(room && this.formBlockRoom()),
      });
      await this.toast.success('Maintenance request submitted');
      this.formTitle.set('');
      this.formDescription.set('');
      this.formNotes.set('');
      this.formPhotos.set([]);
      this.formBlockRoom.set(false);
      this.showForm.set(false);
    } catch (err: any) {
      await this.toast.error(err?.message || 'Failed to submit maintenance request');
    } finally {
      this.saving.set(false);
    }
  }

  openDetail(id: string): void {
    this.router.navigate(['/maintenance/requests', id]);
  }
}
