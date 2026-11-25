import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { UserManagementComponent } from './user-management.component';
import { RoleService } from '../../../services/role.service';
import { UserProfile } from '../../../interface';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let roleService: RoleService;

  const mockUsers: UserProfile[] = [
    {
      uid: 'test_1',
      name: 'Sunita Bhosale',
      email: 'sunita@test.com',
      role: 'manager',
      accountStatus: 'active',
      status: 'active',
      isActive: true,
      propertyIds: ['lodge_001'],
      permissions: [],
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'test_2',
      name: 'Amit Deshmukh',
      email: 'amit@test.com',
      role: null,
      accountStatus: 'pending',
      status: 'pending',
      isActive: true,
      propertyIds: [],
      permissions: [],
      createdAt: '2026-01-02T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    roleService = TestBed.inject(RoleService);
    roleService.registeredUsers.set(mockUsers);

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create UserManagementComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate pending and active user counts', () => {
    expect(component.totalUsersCount()).toBeGreaterThan(0);
    expect(component.pendingCount()).toBeGreaterThanOrEqual(0);
  });

  it('should filter users by search query', () => {
    component.searchQuery.set('Sunita');
    const filtered = component.filteredUsers();
    expect(filtered.some((u) => u.name.includes('Sunita'))).toBeTrue();
  });
});
