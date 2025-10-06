// src/app/shared/shared.module.ts - VERSION CORRIGÉE
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// ✅ CORRECTION IMPORTANTE - Import du MaterialModule corrigé
import { MaterialModule } from '../material.module';

// ✅ CORRECTION CHEMINS - Chemins corrects selon ta structure
import { NotificationCenterComponent } from '../components/notification-center/notification-center.component';
import { NotificationBadgeDirective } from '../directives/notification-badge.directive';

// ✅ CORRECTION - Import du composant existant avec bon chemin
import { CreateProjectModalComponent } from '../../features/dashboard/components/modals/create-project-modal/create-project-modal.component';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

@NgModule({
  declarations: [
    // ✅ DÉCOMMENTÉ - Composant existant
    CreateProjectModalComponent,

    // ✅ NOUVEAUX COMPOSANTS - Notifications
    NotificationCenterComponent,
    NotificationBadgeDirective,
    ConfirmDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,           // ✅ IMPORTANT - Pour ngModel
    ReactiveFormsModule,   // ✅ IMPORTANT - Pour les formulaires
    MaterialModule,        // ✅ CORRECTION - Import du MaterialModule corrigé
  ],
  exports: [
    // Modules de base
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,

    // ✅ DÉCOMMENTÉ - Composant existant
    CreateProjectModalComponent,

    // ✅ NOUVEAUX EXPORTS - Composants notifications
    NotificationCenterComponent,
    NotificationBadgeDirective,
    ConfirmDialogComponent
  ]
})
export class SharedModule { }
