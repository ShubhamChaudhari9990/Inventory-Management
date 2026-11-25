import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonButton, IonIcon, IonProgressBar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cloudUploadOutline,
  documentTextOutline,
  downloadOutline,
  trashOutline,
} from 'ionicons/icons';
import { Unsubscribe } from 'firebase/firestore';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  LODGE_DOCUMENT_CATEGORIES,
  Lodge,
  LodgeDocumentCategory,
  LodgeDocumentItem,
} from '../../interface';
import { LodgeService } from '../../services/lodge.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-lodge-documents',
  templateUrl: './lodge-documents.page.html',
  styleUrls: ['./lodge-documents.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonProgressBar,
    AppShellComponent,
  ],
})
export class LodgeDocumentsPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly lodgeService = inject(LodgeService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly lodgeId = signal('');
  readonly lodge = computed<Lodge | undefined>(() =>
    this.lodgeService.getLodgeById(this.lodgeId()),
  );
  readonly documents = signal<LodgeDocumentItem[]>([]);
  readonly uploadProgress = signal<number | null>(null);
  readonly categories = LODGE_DOCUMENT_CATEGORIES;

  docTitle = '';
  docCategory: LodgeDocumentCategory = 'GST Certificate';
  docExpiry = '';
  selectedFile: File | null = null;

  private docUnsub: Unsubscribe | null = null;

  constructor() {
    addIcons({
      arrowBackOutline,
      cloudUploadOutline,
      documentTextOutline,
      downloadOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('lodgeId') || '';
    this.lodgeId.set(id);
    if (!id || !this.roleService.canAccessProperty(id) || this.roleService.isStaff()) {
      this.toast.error('Unauthorized access to lodge documents.');
      void this.router.navigate(['/lodges']);
      return;
    }

    this.docUnsub = this.lodgeService.watchLodgeDocuments(id, (docs) => {
      this.documents.set(docs);
    });
  }

  ngOnDestroy(): void {
    if (this.docUnsub) this.docUnsub();
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    const err = this.lodgeService.validateDocumentFile(file);
    if (err) {
      this.toast.error(err);
      input.value = '';
      this.selectedFile = null;
      return;
    }
    this.selectedFile = file;
    if (!this.docTitle.trim()) {
      this.docTitle = file.name.replace(/\.[^.]+$/, '');
    }
  }

  async uploadDocument(): Promise<void> {
    if (!this.selectedFile || !this.docTitle.trim()) {
      this.toast.warning('Please enter a document title and choose a file.');
      return;
    }
    const l = this.lodge();
    const user = this.roleService.currentUserProfile();
    if (!l || !user) return;

    this.uploadProgress.set(1);
    try {
      const res = await this.lodgeService.uploadLodgeFile(
        this.lodgeId(),
        'documents',
        this.selectedFile,
        (pct) => this.uploadProgress.set(pct),
      );
      await this.lodgeService.addLodgeDocument(this.lodgeId(), {
        lodgeId: this.lodgeId(),
        organizationId: l.organizationId,
        title: this.docTitle.trim(),
        category: this.docCategory,
        fileType: this.selectedFile.type || 'application/octet-stream',
        fileSize: this.selectedFile.size,
        url: res.url,
        storagePath: res.storagePath,
        expiryDate: this.docExpiry || undefined,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.name || user.email || 'Authorized User',
        uploadedByUid: user.uid,
      });
      this.docTitle = '';
      this.docExpiry = '';
      this.selectedFile = null;
      this.toast.success('Document uploaded securely.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to upload document.');
    } finally {
      this.uploadProgress.set(null);
    }
  }

  async deleteDocument(docItem: LodgeDocumentItem): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Document?',
      message: `Are you sure you want to delete "${docItem.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.lodgeService.deleteLodgeDocument(
                this.lodgeId(),
                docItem.id,
                docItem.storagePath,
              );
              this.toast.success('Document deleted.');
            } catch (err: any) {
              this.toast.error(err?.message || 'Failed to delete document.');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
