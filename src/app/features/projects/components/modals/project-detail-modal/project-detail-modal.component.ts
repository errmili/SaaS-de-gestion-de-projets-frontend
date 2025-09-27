import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { ProjectControllerService } from './../../../../../services/projects/services/project-controller.service';
import { ProjectDto } from './../../../../../services/projects/models/project-dto';
import { UpdateProjectRequest } from './../../../../../services/projects/models/update-project-request';

// Interface pour les données passées au modal
export interface ProjectDetailModalData {
  project: ProjectDto;
  mode: 'view' | 'edit';
}

// Interface pour le résultat du modal
export interface ProjectDetailModalResult {
  action: 'updated' | 'deleted' | 'cancelled';
  project?: ProjectDto;
}

@Component({
  selector: 'app-project-detail-modal',
  templateUrl: './project-detail-modal.component.html',
  styleUrls: ['./project-detail-modal.component.css']
})
export class ProjectDetailModalComponent implements OnInit {
  projectForm!: FormGroup;
  originalProject: ProjectDto;
  isLoading = false;
  isEditing = false;
  isDeleting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProjectDetailModalComponent>,
    private projectService: ProjectControllerService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: ProjectDetailModalData
  ) {
    this.originalProject = { ...data.project };
    this.isEditing = data.mode === 'edit';
  }

  ngOnInit(): void {
    this.initializeForm();
    console.log('🔍 ProjectDetailModal initialized with project:', this.data.project);
  }

  private initializeForm(): void {
    const project = this.data.project;

    this.projectForm = this.fb.group({
      name: [project.name || '', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: [project.description || '', [Validators.maxLength(500)]],
      priority: [project.priority || 'MEDIUM'],
      status: [project.status || 'ACTIVE'],
      startDate: [this.formatDateForInput(project.startDate), ''],
      endDate: [this.formatDateForInput(project.endDate), '']
    }, {
      validators: this.dateRangeValidator
    });

    // Si mode view, désactiver le formulaire
    if (!this.isEditing) {
      this.projectForm.disable();
    }

    console.log('📝 Form initialized in', this.isEditing ? 'EDIT' : 'VIEW', 'mode');
  }

  private dateRangeValidator(control: AbstractControl): {[key: string]: any} | null {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return { dateRange: true };
    }

    return null;
  }

  // Basculer entre mode lecture et édition
  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
    console.log('🔄 Toggle edit mode:', this.isEditing ? 'EDIT' : 'VIEW');

    if (this.isEditing) {
      this.projectForm.enable();
      this.snackBar.open('Edit mode enabled - Make your changes and click Save', 'Close', {
        duration: 4000,
        panelClass: ['success-snackbar']
      });
    } else {
      this.projectForm.disable();
      // Restaurer les valeurs originales si on annule l'édition
      this.restoreOriginalValues();
    }
  }

  private restoreOriginalValues(): void {
    const project = this.data.project;
    this.projectForm.patchValue({
      name: project.name || '',
      description: project.description || '',
      priority: project.priority || 'MEDIUM',
      status: project.status || 'ACTIVE',
      startDate: this.formatDateForInput(project.startDate),
      endDate: this.formatDateForInput(project.endDate)
    });
    console.log('🔄 Form values restored');
  }

  // Sauvegarder les modifications
  onSave(): void {
    if (this.projectForm.valid && this.data.project.id) {
      console.log('💾 Starting save process...');
      this.updateProject();
    } else {
      console.log('❌ Form invalid or no project ID');
      this.snackBar.open('Please fix validation errors before saving', 'Close', { duration: 3000 });
    }
  }

  private updateProject(): void {
    this.isLoading = true;
    const token = localStorage.getItem('access_token');

    if (!token || !this.data.project.id) {
      this.snackBar.open('Authentication error', 'Close', { duration: 3000 });
      this.isLoading = false;
      return;
    }

    const formValue = this.projectForm.value;
    const updateRequest: UpdateProjectRequest = {
      name: formValue.name?.trim(),
      description: formValue.description?.trim() || undefined,
      priority: formValue.priority,
      status: formValue.status,
      startDate: formValue.startDate ? this.formatDateForAPI(formValue.startDate) : undefined,
      endDate: formValue.endDate ? this.formatDateForAPI(formValue.endDate) : undefined
    };

    console.log('🔄 Updating project:', updateRequest);

    this.projectService.updateProject({
      projectId: this.data.project.id,
      body: updateRequest,
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        console.log('✅ Project updated:', response);

        if (response.success && response.data) {
          this.snackBar.open('Project updated successfully!', 'Close', {
            duration: 4000,
            panelClass: ['success-snackbar']
          });

          // Mettre à jour le projet local
          this.data.project = { ...response.data };
          this.originalProject = { ...response.data };

          // Sortir du mode édition
          this.isEditing = false;
          this.projectForm.disable();

          // Retourner le projet mis à jour
          this.dialogRef.close({
            action: 'updated',
            project: response.data
          } as ProjectDetailModalResult);
        } else {
          console.log('❌ Update response not successful:', response);
          this.snackBar.open('Failed to update project', 'Close', { duration: 3000 });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('🚨 Error updating project:', error);

        let errorMessage = 'Error updating project';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }

        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  // Confirmer la suppression
  onDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDeleteProjectDialog, {
      width: '400px',
      data: {
        title: 'Delete Project',
        message: `Are you sure you want to delete "${this.data.project.name}"? This will also delete all tasks and data associated with this project. This action cannot be undone.`,
        confirmText: 'Delete Project',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        console.log('🗑️ User confirmed deletion');
        this.deleteProject();
      } else {
        console.log('❌ User cancelled deletion');
      }
    });
  }

  private deleteProject(): void {
    this.isDeleting = true;
    const token = localStorage.getItem('access_token');

    if (!token || !this.data.project.id) {
      this.snackBar.open('Authentication error', 'Close', { duration: 3000 });
      this.isDeleting = false;
      return;
    }

    console.log('🗑️ Deleting project:', this.data.project.id);

    this.projectService.deleteProject({
      projectId: this.data.project.id,
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        console.log('🗑️ Project deleted:', response);

        if (response.success) {
          this.snackBar.open('Project deleted successfully!', 'Close', {
            duration: 4000,
            panelClass: ['success-snackbar']
          });

          // Retourner l'information de suppression
          this.dialogRef.close({
            action: 'deleted',
            project: this.data.project
          } as ProjectDetailModalResult);
        } else {
          console.log('❌ Delete response not successful:', response);
          this.snackBar.open('Failed to delete project', 'Close', { duration: 3000 });
        }
        this.isDeleting = false;
      },
      error: (error) => {
        console.error('🚨 Error deleting project:', error);
        this.snackBar.open('Error deleting project', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isDeleting = false;
      }
    });
  }

  // Fermer le modal
  onClose(): void {
    if (this.isEditing && this.projectForm.dirty) {
      // Demander confirmation si des modifications non sauvegardées
      const dialogRef = this.dialog.open(ConfirmDeleteProjectDialog, {
        width: '400px',
        data: {
          title: 'Unsaved Changes',
          message: 'You have unsaved changes. Are you sure you want to close?',
          confirmText: 'Close anyway',
          cancelText: 'Keep editing'
        }
      });

      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          console.log('🚪 Closing with unsaved changes');
          this.dialogRef.close({ action: 'cancelled' } as ProjectDetailModalResult);
        }
      });
    } else {
      console.log('🚪 Closing modal');
      this.dialogRef.close({ action: 'cancelled' } as ProjectDetailModalResult);
    }
  }

  // Utilitaires de formatage de date
  private formatDateForInput(dateString?: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  private formatDateForAPI(dateString: string): string {
    try {
      return new Date(dateString + 'T00:00:00').toISOString();
    } catch {
      return dateString;
    }
  }

  // Méthodes utilitaires pour le template
  getPriorityIcon(priority?: string): string {
    switch (priority) {
      case 'LOW': return 'keyboard_arrow_down';
      case 'MEDIUM': return 'remove';
      case 'HIGH': return 'keyboard_arrow_up';
      case 'CRITICAL': return 'priority_high';
      default: return 'remove';
    }
  }

  getStatusIcon(status?: string): string {
    switch (status) {
      case 'ACTIVE': return 'play_circle';
      case 'COMPLETED': return 'check_circle';
      case 'ARCHIVED': return 'archive';
      case 'ON_HOLD': return 'pause_circle';
      default: return 'help_outline';
    }
  }

  formatDisplayDate(dateString?: string): string {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  }

  calculateDuration(): string {
    const start = this.data.project.startDate;
    const end = this.data.project.endDate;

    if (!start || !end) return 'Duration not set';

    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'Invalid duration';
      if (diffDays === 0) return 'Same day';
      if (diffDays === 1) return '1 day';
      if (diffDays < 30) return `${diffDays} days`;
      if (diffDays < 365) return `${Math.round(diffDays / 30)} months`;
      return `${Math.round(diffDays / 365)} years`;
    } catch {
      return 'Invalid duration';
    }
  }

  calculateDaysActive(): number {
    if (!this.data.project.createdAt) return 0;
    try {
      const created = new Date(this.data.project.createdAt);
      const today = new Date();
      const diffTime = today.getTime() - created.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  // Getters pour le template
  get project(): ProjectDto {
    return this.data.project;
  }

  // Getters pour les contrôles du formulaire
  get nameControl() { return this.projectForm.get('name'); }
  get descriptionControl() { return this.projectForm.get('description'); }
  get priorityControl() { return this.projectForm.get('priority'); }
  get statusControl() { return this.projectForm.get('status'); }
  get startDateControl() { return this.projectForm.get('startDate'); }
  get endDateControl() { return this.projectForm.get('endDate'); }
}

// ===== COMPONENT DE CONFIRMATION =====
@Component({
  selector: 'app-confirm-delete-project-dialog',
  template: `
    <div class="confirm-dialog">
      <h1 mat-dialog-title>{{ data.title }}</h1>
      <div mat-dialog-content>
        <p>{{ data.message }}</p>
      </div>
      <div mat-dialog-actions align="end">
        <button mat-button [mat-dialog-close]="false">
          {{ data.cancelText }}
        </button>
        <button mat-raised-button
                color="warn"
                [mat-dialog-close]="true">
          {{ data.confirmText }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 350px;
    }

    h1[mat-dialog-title] {
      margin: 0 0 16px 0;
      color: #2c3e50;
    }

    div[mat-dialog-content] p {
      margin: 0;
      color: #6c757d;
      line-height: 1.5;
    }

    div[mat-dialog-actions] {
      margin: 16px 0 0 0;
      gap: 12px;
    }

    button {
      min-width: 80px;
    }
  `]
})
export class ConfirmDeleteProjectDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      title: string;
      message: string;
      confirmText: string;
      cancelText: string;
    }
  ) {}
}
