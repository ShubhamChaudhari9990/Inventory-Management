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
  alertCircleOutline,
  arrowBackOutline,
  cloudUploadOutline,
  openOutline,
  saveOutline,
  trashOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  CustomerAccountStatus,
  CustomerItem,
  CustomerType,
} from '../../interface';
import { CustomerService } from '../../services/customer.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-customer-form',
  templateUrl: './customer-form.page.html',
  styleUrls: ['./customer-form.page.scss'],
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
export class CustomerFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly customerService = inject(CustomerService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly isEditMode = signal(false);
  readonly customerId = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly duplicates = signal<CustomerItem[]>([]);
  allowSharedPhone = false;

  readonly photoUrl = signal<string | null>(null);
  readonly photoPath = signal<string | null>(null);
  readonly uploadProgress = signal<number | null>(null);
  private oldPhotoPath: string | null = null;

  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'Edit Customer' : 'Add Customer',
  );

  private savedSuccessfully = false;
  private tempUploadId = `CUST-TMP-${Date.now()}`;

  readonly form: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.maxLength(80)]],
    phone: ['', [Validators.required, Validators.pattern(/^[+0-9\s-]{7,20}$/)]],
    email: ['', [Validators.email]],
    gender: [''],
    dateOfBirth: [''],
    country: ['India'],
    state: ['Maharashtra'],
    city: ['', Validators.required],
    address: [''],
    pincode: ['', [Validators.pattern(/^$|^[a-zA-Z0-9\s-]{4,12}$/)]],
    idType: ['Aadhaar'],
    idNumber: [''],
    customerType: ['Regular' as CustomerType, Validators.required],
    preferences: [''],
    specialRequirements: [''],
    notes: [''],
    customerStatus: ['active' as CustomerAccountStatus, Validators.required],
  });

  constructor() {
    addIcons({
      alertCircleOutline,
      arrowBackOutline,
      cloudUploadOutline,
      openOutline,
      saveOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('customerId');
    if (id) {
      this.isEditMode.set(true);
      this.customerId.set(id);
      this.tempUploadId = id;
      const existing = this.customerService.getCustomerById(id);
      if (existing) {
        this.patchFromCustomer(existing);
      } else {
        this.toast.error('Customer not found.');
        void this.router.navigate(['/customers']);
      }
    }
  }

  private patchFromCustomer(c: CustomerItem): void {
    const parts = (c.name || '').trim().split(/\s+/);
    const first = c.firstName || parts[0] || '';
    const last = c.lastName || parts.slice(1).join(' ') || '';

    this.form.patchValue({
      firstName: first,
      lastName: last,
      phone: c.phone,
      email: c.email || '',
      gender: c.gender || '',
      dateOfBirth: c.dateOfBirth || '',
      country: c.country || 'India',
      state: c.state || '',
      city: c.city || '',
      address: c.fullAddress || c.address || '',
      pincode: c.pincode || '',
      idType: c.idType || 'Aadhaar',
      idNumber: c.idNumber || '',
      customerType: c.customerType || 'Regular',
      preferences: c.preferences || '',
      specialRequirements: c.specialRequirements || '',
      notes: c.notes || '',
      customerStatus: c.customerStatus || 'active',
    });

    this.photoUrl.set(c.photoUrl || null);
    this.photoPath.set(c.photoPath || null);
    this.form.markAsPristine();
  }

  checkDuplicates(): void {
    const phone = this.form.get('phone')?.value || '';
    const email = this.form.get('email')?.value || '';
    if (!phone && !email) {
      this.duplicates.set([]);
      return;
    }
    const matches = this.customerService.findDuplicates(
      phone,
      email,
      this.customerId() || undefined,
    );
    this.duplicates.set(matches);
  }

  openExistingCustomer(c: CustomerItem): void {
    this.savedSuccessfully = true;
    void this.router.navigate(['/customers', c.id]);
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    this.oldPhotoPath = this.photoPath();
    this.uploadProgress.set(1);
    try {
      const res = await this.customerService.uploadProfilePhoto(
        this.tempUploadId,
        file,
        (pct) => this.uploadProgress.set(pct),
      );
      this.photoUrl.set(res.url);
      this.photoPath.set(res.storagePath);
      this.form.markAsDirty();
      this.toast.success('Profile photo uploaded.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to upload photo.');
    } finally {
      this.uploadProgress.set(null);
    }
  }

  removePhoto(): void {
    this.oldPhotoPath = this.photoPath();
    this.photoUrl.set(null);
    this.photoPath.set(null);
    this.form.markAsDirty();
  }

  async onSubmit(): Promise<void> {
    if (this.isSaving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.error('Please complete all required customer fields.');
      return;
    }

    this.checkDuplicates();
    if (!this.isEditMode() && this.duplicates().length > 0 && !this.allowSharedPhone) {
      this.toast.warning('Duplicate customer detected. Open existing profile or confirm shared family number.');
      return;
    }

    this.isSaving.set(true);
    try {
      const v = this.form.getRawValue();
      const fullName = [v.firstName, v.lastName].filter(Boolean).join(' ').trim();
      const initials = fullName
        .split(/\s+/)
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      if (this.isEditMode() && this.customerId()) {
        await this.customerService.updateCustomer(this.customerId()!, {
          firstName: v.firstName.trim(),
          lastName: v.lastName?.trim() || '',
          fullName,
          name: fullName,
          initials,
          phone: v.phone.trim(),
          email: v.email?.trim() || '',
          gender: v.gender,
          dateOfBirth: v.dateOfBirth,
          photoUrl: this.photoUrl() || undefined,
          photoPath: this.photoPath() || undefined,
          country: v.country?.trim() || 'India',
          state: v.state?.trim() || '',
          city: v.city.trim(),
          address: v.address?.trim() || '',
          fullAddress: v.address?.trim() || '',
          pincode: v.pincode?.trim() || '',
          idType: v.idType,
          idNumber: v.idNumber?.trim() || '',
          customerType: v.customerType,
          preferences: v.preferences?.trim() || '',
          specialRequirements: v.specialRequirements?.trim() || '',
          notes: v.notes?.trim() || '',
          customerStatus: v.customerStatus,
        });
        if (this.oldPhotoPath) {
          await this.customerService.deleteStorageFile(this.oldPhotoPath);
        }
        this.savedSuccessfully = true;
        this.form.markAsPristine();
        this.toast.success(`${fullName} updated.`);
        void this.router.navigate(['/customers', this.customerId()]);
      } else {
        const newId = await this.customerService.createCustomer(
          {
            initials,
            firstName: v.firstName.trim(),
            lastName: v.lastName?.trim() || '',
            fullName,
            name: fullName,
            phone: v.phone.trim(),
            email: v.email?.trim() || '',
            gender: v.gender,
            dateOfBirth: v.dateOfBirth,
            photoUrl: this.photoUrl() || undefined,
            photoPath: this.photoPath() || undefined,
            country: v.country?.trim() || 'India',
            state: v.state?.trim() || '',
            city: v.city.trim(),
            address: v.address?.trim() || '',
            fullAddress: v.address?.trim() || '',
            pincode: v.pincode?.trim() || '',
            idType: v.idType,
            idNumber: v.idNumber?.trim() || '',
            customerType: v.customerType,
            preferences: v.preferences?.trim() || '',
            specialRequirements: v.specialRequirements?.trim() || '',
            notes: v.notes?.trim() || '',
            customerStatus: v.customerStatus,
            status: 'Paid',
            visits: 0,
            totalBookings: 0,
            totalNights: 0,
            due: '₹0',
          },
          this.allowSharedPhone,
        );
        this.savedSuccessfully = true;
        this.form.markAsPristine();
        this.toast.success(`${fullName} created.`);
        void this.router.navigate(['/customers', newId]);
      }
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to save customer.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async onCancel(): Promise<void> {
    if (await this.canDeactivate()) {
      const target = this.isEditMode() && this.customerId()
        ? ['/customers', this.customerId()]
        : ['/customers'];
      void this.router.navigate(target);
    }
  }

  async canDeactivate(): Promise<boolean> {
    if (this.savedSuccessfully || !this.form.dirty) return true;
    const alert = await this.alertCtrl.create({
      header: 'Unsaved Changes',
      message: 'Discard unsaved customer changes?',
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
    if (navId === 'customers') {
      void this.onCancel();
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
