import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
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
  playOutline,
  checkmarkDoneOutline,
  cameraOutline,
  constructOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { HousekeepingService } from '../../services/housekeeping.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import { MaintenanceIssueItem } from '../../interface';

@Component({
  selector: 'app-housekeeping-task-detail',
  templateUrl: './housekeeping-task-detail.page.html',
  styleUrls: ['./housekeeping-task-detail.page.scss'],
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
export class HousekeepingTaskDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly hkService = inject(HousekeepingService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  private readonly taskId = signal<string>(
    this.route.snapshot.paramMap.get('taskId') || '',
  );

  readonly task = computed(() =>
    this.hkService.tasks().find((t) => t.id === this.taskId()),
  );

  readonly notes = signal<string>('');
  readonly missingItemsText = signal<string>('');
  readonly uploadedPhotos = signal<string[]>([]);
  readonly uploading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);

  // Maintenance issue form
  readonly showIssueForm = signal<boolean>(false);
  readonly issueCategory = signal<MaintenanceIssueItem['category']>('Plumbing Issue');
  readonly issueSeverity = signal<MaintenanceIssueItem['severity']>('Medium');
  readonly issueDescription = signal<string>('');
  readonly issueOutOfService = signal<boolean>(false);

  readonly categories: MaintenanceIssueItem['category'][] = [
    'Broken AC',
    'Electrical Problem',
    'Plumbing Issue',
    'Damaged Furniture',
    'Missing Equipment',
    'Other',
  ];

  readonly severities: MaintenanceIssueItem['severity'][] = [
    'Low',
    'Medium',
    'High',
    'Critical',
  ];

  constructor() {
    addIcons({
      playOutline,
      checkmarkDoneOutline,
      cameraOutline,
      constructOutline,
      alertCircleOutline,
    });
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
    const t = this.task();
    if (!file || !t) return;

    this.uploading.set(true);
    try {
      const url = await this.hkService.uploadTaskPhoto(
        t.propertyId || '',
        t.roomId || t.room,
        t.id,
        file,
      );
      this.uploadedPhotos.update((arr) => [...arr, url]);
      await this.toast.success('Photo uploaded');
    } catch (err) {
      await this.toast.error('Failed to upload photo');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async startTask(): Promise<void> {
    const t = this.task();
    if (!t) return;
    this.saving.set(true);
    try {
      await this.hkService.startCleaning(t);
      await this.toast.success(`Started cleaning Room ${t.room}`);
    } catch {
      await this.toast.error('Failed to start cleaning');
    } finally {
      this.saving.set(false);
    }
  }

  async submitCleaning(submitForInspection: boolean): Promise<void> {
    const t = this.task();
    if (!t) return;
    this.saving.set(true);
    try {
      const missing = this.missingItemsText()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const photos = [
        ...(t.photos || []),
        ...this.uploadedPhotos(),
      ];
      await this.hkService.completeCleaning(
        t,
        this.notes().trim() || t.notes || '',
        photos,
        missing,
        submitForInspection,
      );
      await this.toast.success(
        submitForInspection
          ? `Room ${t.room} submitted for inspection`
          : `Cleaning marked completed for Room ${t.room}`,
      );
    } catch {
      await this.toast.error('Failed to update cleaning task');
    } finally {
      this.saving.set(false);
    }
  }

  async submitMaintenanceIssue(): Promise<void> {
    const t = this.task();
    if (!t || !this.issueDescription().trim()) {
      await this.toast.warning('Please enter a maintenance issue description.');
      return;
    }

    this.saving.set(true);
    try {
      const matchedRoom = this.hkService
        .rooms()
        .find(
          (r) =>
            (t.roomId && r.id === t.roomId) ||
            (r.propertyId === t.propertyId && r.number === t.room),
        );
      if (!matchedRoom) {
        await this.toast.error('Room record not found for maintenance report');
        return;
      }
      await this.hkService.reportMaintenanceIssue({
        propertyId: t.propertyId || '',
        room: matchedRoom,
        taskId: t.id,
        category: this.issueCategory(),
        description: this.issueDescription().trim(),
        severity: this.issueSeverity(),
        markOutOfService: this.issueOutOfService(),
      });
      await this.toast.success('Maintenance issue reported');
      this.issueDescription.set('');
      this.issueOutOfService.set(false);
      this.showIssueForm.set(false);
    } catch {
      await this.toast.error('Failed to report maintenance issue');
    } finally {
      this.saving.set(false);
    }
  }
}
