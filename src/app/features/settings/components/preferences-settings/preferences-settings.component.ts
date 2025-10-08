import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UserPreferencesService, NotificationPreferences } from '../../../../core/services/user-preferences.service';

@Component({
  selector: 'app-preferences-settings',
  templateUrl: './preferences-settings.component.html',
  styleUrls: ['./preferences-settings.component.css']
})
export class PreferencesSettingsComponent implements OnInit {
  preferences: NotificationPreferences | null = null;
  isLoading = false;
  isSaving = false;

  constructor(
    private userPreferencesService: UserPreferencesService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPreferences();
  }

  loadPreferences(): void {
    this.isLoading = true;
    this.userPreferencesService.loadUserPreferences().subscribe({
      next: (prefs) => {
        this.preferences = prefs;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading preferences:', error);
        this.isLoading = false;
      }
    });
  }

  onPreferenceChange(key: keyof NotificationPreferences): void {
    if (!this.preferences) return;

    this.isSaving = true;
    this.userPreferencesService.saveUserPreferences({
      [key]: this.preferences[key]
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open('Preference updated', 'Close', { duration: 2000 });
      },
      error: (error) => {
        console.error('Error saving preference:', error);
        this.isSaving = false;
        this.snackBar.open('Error saving preference', 'Close', { duration: 3000 });
      }
    });
  }

  resetToDefaults(): void {
    this.isSaving = true;
    this.userPreferencesService.resetToDefaults().subscribe({
      next: (prefs) => {
        this.preferences = prefs;
        this.isSaving = false;
        this.snackBar.open('Preferences reset to defaults', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error resetting preferences:', error);
        this.isSaving = false;
        this.snackBar.open('Error resetting preferences', 'Close', { duration: 3000 });
      }
    });
  }
}
