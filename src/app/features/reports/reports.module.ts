import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// import { ReportsRoutingModule } from './reports-routing.module';
import { MaterialModule } from '../../shared/material.module';
import { SharedModule } from '../../shared/shared/shared.module';

// Components
import { ReportsPageComponent } from './components/reports-page/reports-page.component';
import { TaskDistributionChartComponent } from './components/task-distribution-chart/task-distribution-chart.component';
import { ReportsRoutingModule } from './reports-routing.module';
import { ProjectStatsTableComponent } from './components/project-stats-table/project-stats-table.component';
// import { ProjectStatsTableComponent } from './components/project-stats-table/project-stats-table.component';

@NgModule({
  declarations: [
    ReportsPageComponent,
    TaskDistributionChartComponent,
    ProjectStatsTableComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    SharedModule,
    ReportsRoutingModule
  ]
})
export class ReportsModule { }
