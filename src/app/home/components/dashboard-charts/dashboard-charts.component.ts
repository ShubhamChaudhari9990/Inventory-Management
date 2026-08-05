import { Component, input } from '@angular/core';
import { ChartComponent } from 'ng-apexcharts';

import { AxisChartOptions, DonutChartOptions } from '../../data/dashboard-charts.data';

@Component({
  selector: 'app-dashboard-axis-chart',
  template: `
    <apx-chart
      [series]="options().series"
      [chart]="options().chart"
      [colors]="options().colors"
      [dataLabels]="options().dataLabels"
      [stroke]="options().stroke"
      [grid]="options().grid"
      [xaxis]="options().xaxis"
      [yaxis]="options().yaxis"
      [legend]="options().legend"
      [plotOptions]="options().plotOptions"
      [tooltip]="options().tooltip"
      [fill]="options().fill"
      [markers]="options().markers"
      [responsive]="options().responsive"
    />
  `,
  imports: [ChartComponent],
})
export class DashboardAxisChartComponent {
  readonly options = input.required<AxisChartOptions>();
}

@Component({
  selector: 'app-dashboard-donut-chart',
  template: `
    <apx-chart
      [series]="options().series"
      [chart]="options().chart"
      [labels]="options().labels"
      [colors]="options().colors"
      [stroke]="options().stroke"
      [legend]="options().legend"
      [dataLabels]="options().dataLabels"
      [plotOptions]="options().plotOptions"
      [tooltip]="options().tooltip"
      [responsive]="options().responsive ?? []"
    />
  `,
  imports: [ChartComponent],
})
export class DashboardDonutChartComponent {
  readonly options = input.required<DonutChartOptions>();
}
