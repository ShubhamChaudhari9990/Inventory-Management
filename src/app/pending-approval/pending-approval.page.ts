import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  callOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
  leaf,
  logOutOutline,
  mailOutline,
  personOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  timeOutline,
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';
import { FirebaseService } from '../services/firebase.service';
import { AppToastService } from '../shared/services/app-toast.service';

@Component({
  selector: 'app-pending-approval',
  templateUrl: './pending-approval.page.html',
  styleUrls: ['./pending-approval.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class PendingApprovalPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly appToast = inject(AppToastService);

  readonly isRefreshing = signal<boolean>(false);

  readonly userProfile = computed(() => this.roleService.currentUserProfile());
  readonly accountStatus = computed(() => this.roleService.accountStatus());
  readonly isPending = computed(() => this.roleService.isPending());
  readonly isSuspended = computed(() => this.roleService.isSuspended());
  readonly isRejected = computed(() => this.roleService.isRejected());

  // Administrator contact details
  readonly adminContact = {
    name: 'LemonWood Central Administration',
    email: 'owner@lemonwood.com',
    phone: '+91 98220 11000',
    hours: 'Mon - Sun: 8:00 AM - 10:00 PM',
  };

  constructor() {
    addIcons({
      leaf,
      timeOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      informationCircleOutline,
      refreshOutline,
      logOutOutline,
      personOutline,
      mailOutline,
      callOutline,
      shieldCheckmarkOutline,
    });

    // Reactive auto-redirect: automatically navigate when status becomes active and role is assigned
    effect(() => {
      const status = this.accountStatus();
      const profile = this.userProfile();
      const role = profile?.role;
      if (status === 'active' && role) {
        const targetRoute =
          role === 'manager'
            ? '/manager/dashboard'
            : role === 'staff'
              ? '/staff/dashboard'
              : '/owner/dashboard';
        void this.router.navigateByUrl(targetRoute, { replaceUrl: true });
      }
    });
  }

  /**
   * Refreshes user profile against Firestore.
   * If an administrator has approved and assigned a role,
   * immediately directs user to their assigned dashboard.
   */
  async checkApprovalStatus(): Promise<void> {
    this.isRefreshing.set(true);
    try {
      const fbUser = await this.firebaseService.authStateReady();
      if (!fbUser) {
        await this.router.navigate(['/login'], { replaceUrl: true });
        return;
      }

      const updatedProfile = await this.roleService.loadUserProfile(
        fbUser.uid,
        fbUser.email ?? '',
      );

      const status = updatedProfile.accountStatus || (updatedProfile.status as any) || 'pending';
      const role = updatedProfile.role;

      if (status === 'active' && role) {
        await this.appToast.show(
          `Welcome, ${updatedProfile.name}! Your account has been approved as ${role.toUpperCase()}.`,
          3500,
          'success',
        );

        const targetRoute =
          role === 'manager'
            ? '/manager/dashboard'
            : role === 'staff'
              ? '/staff/dashboard'
              : '/owner/dashboard';

        await this.router.navigateByUrl(targetRoute, { replaceUrl: true });
      } else if (status === 'suspended') {
        await this.appToast.show(
          'Your account is currently suspended by management.',
          3000,
          'danger',
        );
      } else if (status === 'rejected') {
        await this.appToast.show(
          'Your registration request was not approved.',
          3000,
          'danger',
        );
      } else {
        await this.appToast.show(
          'Your account is still pending approval. Please contact your lodge owner.',
          3000,
          'warning',
        );
      }
    } catch (err) {
      console.error('Error refreshing approval status:', err);
      await this.appToast.show(
        'Could not refresh status. Please check your internet connection.',
        3000,
        'danger',
      );
    } finally {
      this.isRefreshing.set(false);
    }
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
  }
}
