
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ProjectControllerService } from '../../../../../services/projects/services/project-controller.service';
import { CreateProjectRequest } from '../../../../../services/projects/models/create-project-request';
import { ProjectDto } from '../../../../../services/projects/models/project-dto';


@Component({
  selector: 'app-create-project-modal',
  templateUrl: './create-project-modal.component.html',
  styleUrls: ['./create-project-modal.component.css']
})
export class CreateProjectModalComponent implements OnInit {
  projectForm!: FormGroup;
  isCreating = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateProjectModalComponent>,
    private projectService: ProjectControllerService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      key: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(10),
        Validators.pattern(/^[A-Z0-9]+$/)
      ]],
      description: [''],
      priority: ['MEDIUM'],
      startDate: [''],
      endDate: ['']
    }, {
      validators: this.dateRangeValidator
    });

    // Auto-generate key from name
    this.projectForm.get('name')?.valueChanges.subscribe(name => {
      if (name && !this.projectForm.get('key')?.dirty) {
        const autoKey = this.generateKeyFromName(name);
        this.projectForm.get('key')?.setValue(autoKey, { emitEvent: false });
      }
    });

    // Convert key to uppercase
    this.projectForm.get('key')?.valueChanges.subscribe(key => {
      if (key) {
        const upperKey = key.toUpperCase();
        if (key !== upperKey) {
          this.projectForm.get('key')?.setValue(upperKey, { emitEvent: false });
        }
      }
    });
  }

  private generateKeyFromName(name: string): string {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .slice(0, 5);
  }

  private dateRangeValidator(control: AbstractControl): {[key: string]: any} | null {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return { dateRange: true };
    }

    return null;
  }

  onSubmit(): void {
    if (this.projectForm.valid) {
      this.createProject();
    }
  }

private createProject(): void {
  this.isCreating = true;
  const token = localStorage.getItem('access_token');

  if (!token) {
    this.snackBar.open('Please login first', 'Close', { duration: 3000 });
    this.isCreating = false;
    return;
  }

  const formValue = this.projectForm.value;

  const projectRequest: CreateProjectRequest = {
    name: formValue.name.trim(),
    key: formValue.key.trim(),
    description: formValue.description?.trim() || undefined,
    priority: formValue.priority || 'MEDIUM'
  };

  console.log('🚀 Creating project:', projectRequest);

  this.projectService.createProject({
    body: projectRequest,
    Authorization: `Bearer ${token}`
  }).subscribe({
    next: (response) => {
      // ✅ AJOUTER - Debug complet de la réponse
      console.log('🔍 RAW API Response:', response);
      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Response success:', response.success);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Full response keys:', Object.keys(response));

      if (response.success && response.data) {
        console.log('✅ SUCCESS detected - closing modal');
        this.snackBar.open(`Project "${response.data.name}" created successfully!`, 'Close', {
          duration: 4000,
          panelClass: ['success-snackbar']
        });

        // Retourner le projet créé
        this.dialogRef.close(response.data);
      } else {
        console.error('❌ Success check failed:', {
          hasSuccess: !!response.success,
          hasData: !!response.data,
          actualSuccess: response.success,
          actualData: response.data
        });
        this.snackBar.open('Failed to create project - Check console for details', 'Close', { duration: 5000 });
        this.isCreating = false;
      }
    },
    error: (error) => {
      console.error('🚨 API Error:', error);
      console.error('🚨 Error status:', error.status);
      console.error('🚨 Error body:', error.error);

      let errorMessage = 'Error creating project';
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 409) {
        errorMessage = 'A project with this key already exists';
      } else if (error.status === 400) {
        errorMessage = 'Invalid project data. Please check your inputs.';
      }

      this.snackBar.open(errorMessage, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      this.isCreating = false;
    }
  });
}

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Getters for template
  get nameControl() { return this.projectForm.get('name'); }
  get keyControl() { return this.projectForm.get('key'); }
  get descriptionControl() { return this.projectForm.get('description'); }
  get priorityControl() { return this.projectForm.get('priority'); }
  get startDateControl() { return this.projectForm.get('startDate'); }
  get endDateControl() { return this.projectForm.get('endDate'); }
}
