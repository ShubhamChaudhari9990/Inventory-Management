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
  clipboardOutline,
} from 'ionicons/icons';
import { HousekeepingService } from '../../services/housekeeping.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import {
  CleaningPriority,
  CleaningScheduleItem,
  HOUSEKEEPING_TASK_TYPES,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
} from '../../interface';

@Component({
  selector: 'app-housekeeping-tasks',
  templateUrl: './housekeeping-tasks.page.html',
  styleUrls: ['./housekeeping-tasks.page.scss'],
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
export class HousekeepingTasksPage {
  private readonly hkService = inject(HousekeepingService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);
  private readonly router = inject(Router);

  readonly showAssignForm = signal(false);
  readonly saving = signal(false);

  // Filters
  readonly lodgeFilter = signal<string>('all');
  readonly statusFilter = signal<string>('all');
  readonly priorityFilter = signal<string>('all');
  readonly taskTypeFilter = signal<string>('all');
  readonly searchQuery = signal<string>('');

  // Assignment form fields
  readonly formLodgeId = signal<string>('');
  readonly formRoomId = signal<string>('');
  readonly formTaskType = signal<HousekeepingTaskType>('Regular Cleaning');
  readonly formStaffUid = signal<string>('');
  readonly formPriority = signal<CleaningPriority>('Medium');
  readonly formDueAt = signal<string>('');
  readonly formInstructions = signal<string>('');

  readonly taskTypes = HOUSEKEEPING_TASK_TYPES;
  readonly priorities: CleaningPriority[] = ['Low', 'Normal', 'Medium', 'High', 'Urgent'];
  readonly statuses: HousekeepingTaskStatus[] = [
    'Pending',
    'Assigned',
    'In Progress',
    'Inspection Pending',
    'Completed',
    'Approved',
    'Rejected',
    'Verified',
    'Cancelled',
  ];

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly canAssign = computed(
    () => this.roleService.isOwner() || this.roleService.isManager(),
  );

  readonly roomsForFormLodge = computed(() => {
    const lid = this.formLodgeId();
    if (!lid) return [];
    return this.hkService.rooms().filter((r) => r.propertyId === lid);
  });

  readonly activeStaffForFormLodge = computed(() => {
    const lid = this.formLodgeId();
    if (!lid) return [];
    return this.roleService.registeredUsers().filter((u) => {
      const status = u.accountStatus || u.status;
      if (status !== 'active' && u.role !== 'owner') return false;
      if (u.role === 'owner') return true;
      return (u.propertyIds || []).includes(lid);
    });
  });

  readonly filteredTasks = computed(() => {
    const lodge = this.lodgeFilter();
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const taskType = this.taskTypeFilter();
    const q = this.searchQuery().trim().toLowerCase();

    return this.hkService.tasks().filter((t) => {
      if (lodge !== 'all' && t.propertyId !== lodge) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (priority !== 'all' && t.priority !== priority) return false;
      if (taskType !== 'all' && (t.taskType || t.type) !== taskType) return false;
      if (q) {
        const matchRoom = t.room.toLowerCase().includes(q);
        const matchStaff = (t.assignedTo || '').toLowerCase().includes(q);
        if (!matchRoom && !matchStaff) return false;
      }
      return true;
    });
  });

  constructor() {
    addIcons({ addOutline, closeOutline, searchOutline, clipboardOutline });
    const firstProp = this.accessibleProperties()[0];
    if (firstProp) {
      this.formLodgeId.set(firstProp.id);
    }
  }

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.accessibleProperties().find((p) => p.id === propertyId)?.name ||
      propertyId
    );
  }

  toggleAssignForm(): void {
    this.showAssignForm.update((v) => !v);
    if (this.showAssignForm() && !this.formLodgeId()) {
      const first = this.accessibleProperties()[0];
      if (first) this.formLodgeId.set(first.id);
    }
  }

  onLodgeChange(lodgeId: string): void {
    this.formLodgeId.set(lodgeId);
    this.formRoomId.set('');
    this.formStaffUid.set('');
  }

  async createTask(): Promise<void> {
    const lodgeId = this.formLodgeId();
    const roomId = this.formRoomId();
    const staffUid = this.formStaffUid();

    if (!lodgeId || !roomId || !staffUid) {
      await this.toast.warning('Please select a lodge, room, and staff member.');
      return;
    }

    const room = this.roomsForFormLodge().find((r) => r.id === roomId);
    const staff = this.activeStaffForFormLodge().find((u) => u.uid === staffUid);
    if (!room || !staff) {
      await this.toast.error('Selected room or staff member not found.');
      return;
    }

    this.saving.set(true);
    try {
      await this.hkService.createAndAssignTask({
        propertyId: lodgeId,
        roomId: room.id,
        room: room.number,
        type: room.type || 'Standard',
        floor: room.floor,
        taskType: this.formTaskType(),
        assignedStaffId: staff.uid,
        assignedTo: staff.name || staff.email,
        priority: this.formPriority(),
        dueAt: this.formDueAt() || undefined,
        instructions: this.formInstructions().trim() || undefined,
      });
      await this.toast.success(`Cleaning task assigned for Room ${room.number}`);
      this.formRoomId.set('');
      this.formInstructions.set('');
      this.showAssignForm.set(false);
    } catch (err: any) {
      await this.toast.error(err?.message || 'Failed to assign cleaning task');
    } finally {
      this.saving.set(false);
    }
  }

  openTask(task: CleaningScheduleItem): void {
    this.router.navigate(['/housekeeping/tasks', task.id]);
  }
}
