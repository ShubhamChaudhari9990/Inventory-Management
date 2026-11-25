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
  checkmarkCircleOutline,
  closeOutline,
  cloudUploadOutline,
  imageOutline,
  saveOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  BED_TYPES,
  BedType,
  OperationalRoomStatus,
  PREDEFINED_ROOM_AMENITIES,
  RoomGalleryImage,
  RoomItem,
} from '../../interface';
import { RoomService } from '../../services/room.service';
import { FloorService } from '../../services/floor.service';
import { RoomTypeService } from '../../services/room-type.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-room-form',
  templateUrl: './room-form.page.html',
  styleUrls: ['./room-form.page.scss'],
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
export class RoomFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly roomService = inject(RoomService);
  private readonly floorService = inject(FloorService);
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly bedTypes = BED_TYPES;
  readonly accessibleLodges = this.propertyService.accessibleProperties;

  readonly isEditMode = signal(false);
  readonly roomId = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly duplicateError = signal<string | null>(null);

  readonly primaryImageUrl = signal<string | null>(null);
  readonly primaryImagePath = signal<string | null>(null);
  readonly primaryProgress = signal<number | null>(null);

  readonly galleryImages = signal<RoomGalleryImage[]>([]);
  readonly galleryProgress = signal<number | null>(null);
  private readonly pendingCleanupPaths: string[] = [];

  readonly selectedAmenities = signal<string[]>([
    'Air Conditioning',
    'TV',
    'Wi-Fi',
    'Attached Bathroom',
  ]);
  readonly allAmenityOptions = signal<string[]>([...PREDEFINED_ROOM_AMENITIES]);
  customAmenityName = '';

  readonly selectedLodgeId = signal<string>('');
  readonly floorsForLodge = computed(() =>
    this.floorService.getFloors(this.selectedLodgeId()),
  );
  readonly typesForLodge = computed(() =>
    this.roomTypeService.getRoomTypes(this.selectedLodgeId()),
  );

  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'Edit Room' : 'Add New Room',
  );

  private savedSuccessfully = false;
  private tempRoomId = `RM-TMP-${Date.now()}`;

  readonly form: FormGroup = this.fb.group({
    number: ['', [Validators.required, Validators.maxLength(30)]],
    roomName: [''],
    roomCode: [''],
    propertyId: ['', Validators.required],
    floorId: [''],
    floor: ['1', Validators.required],
    roomTypeId: [''],
    type: ['Deluxe Room', Validators.required],
    description: [''],
    operationalStatus: ['active' as OperationalRoomStatus, Validators.required],

    // Occupancy
    maximumAdults: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    maximumChildren: [1, [Validators.min(0), Validators.max(20)]],
    maximumOccupancy: [3, [Validators.required, Validators.min(1), Validators.max(30)]],
    beds: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    bedConfiguration: ['Queen' as BedType, Validators.required],

    // Pricing
    basePrice: [2500, [Validators.required, Validators.min(0)]],
    weekdayPrice: [2500, [Validators.min(0)]],
    weekendPrice: [3000, [Validators.min(0)]],
    extraAdultCharge: [500, [Validators.min(0)]],
    extraChildCharge: [250, [Validators.min(0)]],
    currency: ['INR', Validators.required],
    taxRate: [12, [Validators.min(0), Validators.max(100)]],
    taxInclusive: [false],

    // Additional Info
    roomSize: ['280 sq ft'],
    smokingPolicy: ['Non-Smoking'],
    accessibilityInfo: [''],
    internalNotes: [''],
  });

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      checkmarkCircleOutline,
      closeOutline,
      cloudUploadOutline,
      imageOutline,
      saveOutline,
    });
  }

  ngOnInit(): void {
    if (this.roleService.isStaff()) {
      this.toast.error('Staff members cannot create or edit rooms.');
      void this.router.navigate(['/rooms']);
      return;
    }

    const id = this.route.snapshot.paramMap.get('roomId');
    if (id) {
      this.isEditMode.set(true);
      this.roomId.set(id);
      this.tempRoomId = id;
      const room = this.roomService.getRoomById(id);
      if (room) {
        this.patchFromRoom(room);
      } else {
        this.toast.error('Room not found.');
        void this.router.navigate(['/rooms']);
      }
    } else {
      const currentProp = this.propertyService.selectedPropertyId();
      const defaultProp =
        currentProp !== 'all'
          ? currentProp
          : this.accessibleLodges()[0]?.id || '';
      this.selectedLodgeId.set(defaultProp);
      this.form.patchValue({ propertyId: defaultProp });
      this.applyLodgeDefaults(defaultProp);
    }
  }

  private applyLodgeDefaults(lodgeId: string): void {
    const lodge = this.accessibleLodges().find((p) => p.id === lodgeId) as any;
    if (lodge) {
      this.form.patchValue({
        currency: lodge.propertyDetails?.currency || lodge.currency || 'INR',
        taxRate: lodge.taxSettings?.defaultTaxRate ?? 12,
        taxInclusive: lodge.taxSettings?.taxInclusive ?? false,
      });
    }
  }

  private patchFromRoom(room: RoomItem): void {
    this.selectedLodgeId.set(room.propertyId || '');
    const numericPrice =
      room.basePrice ??
      (Number(String(room.price || '0').replace(/[^0-9.]/g, '')) || 0);

    this.form.patchValue({
      number: room.number,
      roomName: room.roomName || '',
      roomCode: room.roomCode || '',
      propertyId: room.propertyId || '',
      floorId: room.floorId || '',
      floor: room.floor || '1',
      roomTypeId: room.roomTypeId || '',
      type: room.type || 'Standard Room',
      description: room.description || '',
      operationalStatus: this.roomService.getEffectiveOperationalStatus(room),
      maximumAdults: room.maximumAdults ?? 2,
      maximumChildren: room.maximumChildren ?? 1,
      maximumOccupancy: room.maximumOccupancy ?? room.capacity ?? 2,
      beds: room.beds ?? 1,
      bedConfiguration: room.bedConfiguration || 'Queen',
      basePrice: numericPrice,
      weekdayPrice: room.weekdayPrice ?? numericPrice,
      weekendPrice: room.weekendPrice ?? numericPrice,
      extraAdultCharge: room.extraAdultCharge ?? 0,
      extraChildCharge: room.extraChildCharge ?? 0,
      currency: room.currency || 'INR',
      taxRate: room.taxConfiguration?.taxRate ?? 12,
      taxInclusive: room.taxConfiguration?.taxInclusive ?? false,
      roomSize: room.roomSize || '',
      smokingPolicy: room.smokingPolicy || 'Non-Smoking',
      accessibilityInfo: room.accessibilityInfo || '',
      internalNotes: room.internalNotes || '',
    });

    this.primaryImageUrl.set(room.primaryImageUrl || room.images?.[0] || null);
    this.primaryImagePath.set(room.primaryImagePath || null);
    this.galleryImages.set(room.galleryImages || []);

    const am = room.amenities || [];
    this.selectedAmenities.set([...am]);
    const merged = Array.from(new Set([...PREDEFINED_ROOM_AMENITIES, ...am]));
    this.allAmenityOptions.set(merged);

    if (this.isEditMode()) {
      this.form.get('number')?.disable();
    }
    this.form.markAsPristine();
  }

  onLodgeChange(lodgeId: string): void {
    this.selectedLodgeId.set(lodgeId);
    this.applyLodgeDefaults(lodgeId);
  }

  onFloorSelect(floorId: string): void {
    const fl = this.floorsForLodge().find((f) => f.id === floorId);
    if (fl) {
      this.form.patchValue({ floor: String(fl.floorNumber) });
    }
  }

  onRoomTypeSelect(typeId: string): void {
    const rt = this.typesForLodge().find((t) => t.id === typeId);
    if (rt) {
      this.form.patchValue({
        type: rt.name,
        basePrice: rt.basePrice,
        weekdayPrice: rt.weekdayPrice ?? rt.basePrice,
        weekendPrice: rt.weekendPrice ?? rt.basePrice,
        maximumAdults: rt.defaultAdultCapacity ?? 2,
        maximumChildren: rt.defaultChildCapacity ?? 1,
        maximumOccupancy: rt.capacity || 2,
        beds: rt.defaultBeds ?? 1,
        bedConfiguration: rt.defaultBedConfiguration || 'Queen',
      });
      if (rt.amenities?.length) {
        this.selectedAmenities.set([...rt.amenities]);
      }
    }
  }

  async checkRoomNumber(): Promise<void> {
    if (this.isEditMode()) return;
    const propId = this.form.get('propertyId')?.value;
    const num = (this.form.get('number')?.value || '').trim();
    if (!propId || !num) {
      this.duplicateError.set(null);
      return;
    }
    const unique = await this.roomService.isRoomNumberUnique(propId, num);
    this.duplicateError.set(
      unique ? null : `Room number "${num}" already exists in this lodge.`,
    );
  }

  toggleAmenity(name: string): void {
    const current = this.selectedAmenities();
    if (current.includes(name)) {
      this.selectedAmenities.set(current.filter((a) => a !== name));
    } else {
      this.selectedAmenities.set([...current, name]);
    }
    this.form.markAsDirty();
  }

  addCustomAmenity(): void {
    const name = this.customAmenityName.trim();
    if (!name) return;
    if (!this.allAmenityOptions().includes(name)) {
      this.allAmenityOptions.update((list) => [...list, name]);
    }
    if (!this.selectedAmenities().includes(name)) {
      this.selectedAmenities.update((list) => [...list, name]);
    }
    this.customAmenityName = '';
    this.form.markAsDirty();
  }

  // ==========================================
  // IMAGE UPLOADS (FIREBASE STORAGE)
  // ==========================================

  async onPrimarySelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    const lodgeId = this.form.get('propertyId')?.value || 'default';
    const oldPath = this.primaryImagePath();
    this.primaryProgress.set(1);
    try {
      const res = await this.roomService.uploadRoomImage(
        lodgeId,
        this.tempRoomId,
        'primary',
        file,
        (pct) => this.primaryProgress.set(pct),
      );
      if (oldPath) this.pendingCleanupPaths.push(oldPath);
      this.primaryImageUrl.set(res.url);
      this.primaryImagePath.set(res.storagePath);
      this.form.markAsDirty();
      this.toast.success('Primary room image uploaded.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to upload image.');
    } finally {
      this.primaryProgress.set(null);
    }
  }

  removePrimary(): void {
    const oldPath = this.primaryImagePath();
    if (oldPath) this.pendingCleanupPaths.push(oldPath);
    this.primaryImageUrl.set(null);
    this.primaryImagePath.set(null);
    this.form.markAsDirty();
  }

  async onGallerySelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    input.value = '';

    const lodgeId = this.form.get('propertyId')?.value || 'default';
    for (const file of files) {
      this.galleryProgress.set(1);
      try {
        const res = await this.roomService.uploadRoomImage(
          lodgeId,
          this.tempRoomId,
          'gallery',
          file,
          (pct) => this.galleryProgress.set(pct),
        );
        this.galleryImages.update((list) => [
          ...list,
          {
            id: `rgal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            url: res.url,
            storagePath: res.storagePath,
            uploadedAt: new Date().toISOString(),
          },
        ]);
        this.form.markAsDirty();
      } catch (err: any) {
        this.toast.error(err?.message || `Failed to upload ${file.name}`);
      } finally {
        this.galleryProgress.set(null);
      }
    }
  }

  removeGalleryImage(img: RoomGalleryImage): void {
    if (img.storagePath) this.pendingCleanupPaths.push(img.storagePath);
    this.galleryImages.update((list) => list.filter((g) => g.id !== img.id));
    this.form.markAsDirty();
  }

  async onSubmit(): Promise<void> {
    if (this.isSaving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.error('Please complete all required room fields.');
      return;
    }

    await this.checkRoomNumber();
    if (this.duplicateError()) {
      this.toast.error(this.duplicateError()!);
      return;
    }

    this.isSaving.set(true);
    try {
      const v = this.form.getRawValue();
      const baseNum = Number(v.basePrice) || 0;
      const op: OperationalRoomStatus = v.operationalStatus || 'active';
      const status =
        op === 'cleaning'
          ? 'Cleaning'
          : op === 'maintenance'
            ? 'Maintenance'
            : op === 'blocked' || op === 'inactive'
              ? 'Out of Service'
              : 'Available';

      const allUrls = [
        ...(this.primaryImageUrl() ? [this.primaryImageUrl()!] : []),
        ...this.galleryImages().map((g) => g.url),
      ];

      const payload: Omit<RoomItem, 'id'> = {
        propertyId: v.propertyId,
        number: v.number.trim(),
        roomName: v.roomName?.trim() || '',
        roomCode: v.roomCode?.trim() || '',
        floorId: v.floorId || '',
        floor: String(v.floor || '1'),
        roomTypeId: v.roomTypeId || '',
        type: v.type,
        description: v.description?.trim() || '',
        maximumAdults: Number(v.maximumAdults) || 2,
        maximumChildren: Number(v.maximumChildren) || 0,
        maximumOccupancy: Number(v.maximumOccupancy) || 2,
        capacity: Number(v.maximumOccupancy) || 2,
        beds: Number(v.beds) || 1,
        bedConfiguration: v.bedConfiguration,
        basePrice: baseNum,
        weekdayPrice: Number(v.weekdayPrice) || baseNum,
        weekendPrice: Number(v.weekendPrice) || baseNum,
        extraAdultCharge: Number(v.extraAdultCharge) || 0,
        extraChildCharge: Number(v.extraChildCharge) || 0,
        currency: v.currency || 'INR',
        taxConfiguration: {
          taxRate: Number(v.taxRate) || 0,
          taxInclusive: !!v.taxInclusive,
        },
        price: `₹${baseNum.toLocaleString('en-IN')}`,
        amenities: this.selectedAmenities(),
        primaryImageUrl: this.primaryImageUrl() || undefined,
        primaryImagePath: this.primaryImagePath() || undefined,
        galleryImages: this.galleryImages(),
        images: allUrls,
        roomSize: v.roomSize || '',
        smokingPolicy: v.smokingPolicy || 'Non-Smoking',
        accessibilityInfo: v.accessibilityInfo || '',
        internalNotes: v.internalNotes || '',
        operationalStatus: op,
        status,
      };

      if (this.isEditMode() && this.roomId()) {
        await this.roomService.updateRoom(this.roomId()!, payload);
        for (const p of this.pendingCleanupPaths) {
          await this.roomService.deleteStorageFile(p);
        }
        this.savedSuccessfully = true;
        this.form.markAsPristine();
        this.toast.success(`Room ${payload.number} updated.`);
        void this.router.navigate(['/rooms', this.roomId()]);
      } else {
        const createdId = await this.roomService.createRoom(payload);
        for (const p of this.pendingCleanupPaths) {
          await this.roomService.deleteStorageFile(p);
        }
        this.savedSuccessfully = true;
        this.form.markAsPristine();
        this.toast.success(`Room ${payload.number} created.`);
        void this.router.navigate(['/rooms', createdId]);
      }
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to save room.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async onCancel(): Promise<void> {
    if (await this.canDeactivate()) {
      const target = this.isEditMode() && this.roomId()
        ? ['/rooms', this.roomId()]
        : ['/rooms'];
      void this.router.navigate(target);
    }
  }

  async canDeactivate(): Promise<boolean> {
    if (this.savedSuccessfully || !this.form.dirty) return true;
    const alert = await this.alertCtrl.create({
      header: 'Unsaved Changes',
      message: 'Discard unsaved room changes?',
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
    if (navId === 'rooms') {
      void this.onCancel();
      return;
    }
    const role = this.roleService.currentRole();
    const target = role === 'owner' ? '/owner/dashboard' : '/manager/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
