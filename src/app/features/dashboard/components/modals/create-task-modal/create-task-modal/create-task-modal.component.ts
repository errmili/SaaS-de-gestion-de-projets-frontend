import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TaskControllerService } from '../../../../../../services/projects/services/task-controller.service';
import { CreateTaskRequest } from '../../../../../../services/projects/models/create-task-request';
import { TaskDto } from '../../../../../../services/projects/models/task-dto';

// Interface pour les données passées au modal
export interface CreateTaskModalData {
  projectId: string;
  projectName?: string;
  initialStatus?: string;
}

@Component({
  selector: 'app-create-task-modal',
  templateUrl: './create-task-modal.component.html',
  styleUrls: ['./create-task-modal.component.css']
})
export class CreateTaskModalComponent implements OnInit {
  taskForm!: FormGroup;
  isCreating = false;

  // Données reçues du parent
  projectId: string;
  projectName?: string;
  initialStatus?: string;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateTaskModalComponent>,
    private taskService: TaskControllerService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: CreateTaskModalData
  ) {
    this.projectId = data.projectId;
    this.projectName = data.projectName;
    this.initialStatus = data.initialStatus;
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      taskType: ['TASK'],
      priority: ['MEDIUM'],
      status: [this.initialStatus || 'TODO'],
      storyPoints: ['', [Validators.min(1), Validators.max(20)]],
      dueDate: ['']
    });

    // Si un statut initial est fourni, le désactiver
    if (this.initialStatus) {
      this.taskForm.get('status')?.disable();
    }
  }

  onSubmit(): void {
    if (this.taskForm.valid) {
      this.createTask();
    }
  }

  private createTask(): void {
    this.isCreating = true;
    const token = localStorage.getItem('access_token');

    if (!token) {
      this.snackBar.open('Please login first', 'Close', { duration: 3000 });
      this.isCreating = false;
      return;
    }

    const formValue = this.taskForm.value;

    const taskRequest: CreateTaskRequest = {
      title: formValue.title.trim(),
      description: formValue.description?.trim() || undefined,
      projectId: this.projectId,
      taskType: formValue.taskType || 'TASK',
      priority: formValue.priority || 'MEDIUM',
      storyPoints: formValue.storyPoints ? parseInt(formValue.storyPoints) : undefined,
      dueDate: formValue.dueDate ? this.formatDate(formValue.dueDate) : undefined
    };

    console.log('🚀 Creating task:', taskRequest);

    this.taskService.createTask({
      body: taskRequest,
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        console.log('🔍 Task creation response:', response);

        if (response.success && response.data) {
          console.log('✅ Task created successfully');
          this.snackBar.open(`Task "${response.data.title}" created successfully!`, 'Close', {
            duration: 4000,
            panelClass: ['success-snackbar']
          });

          // Retourner la tâche créée avec le statut initial si spécifié
          const createdTask = {
            ...response.data,
            status: this.initialStatus || response.data.status
          };
          this.dialogRef.close(createdTask);
        } else {
          console.error('❌ Task creation failed:', response);
          this.snackBar.open('Failed to create task', 'Close', { duration: 3000 });
          this.isCreating = false;
        }
      },
      error: (error) => {
        console.error('🚨 Error creating task:', error);

        let errorMessage = 'Error creating task';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          errorMessage = 'Invalid task data. Please check your inputs.';
        } else if (error.status === 404) {
          errorMessage = 'Project not found. Please refresh and try again.';
        }

        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isCreating = false;
      }
    });
  }

  private formatDate(date: string): string {
    // Si la date est déjà au format ISO, la retourner telle quelle
    if (date.includes('T')) {
      return date;
    }
    // Sinon, l'ajouter l'heure par défaut
    return new Date(date + 'T00:00:00').toISOString();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Méthodes utilitaires pour le template
  getStatusIcon(status: string): string {
    switch (status.toUpperCase()) {
      case 'TODO': return 'radio_button_unchecked';
      case 'IN_PROGRESS': return 'schedule';
      case 'IN_REVIEW': return 'search';
      case 'DONE': return 'check_circle';
      case 'BLOCKED': return 'block';
      default: return 'radio_button_unchecked';
    }
  }

  getStatusLabel(status: string): string {
    switch (status.toUpperCase()) {
      case 'TODO': return 'To Do';
      case 'IN_PROGRESS': return 'In Progress';
      case 'IN_REVIEW': return 'In Review';
      case 'DONE': return 'Done';
      case 'BLOCKED': return 'Blocked';
      default: return status;
    }
  }

  // Getters pour le template
  get titleControl() { return this.taskForm.get('title'); }
  get descriptionControl() { return this.taskForm.get('description'); }
  get taskTypeControl() { return this.taskForm.get('taskType'); }
  get priorityControl() { return this.taskForm.get('priority'); }
  get statusControl() { return this.taskForm.get('status'); }
  get storyPointsControl() { return this.taskForm.get('storyPoints'); }
  get dueDateControl() { return this.taskForm.get('dueDate'); }
}
