import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
  shieldCheckmarkOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  cameraOutline,
} from 'ionicons/icons';
import { HousekeepingService } from '../../services/housekeeping.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import {
  CleaningScheduleItem,
  INSPECTION_CHECKLIST_LABELS,
} from '../../interface';

@Component({
  selector: 'app-housekeeping-inspection',
  templateUrl: './housekeeping-inspection.page.html',
  styleUrls: ['./housekeeping-inspection.page.scss'],
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
export class HousekeepingInspectionPage {
  private readonly hkService = inject(HousekeepingService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly checklistLabels = INSPECTION_CHECKLIST_LABELS;
  readonly selectedTask = signal<CleaningScheduleItem | null>(null);
  readonly checklist = signal<Record<string, boolean>>({});
  readonly notes = signal<string>('');
  readonly rejectionReason = signal<string>('');
  readonly photos = signal<string[]>([]);
  readonly uploading = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);

  readonly pendingQueue = computed(() =>
    this.hkService.tasks().filter((t) => t.status === 'Inspection Pending'),
  );

  readonly pastInspections = computed(() =>
    this.hkService.inspections().slice(0, 20),
  );

  readonly canInspectSelected = computed(() => {
    const t = this.selectedTask();
    if (!t) return false;
    if (this.roleService.isOwner()) return true;
    const uid = this.roleService.currentUserProfile()?.uid;
    if (uid && t.assignedStaffId === uid) return false;
    return this.roleService.isManager();
  });

  constructor() {
    addIcons({
      shieldCheckmarkOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      cameraOutline,
    });
    this.resetChecklist();
  }

  private resetChecklist(): void {
    const initial: Record<string, boolean> = {};
    for (const label of this.checklistLabels) {
      initial[label] = true;
    }
    this.checklist.set(initial);
  }

  selectTask(task: CleaningScheduleItem): void {
    this.selectedTask.set(task);
    this.resetChecklist();
    this.notes.set('');
    this.rejectionReason.set('');
    this.photos.set([]);
  }

  toggleCheck(key: string, val: boolean): void {
    this.checklist.update((curr) => ({ ...curr, [key]: val }));
  }

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.propertyService
        .accessibleProperties()
        .find((p) => p.id === propertyId)?.name || propertyId
    );
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const t = this.selectedTask();
    if (!file || !t) return;

    this.uploading.set(true);
    try {
      const url = await this.hkService.uploadTaskPhoto(
        t.propertyId || '',
        t.roomId || t.room,
        t.id,
        file,
      );
      this.photos.update((arr) => [...arr, url]);
      await this.toast.success('Inspection photo uploaded');
    } catch {
      await this.toast.error('Failed to upload inspection photo');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async submit(outcome: 'Approved' | 'Rejected'): Promise<void> {
    const t = this.selectedTask();
    if (!t) return;

    if (!this.canInspectSelected()) {
      await this.toast.warning(
        'Staff/Managers cannot approve their own cleaning task.',
      );
      return;
    }

    if (outcome === 'Rejected' && !this.rejectionReason().trim()) {
      await this.toast.warning('Please enter a rejection reason.');
      return;
    }

    this.submitting.set(true);
    try {
      const checklistArray = this.checklistLabels.map((label) => ({
        label,
        passed: Boolean(this.checklist()[label]),
      }));
      await this.hkService.submitInspection({
        task: t,
        checklist: checklistArray,
        notes: this.notes().trim(),
        photos: this.photos(),
        outcome,
        rejectionReason: this.rejectionReason().trim() || undefined,
      });
      await this.toast.success(
        outcome === 'Approved'
          ? `Room ${t.room} approved and marked Inspected`
          : `Room ${t.room} rejected and returned for re-cleaning`,
      );
      this.selectedTask.set(null);
    } catch (err: any) {
      await this.toast.error(err?.message || 'Failed to submit inspection');
    } finally {
      this.submitting.set(false);
    }
  }
}
