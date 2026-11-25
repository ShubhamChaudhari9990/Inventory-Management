import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonIcon,
  IonProgressBar,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cloudUploadOutline,
  saveOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { AccountStatus, PermissionKey, UserRole } from '../../interface';
import { EmployeeService } from '../../services/employee.service';
import { PropertyService } from '../../services/property.service';
import { PermissionService } from '../../services/permission.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-employee-form',
  templateUrl: './employee-form.page.html',
  styleUrls: ['./employee-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonButton,
    IonIcon,
    IonProgressBar,
    IonSpinner,
    AppShellComponent,
  ],
})
export class EmployeeFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly employeeService = inject(EmployeeService);
  private readonly propertyService = inject(PropertyService);
  private readonly permissionService = inject(PermissionService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly lodges = this.propertyService.properties;
  readonly permissionGroups = this.permissionService.getPermissionGroups();

  readonly isEditMode = signal(false);
  readonly employeeUid = signal<string | null>(null);
  readonly linkedExistingUid = signal<string | null>(null);
  readonly isSaving = signal(false);

  readonly photoUrl = signal<string | null>(null);
  readonly photoPath = signal<string | null>(null);
  readonly uploadProgress = signal<number | null>(null);

  readonly assignedLodgeIds = signal<string[]>([]);
  readonly selectedPermissions = signal<PermissionKey[]>([]);

  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'Edit Employee' : 'Add Employee',
  );

  private savedSuccessfully = false;
  private tempUploadUid = `EMP-TMP-${Date.now()}`;

  readonly form: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    address: [''],
    dateOfBirth: [''],
    employeeId: [`EMP-${String(Date.now()).slice(-4)}`, Validators.required],
    role: ['staff' as UserRole, Validators.required],
    designation: ['receptionist', Validators.required],
    department: ['Front Office'],
    employmentType: ['Full-Time'],
    employmentStatus: ['active' as AccountStatus, Validators.required],
    joiningDate: [new Date().toISOString().slice(0, 10)],
  });

  constructor() {
    addIcons({ arrowBackOutline, cloudUploadOutline, saveOutline });
  }

  ngOnInit(): void {
    if (!this.roleService.isOwner()) {
      this.toast.error('Only the Owner can add or edit employee authorization.');
      void this.router.navigate(['/staff']);
      return;
    }

    const id = this.route.snapshot.paramMap.get('employeeId');
    if (id) {
      this.isEditMode.set(true);
      this.employeeUid.set(id);
      this.tempUploadUid = id;
      const emp = this.employeeService.getEmployeeById(id);
      if (emp) {
        this.form.patchValue({
          firstName: emp.firstName || emp.name,
          lastName: emp.lastName || '',
          email: emp.email,
          phone: emp.phone,
          address: emp.address || '',
          dateOfBirth: emp.dateOfBirth || '',
          employeeId: emp.employeeId,
          role: emp.role || 'staff',
          designation: emp.designation,
          department: emp.department || 'Operations',
          employmentType: emp.employmentType || 'Full-Time',
          employmentStatus: emp.employmentStatus,
          joiningDate: emp.joiningDate || '',
        });
        this.form.get('email')?.disable();
        this.photoUrl.set(emp.photoUrl || null);
        this.photoPath.set(emp.photoPath || null);
        this.assignedLodgeIds.set([...emp.assignedLodgeIds]);
        this.selectedPermissions.set([...emp.permissions]);
      }
      this.form.markAsPristine();
    } else {
      const firstLodge = this.lodges()[0]?.id;
      if (firstLodge) this.assignedLodgeIds.set([firstLodge]);
      this.applyTemplate();
    }
  }

  onEmailBlur(): void {
    if (this.isEditMode()) return;
    const email = this.form.get('email')?.value || '';
    const found = this.employeeService.findUserByEmail(email);
    this.linkedExistingUid.set(found ? found.uid : null);
  }

  applyTemplate(): void {
    const role = this.form.get('role')?.value as UserRole;
    const des = this.form.get('designation')?.value || 'receptionist';
    const perms = this.permissionService.getDefaultPermissions(
      role,
      role === 'manager' ? 'manager' : des,
    );
    this.selectedPermissions.set([...perms]);
  }

  toggleLodge(id: string): void {
    const cur = this.assignedLodgeIds();
    this.assignedLodgeIds.set(
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
    this.form.markAsDirty();
  }

  togglePerm(key: PermissionKey): void {
    const cur = this.selectedPermissions();
    this.selectedPermissions.set(
      cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key],
    );
    this.form.markAsDirty();
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.uploadProgress.set(1);
    try {
      const res = await this.employeeService.uploadEmployeePhoto(
        this.tempUploadUid,
        file,
        (pct) => this.uploadProgress.set(pct),
      );
      this.photoUrl.set(res.url);
      this.photoPath.set(res.storagePath);
      this.form.markAsDirty();
      this.toast.success('Photo uploaded.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Upload failed.');
    } finally {
      this.uploadProgress.set(null);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.isSaving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.error('Complete all required employee fields.');
      return;
    }

    this.isSaving.set(true);
    try {
      const v = this.form.getRawValue();
      if (this.isEditMode() && this.employeeUid()) {
        await this.employeeService.updateEmployee(this.employeeUid()!, {
          firstName: v.firstName,
          lastName: v.lastName,
          phone: v.phone,
          address: v.address,
          dateOfBirth: v.dateOfBirth,
          photoUrl: this.photoUrl() || undefined,
          photoPath: this.photoPath() || undefined,
          role: v.role,
          designation: v.designation,
          department: v.department,
          assignedLodgeIds: this.assignedLodgeIds(),
          permissions: this.selectedPermissions(),
          employmentType: v.employmentType,
          employmentStatus: v.employmentStatus,
        });
        this.savedSuccessfully = true;
        this.form.markAsPristine();
        this.toast.success('Employee updated.');
        void this.router.navigate(['/staff/employees', this.employeeUid()]);
      } else {
        const uid = await this.employeeService.createOrLinkEmployee({
          existingUid: this.linkedExistingUid() || undefined,
          employeeId: v.employeeId,
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          phone: v.phone,
          address: v.address,
          dateOfBirth: v.dateOfBirth,
          photoUrl: this.photoUrl() || undefined,
          photoPath: this.photoPath() || undefined,
          role: v.role,
          designation: v.designation,
          department: v.department,
          assignedLodgeIds: this.assignedLodgeIds(),
          permissions: this.selectedPermissions(),
          employmentType: v.employmentType,
          employmentStatus: v.employmentStatus,
          joiningDate: v.joiningDate,
        });
        this.savedSuccessfully = true;
        this.form.markAsPristine();
        this.toast.success('Employee saved.');
        void this.router.navigate(['/staff/employees', uid]);
      }
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to save employee.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async onCancel(): Promise<void> {
    if (await this.canDeactivate()) {
      void this.router.navigate(['/staff/employees']);
    }
  }

  async canDeactivate(): Promise<boolean> {
    if (this.savedSuccessfully || !this.form.dirty) return true;
    const alert = await this.alertCtrl.create({
      header: 'Unsaved Changes',
      message: 'Discard unsaved employee changes?',
      buttons: [
        { text: 'Stay', role: 'cancel' },
        { text: 'Discard', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  onNavChange(navId: string): void {
    if (navId === 'staff') {
      void this.onCancel();
      return;
    }
    void this.router.navigate(['/owner/dashboard'], { queryParams: { nav: navId } });
  }
}
