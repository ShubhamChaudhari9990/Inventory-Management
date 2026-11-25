import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonIcon, IonProgressBar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowDownOutline,
  arrowUpOutline,
  cloudUploadOutline,
  starOutline,
  star,
  trashOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { Lodge, LodgeGalleryItem } from '../../interface';
import { LodgeService } from '../../services/lodge.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-lodge-gallery',
  templateUrl: './lodge-gallery.page.html',
  styleUrls: ['./lodge-gallery.page.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, IonProgressBar, AppShellComponent],
})
export class LodgeGalleryPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lodgeService = inject(LodgeService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly lodgeId = signal('');
  readonly lodge = computed<Lodge | undefined>(() =>
    this.lodgeService.getLodgeById(this.lodgeId()),
  );
  readonly gallery = signal<LodgeGalleryItem[]>([]);
  readonly uploadProgress = signal<number | null>(null);

  constructor() {
    addIcons({
      arrowBackOutline,
      arrowDownOutline,
      arrowUpOutline,
      cloudUploadOutline,
      starOutline,
      star,
      trashOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('lodgeId') || '';
    this.lodgeId.set(id);
    if (!id || !this.roleService.canAccessProperty(id) || this.roleService.isStaff()) {
      this.toast.error('Unauthorized access to gallery management.');
      void this.router.navigate(['/lodges']);
      return;
    }
    const existing = this.lodgeService.getLodgeById(id);
    this.gallery.set([...(existing?.images?.gallery || [])]);
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    input.value = '';

    const current = [...this.gallery()];
    for (const file of files) {
      this.uploadProgress.set(1);
      try {
        const res = await this.lodgeService.uploadLodgeFile(
          this.lodgeId(),
          'gallery',
          file,
          (pct) => this.uploadProgress.set(pct),
        );
        current.push({
          id: `gal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          url: res.url,
          storagePath: res.storagePath,
          order: current.length,
          uploadedAt: new Date().toISOString(),
          uploadedBy: this.roleService.currentUserProfile()?.name || 'User',
        });
      } catch (err: any) {
        this.toast.error(err?.message || `Failed to upload ${file.name}`);
      } finally {
        this.uploadProgress.set(null);
      }
    }
    this.gallery.set(current);
    await this.lodgeService.saveGallery(this.lodgeId(), current);
    this.toast.success('Gallery updated.');
  }

  async setAsCover(item: LodgeGalleryItem): Promise<void> {
    const updated = this.gallery().map((g) => ({
      ...g,
      isCover: g.id === item.id,
    }));
    this.gallery.set(updated);
    await this.lodgeService.saveGallery(
      this.lodgeId(),
      updated,
      item.url,
      item.storagePath || null,
    );
    this.toast.success('Cover image updated.');
  }

  async moveItem(index: number, delta: -1 | 1): Promise<void> {
    const list = [...this.gallery()];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const reordered = list.map((g, i) => ({ ...g, order: i }));
    this.gallery.set(reordered);
    await this.lodgeService.saveGallery(this.lodgeId(), reordered);
  }

  async removeItem(item: LodgeGalleryItem): Promise<void> {
    const updated = this.gallery()
      .filter((g) => g.id !== item.id)
      .map((g, i) => ({ ...g, order: i }));
    this.gallery.set(updated);
    await this.lodgeService.saveGallery(this.lodgeId(), updated);
    await this.lodgeService.deleteStorageFile(item.storagePath);
    this.toast.success('Photo removed.');
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
