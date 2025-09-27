import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { TaskControllerService } from '../../../../../../services/projects/services/task-controller.service';
import { TaskDto } from '../../../../../../services/projects/models/task-dto';
import { UpdateTaskRequest } from '../../../../../../services/projects/models/update-task-request';

// Interface pour les données passées au modal
export interface TaskDetailModalData {
  task: TaskDto;
  projectName?: string;
}

// Interface pour le résultat du modal
export interface TaskDetailModalResult {
  action: 'updated' | 'deleted' | 'cancelled';
  task?: TaskDto;
}

@Component({
  selector: 'app-task-detail-modal',
  templateUrl: './task-detail-modal.component.html',
  styleUrls: ['./task-detail-modal.component.css']
})
export class TaskDetailModalComponent implements OnInit {
  taskForm!: FormGroup;
  originalTask: TaskDto;
  isLoading = false;
  isEditing = false;
  isDeleting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TaskDetailModalComponent>,
    private taskService: TaskControllerService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: TaskDetailModalData
  ) {
    this.originalTask = { ...data.task };
  }

  ngOnInit(): void {
    this.initializeForm();
    console.log('🔍 TaskDetailModal initialized with task:', this.data.task);
  }

  private initializeForm(): void {
    const task = this.data.task;

    this.taskForm = this.fb.group({
      title: [task.title || '', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: [task.description || '', [Validators.maxLength(1000)]],
      taskType: [task.taskType || 'TASK'],
      priority: [task.priority || 'MEDIUM'],
      status: [task.status || 'TODO'],
      storyPoints: [task.storyPoints || '', [Validators.min(1), Validators.max(20)]],
      dueDate: [this.formatDateForInput(task.dueDate), ''],
      assigneeId: [task.assigneeId || '']
    });

    // Désactiver le formulaire par défaut (mode lecture)
    this.taskForm.disable();
    console.log('📝 Form initialized in read mode');
  }

  // Basculer entre mode lecture et édition
  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
    console.log('🔄 Toggle edit mode:', this.isEditing ? 'EDIT' : 'READ');

    if (this.isEditing) {
      this.taskForm.enable();
      this.snackBar.open('Edit mode enabled - Make your changes and click Save', 'Close', {
        duration: 4000,
        panelClass: ['success-snackbar']
      });
    } else {
      this.taskForm.disable();
      // Restaurer les valeurs originales si on annule l'édition
      this.restoreOriginalValues();
    }
  }

  private restoreOriginalValues(): void {
    const task = this.data.task;
    this.taskForm.patchValue({
      title: task.title || '',
      description: task.description || '',
      taskType: task.taskType || 'TASK',
      priority: task.priority || 'MEDIUM',
      status: task.status || 'TODO',
      storyPoints: task.storyPoints || '',
      dueDate: this.formatDateForInput(task.dueDate),
      assigneeId: task.assigneeId || ''
    });
    console.log('🔄 Form values restored');
  }

  // Sauvegarder les modifications
  onSave(): void {
    if (this.taskForm.valid && this.data.task.id) {
      console.log('💾 Starting save process...');
      this.updateTask();
    } else {
      console.log('❌ Form invalid or no task ID');
      this.snackBar.open('Please fix validation errors before saving', 'Close', { duration: 3000 });
    }
  }

  private updateTask(): void {
    this.isLoading = true;
    const token = localStorage.getItem('access_token');

    if (!token || !this.data.task.id) {
      this.snackBar.open('Authentication error', 'Close', { duration: 3000 });
      this.isLoading = false;
      return;
    }

    const formValue = this.taskForm.value;
    const updateRequest: UpdateTaskRequest = {
      title: formValue.title?.trim(),
      description: formValue.description?.trim() || undefined,
      taskType: formValue.taskType,
      priority: formValue.priority,
      status: formValue.status,
      storyPoints: formValue.storyPoints ? parseInt(formValue.storyPoints) : undefined,
      dueDate: formValue.dueDate ? this.formatDateForAPI(formValue.dueDate) : undefined,
      assigneeId: formValue.assigneeId || undefined
    };

    console.log('🔄 Updating task:', updateRequest);

    this.taskService.updateTask({
      taskId: this.data.task.id,
      body: updateRequest,
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        console.log('✅ Task updated:', response);

        if (response.success && response.data) {
          this.snackBar.open('Task updated successfully!', 'Close', {
            duration: 4000,
            panelClass: ['success-snackbar']
          });

          // Mettre à jour la tâche locale
          this.data.task = { ...response.data };
          this.originalTask = { ...response.data };

          // Sortir du mode édition
          this.isEditing = false;
          this.taskForm.disable();

          // Retourner la tâche mise à jour
          this.dialogRef.close({
            action: 'updated',
            task: response.data
          } as TaskDetailModalResult);
        } else {
          console.log('❌ Update response not successful:', response);
          this.snackBar.open('Failed to update task', 'Close', { duration: 3000 });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('🚨 Error updating task:', error);

        let errorMessage = 'Error updating task';
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
    const dialogRef = this.dialog.open(ConfirmDeleteDialog, {
      width: '400px',
      data: {
        title: 'Delete Task',
        message: `Are you sure you want to delete "${this.data.task.title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        console.log('🗑️ User confirmed deletion');
        this.deleteTask();
      } else {
        console.log('❌ User cancelled deletion');
      }
    });
  }

  private deleteTask(): void {
    this.isDeleting = true;
    const token = localStorage.getItem('access_token');

    if (!token || !this.data.task.id) {
      this.snackBar.open('Authentication error', 'Close', { duration: 3000 });
      this.isDeleting = false;
      return;
    }

    console.log('🗑️ Deleting task:', this.data.task.id);

    this.taskService.deleteTask({
      taskId: this.data.task.id,
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        console.log('🗑️ Task deleted:', response);

        if (response.success) {
          this.snackBar.open('Task deleted successfully!', 'Close', {
            duration: 4000,
            panelClass: ['success-snackbar']
          });

          // Retourner l'information de suppression
          this.dialogRef.close({
            action: 'deleted',
            task: this.data.task
          } as TaskDetailModalResult);
        } else {
          console.log('❌ Delete response not successful:', response);
          this.snackBar.open('Failed to delete task', 'Close', { duration: 3000 });
        }
        this.isDeleting = false;
      },
      error: (error) => {
        console.error('🚨 Error deleting task:', error);
        this.snackBar.open('Error deleting task', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isDeleting = false;
      }
    });
  }

  // Fermer le modal
  onClose(): void {
    if (this.isEditing && this.taskForm.dirty) {
      // Demander confirmation si des modifications non sauvegardées
      const dialogRef = this.dialog.open(ConfirmDeleteDialog, {
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
          this.dialogRef.close({ action: 'cancelled' } as TaskDetailModalResult);
        }
      });
    } else {
      console.log('🚪 Closing modal');
      this.dialogRef.close({ action: 'cancelled' } as TaskDetailModalResult);
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
  getTaskTypeIcon(taskType?: string): string {
    switch (taskType) {
      case 'BUG': return 'bug_report';
      case 'STORY': return 'library_books';
      case 'EPIC': return 'stars';
      case 'SUBTASK': return 'subdirectory_arrow_right';
      default: return 'assignment';
    }
  }

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
      case 'TODO': return 'radio_button_unchecked';
      case 'IN_PROGRESS': return 'schedule';
      case 'IN_REVIEW': return 'search';
      case 'DONE': return 'check_circle';
      case 'BLOCKED': return 'block';
      default: return 'radio_button_unchecked';
    }
  }

  formatDueDate(dueDate?: string): string {
    if (!dueDate) return 'No due date';
    try {
      const date = new Date(dueDate);
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Due today';
      if (diffDays === 1) return 'Due tomorrow';
      if (diffDays === -1) return 'Due yesterday';
      if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
      return `Due in ${diffDays} days`;
    } catch {
      return 'Invalid date';
    }
  }

  formatCreatedDate(createdAt?: string): string {
    if (!createdAt) return '';
    try {
      const date = new Date(createdAt);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  }

  isDueDateOverdue(dueDate?: string): boolean {
    if (!dueDate) return false;
    try {
      const date = new Date(dueDate);
      const today = new Date();
      return date < today;
    } catch {
      return false;
    }
  }

  // Getters pour le template
  get task(): TaskDto {
    return this.data.task;
  }

  get projectName(): string {
    return this.data.projectName || this.task.projectName || 'Unknown Project';
  }

  // Getters pour les contrôles du formulaire
  get titleControl() { return this.taskForm.get('title'); }
  get descriptionControl() { return this.taskForm.get('description'); }
  get taskTypeControl() { return this.taskForm.get('taskType'); }
  get priorityControl() { return this.taskForm.get('priority'); }
  get statusControl() { return this.taskForm.get('status'); }
  get storyPointsControl() { return this.taskForm.get('storyPoints'); }
  get dueDateControl() { return this.taskForm.get('dueDate'); }
}

// ===== COMPONENT DE CONFIRMATION =====
@Component({
  selector: 'app-confirm-delete-dialog',
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
export class ConfirmDeleteDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      title: string;
      message: string;
      confirmText: string;
      cancelText: string;
    }
  ) {}
}
