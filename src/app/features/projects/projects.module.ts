import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { ProjectsRoutingModule } from './projects-routing.module';
import { ProjectsListComponent } from './components/projects-list/projects-list.component';
import { ProjectDetailModalComponent, ConfirmDeleteProjectDialog } from './components/modals/project-detail-modal/project-detail-modal.component';
import { ProjectStatsModalComponent } from './components/modals/project-stats-modal/project-stats-modal.component';
import { MaterialModule } from 'src/app/shared/material.module';

@NgModule({
  declarations: [
    ProjectsListComponent,
    ProjectDetailModalComponent,
    ConfirmDeleteProjectDialog,
    ProjectStatsModalComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    ProjectsRoutingModule
  ]
})
export class ProjectsModule { }
