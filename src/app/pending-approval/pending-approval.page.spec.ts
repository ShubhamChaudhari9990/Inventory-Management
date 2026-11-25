import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { PendingApprovalPage } from './pending-approval.page';

describe('PendingApprovalPage', () => {
  let component: PendingApprovalPage;
  let fixture: ComponentFixture<PendingApprovalPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingApprovalPage],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingApprovalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the PendingApprovalPage component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize admin contact details', () => {
    expect(component.adminContact.email).toBe('owner@lemonwood.com');
    expect(component.adminContact.phone).toContain('98220');
  });
});
