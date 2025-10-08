import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';


import { MaterialModule } from '../../shared/material.module';
import { SharedModule } from '../../shared/shared/shared.module';

// Components
import { SettingsPageComponent } from './components/settings-page/settings-page.component';
import { ProfileSettingsComponent } from './components/profile-settings/profile-settings.component';
import { PreferencesSettingsComponent } from './components/preferences-settings/preferences-settings.component';
import { AccountSettingsComponent } from './components/account-settings/account-settings.component';
import { SettingsRoutingModule } from './settings-routing.module';

@NgModule({
  declarations: [
    SettingsPageComponent,
    ProfileSettingsComponent,
    PreferencesSettingsComponent,
    AccountSettingsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    SharedModule,
    SettingsRoutingModule
  ]
})
export class SettingsModule { }
