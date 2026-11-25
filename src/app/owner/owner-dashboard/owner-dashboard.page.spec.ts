import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { OwnerDashboardPage } from './owner-dashboard.page';

describe('OwnerDashboardPage', () => {
  let component: OwnerDashboardPage;
  let fixture: ComponentFixture<OwnerDashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerDashboardPage],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the OwnerDashboardPage component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize 12 KPI cards for Owner', () => {
    const kpis = component.ownerKpis();
    expect(kpis.length).toBe(12);
  });
});
