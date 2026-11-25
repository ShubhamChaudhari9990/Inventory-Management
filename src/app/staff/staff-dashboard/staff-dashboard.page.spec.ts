import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { StaffDashboardPage } from './staff-dashboard.page';

describe('StaffDashboardPage', () => {
  let component: StaffDashboardPage;
  let fixture: ComponentFixture<StaffDashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffDashboardPage],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the StaffDashboardPage component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute task counters for Staff', () => {
    expect(component.totalTaskCount()).toBeGreaterThanOrEqual(0);
    expect(component.pendingCount()).toBeGreaterThanOrEqual(0);
    expect(component.completedCount()).toBeGreaterThanOrEqual(0);
  });
});
