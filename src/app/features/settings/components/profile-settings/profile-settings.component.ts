import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../../core/services/auth.service';
import { UserControllerService } from '../../../../services/auth/services/user-controller.service';
import { UserDto } from '../../../../services/auth/models/user-dto';
import { UpdateUserRequest } from '../../../../services/auth/models/update-user-request';

@Component({
  selector: 'app-profile-settings',
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.css']
})
export class ProfileSettingsComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: UserDto | null = null;
  isLoading = false;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userController: UserControllerService,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      avatarUrl: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading = true;

    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.profileForm.patchValue({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            avatarUrl: user.avatarUrl || ''
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.isLoading = false;
        this.snackBar.open('Error loading profile', 'Close', { duration: 3000 });
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid || !this.currentUser?.id) {
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
      firstName: this.profileForm.value.firstName,
      lastName: this.profileForm.value.lastName,
      avatarUrl: this.profileForm.value.avatarUrl || undefined
    };

    this.userController.updateUser({
      userId: this.currentUser.id,
      body: updateData
    }).subscribe({
      next: (response) => {
        this.isSaving = false;
        if (response.success && response.data) {
          this.currentUser = response.data;
          this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });

          // Recharger l'utilisateur dans le service
          this.authService.loadCurrentUserSafely();
        }
      },
      error: (error) => {
        this.isSaving = false;
        console.error('Error updating profile:', error);
        this.snackBar.open('Error updating profile', 'Close', { duration: 3000 });
      }
    });
  }

  onCancel(): void {
    this.loadUserProfile();
  }

  getAvatarUrl(): string {
    const avatarUrl = this.profileForm.value.avatarUrl || this.currentUser?.avatarUrl;
    return avatarUrl || this.getDefaultAvatar();
  }

  getDefaultAvatar(): string {
    // Générer un avatar par défaut avec les initiales
    const firstName = this.currentUser?.firstName || 'U';
    const lastName = this.currentUser?.lastName || 'N';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    // Utiliser UI Avatars API
    return `https://ui-avatars.com/api/?name=${initials}&background=5d4e75&color=fff&size=200`;
  }
}
