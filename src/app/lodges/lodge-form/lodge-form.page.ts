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
  addOutline,
  arrowBackOutline,
  businessOutline,
  checkmarkCircleOutline,
  closeOutline,
  cloudUploadOutline,
  imageOutline,
  saveOutline,
  trashOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  LODGE_TYPES,
  Lodge,
  LodgeFacilityItem,
  LodgeFormData,
  LodgeGalleryItem,
  LodgeType,
  PREDEFINED_FACILITIES,
  PropertyStatus,
} from '../../interface';
import { LodgeService } from '../../services/lodge.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

export const CURRENCY_OPTIONS = [
  { code: 'INR', label: 'INR (₹) - Indian Rupee' },
  { code: 'USD', label: 'USD ($) - US Dollar' },
  { code: 'EUR', label: 'EUR (€) - Euro' },
  { code: 'GBP', label: 'GBP (£) - British Pound' },
  { code: 'AED', label: 'AED - UAE Dirham' },
];

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +05:30)' },
  { value: 'UTC', label: 'UTC (+00:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +04:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +08:00)' },
];

@Component({
  selector: 'app-lodge-form',
  templateUrl: './lodge-form.page.html',
  styleUrls: ['./lodge-form.page.scss'],
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
export class LodgeFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly lodgeService = inject(LodgeService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly lodgeTypes = LODGE_TYPES;
  readonly currencies = CURRENCY_OPTIONS;
  readonly timezones = TIMEZONE_OPTIONS;

  readonly isEditMode = signal(false);
  readonly lodgeId = signal<string | null>(null);
  readonly existingLodge = signal<Lodge | null>(null);
  readonly isSaving = signal(false);
  readonly isCodeChecking = signal(false);
  readonly codeDuplicateError = signal<string | null>(null);

  // Storage Upload State
  readonly logoUrl = signal<string | null>(null);
  readonly logoPath = signal<string | null>(null);
  readonly logoProgress = signal<number | null>(null);

  readonly coverUrl = signal<string | null>(null);
  readonly coverPath = signal<string | null>(null);
  readonly coverProgress = signal<number | null>(null);

  readonly galleryItems = signal<LodgeGalleryItem[]>([]);
  readonly galleryProgress = signal<number | null>(null);
  private readonly pendingCleanupPaths: string[] = [];

  // Facilities
  readonly facilityItems = signal<LodgeFacilityItem[]>(
    PREDEFINED_FACILITIES.map((f, idx) => ({
      id: `fac_${idx}`,
      name: f.name,
      icon: f.icon,
      description: f.defaultDesc,
      active: ['Wi-Fi', 'Parking', 'Room Service', 'Power Backup'].includes(f.name),
      isCustom: false,
    })),
  );
  customFacilityName = '';

  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'Edit Lodge' : 'Add New Lodge',
  );

  private savedSuccessfully = false;
  private tempUploadId = `tmp_${Date.now()}`;

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
    businessName: ['LemonWood Hospitality'],
    description: ['', [Validators.maxLength(1000)]],
    type: ['Lodge' as LodgeType, Validators.required],
    status: ['active' as PropertyStatus, Validators.required],
    contact: this.fb.group({
      primaryPhone: ['', [Validators.required, Validators.pattern(/^[+0-9\s-]{7,20}$/)]],
      alternatePhone: ['', [Validators.pattern(/^$|^[+0-9\s-]{7,20}$/)]],
      email: ['', [Validators.email]],
      website: [''],
      contactPerson: [''],
    }),
    lodgeAddress: this.fb.group({
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      city: ['', Validators.required],
      district: [''],
      state: ['', Validators.required],
      country: ['India', Validators.required],
      postalCode: ['', [Validators.pattern(/^$|^[a-zA-Z0-9\s-]{4,12}$/)]],
      latitude: [null as number | null],
      longitude: [null as number | null],
    }),
    propertyDetails: this.fb.group({
      totalFloors: [2, [Validators.required, Validators.min(1), Validators.max(200)]],
      estimatedRoomCount: [12, [Validators.required, Validators.min(0), Validators.max(10000)]],
      maximumGuestCapacity: [36, [Validators.min(0), Validators.max(50000)]],
      checkInTime: ['12:00', Validators.required],
      checkOutTime: ['11:00', Validators.required],
      currency: ['INR', Validators.required],
      timezone: ['Asia/Kolkata', Validators.required],
    }),
    taxSettings: this.fb.group({
      gstNumber: [''],
      panNumber: [''],
      businessRegNumber: [''],
      invoicePrefix: ['LW-INV'],
      defaultTaxRate: [12, [Validators.min(0), Validators.max(100)]],
      taxInclusive: [false],
    }),
  });

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      businessOutline,
      checkmarkCircleOutline,
      closeOutline,
      cloudUploadOutline,
      imageOutline,
      saveOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('lodgeId');
    if (id) {
      this.isEditMode.set(true);
      this.lodgeId.set(id);
      this.tempUploadId = id;
      const lodge = this.lodgeService.getLodgeById(id);
      if (lodge) {
        this.patchFormFromLodge(lodge);
      } else {
        this.toast.error('Lodge not found.');
        void this.router.navigate(['/lodges']);
      }
    } else {
      const defaultCode = this.lodgeService.generateDefaultLodgeCode('LW');
      this.form.patchValue({ code: defaultCode });
    }
  }

  private patchFormFromLodge(lodge: Lodge): void {
    this.existingLodge.set(lodge);
    this.form.patchValue({
      name: lodge.name,
      code: lodge.code,
      businessName: lodge.businessName || 'LemonWood Hospitality',
      description: lodge.description || lodge.tagline || '',
      type: lodge.type || 'Lodge',
      status: lodge.status || 'active',
      contact: {
        primaryPhone: lodge.contact?.primaryPhone || lodge.phone || '',
        alternatePhone: lodge.contact?.alternatePhone || '',
        email: lodge.contact?.email || lodge.email || '',
        website: lodge.contact?.website || '',
        contactPerson: lodge.contact?.contactPerson || '',
      },
      lodgeAddress: {
        addressLine1: lodge.lodgeAddress?.addressLine1 || lodge.address || '',
        addressLine2: lodge.lodgeAddress?.addressLine2 || '',
        city: lodge.lodgeAddress?.city || lodge.city || '',
        district: lodge.lodgeAddress?.district || lodge.district || '',
        state: lodge.lodgeAddress?.state || lodge.state || '',
        country: lodge.lodgeAddress?.country || lodge.country || 'India',
        postalCode: lodge.lodgeAddress?.postalCode || lodge.postalCode || lodge.pincode || '',
        latitude: lodge.lodgeAddress?.latitude ?? null,
        longitude: lodge.lodgeAddress?.longitude ?? null,
      },
      propertyDetails: {
        totalFloors: lodge.propertyDetails?.totalFloors ?? lodge.totalFloors ?? 1,
        estimatedRoomCount: lodge.propertyDetails?.estimatedRoomCount ?? lodge.totalRooms ?? 0,
        maximumGuestCapacity: lodge.propertyDetails?.maximumGuestCapacity ?? (lodge.totalRooms || 0) * 3,
        checkInTime: lodge.propertyDetails?.checkInTime || lodge.checkInTime || '12:00',
        checkOutTime: lodge.propertyDetails?.checkOutTime || lodge.checkOutTime || '11:00',
        currency: lodge.propertyDetails?.currency || lodge.currency || 'INR',
        timezone: lodge.propertyDetails?.timezone || lodge.timezone || 'Asia/Kolkata',
      },
      taxSettings: {
        gstNumber: lodge.taxSettings?.gstNumber || lodge.gstin || '',
        panNumber: lodge.taxSettings?.panNumber || '',
        businessRegNumber: lodge.taxSettings?.businessRegNumber || '',
        invoicePrefix: lodge.taxSettings?.invoicePrefix || `${lodge.code}-INV`,
        defaultTaxRate: lodge.taxSettings?.defaultTaxRate ?? 12,
        taxInclusive: lodge.taxSettings?.taxInclusive ?? false,
      },
    });

    this.logoUrl.set(lodge.images?.logo || null);
    this.logoPath.set(lodge.images?.logoPath || null);
    this.coverUrl.set(lodge.images?.cover || lodge.imageUrl || null);
    this.coverPath.set(lodge.images?.coverPath || null);
    this.galleryItems.set(lodge.images?.gallery || []);

    if (lodge.facilityItems && lodge.facilityItems.length > 0) {
      this.facilityItems.set(lodge.facilityItems);
    } else if (lodge.amenities && lodge.amenities.length > 0) {
      const existingNames = new Set(lodge.amenities);
      const updated = this.facilityItems().map((f) => ({
        ...f,
        active: existingNames.has(f.name),
      }));
      // Append any custom amenities not in predefined
      for (const name of lodge.amenities) {
        if (!updated.some((u) => u.name === name)) {
          updated.push({
            id: `fac_custom_${Date.now()}_${Math.random()}`,
            name,
            active: true,
            isCustom: true,
          });
        }
      }
      this.facilityItems.set(updated);
    }
    this.form.markAsPristine();
  }

  onNameBlur(): void {
    if (!this.isEditMode()) {
      const nameVal = this.form.get('name')?.value || '';
      const codeControl = this.form.get('code');
      if (nameVal && (!codeControl?.dirty)) {
        codeControl?.setValue(this.lodgeService.generateDefaultLodgeCode(nameVal));
      }
    }
  }

  async checkCodeUniqueness(): Promise<void> {
    const code = (this.form.get('code')?.value || '').trim();
    if (!code) {
      this.codeDuplicateError.set(null);
      return;
    }
    this.isCodeChecking.set(true);
    try {
      const isUnique = await this.lodgeService.isLodgeCodeUnique(
        code,
        this.lodgeId() || undefined,
      );
      this.codeDuplicateError.set(
        isUnique ? null : `Lodge code "${code.toUpperCase()}" is already in use.`,
      );
    } catch {
      this.codeDuplicateError.set(null);
    } finally {
      this.isCodeChecking.set(false);
    }
  }

  // ==========================================
  // IMAGE UPLOADS (FIREBASE STORAGE)
  // ==========================================

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    const oldPath = this.logoPath();
    this.logoProgress.set(1);
    try {
      const res = await this.lodgeService.uploadLodgeFile(
        this.tempUploadId,
        'branding',
        file,
        (pct) => this.logoProgress.set(pct),
      );
      if (oldPath) this.pendingCleanupPaths.push(oldPath);
      this.logoUrl.set(res.url);
      this.logoPath.set(res.storagePath);
      this.form.markAsDirty();
      this.toast.success('Lodge logo uploaded.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to upload logo.');
    } finally {
      this.logoProgress.set(null);
    }
  }

  removeLogo(): void {
    const oldPath = this.logoPath();
    if (oldPath) this.pendingCleanupPaths.push(oldPath);
    this.logoUrl.set(null);
    this.logoPath.set(null);
    this.form.markAsDirty();
  }

  async onCoverSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    const oldPath = this.coverPath();
    this.coverProgress.set(1);
    try {
      const res = await this.lodgeService.uploadLodgeFile(
        this.tempUploadId,
        'branding',
        file,
        (pct) => this.coverProgress.set(pct),
      );
      if (oldPath) this.pendingCleanupPaths.push(oldPath);
      this.coverUrl.set(res.url);
      this.coverPath.set(res.storagePath);
      this.form.markAsDirty();
      this.toast.success('Cover image uploaded.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to upload cover image.');
    } finally {
      this.coverProgress.set(null);
    }
  }

  removeCover(): void {
    const oldPath = this.coverPath();
    if (oldPath) this.pendingCleanupPaths.push(oldPath);
    this.coverUrl.set(null);
    this.coverPath.set(null);
    this.form.markAsDirty();
  }

  async onGallerySelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    input.value = '';

    for (const file of files) {
      this.galleryProgress.set(1);
      try {
        const res = await this.lodgeService.uploadLodgeFile(
          this.tempUploadId,
          'gallery',
          file,
          (pct) => this.galleryProgress.set(pct),
        );
        const item: LodgeGalleryItem = {
          id: `gal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          url: res.url,
          storagePath: res.storagePath,
          order: this.galleryItems().length,
          uploadedAt: new Date().toISOString(),
          uploadedBy: this.roleService.currentUserProfile()?.name || 'Owner',
        };
        this.galleryItems.update((list) => [...list, item]);
        this.form.markAsDirty();
      } catch (err: any) {
        this.toast.error(err?.message || `Failed to upload ${file.name}`);
      } finally {
        this.galleryProgress.set(null);
      }
    }
  }

  removeGalleryItem(item: LodgeGalleryItem): void {
    if (item.storagePath) this.pendingCleanupPaths.push(item.storagePath);
    this.galleryItems.update((list) => list.filter((i) => i.id !== item.id));
    this.form.markAsDirty();
  }

  // ==========================================
  // FACILITIES
  // ==========================================

  toggleFacility(id: string): void {
    this.facilityItems.update((list) =>
      list.map((f) => (f.id === id ? { ...f, active: !f.active } : f)),
    );
    this.form.markAsDirty();
  }

  addCustomFacility(): void {
    const name = this.customFacilityName.trim();
    if (!name) return;
    if (this.facilityItems().some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      this.toast.warning('Facility already exists.');
      return;
    }
    this.facilityItems.update((list) => [
      ...list,
      {
        id: `fac_custom_${Date.now()}`,
        name,
        icon: 'checkmark-circle-outline',
        active: true,
        isCustom: true,
      },
    ]);
    this.customFacilityName = '';
    this.form.markAsDirty();
  }

  // ==========================================
  // SUBMIT & UNSAVED CHANGES GUARD
  // ==========================================

  async onSubmit(): Promise<void> {
    if (this.isSaving()) return;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.toast.error('Please fill all required fields accurately.');
      return;
    }

    await this.checkCodeUniqueness();
    if (this.codeDuplicateError()) {
      this.toast.error(this.codeDuplicateError()!);
      return;
    }

    this.isSaving.set(true);
    try {
      const v = this.form.getRawValue();
      const payload: LodgeFormData = {
        name: v.name,
        code: v.code,
        businessName: v.businessName,
        description: v.description,
        type: v.type,
        status: v.status,
        contact: v.contact,
        lodgeAddress: v.lodgeAddress,
        propertyDetails: v.propertyDetails,
        images: {
          logo: this.logoUrl(),
          logoPath: this.logoPath(),
          cover: this.coverUrl(),
          coverPath: this.coverPath(),
          gallery: this.galleryItems(),
        },
        facilityItems: this.facilityItems(),
        taxSettings: v.taxSettings,
      };

      if (this.isEditMode() && this.lodgeId()) {
        await this.lodgeService.updateLodge(
          this.lodgeId()!,
          payload,
          this.existingLodge()?.code,
        );
        // Cleanup replaced/removed files from Storage
        for (const p of this.pendingCleanupPaths) {
          await this.lodgeService.deleteStorageFile(p);
        }
        this.savedSuccessfully = true;
        this.form.markAsPristine();
        this.toast.success(`${payload.name} updated successfully.`);
        void this.router.navigate(['/lodges', this.lodgeId()]);
      } else {
        const createdId = await this.lodgeService.createLodgeTransaction(payload);
        for (const p of this.pendingCleanupPaths) {
          await this.lodgeService.deleteStorageFile(p);
        }
        this.savedSuccessfully = true;
        this.form.markAsPristine();
        this.toast.success(`${payload.name} created successfully.`);
        void this.router.navigate(['/lodges', createdId]);
      }
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to save lodge.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async onCancel(): Promise<void> {
    if (await this.canDeactivate()) {
      const target = this.isEditMode() && this.lodgeId()
        ? ['/lodges', this.lodgeId()]
        : ['/lodges'];
      void this.router.navigate(target);
    }
  }

  async canDeactivate(): Promise<boolean> {
    if (this.savedSuccessfully || !this.form.dirty) {
      return true;
    }
    const alert = await this.alertCtrl.create({
      header: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave without saving?',
      buttons: [
        { text: 'Stay', role: 'cancel' },
        { text: 'Discard Changes', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  hasError(path: string, errorCode?: string): boolean {
    const ctrl = this.form.get(path);
    if (!ctrl || !ctrl.touched || !ctrl.errors) return false;
    return errorCode ? !!ctrl.errors[errorCode] : true;
  }

  onNavChange(navId: string): void {
    if (navId === 'lodges') {
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
