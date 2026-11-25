import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DatePreset,
  ReportsAnalyticsService,
} from '../../../services/reports-analytics.service';

@Component({
  selector: 'app-report-filter-bar',
  templateUrl: './report-filter-bar.component.html',
  styleUrls: ['./report-filter-bar.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class ReportFilterBarComponent {
  readonly reportsService = inject(ReportsAnalyticsService);

  readonly filter = this.reportsService.filter;
  readonly accessibleProperties = this.reportsService.accessibleProperties;
  readonly dateError = this.reportsService.dateRangeError;

  readonly presets: { key: DatePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 Days' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
    { key: 'thisYear', label: 'This Year' },
    { key: 'custom', label: 'Custom Range' },
  ];

  readonly showCustomInputs = computed(() => this.filter().preset === 'custom');

  onPresetChange(preset: DatePreset): void {
    this.reportsService.setPreset(preset);
  }

  onLodgeChange(lodgeId: string): void {
    this.reportsService.setLodge(lodgeId);
  }

  onStartChange(start: string): void {
    this.reportsService.setCustomDates(start, this.filter().endDate);
  }

  onEndChange(end: string): void {
    this.reportsService.setCustomDates(this.filter().startDate, end);
  }
}
