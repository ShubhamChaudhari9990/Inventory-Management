import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ManagerDashboardPage } from './manager-dashboard.page';

describe('ManagerDashboardPage', () => {
  let component: ManagerDashboardPage;
  let fixture: ComponentFixture<ManagerDashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerDashboardPage],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagerDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the ManagerDashboardPage component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize 8 operations KPI cards for Manager', () => {
    const kpis = component.managerKpis();
    expect(kpis.length).toBe(8);
  });
});
