// src/app/features/dashboard/dashboard.module.ts - VERSION CORRIGÉE
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './components/dashboard/dashboard.component';
// import { MaterialModule } from 'src/app/material.module'; // ✅ CORRECTION - Chemin direct
// import { SharedModule } from 'src/app/shared/shared.module'; // ✅ CORRECTION - Chemin corrigé

// ✅ SUPPRIMÉ - CreateProjectModalComponent (maintenant dans SharedModule)
import { CreateTaskModalComponent } from './components/modals/create-task-modal/create-task-modal/create-task-modal.component';
import { ConfirmDeleteDialog, TaskDetailModalComponent } from './components/modals/task-detail-modal/task-detail-modal/task-detail-modal.component';
import { MaterialModule } from 'src/app/shared/material.module';
import { SharedModule } from 'src/app/shared/shared/shared.module';

@NgModule({
  declarations: [
    DashboardComponent,
    // ✅ SUPPRIMÉ - CreateProjectModalComponent (exporté depuis SharedModule)
    CreateTaskModalComponent,
    TaskDetailModalComponent,
    ConfirmDeleteDialog
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    DashboardRoutingModule,
    SharedModule // ✅ Contient maintenant NotificationCenter + CreateProjectModal
  ]
})
export class DashboardModule { }
