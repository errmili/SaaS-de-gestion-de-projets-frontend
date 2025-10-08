import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UserDto } from '../../../../services/auth/models/user-dto';
import { UserControllerService } from '../../../../services/auth/services/user-controller.service';
import { UpdateUserRequest } from '../../../../services/auth/models/update-user-request';

export interface TeamMemberDetailData {
  member: UserDto;
  currentUser: UserDto | null;
}

@Component({
  selector: 'app-team-member-detail',
  templateUrl: './team-member-detail.component.html',
  styleUrls: ['./team-member-detail.component.css']
})
export class TeamMemberDetailComponent implements OnInit {
  member: UserDto;
  currentUser: UserDto | null;
  editForm: FormGroup;

  isEditing = false;
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<TeamMemberDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TeamMemberDetailData,
    private fb: FormBuilder,
    private userController: UserControllerService,
    private snackBar: MatSnackBar
  ) {
    this.member = data.member;
    this.currentUser = data.currentUser;

    this.editForm = this.fb.group({
      firstName: [this.member.firstName, [Validators.required, Validators.maxLength(100)]],
      lastName: [this.member.lastName, [Validators.required, Validators.maxLength(100)]],
      avatarUrl: [this.member.avatarUrl, [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    console.log('Member detail opened:', this.member);
  }

  canEdit(): boolean {
    return this.isCurrentUser() || this.isAdmin() || this.isManager();
  }

  canDeactivate(): boolean {
    return this.isAdmin() && !this.isCurrentUser();
  }

  isCurrentUser(): boolean {
    return this.member.id === this.currentUser?.id;
  }

  isAdmin(): boolean {
    return this.currentUser?.roles?.includes('ADMIN') || false;
  }

  isManager(): boolean {
    return this.currentUser?.roles?.includes('MANAGER') || false;
  }

  startEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editForm.patchValue({
      firstName: this.member.firstName,
      lastName: this.member.lastName,
      avatarUrl: this.member.avatarUrl
    });
  }

  saveChanges(): void {
    if (this.editForm.invalid || !this.member.id) {
      return;
    }

    this.isSaving = true;
    const token = localStorage.getItem('access_token');

    if (!token) {
      this.snackBar.open('Authentication required', 'Close', { duration: 3000 });
      this.isSaving = false;
      return;
    }

    const updateData: UpdateUserRequest = {
      firstName: this.editForm.value.firstName,
      lastName: this.editForm.value.lastName,
      avatarUrl: this.editForm.value.avatarUrl || undefined
    };

    this.userController.updateUser({
      userId: this.member.id,
      body: updateData
    }).subscribe({
      next: (response) => {
        this.isSaving = false;
        if (response.success && response.data) {
          this.member = response.data;
          this.isEditing = false;
          this.snackBar.open('Member updated successfully', 'Close', { duration: 3000 });
          this.dialogRef.close({ action: 'updated', member: this.member });
        }
      },
      error: (error) => {
        this.isSaving = false;
        console.error('Error updating member:', error);
        this.snackBar.open('Error updating member', 'Close', { duration: 3000 });
      }
    });
  }

  deactivateMember(): void {
    if (!this.member.id || !this.canDeactivate()) {
      return;
    }

    const confirmed = confirm(`Are you sure you want to deactivate ${this.member.fullName}?`);
    if (!confirmed) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      this.snackBar.open('Authentication required', 'Close', { duration: 3000 });
      return;
    }

    this.userController.deleteUser({
      userId: this.member.id
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Member deactivated successfully', 'Close', { duration: 3000 });
          this.dialogRef.close({ action: 'deactivated', member: this.member });
        }
      },
      error: (error) => {
        console.error('Error deactivating member:', error);
        this.snackBar.open('Error deactivating member', 'Close', { duration: 3000 });
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  getAvatarUrl(): string {
    const avatarUrl = this.editForm.value.avatarUrl || this.member.avatarUrl;
    if (avatarUrl) return avatarUrl;

    const firstName = this.member.firstName || 'U';
    const lastName = this.member.lastName || 'N';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    return `https://ui-avatars.com/api/?name=${initials}&background=5d4e75&color=fff&size=200`;
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'ADMIN': return 'role-admin';
      case 'MANAGER': return 'role-manager';
      case 'USER': return 'role-user';
      default: return '';
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
